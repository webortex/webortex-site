/**
 * Campaign mutations shared between the list and detail screens.
 *
 * Kept out of the component modules so those export only components, which is
 * what React Fast Refresh needs to hot-swap them without a full reload.
 */

import { api } from "@/mobility-media/lib/api";
import { useApiMutation } from "@/mobility-media/lib/mutations";

/** A campaign write can change list rows, the detail view and dashboard tiles. */
export const invalidateCampaigns = [["campaigns"], ["analytics"]];

/**
 * Bulk pause / resume / cancel for the campaign list.
 *
 * The API reports per-campaign results rather than all-or-nothing, so the
 * caller summarises the outcome with the failures named.
 */
export function useBulkCampaignState({ onDone } = {}) {
  return useApiMutation(
    ({ campaignIds, state }) => api.post("/campaigns/bulk-state", { campaignIds, state }),
    { invalidate: invalidateCampaigns, onSuccess: onDone },
  );
}
