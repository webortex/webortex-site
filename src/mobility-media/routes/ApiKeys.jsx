/**
 * Conversion-feed API keys.
 *
 * An advertiser's own systems (a shop, a CRM, a POS) report conversions to
 * `POST /public/v1/conversions` with one of these keys. Advertisers manage their
 * own; staff can manage any advertiser's and are the only ones who can issue a
 * verified-feed key, whose conversions count toward driver payouts.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { PageHeader } from "@/mobility-media/components/PageHeader";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { ConfirmDialog, FormDialog, SecretRevealDialog } from "@/mobility-media/components/Dialogs";
import { useAuth, usePermission } from "@/mobility-media/auth/context";
import { API_BASE } from "@/mobility-media/config";
import { api } from "@/mobility-media/lib/api";
import { formatDateTime } from "@/mobility-media/lib/format";
import { useApiMutation } from "@/mobility-media/lib/mutations";
import { items } from "@/mobility-media/routes/queries";

function keysPath(advertiserId) {
  return `/advertisers/${encodeURIComponent(advertiserId)}/api-keys`;
}

export default function ApiKeys() {
  const { user } = useAuth();
  const { can } = usePermission();
  const isStaffUser = user?.portal === "admin";
  const [advertiserInput, setAdvertiserInput] = useState(user?.advertiserId ?? "");
  const advertiserId = (isStaffUser ? advertiserInput : user?.advertiserId ?? "").trim();
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [issued, setIssued] = useState(null);

  const keys = useQuery({
    queryKey: ["apiKeys", advertiserId],
    queryFn: ({ signal }) => api.get(keysPath(advertiserId), { signal }),
    enabled: advertiserId.length >= 3,
  });
  const rows = useMemo(() => items(keys.data), [keys.data]);
  const invalidate = [["apiKeys"]];

  const revoke = useApiMutation(
    (keyId) => api.post(`${keysPath(advertiserId)}/${encodeURIComponent(keyId)}/revoke`, {}),
    { invalidate, onSuccess: () => setRevoking(null) },
  );

  const columns = [
    { id: "label", header: "Key", render: (row) => <CellText primary={row.label} secondary={row.keyId} /> },
    {
      id: "trustLevel",
      header: "Trust",
      render: (row) => (
        <Chip size="small" color={row.trustLevel === "VERIFIED_FEED" ? "success" : "default"} label={row.trustLevel === "VERIFIED_FEED" ? "Verified feed" : "Untrusted"} />
      ),
    },
    { id: "createdAt", header: "Created", render: (row) => formatDateTime(row.createdAt) },
    { id: "lastUsedAt", header: "Last used", render: (row) => (row.lastUsedAt ? formatDateTime(row.lastUsedAt) : "Never") },
    {
      id: "state",
      header: "",
      align: "right",
      render: (row) =>
        row.revokedAt ? (
          <Typography variant="caption" color="text.secondary">Revoked {formatDateTime(row.revokedAt)}</Typography>
        ) : (
          <Button size="small" color="error" onClick={() => setRevoking(row)}>Revoke</Button>
        ),
    },
  ];

  if (!can("apikeys:manage")) {
    return <Alert severity="info">Your role cannot manage API keys.</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title="API keys"
        subtitle="Keys your systems use to report leads, coupon redemptions and sales"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} disabled={advertiserId.length < 3} onClick={() => setCreating(true)}>
            New key
          </Button>
        }
      />

      {isStaffUser ? (
        <TextField
          label="Advertiser id"
          value={advertiserInput}
          onChange={(event) => setAdvertiserInput(event.target.value)}
          size="small"
          sx={{ mb: 2, minWidth: 280 }}
          helperText="Staff can manage the keys of any advertiser."
        />
      ) : null}

      <Card sx={{ mb: 2 }}>
        {advertiserId.length < 3 ? (
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {isStaffUser ? "Enter an advertiser id to see its keys." : "Your account is not linked to an advertiser."}
            </Typography>
          </CardContent>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.keyId}
            loading={keys.isLoading}
            error={keys.error}
            onRetry={keys.refetch}
            page={1}
            pageCount={1}
            pageSize={100}
            onPageChange={() => undefined}
            emptyTitle="No keys yet"
            emptyDescription="Create a key for each system that reports conversions, so one can be revoked without breaking the others."
          />
        )}
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>Sending conversions</Typography>
          <Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: "action.hover", borderRadius: 1, overflowX: "auto", fontSize: 12 }}>
{`POST ${API_BASE}/public/v1/conversions
X-Conversion-Api-Key: <your key>
Content-Type: application/json

{ "conversions": [ { "campaignId": "CMP_…", "source": "API", "type": "PURCHASE",
    "valueMinor": 49900, "externalReference": "order-1042" } ] }`}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Re-sending the same externalReference is safe — it is counted once.
          </Typography>
        </CardContent>
      </Card>

      {creating ? (
        <NewKeyDialog
          advertiserId={advertiserId}
          canIssueVerified={can("advertisers:review")}
          onClose={() => setCreating(false)}
          onIssued={(key) => {
            setCreating(false);
            setIssued(key);
          }}
        />
      ) : null}

      {issued ? (
        <SecretRevealDialog
          open
          title={`Key “${issued.label}” created`}
          fields={[{ label: "API key", value: issued.plaintext }]}
          onClose={() => setIssued(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(revoking)}
        title={`Revoke “${revoking?.label ?? ""}”?`}
        body="Any system using this key is rejected from its next request. This cannot be undone; issue a new key to restore access."
        confirmLabel="Revoke key"
        destructive
        pending={revoke.isPending}
        error={revoke.error}
        onConfirm={() => revoke.mutate(revoking.keyId)}
        onClose={() => {
          setRevoking(null);
          revoke.reset();
        }}
      />
    </Box>
  );
}

function NewKeyDialog({ advertiserId, canIssueVerified, onClose, onIssued }) {
  const [label, setLabel] = useState("");
  const [trustLevel, setTrustLevel] = useState("UNTRUSTED");
  const create = useApiMutation((body) => api.post(keysPath(advertiserId), body), {
    invalidate: [["apiKeys"]],
    onSuccess: onIssued,
  });

  return (
    <FormDialog
      open
      title="New API key"
      submitLabel="Create key"
      onClose={onClose}
      pending={create.isPending}
      error={create.error}
      canSubmit={label.trim().length >= 2}
      onSubmit={() => create.mutate({ label: label.trim(), trustLevel })}
    >
      <TextField label="Label" value={label} onChange={(event) => setLabel(event.target.value)} required autoFocus helperText="Which system uses it, e.g. “Shopify store”." />
      {canIssueVerified ? (
        <TextField select label="Trust level" value={trustLevel} onChange={(event) => setTrustLevel(event.target.value)}>
          <MenuItem value="UNTRUSTED">Untrusted — conversions are recorded but never marked verified</MenuItem>
          <MenuItem value="VERIFIED_FEED">Verified feed — a vetted integration whose conversions count toward payouts</MenuItem>
        </TextField>
      ) : (
        <Alert severity="info">Conversions from this key are recorded as unverified. Ask Webortex to verify an integration you want counted toward payouts.</Alert>
      )}
    </FormDialog>
  );
}
