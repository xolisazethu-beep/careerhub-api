/**
 * Resilient browser fetch for the real-backend calls (auth, companies, apply,
 * review). The Dockerised API has a real cold start: the first request after
 * idle can stall or briefly refuse the connection, which surfaces in the browser
 * as a bare `TypeError: Failed to fetch`. This wrapper retries network errors and
 * 5xx with a short backoff and a per-attempt timeout, and turns a final failure
 * into a friendly message instead of "Failed to fetch".
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  { retries = 2, timeoutMs = 20_000 } = {},
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) {
        await sleep(Math.min(600 * 2 ** attempt, 2500));
        continue;
      }
      return res;
    } catch {
      clearTimeout(timer);
      if (attempt < retries) {
        await sleep(Math.min(600 * 2 ** attempt, 2500));
        continue;
      }
    }
  }
  // After all retries: a friendly, actionable message (the backend is usually
  // just waking up). Never the raw "Failed to fetch".
  throw new Error(
    "Couldn't reach the server — it may be waking up. Please try again in a moment.",
  );
}
