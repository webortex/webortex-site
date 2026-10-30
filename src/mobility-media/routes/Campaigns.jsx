/**
 * Campaign list.
 *
 * `/campaigns` returns the advertiser's whole campaign set plus per-status
 * counts in one response, so the status tabs come from the server rather than
 * being derived client-side. Counting locally would give the same numbers, but
 * only for the set that happened to be loaded — and these lists are not
 * truncated.
 *
 * Rows that can be submitted are selected in bulk. The selection is by id, not by
 * index, so paging cannot shift a selection onto the wrong campaign.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { PageHeader, StatusChip } from "@/mobility-media/components/PageHeader";
import { usePermission } from "@/mobility-media/auth/context";
import { api } from "@/mobility-media/lib/api";
import { formatDate, formatMoney } from "@/mobility-media/lib/format";
import { useCampaigns, items, paginate } from "@/mobility-media/routes/queries";
import { useBulkCampaignState } from "@/mobility-media/routes/campaignMutations";
import { canTransitionEntity } from "../../../packages/shared/src/statuses";

/** Bulk run-state actions offered on a selection, in display order. */
const BULK_STATES = [
  { state: "PAUSED", label: "Pause" },
  { state: "RUNNING", label: "Resume" },
  { state: "CANCELLED", label: "Cancel" },
];

/**
 * Tab values are `campaignSchema.status` members.
 *
 * "ACTIVE" was previously a tab, but no campaign is ever in that state — the live
 * one is RUNNING. Selecting it filtered on a value the API can never return, so the
 * tab looked like an empty result rather than an error.
 */
const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "RUNNING", label: "Running" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** Statuses the API will accept for submission. */
const SUBMITTABLE = new Set(["DRAFT", "REJECTED"]);

export default function Campaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermission();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data, isLoading, error, refetch } = useCampaigns();
  const all = useMemo(() => items(data), [data]);

  // Client-side filter: the endpoint returns everything, so filtering server-side
  // would be a round trip that returns the same set.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter((campaign) => {
      if (status !== "ALL" && campaign.status !== status) return false;
      if (!term) return true;
      return (
        (campaign.name ?? "").toLowerCase().includes(term) ||
        (campaign.code ?? "").toLowerCase().includes(term) ||
        (campaign.id ?? "").toLowerCase().includes(term)
      );
    });
  }, [all, status, search]);

  const paged = useMemo(() => paginate(filtered, page), [filtered, page]);

  const canWrite = can("campaigns:write");
  const selected = useMemo(() => filtered.filter((campaign) => selectedIds.includes(campaign.id)), [filtered, selectedIds]);
  const submittable = useMemo(() => selected.filter((campaign) => SUBMITTABLE.has(campaign.status)), [selected]);

  const bulkState = useBulkCampaignState({ onDone: () => setSelectedIds([]) });
  const eligibleFor = (state) =>
    selected.filter(
      (campaign) =>
        canTransitionEntity("campaign", campaign.status, state) && (state !== "RUNNING" || campaign.status === "PAUSED"),
    );

  const bulkSubmit = useMutation({
    mutationFn: () => api.post("/campaigns/bulk-submit", { campaignIds: submittable.map((c) => c.id) }),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  // Counts come from the API so the tabs agree with what the server would count.
  const counts = data?.statusCounts ?? {};

  const columns = [
    {
      id: "name",
      header: "Campaign",
      render: (row) => <CellText primary={row.name} secondary={row.code} />,
    },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    {
      // `budget` is a nested object on the API, and amounts are minor units, so
      // reading `row.budgetMinor` would silently render every budget as a dash.
      id: "budget",
      header: "Budget",
      align: "right",
      render: (row) => formatMoney(row.budget?.totalMinor, row.budget?.currency ?? "INR"),
    },
    {
      id: "startsAt",
      header: "Flight",
      render: (row) => (
        <Typography variant="body2" noWrap>
          {formatDate(row.startsAt)} – {formatDate(row.endsAt)}
        </Typography>
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      render: (row) => <Typography variant="body2" color="text.secondary">{formatDate(row.updatedAt)}</Typography>,
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Campaigns"
        subtitle={
          // Campaigns have no "ACTIVE" status: `RUNNING` is the live one. Counting
          // a key that can never be present would have shown "0 active" forever.
          counts && Object.keys(counts).length > 0
            ? `${counts.RUNNING ?? 0} running · ${counts.PENDING_REVIEW ?? 0} awaiting review`
            : undefined
        }
        actions={
          canWrite ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/mobility/campaigns/new")}>
              New campaign
            </Button>
          ) : null
        }
      />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={status}
            onChange={(_, value) => {
              setStatus(value);
              setPage(1);
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {STATUS_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  tab.value === "ALL"
                    ? `${tab.label}${all.length ? ` (${all.length})` : ""}`
                    : counts[tab.value]
                      ? `${tab.label} (${counts[tab.value]})`
                      : tab.label
                }
              />
            ))}
          </Tabs>
        </Box>

        <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search by name or id"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 260 }}
          />

          {selectedIds.length > 0 ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {selectedIds.length} selected
              </Typography>
              {canWrite && submittable.length > 0 ? (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SendIcon />}
                  disabled={bulkSubmit.isPending}
                  onClick={() => bulkSubmit.mutate()}
                >
                  Submit {submittable.length} for review
                </Button>
              ) : null}
              {canWrite
                ? BULK_STATES.map(({ state, label }) => {
                    const eligible = eligibleFor(state);
                    return eligible.length > 0 ? (
                      <Button
                        key={state}
                        size="small"
                        variant="outlined"
                        color={state === "CANCELLED" ? "error" : "inherit"}
                        disabled={bulkState.isPending}
                        onClick={() => {
                          if (state === "CANCELLED" && !window.confirm(`Cancel ${eligible.length} campaign(s)? This cannot be undone.`)) return;
                          bulkState.mutate({ campaignIds: eligible.map((campaign) => campaign.id), state });
                        }}
                      >
                        {label} {eligible.length}
                      </Button>
                    ) : null;
                  })
                : null}
              {selected.length !== submittable.length ? (
                <Typography variant="caption" color="text.secondary">
                  {selected.length - submittable.length} not submittable from their current status
                </Typography>
              ) : null}
              <Button size="small" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </>
          ) : null}
        </Stack>

        {bulkSubmit.isError ? <Alert severity="error">{bulkSubmit.error?.message}</Alert> : null}
        {bulkState.isError ? <Alert severity="error" sx={{ mx: 2, mb: 1 }}>{bulkState.error?.message}</Alert> : null}
        {bulkState.isSuccess ? (
          <Alert severity={bulkState.data?.results?.some((r) => r.status === "FAILED") ? "warning" : "success"} sx={{ mx: 2, mb: 1 }}>
            Updated {bulkState.data?.results?.filter((r) => r.status === "OK").length ?? 0} campaign(s).
            {bulkState.data?.results
              ?.filter((r) => r.status === "FAILED")
              .map((r) => ` ${r.campaignId}: ${r.error}`)
              .join(";")}
          </Alert>
        ) : null}
        {bulkSubmit.isSuccess ? (
          <Alert severity="success" sx={{ mx: 2, mb: 1 }}>
            Submitted {bulkSubmit.data?.submitted?.length ?? 0} campaign(s) for review.
            {bulkSubmit.data?.failed?.length
              ? ` Not submitted: ${bulkSubmit.data.failed.map((f) => `${f.campaignId} (${f.error})`).join("; ")}`
              : ""}
          </Alert>
        ) : null}

        <DataTable
          columns={columns}
          rows={paged.rows}
          rowKey={(row) => row.id}
          loading={isLoading}
          error={error}
          onRetry={refetch}
          page={paged.page}
          pageCount={paged.pageCount}
          pageSize={25}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/mobility/campaigns/${encodeURIComponent(row.id)}`)}
          selectable={canWrite}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyTitle={search || status !== "ALL" ? "No campaigns match" : "No campaigns yet"}
          emptyDescription={
            search || status !== "ALL"
              ? "Try a different search or status."
              : canWrite
                ? "Create a campaign to start booking inventory."
                : "There are no campaigns to show."
          }
        />
      </Card>
    </Box>
  );
}