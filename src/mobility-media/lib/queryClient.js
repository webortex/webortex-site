/**
 * React Query configuration.
 *
 * The retry policy is the part worth being explicit about. The default of three
 * retries regardless of status is wrong for this API: a 403 will never succeed on
 * a retry, so retrying it triples the load and delays the error the user needs to
 * see. Only genuinely transient failures — network drops, rate limits, server
 * errors — are retried.
 */

import { QueryClient } from "@tanstack/react-query";
import { ApiError, isAbortError } from "@/mobility-media/lib/api";

/** True when the failure is worth another attempt. */
function shouldRetry(failureCount, error) {
  // A cancelled query is a filter change or an unmount, not a failure. Retrying
  // would fight the newer request that replaced it.
  if (isAbortError(error)) return false;
  if (error instanceof ApiError) {
    // 403 PROFILE_MISSING is explicitly retryable server-side: the profile write
    // may not have landed yet.
    if (error.code === "PROFILE_MISSING") return failureCount < 2;
    if (error.status >= 400 && error.status < 500) return false;
    return failureCount < 3;
  }
  return failureCount < 2;
}

function retryDelay(attemptIndex) {
  // Exponential with a ceiling. The cap matters: without it a rate-limited
  // client can back off far enough that the user has given up.
  return Math.min(1_000 * 2 ** attemptIndex, 15_000);
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay,
        // Aggregates are recomputed hourly server-side, so a value that is 60s
        // old is not stale in any meaningful sense. Without this, navigating
        // between screens refetches the same dashboards repeatedly.
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        // Keeps the previous page's data visible while the next loads, so a
        // filter change does not blank the table.
        placeholderData: (previous) => previous,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();