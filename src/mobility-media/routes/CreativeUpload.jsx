/**
 * Creative upload.
 *
 * The upload is deliberately **not** a multipart `POST`. Large video never
 * travels through the function: the client asks for an intent, gets a short-lived
 * signed `PUT` URL into the private bucket, uploads the bytes straight to
 * Storage, and then registers the creative document.
 *
 * ```
 * POST /creatives/upload-intent  ->  { uploadUrl, storagePath, headers }
 * PUT  <uploadUrl>               ->  the bytes
 * POST /creatives                ->  metadata + the storagePath returned above
 * ```
 *
 * Three consequences of that shape, all handled here:
 *
 *  - **The metadata must be sent twice.** The intent call validates and reserves
 *    the object; the registration call records the document. Both need the same
 *    metadata, and it is built once and reused so the two cannot disagree.
 *  - **A failure between the PUT and the registration leaves an orphan.** The
 *    object is in the bucket with no document pointing at it. That is why the
 *    phase is reported explicitly rather than as one opaque spinner: the user
 *    needs to know a retry is safe, because retrying re-registers rather than
 *    re-uploading.
 *  - **`Content-Type` is part of the signature.** The intent returns the headers
 *    it presigned with, and they are sent verbatim — a rewritten header fails the
 *    signature check with an opaque storage error.
 *
 * Client-side checks against `/settings` exist to fail fast with a readable
 * message. They are not a security boundary: the server re-validates every one of
 * them at registration.
 */

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useCampaigns, useSettings, items } from "@/mobility-media/routes/queries";
import { api } from "@/mobility-media/lib/api";
import { formatBytes } from "@/mobility-media/lib/format";

/**
 * Campaign states in which `registerCreative` accepts a new creative.
 *
 * Mirrors the server's allow-list. Offering a status the server rejects turns a
 * selection into a 409 after the file has already been uploaded, which is the
 * worst moment to discover it.
 */
const UPLOADABLE_STATUSES = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "NEEDS_MORE_INFORMATION"];

const MIME_TO_FORMAT = {
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
  "image/jpeg": "IMAGE",
  "image/jpg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
};

export default function CreativeUpload({ onClose, onUploaded }) {
  const queryClient = useQueryClient();
  const fileInput = useRef(null);

  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [probed, setProbed] = useState(null);
  const [phase, setPhase] = useState("idle");

  const settings = useSettings();
  const campaigns = useCampaigns();
  const limits = settings.data?.creative;

  const eligibleCampaigns = useMemo(
    () =>
      items(campaigns.data).filter(
        (campaign) => campaign?.id && UPLOADABLE_STATUSES.includes(campaign.status),
      ),
    [campaigns.data],
  );

  /**
   * Best-effort dimensions and duration, read from the file in the browser.
   *
   * A missing answer is normal and not an error: the browser cannot decode some
   * containers, and the schema treats all three fields as nullable. They are sent
   * as `null` rather than guessed, and the server substitutes the platform's
   * preferred aspect ratio.
   */
  function probe(selected) {
    setProbed(null);
    const url = URL.createObjectURL(selected);
    const finish = (result) => {
      setProbed(result);
      URL.revokeObjectURL(url);
    };

    if (selected.type.startsWith("image/")) {
      const image = new Image();
      image.onload = () => finish({ widthPx: image.naturalWidth, heightPx: image.naturalHeight, durationSeconds: null });
      image.onerror = () => finish(null);
      image.src = url;
      return;
    }

    if (selected.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        finish({
          widthPx: video.videoWidth || null,
          heightPx: video.videoHeight || null,
          durationSeconds: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
        });
      video.onerror = () => finish(null);
      video.src = url;
      return;
    }

    finish(null);
  }

  function chooseFile(selected) {
    setFile(selected);
    // Defaults the name to the filename so the common case needs no typing; the
    // schema wants 2–120 characters and a bare "a.mp4" is not a useful name.
    if (selected && !name) setName(selected.name.replace(/\.[^.]+$/, "").slice(0, 120));
    if (selected) probe(selected);
  }

  /** Client-side pre-flight. Each failure names the limit it broke. */
  function preflight() {
    if (!campaignId) return "Choose a campaign for this creative.";
    if (!file) return "Choose a file to upload.";
    if (name.trim().length < 2) return "Give the creative a name of at least 2 characters.";

    const format = MIME_TO_FORMAT[file.type];
    if (!format) return `${file.type || "That file type"} is not a supported creative format.`;

    if (limits?.allowedFormats && !limits.allowedFormats.includes(format)) {
      return `This platform only accepts ${limits.allowedFormats.join(" and ")} creatives.`;
    }
    if (limits?.maxFileSizeBytes && file.size > limits.maxFileSizeBytes) {
      return `That file is ${formatBytes(file.size)}; the limit is ${formatBytes(limits.maxFileSizeBytes)}.`;
    }
    if (probed?.durationSeconds != null && limits?.minDurationSeconds && probed.durationSeconds < limits.minDurationSeconds) {
      return `That clip runs ${probed.durationSeconds}s; the minimum is ${limits.minDurationSeconds}s.`;
    }
    if (probed?.durationSeconds != null && limits?.maxDurationSeconds && probed.durationSeconds > limits.maxDurationSeconds) {
      return `That clip runs ${probed.durationSeconds}s; the maximum is ${limits.maxDurationSeconds}s.`;
    }
    if (probed?.widthPx && limits?.minWidthPx && probed.widthPx < limits.minWidthPx) {
      return `That file is ${probed.widthPx}px wide; the minimum is ${limits.minWidthPx}px.`;
    }
    if (probed?.heightPx && limits?.minHeightPx && probed.heightPx < limits.minHeightPx) {
      return `That file is ${probed.heightPx}px tall; the minimum is ${limits.minHeightPx}px.`;
    }
    return null;
  }

  const upload = useMutation({
    mutationFn: async () => {
      // Built once and reused: the registration must describe the same file the
      // intent reserved, or the document and the object disagree.
      const metadata = {
        campaignId,
        name: name.trim(),
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        widthPx: probed?.widthPx ?? null,
        heightPx: probed?.heightPx ?? null,
        durationSeconds: probed?.durationSeconds ?? null,
      };

      setPhase("intent");
      const intent = await api.post("/creatives/upload-intent", metadata);

      setPhase("uploading");
      // Straight to Storage, with the exact headers the URL was signed for. No
      // Authorization: this request does not go through the API.
      const response = await fetch(intent.uploadUrl, {
        method: intent.method ?? "PUT",
        headers: intent.headers ?? {},
        body: file,
      });
      if (!response.ok) {
        throw new Error(
          `The file could not be stored (HTTP ${response.status}). Check your connection and try again — nothing has been registered yet.`,
        );
      }

      setPhase("registering");
      return api.post("/creatives", { ...metadata, storagePath: intent.storagePath });
    },
    onSuccess: (creative) => {
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      onUploaded?.(creative);
    },
  });

  const problem = file && name ? preflight() : null;
  const busy = upload.isPending;

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Upload creative</Typography>

          <Typography variant="body2" color="text.secondary">
            The file goes straight to private storage; only its metadata passes through the API.
          </Typography>

          {upload.isError ? (
            <Alert severity="error">
              <AlertTitle>Upload failed</AlertTitle>
              {upload.error?.message}
            </Alert>
          ) : null}

          <TextField
            select
            label="Campaign"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
            helperText={
              eligibleCampaigns.length === 0
                ? "No campaign currently accepts creatives. Pause a running campaign to add one."
                : "Creatives can only be added to a campaign that is not running or completed."
            }
            disabled={busy}
          >
            {eligibleCampaigns.map((campaign) => (
              <MenuItem key={campaign.id} value={campaign.id}>
                {campaign.name} — {String(campaign.status).replace(/_/g, " ").toLowerCase()}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <input
              ref={fileInput}
              type="file"
              hidden
              onChange={(event) => {
                const selected = event.target.files?.[0];
                if (selected) chooseFile(selected);
              }}
            />
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              {file ? "Choose a different file" : "Choose file"}
            </Button>
            {file ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {file.type || "unknown type"} · {formatBytes(file.size)}
                </Typography>
              </Stack>
            ) : null}
            {file && probed === null ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Dimensions could not be read from this file. They will be left blank and the server will
                apply the platform default.
              </Typography>
            ) : null}
            {file && probed ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {probed.widthPx && probed.heightPx ? `${probed.widthPx}×${probed.heightPx}px` : "dimensions unknown"}
                {probed.durationSeconds != null ? ` · ${probed.durationSeconds}s` : ""}
              </Typography>
            ) : null}
          </Box>

          <TextField
            label="Creative name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            inputProps={{ maxLength: 120 }}
            helperText="How this creative is identified in reports and review."
          />

          {limits ? (
            <Typography variant="caption" color="text.secondary">
              Limits: {limits.allowedFormats.join(", ")} up to {formatBytes(limits.maxFileSizeBytes)}
              {limits.minDurationSeconds != null && limits.maxDurationSeconds != null
                ? `, ${limits.minDurationSeconds}–${limits.maxDurationSeconds}s`
                : ""}
              , minimum {limits.minWidthPx}×{limits.minHeightPx}px.
            </Typography>
          ) : null}

          {problem ? (
            <Alert severity="info">{problem}</Alert>
          ) : null}

          {busy ? (
            <Box>
              <LinearProgress sx={{ mb: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {phase === "intent" ? "Reserving storage for this file…" : null}
                {phase === "uploading"
                  ? "Uploading the file to storage. Large video can take a while; keep this dialog open."
                  : null}
                {phase === "registering" ? "Registering the creative…" : null}
              </Typography>
            </Box>
          ) : null}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose} disabled={busy}>
              {busy ? "Uploading…" : "Cancel"}
            </Button>
            <Button
              variant="contained"
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CloudUploadIcon />}
              disabled={busy || Boolean(problem) || !file || !campaignId}
              onClick={() => upload.mutate()}
            >
              Upload
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}