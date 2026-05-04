/**
 * Thin wrapper around GA4 gtag so calls never crash
 * if the script hasn't loaded yet (e.g. ad-blockers, slow networks).
 */
export function track(event, params = {}) {
  try {
    window.gtag?.('event', event, params)
  } catch {}
}
