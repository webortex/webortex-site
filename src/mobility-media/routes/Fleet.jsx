/**
 * Fleet.
 *
 * Vehicles, screens and drivers in one screen with tabs, because an operator
 * diagnosing "this taxi's screen is not playing" needs all three together —
 * splitting them into separate pages hides the relationship that explains the
 * fault.
 */

import { useMemo, useState } from "react";
import { Box, Button, Card, Grid, Stack, Tab, Tabs, TextField, MenuItem, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import KeyIcon from "@mui/icons-material/Key";
import LinkIcon from "@mui/icons-material/Link";
import { usePermission } from "@/mobility-media/auth/context";
import {
  AddScreenDialog,
  AddVehicleDialog,
  DeviceCredentialDialog,
  EnrolDeviceDialog,
  RotateSecretDialog,
  StatusChangeDialog,
} from "@/mobility-media/routes/FleetActions";
import { DRIVER_STATUS_OPTIONS, VEHICLE_STATUS_OPTIONS } from "@/mobility-media/routes/fleetOptions";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TvIcon from "@mui/icons-material/Tv";
import BadgeIcon from "@mui/icons-material/Badge";
import { DataTable, CellText } from "@/mobility-media/components/DataTable";
import { PageHeader, StatCard, StatusChip } from "@/mobility-media/components/PageHeader";
import { DonutChart } from "@/mobility-media/components/charts";
import { ErrorState } from "@/mobility-media/components/States";
import { useScreens, useScreenHealth, useVehicles, useDrivers, items, paginate } from "@/mobility-media/routes/queries";
import { formatDateTime, formatNumber } from "@/mobility-media/lib/format";

const TABS = [
  { value: "screens", label: "Screens", icon: <TvIcon fontSize="small" /> },
  { value: "vehicles", label: "Vehicles", icon: <DirectionsCarIcon fontSize="small" /> },
  { value: "drivers", label: "Drivers", icon: <BadgeIcon fontSize="small" /> },
];

export default function Fleet() {
  const [tab, setTab] = useState("screens");
  const { can } = usePermission();
  const [dialog, setDialog] = useState(null);
  // Only needed to offer vehicles when registering a screen.
  const vehicles = useVehicles({ limit: 200 });

  return (
    <Box>
      <PageHeader
        title="Fleet"
        subtitle="Screens, vehicles and drivers across the network"
        actions={
          <Stack direction="row" spacing={1}>
            {can("vehicles:write") ? (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setDialog("vehicle")}>
                Vehicle
              </Button>
            ) : null}
            {can("screens:write") ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialog("screen")}>
                Screen
              </Button>
            ) : null}
          </Stack>
        }
      />
      {dialog === "vehicle" ? <AddVehicleDialog open onClose={() => setDialog(null)} /> : null}
      {dialog === "screen" ? <AddScreenDialog open onClose={() => setDialog(null)} vehicles={items(vehicles.data)} /> : null}

      <Card>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
          {TABS.map((item) => (
            <Tab key={item.value} value={item.value} label={item.label} icon={item.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Card>

      <Box sx={{ mt: 2 }}>
        {tab === "screens" ? <ScreensPanel /> : null}
        {tab === "vehicles" ? <VehiclesPanel /> : null}
        {tab === "drivers" ? <DriversPanel /> : null}
      </Box>
    </Box>
  );
}

/**
 * Screens.
 *
 * The route returns each screen plus two derived fields: `derivedStatus` (live
 * heartbeat, so `ONLINE`/`OFFLINE`/`DEGRADED` reflect the last few minutes rather
 * than the stored lifecycle state) and `lastHeartbeatAt`. The stored `status` is
 * the lifecycle state and does not change on its own.
 *
 * Device hardware is not part of this payload — it lives on a separate `DEV-`
 * document — so there is no hardware column here rather than a permanently blank one.
 */
const SCREEN_STATUSES = ["UNASSIGNED", "ASSIGNED", "ONLINE", "OFFLINE", "MAINTENANCE", "DECOMMISSIONED"];

/** `vehicleSchema.status`. `INACTIVE` was offered but is not a vehicle state. */
const VEHICLE_STATUSES = ["PENDING", "VERIFIED", "ACTIVE", "MAINTENANCE", "SUSPENDED", "RETIRED"];

function ScreensPanel() {
  const { can } = usePermission();
  const [enrolling, setEnrolling] = useState(null);
  const [rotating, setRotating] = useState(null);
  const [credential, setCredential] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const screens = useScreens({ status: status || undefined, limit: 200 });
  const health = useScreenHealth({});

  const list = useMemo(() => items(screens.data), [screens.data]);
  const paged = useMemo(() => paginate(list, page), [list, page]);
  const counts = health.data?.counts;

  const columns = [
    { id: "code", header: "Screen", render: (row) => <CellText primary={row.code} secondary={row.screenType} /> },
    {
      id: "vehicleId",
      header: "Vehicle",
      render: (row) =>
        row.vehicleId ?? <Typography variant="body2" color="warning.main">Unassigned</Typography>,
    },
    { id: "status", header: "State", render: (row) => <StatusChip status={row.status} /> },
    // `derivedStatus` is the live heartbeat verdict; `status` above is lifecycle.
    { id: "derivedStatus", header: "Health", render: (row) => <StatusChip status={row.derivedStatus} /> },
    {
      id: "lastHeartbeatAt",
      header: "Last seen",
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatDateTime(row.lastHeartbeatAt)}
        </Typography>
      ),
    },
    {
      id: "device",
      header: "Player",
      align: "right",
      render: (row) =>
        !can("devices:write") ? (
          row.deviceId ? "Enrolled" : "—"
        ) : row.deviceId ? (
          <Button size="small" startIcon={<KeyIcon />} onClick={() => setRotating(row)}>
            Rotate key
          </Button>
        ) : (
          <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => setEnrolling(row)}>
            Enrol
          </Button>
        ),
    },
  ];

  return (
    <>
      {enrolling ? (
        <EnrolDeviceDialog
          open
          screen={enrolling}
          onClose={() => setEnrolling(null)}
          onEnrolled={(issued) => {
            setEnrolling(null);
            setCredential(issued);
          }}
        />
      ) : null}
      {rotating ? (
        <RotateSecretDialog
          open
          screen={rotating}
          onClose={() => setRotating(null)}
          onRotated={(issued) => {
            setRotating(null);
            setCredential(issued);
          }}
        />
      ) : null}
      <DeviceCredentialDialog credential={credential} onClose={() => setCredential(null)} />
      {counts ? (
        // These count *devices*, while the table below lists *screens*. They are
        // separate collections, so the totals are a network health signal rather
        // than a row count of what is on screen.
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Online" value={formatNumber(counts.online)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Offline" value={formatNumber(counts.offline)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Degraded" value={formatNumber(counts.degraded)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}><StatCard label="Unassigned" value={formatNumber(counts.unassigned)} /></Grid>
        </Grid>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Status mix</Typography>
              <DonutChart
                rows={[
                  { label: "Online", value: counts?.online ?? 0 },
                  { label: "Offline", value: counts?.offline ?? 0 },
                  { label: "Degraded", value: counts?.degraded ?? 0 },
                  { label: "Maintenance", value: counts?.maintenance ?? 0 },
                  { label: "Unassigned", value: counts?.unassigned ?? 0 },
                ]}
                height={220}
              />
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 9 }}>
          <Card>
            <Stack direction="row" sx={{ p: 2 }} spacing={2}>
              <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
                <MenuItem value="">All</MenuItem>
                {SCREEN_STATUSES.map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <DataTable
              columns={columns}
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={screens.isLoading}
              error={screens.error}
              onRetry={screens.refetch}
              page={paged.page}
              pageCount={paged.pageCount}
              pageSize={25}
              onPageChange={setPage}
              emptyTitle="No screens match"
            />
          </Card>
        </Grid>
      </Grid>
    </>
  );
}

/**
 * Vehicles.
 *
 * `vehicleSchema` has no `cityName` and no joined city record — only `cityId`. The
 * id is rendered rather than a name that would always be blank, with the label
 * making clear what it is.
 */
function VehiclesPanel() {
  const { can } = usePermission();
  const [changing, setChanging] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const vehicles = useVehicles({ status: status || undefined, limit: 200 });
  const list = useMemo(() => items(vehicles.data), [vehicles.data]);
  const paged = useMemo(() => paginate(list, page), [list, page]);

  const columns = [
    {
      id: "registrationNumber",
      header: "Registration",
      render: (row) => <CellText primary={row.registrationNumber} secondary={row.code} />,
    },
    // `type`, not `vehicleType`: the schema field is the vehicle-type enum.
    { id: "type", header: "Type", render: (row) => row.type },
    // `make` and `model` are separate fields.
    {
      id: "model",
      header: "Model",
      render: (row) =>
        [row.make, row.model].filter(Boolean).join(" ") || <Typography variant="body2" color="text.secondary">—</Typography>,
    },
    { id: "cityId", header: "City id", render: (row) => row.cityId ?? "—" },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    ...(can("vehicles:write")
      ? [{
          id: "actions",
          header: "",
          align: "right",
          render: (row) => (
            <Button size="small" onClick={() => setChanging(row)}>
              Change status
            </Button>
          ),
        }]
      : []),
  ];

  return (
    <Card>
      {changing ? (
        <StatusChangeDialog open entity="vehicle" record={changing} options={VEHICLE_STATUS_OPTIONS} onClose={() => setChanging(null)} />
      ) : null}
      <Stack direction="row" sx={{ p: 2 }} spacing={2}>
        <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
          <MenuItem value="">All</MenuItem>
          {VEHICLE_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </TextField>
      </Stack>
      {vehicles.error ? <ErrorState error={vehicles.error} onRetry={vehicles.refetch} /> : null}
      <DataTable
        columns={columns}
        rows={paged.rows}
        rowKey={(row) => row.id}
        loading={vehicles.isLoading}
        page={paged.page}
        pageCount={paged.pageCount}
        pageSize={25}
        onPageChange={setPage}
        emptyTitle="No vehicles match"
      />
    </Card>
  );
}

/**
 * Drivers.
 *
 * `driverSchema` has no `vehicleId`: a driver may own vehicles, and those carry
 * `ownerDriverId`/`driverId` the other way round. Rendering `row.vehicleId` here
 * showed a dash for every driver in the fleet.
 */
function DriversPanel() {
  const { can } = usePermission();
  const [changing, setChanging] = useState(null);
  const [page, setPage] = useState(1);
  const drivers = useDrivers({ limit: 200 });
  const list = useMemo(() => items(drivers.data), [drivers.data]);
  const paged = useMemo(() => paginate(list, page), [list, page]);

  const columns = [
    { id: "fullName", header: "Driver", render: (row) => <CellText primary={row.fullName} secondary={row.code} /> },
    { id: "phone", header: "Phone", render: (row) => row.phone },
    { id: "cityId", header: "City id", render: (row) => row.cityId ?? "—" },
    { id: "status", header: "Status", render: (row) => <StatusChip status={row.status} /> },
    ...(can("drivers:write")
      ? [{
          id: "actions",
          header: "",
          align: "right",
          render: (row) => (
            <Button size="small" onClick={() => setChanging(row)}>
              Change status
            </Button>
          ),
        }]
      : []),
  ];

  return (
    <Card>
      {changing ? (
        <StatusChangeDialog open entity="driver" record={changing} options={DRIVER_STATUS_OPTIONS} onClose={() => setChanging(null)} />
      ) : null}
      <DataTable
        columns={columns}
        rows={paged.rows}
        rowKey={(row) => row.id}
        loading={drivers.isLoading}
        error={drivers.error}
        onRetry={drivers.refetch}
        page={paged.page}
        pageCount={paged.pageCount}
        pageSize={25}
        onPageChange={setPage}
        emptyTitle="No drivers"
      />
    </Card>
  );
}