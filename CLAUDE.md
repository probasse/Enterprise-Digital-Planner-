# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Static HTML/CSS/JS single-page application for enterprise cutover planning. No build step, no framework, no backend — open `index.html` directly in a browser. All data persists in browser localStorage.

## Running the App

```bash
# Option 1: Open directly in browser (file://)
open index.html

# Option 2: Serve locally (needed for some browser restrictions)
python3 -m http.server 8080
# then visit http://localhost:8080
```

No install, no build, no lint commands — there are none.

## File Structure

- `index.html` — entire UI shell; all modal markup lives here
- `js/storage.js` — localStorage wrapper, multi-project management, `escapeHtml()` global
- `js/tasks.js` — 11 data modules (Tasks, Resources, Risks, Issues, Decisions, Actions, etc.)
- `js/app.js` — all view renderers, event binding, modal logic (~2200 lines)
- `js/reports.js` — 12 report generators producing printable HTML
- `js/timeline.js` — Gantt-style timeline
- `css/styles.css` — all styles including dark/light theme and print media
- `sample-imports/s4hana-rise-p01-cutover.json` — 35-task import for testing

## Architecture

### Module Pattern
All modules are plain JS object literals (no classes, no imports/exports). Script load order in `index.html` matters: `storage.js` → `tasks.js` → `app.js` → `reports.js` → `timeline.js`.

### Multi-Project Storage (Critical)
`Storage.KEYS` is a **getter**, not a static property. It returns localStorage keys namespaced to the active project:
```js
Storage.KEYS.TASKS  // → "cutover_{projectId}_tasks"
```
Global (non-project-scoped) keys are in `Storage.GLOBAL_KEYS`: `THEME`, `PROJECTS`, `ACTIVE_PROJECT`.

When adding a new data module, follow the same pattern: read/write via `Storage.KEYS.YOUR_KEY` so data is isolated per project.

### Data Module Pattern (js/tasks.js)
Every module exposes `getAll()`, `getById(id)`, `add(record)`, `update(id, updates)`, `delete(id)`. Status-tracking modules (Issues, Decisions, Actions, Risks, Tasks) also maintain `statusHistory: [{status, enteredAt}]` — append to this array on every status change, never replace it.

The shared duration formatter is `Issues._fmtDuration(ms)` — reuse it across all modules rather than duplicating.

### Rendering (js/app.js)
Views are rendered by `App.renderXxx()` methods that return or inject HTML strings. Dynamic rows use inline `onclick="App.method('${escapeHtml(id)}')"` handlers. Always apply `escapeHtml()` to any user-supplied value before inserting into HTML.

### Adding a New View
1. Add modal markup to `index.html`
2. Add data module to `js/tasks.js` with standard CRUD methods
3. Add `Storage.KEYS.YOUR_KEY` in the `KEYS` getter in `storage.js`
4. Add `renderXxxList()`, `showXxxModal()`, `saveXxx()` methods to `App` in `app.js`
5. Add `bindXxxActions()` call inside `App.init()`
6. Add a report generator to `js/reports.js` if needed

### Date Handling
All dates stored as UTC ISO strings. Display via `App.formatDateTime24(isoString)` which respects the user's saved IANA timezone preference. To convert a `datetime-local` input to UTC ISO, use `App.fromLocalInput(str)`; reverse with `App.toLocalInput(isoStr)`.

### Inactive Resources
`Resources` have a `status: 'active'|'inactive'` field. `populateAssigneeDropdown()` and `populateAssigneeFilterDropdown()` skip inactive resources. Render inactive rows with class `inactive-resource-row`.

### XSS Protection
`escapeHtml()` is a global function defined in `storage.js`. Apply it to every user-controlled value before rendering into HTML. This is the only XSS mitigation — do not skip it.

### Project Reload vs Page Reload
After switching projects or changing project settings, call `App.reloadApp()` (re-renders switcher + current view) rather than `window.location.reload()`.

### Project Lock
`Storage.isLocked()` / `Storage.setLocked(bool)` — stored at `Storage.KEYS.LOCKED`. Any write action in `App` should guard with `if (this._assertNotLocked()) return;`. The lock badge (`#lockBadge`) is shown/hidden via `App._updateLockBadge()`, called on every `showView()`.

### Generic Table System (js/app.js)
All seven tables support drag-to-reorder columns, resizable columns, and click-to-sort. Each feature is guarded by a bound-flag object so listeners are attached only once per table. Render call order matters:

```
applyTableColumnOrder → applyTableColumnWidths → _updateSortIndicators
→ bindTableColumnDrag → bindTableColumnResize → bindTableColumnSort
```

Key methods:
- `_resolveTable(sel)` — resolves a CSS class name (hyphenated) or element ID (camelCase/`#id`) to a DOM element
- `applyTableColumnOrder(sel, storageKey, colCount)` — reorders `th`/`td[data-col]` by saved index array
- `bindTableColumnDrag(sel, storageKey, colCount)` — guarded by `_tableDragBound[sel]`
- `applyTableColumnWidths(sel, widthsKey, colCount)` — applies persisted `px` widths to `th`
- `bindTableColumnResize(sel, widthsKey, colCount)` — guarded by `_tableResizeBound[sel]`
- `_applyTableSort(tableId, items, colFieldMap, sortKeys)` — sorts per `_tableSort[tableId]`
- `bindTableColumnSort(tableId, rerenderFn)` — guarded by `_tableSortBound[tableId]`

Table IDs: `tasks-table`, `resources-table`, `risks-table`, `communication-table`, `issuesTable`, `decisionsTable`, `actionsTable`. All use `table-layout: fixed` (required for resize). Columns that should participate in reorder/resize must have a `data-col` attribute; the Actions column must not.

### Tasks Module Extras
- `Tasks.addWithNumber(task, taskNumber)` — used by CSV import to preserve the original `T-NNN` number and advance `TASK_SEQ` if needed
- `Tasks.getByTaskNumber(taskNumber)` — look up by `T-NNN` label
- Mass-selection state lives in `App._massSelected` (a `Set` of task IDs); cleared whenever leaving the tasks view

### Other Data Modules
`js/tasks.js` also exports: `Resources`, `Risks`, `Rollback`, `GoNoGo`, `Communications`, `Issues`, `Decisions`, `Actions`, `Categories`, `Statuses`. `Categories` and `Statuses` are per-project configurable lists used to populate dropdowns.
