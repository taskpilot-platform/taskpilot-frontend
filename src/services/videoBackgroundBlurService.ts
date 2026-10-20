/**
 * Video Background Blur Service for TaskPilot Meetings
 *
 * Implements real-time background blurring using Google MediaPipe Selfie Segmentation
 * (AI neural network via WebGL / WASM) combined with Canvas 2D hardware-accelerated
 * composite pipeline.
 *
 * Architecture:
 * 1. Raw camera stream -> Offscreen Video -> MediaPipe SelfieSegmentation (Landscape TFLite ~250KB).
 * 2. Real-time body mask -> Canvas 2D layer 1 (Mask with 4px feathering to soften hair & shoulders).
 * 3. Layer 2: Original camera video composited sharply inside the person mask ('source-in').
 * 4. Layer 3: Original camera video with Gaussian blur composited behind the person ('destination-over').
 * 5. Output: 30 FPS MediaStream via canvas.captureStream(30), swappable to LiveKit via restartTrack.
 * 6. Graceful fallback: Automatically degrades to geometric contour if WebGL / CDN is unavailable.
 *
 * Presets:
 * - off: 0px (Bypass)
 * - slight: 8px (Soft natural blur)
 * - standard: 16px (Teams / Meet enterprise standard blur)
 * - deep: 24px (High privacy isolation)
 */

import { SelfieSegmentation, type Results } from "@mediapipe/selfie_segmentation";

export type BlurPreset = "off" | "slight" | "standard" | "deep";

export interface BlurPresetOption {
  key: BlurPreset;
  radius: number;
  labelKey: string;
  fallbackLabel: string;
}

export const BLUR_PRESETS: BlurPresetOption[] = [
  { key: "off", radius: 0, labelKey: "meetings.blur_off", fallbackLabel: "Tắt làm mờ" },
  { key: "slight", radius: 8, labelKey: "meetings.blur_slight", fallbackLabel: "Mờ nhẹ (8px)" },
  { key: "standard", radius: 16, labelKey: "meetings.blur_standard", fallbackLabel: "Chuẩn (16px)" },
  { key: "deep", radius: 24, labelKey: "meetings.blur_deep", fallbackLabel: "Mờ sâu (24px)" },
];

export class VideoBackgroundBlurService {
  private preset: BlurPreset = "off";
  private sourceStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private offscreenVideo: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isProcessing = false;
  private isModelBusy = false;
  private isAiActive = false;
  private segmenter: SelfieSegmentation | null = null;
  private subscribers = new Set<(preset: BlurPreset) => void>();

  /**
   * Get currently active blur preset
   */
  public getPreset(): BlurPreset {
    return this.preset;
  }

  /**
   * Get source input camera stream
   */
  public getSourceStream(): MediaStream | null {
    return this.sourceStream;
  }

  /**
   * Get processed blurred output stream
   */
  public getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  /**
   * Check if blur effect is currently enabled
   */
  public isBlurActive(): boolean {
    return this.preset !== "off";
  }

  /**
   * Check if MediaPipe AI segmentation is actively running
   */
  public isUsingAi(): boolean {
    return this.isAiActive;
  }

  /**
   * Subscribe to preset changes
   */
  public subscribe(callback: (preset: BlurPreset) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((fn) => {
      try {
        fn(this.preset);
      } catch (err) {
        console.warn("Error in blur preset subscriber:", err);
      }
    });
  }

  /**
   * Update active preset
   */
  public setPreset(newPreset: BlurPreset): void {
    if (this.preset === newPreset) return;
    this.preset = newPreset;
    this.notify();
  }

  /**
   * Initialize blur processor with an input camera MediaStream
   */
  public async initialize(
    sourceStream: MediaStream,
    initialPreset: BlurPreset = "standard"
  ): Promise<MediaStream> {
    this.cleanup();
    this.sourceStream = sourceStream;
    this.preset = initialPreset;

    const videoTrack = sourceStream.getVideoTracks()[0];
    if (!videoTrack) {
      throw new Error("No video track found in source stream");
    }

    // In non-browser / test environment fallback
    if (typeof document === "undefined") {
      this.processedStream = sourceStream;
      this.notify();
      return sourceStream;
    }

    try {
      const width = 640;
      const height = 480;

      // 1. Offscreen Video element to render camera frames
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.srcObject = sourceStream;
      await video.play().catch(() => {});
      this.offscreenVideo = video;

      // 2. Offscreen Canvas element for frame composition
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { willReadFrequently: true });

      // 3. Initialize Google MediaPipe SelfieSegmentation AI model
      await this.initMediaPipeModel(width, height);

      // 4. Obtain processed MediaStream from canvas
      let stream: MediaStream | null = null;
      if (typeof canvas.captureStream === "function") {
        stream = canvas.captureStream(30);
      } else if (typeof (canvas as any).mozCaptureStream === "function") {
        stream = (canvas as any).mozCaptureStream(30);
      } else {
        stream = sourceStream;
      }

      this.processedStream = stream;
      this.isProcessing = true;
      this.startRenderLoop();
      this.notify();

      return stream || sourceStream;
    } catch (err) {
      console.warn("Failed to initialize AI blur pipeline, falling back to direct stream:", err);
      this.processedStream = sourceStream;
      this.notify();
      return sourceStream;
    }
  }

  /**
   * Initialize MediaPipe Selfie Segmentation instance
   */
  private async initMediaPipeModel(width: number, height: number): Promise<void> {
    try {
      // Safe constructor check for browser / test / bundler environments
      const SegmenterCtor =
        SelfieSegmentation ||
        (SelfieSegmentation as any)?.default ||
        (window as any)?.SelfieSegmentation;

      if (!SegmenterCtor) {
        throw new Error("SelfieSegmentation constructor not found");
      }

      const segmenter = new SegmenterCtor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      // Model selection: 1 (Landscape 144x256, optimized for webcam meetings)
      segmenter.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      segmenter.onResults((results: Results) => {
        this.handleSegmentationResults(results, width, height);
      });

      if (typeof segmenter.initialize === "function") {
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("MediaPipe initialization timeout")), 2500);
        });
        await Promise.race([segmenter.initialize(), timeoutPromise]).catch((initErr: any) => {
          console.warn("MediaPipe model initialization notice/fallback:", initErr);
        });
      }

      this.segmenter = segmenter;
      this.isAiActive = true;
    } catch (modelErr) {
      console.warn("MediaPipe AI model initialization failed; activating geometric fallback:", modelErr);
      this.isAiActive = false;
      this.segmenter = null;
    }
  }

  /**
   * Handle AI Segmentation results and render tri-layer composition
   */
  private handleSegmentationResults(results: Results, width: number, height: number): void {
    if (!this.isProcessing || !this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    if (this.preset === "off") {
      ctx.save();
      ctx.filter = "none";
      ctx.drawImage(results.image, 0, 0, width, height);
      ctx.restore();
      return;
    }

    const radius = this.preset === "slight" ? 8 : this.preset === "deep" ? 24 : 16;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Step 1: Draw AI segmentation mask with 4px feathering to prevent hair/shoulder edge artifacts
    ctx.filter = "blur(4px)";
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);

    // Step 2: Composite original sharp person inside the feathered mask
    ctx.globalCompositeOperation = "source-in";
    ctx.filter = "none";
    ctx.drawImage(results.image, 0, 0, width, height);

    // Step 3: Composite blurred background behind the person
    ctx.globalCompositeOperation = "destination-over";
    ctx.filter = `blur(${radius}px)`;
    // Draw with slight negative margin to avoid transparent boundary bleeding
    ctx.drawImage(results.image, -16, -16, width + 32, height + 32);

    ctx.restore();
  }

  /**
   * Geometric silhouette fallback if MediaPipe is loading or WebGL is unavailable
   */
  private renderGeometricFallback(video: HTMLVideoElement, width: number, height: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    if (this.preset === "off") {
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, width, height);
      return;
    }

    const radius = this.preset === "slight" ? 8 : this.preset === "deep" ? 24 : 16;

    // Render background blur
    ctx.save();
    ctx.filter = `blur(${radius}px)`;
    ctx.drawImage(video, -16, -16, width + 32, height + 32);
    ctx.restore();

    // Render sharp foreground portrait contour
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.65, width * 0.32, height * 0.45, 0, 0, Math.PI * 2);
    ctx.ellipse(width * 0.5, height * 0.38, width * 0.19, height * 0.28, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.filter = "none";
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * Continuous render loop driving AI frame submissions
   */
  private startRenderLoop = () => {
    const renderFrame = async () => {
      if (!this.isProcessing || !this.canvas || !this.ctx || !this.offscreenVideo) {
        return;
      }

      const video = this.offscreenVideo;
      const width = this.canvas.width;
      const height = this.canvas.height;

      if (video.readyState >= 2) {
        if (this.isAiActive && this.segmenter) {
          if (!this.isModelBusy) {
            this.isModelBusy = true;
            try {
              await this.segmenter.send({ image: video });
            } catch {
              // On transient WebGL error, fallback to geometric frame
              this.renderGeometricFallback(video, width, height);
            } finally {
              this.isModelBusy = false;
            }
          }
        } else {
          this.renderGeometricFallback(video, width, height);
        }
      }

      this.animFrameId = requestAnimationFrame(renderFrame);
    };

    this.animFrameId = requestAnimationFrame(renderFrame);
  };

  /**
   * Stop processing and release canvas/streams/models
   */
  public stop(): void {
    this.cleanup();
    this.preset = "off";
    this.notify();
  }

  private cleanup(): void {
    this.isProcessing = false;
    this.isModelBusy = false;
    this.isAiActive = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.segmenter) {
      try {
        void this.segmenter.close?.();
      } catch {}
      this.segmenter = null;
    }

    if (this.offscreenVideo) {
      try {
        this.offscreenVideo.pause();
        this.offscreenVideo.srcObject = null;
      } catch {}
      this.offscreenVideo = null;
    }

    this.canvas = null;
    this.ctx = null;
    this.sourceStream = null;
    this.processedStream = null;
  }

  public destroy(): void {
    this.cleanup();
    this.subscribers.clear();
  }
}

export const videoBackgroundBlurService = new VideoBackgroundBlurService();
