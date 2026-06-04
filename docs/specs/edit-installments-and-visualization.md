# Edit Installment Expenses & Visualization Improvements

**Status**: Draft
**Created**: 2026-06-04
**Author**: Architect Agent

---

## Context

Users currently cannot edit installment expenses after creation. If a start month is set incorrectly or the name/amount/installment count needs adjustment, the only option is to delete and recreate the expense, losing paid-installment state. Additionally, the dashboard lacks visual tools for understanding spending trends and installment timelines at a glance.

This spec covers two enhancements:
1. Inline editing of installment expenses with atomic history redistribution
2. Spending trend chart (SVG-based, zero dependencies) and installment timeline visualization

## Current State

### InstallmentCard (`src/components/InstallmentCard.jsx`)
- Displays name, progress bar, installment count, per-installment amount, total
- Actions: increment, decrement, delete (all via server actions)
- No edit capability; view-only layout with action buttons
- 83 lines, uses `useTransition`, `lucide-react` icons, `useLocale` for i18n

### Server Actions (`src/actions/dashboard.js`)
- `addInstallmentExpense`: Creates expense row + distributes pending details across monthly_history entries for each installment month
- `deleteInstallmentExpense`: Removes expense row + cleans up all matching history details by expenseId, detailKey, or base name
- `syncInstallmentHistoryDetail`: Updates a single month's history detail for increment/decrement operations
- `getTargetMonthForInstallment(startMonthStr, offset)`: Computes target month from start_month + offset
- History details use `detailKey` format: `installment:{month}:{name}:{installmentNumber}`

### Monthly History Data Model
- `monthly_history` table: id, dashboard_id, month (e.g. "May/2026"), total_amount, details (JSON array), status, sort_date
- Each detail object: `{ expenseId, detailKey, name, amount, status, includeInTotal, kind, installmentNumber, installmentTotal }`

### Page Layout (`src/app/page.jsx`)
- Server component rendering: TopBar, DashboardSelector, Header, AddExpense, InstallmentCards section, OneTimeExpenses section, HistoryAccordion section
- Data fetched via `getDashboardData(dashboardId)` which returns `{ summary, installmentExpenses, oneTimeExpenses, timeline }`

### Translations (`src/components/LocaleProvider.jsx`)
- Dual-language support (en/pt) via context provider
- `t(key, vars)` for string interpolation, `translateMonth(monthString)` for month names
- All UI strings centralized in `translations` object

---

## Proposed Design

### Feature 1: Edit Installment Expenses

#### 1.1 Server Action: `editInstallmentExpense`

**File**: `src/actions/dashboard.js`

**Signature**:
```
editInstallmentExpense(expenseId, updates)
```

Where `updates` is `{ name?: string, total_amount?: number, installments?: number, start_month?: string }`.

**Algorithm** (must be atomic in effect -- all steps complete or the operation fails):

1. Fetch the current expense row by `expenseId` (get `dashboard_id`, old `name`, old `start_month`, old `installments`, `paid_installments`).
2. Compute new `installment_amount = updates.total_amount / updates.installments` (or keep existing if fields not changed).
3. Determine new `paid_installments`: if `updates.installments < current.paid_installments`, clamp to `updates.installments`; otherwise keep current value.
4. **Remove old history details**: Fetch all `monthly_history` rows for the dashboard. For each row, filter out details matching this expense by `expenseId` or by `detailKey` containing the old name. Recalculate `total_amount`. Update or delete the history row (delete if details array becomes empty).
5. **Update the expense row** with new values: `name`, `total_amount`, `installments`, `installment_amount`, `start_month`, `paid_installments` (clamped).
6. **Redistribute new history details**: For each installment `i` from 1 to `updates.installments`, compute the target month using `getTargetMonthForInstallment(updates.start_month, i - 1)`. Create a detail object with status `'paid'` if `i <= new paid_installments`, otherwise `'pending'`. Upsert into the target month's history using `upsertMonthlyHistoryDetail`.
7. Call `revalidatePath('/')`.

**Error handling**: If any Supabase operation fails, throw with the error message. The caller (client) catches and displays an alert. Since Supabase does not support multi-statement transactions from the JS client, the operation sequence is best-effort. The "remove old + insert new" approach is the same pattern already used by `deleteInstallmentExpense` + `addInstallmentExpense`, so this is consistent with existing conventions.

**Contract**:
- Input: `expenseId` (UUID string), `updates` (object with all four fields required -- the client always sends the full current state with modifications)
- Output: returns the updated expense data or throws
- Side effects: mutates `installment_expenses` row, mutates/creates/deletes `monthly_history` rows, calls `revalidatePath`

#### 1.2 Client Component: Inline Edit Mode on InstallmentCard

**File**: `src/components/InstallmentCard.jsx`

The card toggles between **view mode** (current layout) and **edit mode** (inline form). A pencil icon button triggers edit mode. In edit mode:

- Name: text input, pre-filled with `expense.name`
- Total Amount: number input, pre-filled with `expense.total_amount`
- Installments: number input (min=2), pre-filled with `expense.installments`
- Start Month: select dropdown (same options as AddExpense), pre-filled with `expense.start_month`
- Two buttons: Save (calls `editInstallmentExpense`) and Cancel (reverts to view mode)

The edit form replaces the card body content. The progress bar and action buttons (increment/decrement/delete) are hidden during edit mode.

**State management**: Local `useState` for `isEditing` boolean and form field values. `useTransition` for the save action (same pattern as existing increment/decrement).

#### 1.3 Translation Keys

Add to both `en` and `pt` in `LocaleProvider.jsx`:

| Key | EN | PT |
|-----|----|----|
| `editInstallment` | `Edit` | `Editar` |
| `editSave` | `Save` | `Salvar` |
| `editCancel` | `Cancel` | `Cancelar` |
| `editName` | `Name` | `Nome` |
| `editTotalAmount` | `Total Amount` | `Valor Total` |
| `editInstallmentsCount` | `Installments` | `Parcelas` |
| `editStartMonth` | `Start Month` | `Mes de Inicio` |
| `startMonth` | `Start:` | `Inicio:` |

---

### Feature 2: Visualization & UI Improvements

#### 2.1 Spending Trend Chart Component

**File**: `src/components/SpendingTrendChart.jsx` (new)

A client component that renders a simple line/bar chart using inline SVG. No external charting library.

**Props**: `timeline` (array of monthly_history objects, already sorted newest-first from `getDashboardData`)

**Design**:
- Reverse the timeline to chronological order (oldest first) for the X axis
- SVG dimensions: responsive width (100% of container), fixed height (~160px)
- Chart type: vertical bars with value labels on top
- X-axis labels: abbreviated month names (translated via `translateMonth`)
- Y-axis: implicit from bar heights (tallest bar = 100% height)
- Color coding: green bars for `status === 'paid'`, amber bars for `status === 'pending'`
- Show the value on hover or always above each bar (formatted with `formatCurrency`)
- If fewer than 2 months of data, show a placeholder message instead of the chart
- Responsive: `viewBox`-based SVG that scales with container width

**SVG Structure** (conceptual):
```
<svg viewBox="0 0 {width} {height}">
  <!-- Bars -->
  <rect> for each month
  <!-- Labels -->
  <text> month abbreviation below each bar
  <text> value above each bar
</svg>
```

**Placement**: Between the `Header` and `AddExpense` components on `page.jsx`. Wrapped in a `<section>` with a heading.

#### 2.2 Installment Timeline Component

**File**: `src/components/InstallmentTimeline.jsx` (new)

A small inline timeline rendered inside `InstallmentCard` showing each installment month as a dot/segment with paid/pending/current-month visual states.

**Props**: `expense` (installment expense object)

**Design**:
- Horizontal row of small circles/dots, one per installment
- Each dot represents an installment month (calculated from `start_month`)
- Dot states:
  - **Paid** (index < paid_installments): filled green circle
  - **Current month** (matches today's month/year): blue ring / highlighted border
  - **Pending** (index >= paid_installments and not current): empty gray circle
- Below the dots: abbreviated month labels (e.g., "May", "Jun", "Jul"...) translated via `translateMonth`
- If there are more than 12 installments, show first 6 + "..." + last 3 to avoid overflow
- Rendered using plain divs with Tailwind classes (no SVG needed for this component)

**Placement**: Inside `InstallmentCard.jsx`, below the progress bar, above the amount row. Only shown in view mode (hidden during edit mode).

#### 2.3 Enhanced InstallmentCard Layout

**File**: `src/components/InstallmentCard.jsx`

Add the following visible info to the card (view mode only):
- Start month label: display `expense.start_month` translated, e.g., "Start: May/2026"
- End month label: computed as `start_month + installments - 1`, e.g., "End: Feb/2027"
- The `InstallmentTimeline` component between the progress bar and the amount row

#### 2.4 Translation Keys for Visualization

| Key | EN | PT |
|-----|----|----|
| `spendingTrend` | `Spending Trend` | `Tendencia de Gastos` |
| `noTrendData` | `Not enough data for trend chart.` | `Dados insuficientes para o grafico.` |
| `endMonth` | `End:` | `Fim:` |
| `currentMonth` | `Current` | `Atual` |

---

## Impact Analysis

### Files Modified
| File | Change Type | Reason |
|------|-------------|--------|
| `src/actions/dashboard.js` | Add function | New `editInstallmentExpense` server action |
| `src/components/InstallmentCard.jsx` | Major edit | Add inline edit mode, timeline integration, start/end month labels, edit button |
| `src/components/LocaleProvider.jsx` | Add keys | New translation strings for both features |
| `src/app/page.jsx` | Minor edit | Add SpendingTrendChart component to layout |

### New Files
| File | Purpose |
|------|---------|
| `src/components/SpendingTrendChart.jsx` | SVG bar chart for monthly spending trend |
| `src/components/InstallmentTimeline.jsx` | Inline dot timeline for installment months |

### Dependencies Affected
- None. Zero new npm packages. All visualization uses inline SVG and Tailwind CSS.

### Backward Compatibility
- Existing installment cards keep all current functionality (increment, decrement, delete)
- Monthly history structure remains the same (same detail object shape)
- No database schema changes required
- The edit operation reuses existing `detailKey` format conventions

### Edge Cases
- Editing an installment to fewer installments than `paid_installments`: clamp paid to new total
- Editing `start_month` to overlap months that already have details from OTHER expenses: safe because details are keyed by `expenseId`
- Editing name: old history details cleaned by `expenseId` match, new ones use new name
- Empty timeline (no history yet): SpendingTrendChart shows placeholder message
- Installment with 1 installment: timeline shows single dot (though UI enforces min=2)
- Very long expense names: truncate with CSS `truncate` class in edit and timeline views

---

## Implementation Plan

### Unit 1: Add translation keys
**File**: `src/components/LocaleProvider.jsx`
**Task**: Add all new translation keys (both en and pt) listed in sections 1.3 and 2.4 to the `translations` object.
**Size**: ~20 lines

### Unit 2: Server action `editInstallmentExpense`
**File**: `src/actions/dashboard.js`
**Task**: Implement the `editInstallmentExpense` server action following the algorithm in section 1.1. Export it. Reuse existing helper functions (`getTargetMonthForInstallment`, `parseDetails`, `upsertMonthlyHistoryDetail`, `getInstallmentBaseName`).
**Size**: ~50 lines
**Dependencies**: Unit 1 (not blocking, but logical ordering)

### Unit 3: InstallmentCard edit mode -- state and form UI
**File**: `src/components/InstallmentCard.jsx`
**Task**: Add `isEditing` state, edit button (Pencil icon from lucide-react), and the edit form JSX (name, total_amount, installments, start_month inputs + Save/Cancel buttons). The Save button calls `editInstallmentExpense` via `startTransition`. Conditionally render edit form vs view mode.
**Size**: ~50 lines of new JSX + ~15 lines of state/handlers
**Dependencies**: Unit 2

### Unit 4: InstallmentTimeline component
**File**: `src/components/InstallmentTimeline.jsx` (new)
**Task**: Create the timeline dot component per section 2.2. Accept `expense` prop, compute month labels from `start_month`, render dots with paid/pending/current-month styling using Tailwind classes.
**Size**: ~45 lines
**Dependencies**: Unit 1

### Unit 5: Integrate InstallmentTimeline into InstallmentCard
**File**: `src/components/InstallmentCard.jsx`
**Task**: Import `InstallmentTimeline`, render it between the progress bar and amount row. Add start/end month labels. Hide timeline and labels during edit mode.
**Size**: ~15 lines
**Dependencies**: Unit 3, Unit 4

### Unit 6: SpendingTrendChart component
**File**: `src/components/SpendingTrendChart.jsx` (new)
**Task**: Create the SVG bar chart component per section 2.1. Accept `timeline` prop, compute bar heights relative to max value, render SVG bars with month labels and value labels. Handle the "not enough data" case.
**Size**: ~50 lines
**Dependencies**: Unit 1

### Unit 7: Integrate SpendingTrendChart into page layout
**File**: `src/app/page.jsx`
**Task**: Import `SpendingTrendChart`, render it in a `<section>` between `Header` and `AddExpense`. Pass `data.timeline` as prop.
**Size**: ~10 lines
**Dependencies**: Unit 6

---

## Open Questions

1. **Month range for start_month dropdown in edit mode**: The AddExpense component hardcodes Dec/2025 through Nov/2026. Should the edit form use the same range, or dynamically compute a range based on current date? **Assumption**: Use the same hardcoded range for now (consistent with AddExpense). A future enhancement can make this dynamic.

2. **Concurrent edits**: If two browser tabs edit the same installment, the last write wins. This is acceptable for a single-user app. **Assumption**: No optimistic locking needed.

3. **History rows with zero details after edit**: When redistributing, some months may lose all their details. **Decision**: Delete history rows with empty detail arrays (consistent with `removeMonthlyHistoryDetail` existing behavior).
