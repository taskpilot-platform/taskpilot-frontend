/**
 * Feature flags for containing local-only or non-production capabilities.
 */

/**
 * Custom group chats are local-browser demo only and must remain disabled in
 * production and by default in development unless explicitly opted in.
 */
export function isCustomChatDemoEnabled(): boolean {
  const isDev = String(import.meta.env.DEV) === "true";
  const isProd =
    String(import.meta.env.PROD) === "true" ||
    import.meta.env.MODE === "production";
  return (
    isDev &&
    !isProd &&
    import.meta.env.VITE_ENABLE_CUSTOM_CHAT_DEMO === "true"
  );
}
