type RealtimeCleanup = () => void;

const cleanupHandlers = new Set<RealtimeCleanup>();

/**
 * Register a realtime transport teardown callback (SSE, STOMP, etc.)
 * invoked when the auth session is cleared or invalidated.
 */
export function registerRealtimeCleanup(cleanup: RealtimeCleanup): () => void {
  cleanupHandlers.add(cleanup);
  return () => {
    cleanupHandlers.delete(cleanup);
  };
}

/**
 * Tear down all active realtime subscriptions for the current session.
 */
export function disconnectAllRealtime(): void {
  for (const cleanup of Array.from(cleanupHandlers)) {
    try {
      cleanup();
    } catch {
      // Keep session teardown resilient if an individual stream fails to close.
    }
  }
}
