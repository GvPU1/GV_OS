/**
 * Local error logging for the root error boundary. Replaces the
 * Lovable-platform-specific reporter (which posted to a hosted
 * analytics endpoint that only exists on lovable.app deployments).
 *
 * Logs to the console for now — swap in any local logging you want
 * (e.g. writing to a log file) without needing a network call.
 */
export function reportError(error, context = {}) {
  console.error("[GV OS] Unhandled error:", error, context);
}
