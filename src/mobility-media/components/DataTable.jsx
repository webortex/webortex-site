/**
 * Server-driven data table.
 *
 * Built on MUI's `Table` rather than TanStack Table. The lists here are all
 * paginated by the API (`limit`/`page`), which means the client has no complete
 * row set to sort or filter locally — a client-side row model would either be a
 * no-op or, worse, sort one page and present it as a sorted table.
 *
 * Sorting and pagination are therefore delegated upward: this component reports
 * the intent and the screen refetches. It stays a presentational component with
 * no data-fetching opinions.
 */

import { useMemo } from "react";
import {
  Box,
  Checkbox,
  IconButton,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { EmptyState, QueryErrorState, TableSkeleton } from "@/mobility-media/components/States";

export function DataTable({
  columns,
  rows = [],
  rowKey = (row) => row.id,
  loading,
  error,
  onRetry,
  sort,
  onSortChange,
  page = 1,
  pageCount = 0,
  totalCount,
  onPageChange,
  pageSize,
  emptyTitle = "Nothing to show",
  emptyDescription,
  emptyAction,
  onRowClick,
  selectable,
  selectedIds = [],
  onSelectionChange,
  rowSx,
}) {
  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible !== false),
    [columns],
  );

  // Sorting is only offered where the API actually sorts that column, so no
  // header promises an ordering the backend cannot deliver.
  const isSorted = (column) => sort?.key === column.sortKey;

  const allRowIds = useMemo(() => rows.map((row) => rowKey(row)), [rows, rowKey]);
  const allSelected = selectable && allRowIds.length > 0 && allRowIds.every((id) => selectedIds.includes(id));
  const someSelected = selectable && selectedIds.length > 0 && !allSelected;

  function toggleAll() {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : allRowIds);
  }

  function toggleOne(id) {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id],
    );
  }

  if (error) return <QueryErrorState error={error} onRetry={onRetry} />;

  const showSkeleton = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0;

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              {selectable ? (
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                    inputProps={{ "aria-label": "Select all rows on this page" }}
                  />
                </TableCell>
              ) : null}

              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? "left"}
                  sx={{ fontWeight: 600, whiteSpace: "nowrap", ...(column.width && { width: column.width }) }}
                >
                  {column.sortable && column.sortKey ? (
                    <TableSortLabel
                      active={isSorted(column)}
                      direction={isSorted(column) && sort.direction === "desc" ? "desc" : "asc"}
                      onClick={() => onSortChange?.(column.sortKey, isSorted(column) && sort.direction === "asc" ? "desc" : "asc")}
                    >
                      {column.header}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {showSkeleton ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (selectable ? 1 : 0)} sx={{ p: 0, border: 0 }}>
                  <TableSkeleton columns={visibleColumns.length} rows={5} />
                </TableCell>
              </TableRow>
            ) : null}

            {rows.map((row) => {
              const id = rowKey(row);
              return (
                <TableRow
                  key={id}
                  hover
                  selected={selectable ? selectedIds.includes(id) : false}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{ cursor: onRowClick ? "pointer" : "default", ...rowSx }}
                >
                  {selectable ? (
                    <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        size="small"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleOne(id)}
                        inputProps={{ "aria-label": `Select row ${id}` }}
                      />
                    </TableCell>
                  ) : null}

                  {visibleColumns.map((column) => (
                    <TableCell key={column.id} align={column.align ?? "left"} sx={column.cellSx}>
                      {column.render ? column.render(row) : row[column.id]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {showEmpty ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : null}

      {pageCount > 1 || (totalCount !== undefined && pageSize) ? (
        <TableFooter page={page} pageCount={pageCount} totalCount={totalCount} pageSize={pageSize} onPageChange={onPageChange} />
      ) : null}
    </Box>
  );
}

function TableFooter({ page, pageCount, totalCount, pageSize, onPageChange }) {
  const from = totalCount === undefined ? null : (page - 1) * pageSize + 1;
  const to = totalCount === undefined ? null : Math.min(page * pageSize, totalCount);

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }} spacing={2}>
      <Typography variant="caption" color="text.secondary">
        {from !== null && totalCount > 0 ? `${from}–${to} of ${totalCount.toLocaleString("en-IN")}` : " "}
      </Typography>
      {pageCount > 1 ? (
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, value) => onPageChange?.(value)}
          size="small"
          color="primary"
        />
      ) : null}
    </Stack>
  );
}

/** Sort control for views that are not tabular. */
export function SortToggle({ active, direction, onClick }) {
  return (
    <IconButton size="small" onClick={onClick} aria-label={`Sort ${direction === "asc" ? "descending" : "ascending"}`}>
      {active && direction === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
    </IconButton>
  );
}

/** Wraps text-heavy cells so one long name cannot break the row layout. */
export function CellText({ primary, children, secondary, maxWidth = 220 }) {
  const value = primary ?? children ?? "—";
  return (
    <Box sx={{ maxWidth }}>
      <Typography variant="body2" noWrap title={typeof value === "string" ? value : undefined}>
        {value}
      </Typography>
      {secondary ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          {secondary}
        </Typography>
      ) : null}
    </Box>
  );
}