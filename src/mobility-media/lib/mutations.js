/**
 * Mutation helper shared by every write in the portal.
 *
 * Invalidation is by key prefix (see `qk` in `lib/api.js`), so a write refreshes
 * every list and detail view that could show the changed record — including
 * dashboard tiles — rather than each screen remembering which keys it affects.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * @param {(variables: any) => Promise<any>} mutationFn
 * @param {{ invalidate?: string[][], onSuccess?: (data: any, variables: any) => void }} [options]
 */
export function useApiMutation(mutationFn, { invalidate = [], onSuccess } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      onSuccess?.(data, variables);
    },
  });
}

/** A fresh idempotency key for a money-moving form, minted once per dialog open. */
export function newIdempotencyKey(prefix = "web") {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${random}`.slice(0, 64);
}

/** Major-unit text input to integer minor units, or `null` when not a valid positive amount. */
export function parseAmountMinor(text) {
  if (typeof text !== "string" || !/^\d+(\.\d{1,2})?$/.test(text.trim())) return null;
  const minor = Math.round(Number.parseFloat(text.trim()) * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
