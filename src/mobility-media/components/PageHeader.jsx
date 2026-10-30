/**
 * Page scaffolding shared by every screen: a title bar, a stat row and a table.
 */

import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { STATUS_COLOURS, humaniseStatus } from "@/mobility-media/theme";
import { formatMoneyParts } from "@/mobility-media/lib/format";

export function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "flex-start" }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {actions}
        </Stack>
      ) : null}
    </Stack>
  );
}

function Breadcrumbs({ items }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>
          {index > 0 ? " / " : ""}
          {item}
        </span>
      ))}
    </Typography>
  );
}

/**
 * A headline figure.
 *
 * `valueMinor` renders whole and fractional units separately so the minor digits
 * can sit at reduced emphasis — easier to scan than a full rupee figure, and it
 * avoids the column of numbers all jittering as digits change.
 */
export function StatCard({ label, value, valueMinor, currency = "INR", delta, hint, icon, tone = "default" }) {
  const parts = valueMinor !== undefined ? formatMoneyParts(valueMinor, currency) : null;

  return (
    <Card sx={{ height: "100%", ...(tone === "error" && { borderColor: "error.main" }) }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {label}
          </Typography>
          {icon ? (
            <Box sx={{ color: "text.disabled", display: "flex" }}>{icon}</Box>
          ) : null}
        </Stack>

        <Typography variant="h3" sx={{ mt: 1, lineHeight: 1.15 }}>
          {parts ? (
            <>
              {parts.major}
              <Typography component="span" variant="h3" color="text.secondary" sx={{ fontSize: "0.6em" }}>
                {parts.minor}
              </Typography>
            </>
          ) : (
            (value ?? "—")
          )}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, minHeight: 22 }}>
          {delta !== undefined && delta !== null ? <DeltaChip delta={delta} /> : null}
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Change indicator.
 *
 * `invert` is for metrics where down is good — spend against budget, or failed
 * payments — so the colour does not imply the wrong thing.
 */
export function DeltaChip({ delta, invert = false }) {
  const numeric = Number(delta);
  if (Number.isNaN(numeric)) return null;

  const isFlat = Math.abs(numeric) < 0.0005;
  const isUp = numeric > 0;
  const good = invert ? !isUp : isUp;

  return (
    <Chip
      size="small"
      variant="outlined"
      label={`${isUp ? "↑" : isFlat ? "→" : "↓"} ${(Math.abs(numeric) * 100).toFixed(1)}%`}
      color={isFlat ? "default" : good ? "success" : "error"}
      sx={{ height: 20, fontSize: "0.6875rem" }}
    />
  );
}

export function StatusChip({ status }) {
  return <Chip size="small" label={humaniseStatus(status)} color={STATUS_COLOURS[status] ?? "default"} />;
}