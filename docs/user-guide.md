# Project Planner — User Guide

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [Project Management](#3-project-management)
4. [Dashboard](#4-dashboard)
5. [Tasks](#5-tasks)
6. [Timeline](#6-timeline)
7. [Resources](#7-resources)
8. [Risks](#8-risks)
9. [Rollback Plan](#9-rollback-plan)
10. [Go/No-Go](#10-gonogo)
11. [Communications](#11-communications)
12. [Issues](#12-issues)
13. [Decisions](#13-decisions)
14. [Actions](#14-actions)
15. [Reports](#15-reports)
16. [Project Settings](#16-project-settings)
17. [Data Import & Export](#17-data-import--export)
18. [Reference](#18-reference)

---

## 1. Overview

**Project Planner** is a browser-based tool for managing complex project cutovers and migrations. All data is stored locally in your browser — no server or login required.

### Key capabilities

| Area | What you can do |
|---|---|
| Planning | Manage tasks with dependencies, durations, and milestones |
| Tracking | Track actual start/end versus planned dates in real time |
| Risk | Log risks, mitigations, owners, and status history |
| Decisions | Record decisions with context, options, and outcomes |
| Issues | Track issues with categories, priority, and resolution |
| Actions | Assign action items with due dates and linked items |
| Rollback | Document rollback steps, triggers, and the point of no return |
| Go/No-Go | Capture readiness criteria across 4 categories |
| Communications | Schedule and track stakeholder communications |
| Reports | Generate 12 report types, print or export to PDF |
| Multi-project | Run multiple independent projects simultaneously |
| Export | Full JSON backup or targeted CSV per data type |

---

## 2. Getting Started

### Opening the tool

Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari). No installation needed.

### First-time setup

When you open the tool for the first time, a blank project called **My Project** is created automatically.

**Recommended first steps:**

1. Click ⚙️ **Settings** (top right of the header) to set your project name, cut-over date, and timezone.
2. Go to **Resources** and add your team members before creating tasks — this lets you assign owners straight away.
3. Go to **Tasks** and start building your task list.

### Interface layout

```
┌─────────────────────────────────────────────────────────────┐
│  ☰  🚀 Project Planner  │  [Project ▾]  │  ⚙️  🌙  Export  │
├─────────────┬───────────────────────────────────────────────┤
│             │                                               │
│  Sidebar    │  Main content area                            │
│  nav menu   │  (changes per selected view)                  │
│             │                                               │
│  📤 Export  │                                               │
│  📥 Import  │                                               │
└─────────────┴───────────────────────────────────────────────┘
```

- **☰ Sidebar toggle** — collapse or expand the left navigation panel.
- **Project switcher** — switch between projects or create new ones.
- **⚙️ Settings** — project name, cut-over date, timezone, categories, issue categories.
- **🌙 Dark Mode** — toggle light/dark theme (persists globally across projects).
- **Countdown** — live timer counting down to the cut-over date/time.

---

## 3. Project Management

### Multiple projects

Project Planner supports multiple independent projects. Each project has its own tasks, resources, risks, issues, decisions, actions, communications, rollback plan, go/no-go criteria, categories, and settings. The **theme** and **sidebar state** are shared globally.

### Switching projects

Click the **project name button** in the header to open the project switcher dropdown. Click any project name to switch to it. The app reloads with that project's data immediately — no page refresh needed.

### Creating a new project

1. Click the **project name button** in the header.
2. Click **+ New Project**.
3. Enter a project name (required), description (optional), and cut-over date (optional).
4. Click **Save New Project**.

New projects start blank with default categories and statuses.

### Deleting a project

Open **Settings** (⚙️) and click **Delete Project** in the modal footer. You will be asked to confirm. The project and all its data are permanently deleted. You cannot delete the only remaining project — create a new one first.

> **Note:** You can also delete a project from the project switcher dropdown by clicking the **✕** next to its name.

### Legacy data migration

If you were using the tool before multi-project support was added, your existing data is automatically migrated to a project called **Migrated Project** the first time you open the updated version.

---

## 4. Dashboard

The Dashboard is the home screen for each project. It provides an at-a-glance summary of project health.

### What you see

| Section | Description |
|---|---|
| **Summary stats** | Total tasks, completed, in-progress, blocked, open risks, go/no-go status |
| **Overall progress** | Percentage bar across all tasks |
| **Category progress** | Completion percentage per task category |
| **Risk level** | Count of high, medium, and low risks |
| **Upcoming tasks** | Next 5 critical or high-priority tasks sorted by start date |
| **Countdown** | Live countdown to cut-over date (days, hours, minutes, seconds) |

---

## 5. Tasks

The Tasks view is the central planning register. Each task has planned and actual dates, dependencies, status history, and more.

### Task fields

| Field | Required | Description |
|---|---|---|
| Task Name | Yes | Short, descriptive name |
| Category | Yes | Used for grouping and colour-coding |
| Priority | Yes | critical / high / medium / low |
| Depends On | No | Predecessor tasks (hold Ctrl/Cmd to select multiple) |
| Start Date & Time | Yes | Planned start in project timezone |
| Duration | No | Format: `HH:MM:SS`. Auto-calculates End Date when entered |
| End Date & Time | Yes | Planned end in project timezone |
| Assignee | No | Team member from Resources list |
| Description | No | Free-text detail |
| Status | No | Selected from configured statuses |
| Milestone | No | Marks the task as a milestone (shown with 🔹) |

> **Auto-assigned:** Task ID (T-001, T-002, …) is assigned automatically on save.

### Actual dates (auto-populated)

| Event | What happens |
|---|---|
| Status changes to **In Progress** | **Actual Start** is set to the current date/time (only on first transition — never overwritten) |
| Status changes to **Completed** | **Actual End** is set to the current date/time |

Actual Start and Actual End appear as read-only fields in the task modal as soon as they have a value. They also populate immediately in the task list without needing to refresh the page.

### Status history

Every status change is recorded with a timestamp. Open any task to see the full history panel at the bottom of the modal, showing each status, when it was entered, and how long the task spent in that state.

### Dependency management

**Snap to Dependency:**
Select one or more predecessor tasks in the *Depends On* field, then click the **⛓ Snap to Dependency** button. The start date is automatically set to 1 second after the latest predecessor's end date. If a duration is set, the end date is recalculated.

**Recalculate Dates:**
The **Recalculate Dates** button (in the Tasks view toolbar) re-snaps the start dates of *all* tasks with dependencies in topological order — useful after rescheduling predecessors.

### Column visibility

Click the **⊞ Columns** button to show or hide specific columns. Visibility is saved per project. The 12 available columns are:

Task ID · Status · Task Name · Category · Priority · Assignee · Start Date · End Date · Duration · Dependencies · Actual Start · Actual End

### Filtering

Use the filter bar to narrow the task list:

- **Category** — filter by task category
- **Status** — filter by task status
- **Priority** — critical / high / medium / low
- **Assignee** — filter to a specific team member

### Quick status update

Change a task's status directly from the task list using the inline status dropdown — no need to open the modal. Actual dates update immediately in the row and in any open modal for that task.

---

## 6. Timeline

The Timeline view renders tasks as a Gantt-style chart.

- Tasks are shown as horizontal bars, colour-coded by status.
- Milestones appear as diamond markers.
- Use the **−** and **+** zoom buttons to compress or expand the time axis.
- Dependencies are shown visually between tasks.

---

## 7. Resources

Resources are the team members who can be assigned to tasks, risks, issues, decisions, actions, communications, and rollback steps.

### Resource fields

| Field | Required | Description |
|---|---|---|
| Name | Yes | Full name |
| Role | Yes | Job title or role (e.g. Technical Lead) |
| Email | No | Contact email address |
| Phone | No | Contact phone number |
| Availability | No | available / partially / unavailable |
| Status | No | **active** (default) or **inactive** |
| Notes | No | Free-text notes |

### Active vs. inactive resources

Setting a resource to **Inactive** removes them from all assignee dropdown menus, preventing new assignments. Existing assignments are preserved and still display the resource's name. To re-enable a resource, edit them and set Status back to **Active**.

### Assigned tasks

The **Assigned Tasks** column shows a count of tasks currently assigned to each resource. Click a resource row to edit their details.

---

## 8. Risks

The Risk Register tracks project risks, their severity, and mitigation actions.

### Risk fields

| Field | Required | Description |
|---|---|---|
| Risk Description | Yes | Clear description of the risk |
| Severity | Yes | high / medium / low |
| Probability | Yes | high / medium / low |
| Impact Description | No | What would happen if the risk materialises |
| Mitigation Plan | Yes | Steps to reduce or remove the risk |
| Risk Owner | No | Team member responsible for monitoring |
| Status | No | open (default) / mitigated / closed |

### Status history

Every status change is tracked automatically. Open a risk to see the full status history panel — each status, when it was entered, and how long the risk was in that state.

### Filtering

Filter risks by **Severity** (high / medium / low) and **Status** (open / mitigated / closed) using the filter bar above the table.

---

## 9. Rollback Plan

The Rollback Plan documents the procedure for reverting the cut-over if things go wrong.

### Configuration

- **Rollback Trigger Criteria** — describe the conditions that would trigger a rollback (e.g. system unavailable, critical errors exceeding threshold).
- **Point of No Return** — set the date and time after which a rollback is no longer feasible. This is displayed prominently in the Rollback Plan report.

### Rollback steps

Each step has:

| Field | Required | Description |
|---|---|---|
| Step Order | Yes | Sequence number (steps are sorted automatically) |
| Step Title | Yes | Short name for the step |
| Description | Yes | Detailed instructions |
| Responsible Person | No | Team member executing the step |
| Estimated Duration | No | Duration in minutes |
| Additional Notes | No | Any caveats or conditional instructions |

The total estimated rollback duration is calculated automatically from all step durations.

---

## 10. Go/No-Go

The Go/No-Go view manages the readiness checklist used to make the final decision to proceed (or not) with the cut-over.

### Structure

Criteria are organised into four categories:

| Category | Purpose |
|---|---|
| Technical Readiness | Systems, infrastructure, integrations |
| Business Readiness | Process, data, sign-offs |
| Operational Readiness | Support, monitoring, runbook |
| Resource Readiness | Team availability, on-call rosters |

### Adding criteria

Click **+ Add Criteria** within any category. Type the criterion text and press Enter or click Add.

### Setting criterion status

Each criterion has three status buttons:

| Button | Status | Meaning |
|---|---|---|
| ✅ | GO | Criterion is met |
| ❌ | NO-GO | Criterion is not met — blocks go-live |
| ⏳ | PENDING | Not yet assessed |

### Overall decision

The overall decision is calculated automatically:

- If **any** criterion is marked **NO-GO** → overall is **NO-GO**
- Else if **any** criterion is **PENDING** → overall is **PENDING**
- Else if all criteria are **GO** → overall is **GO**

### Finalising the decision

Click **Finalize Decision** to lock the decision with a timestamp. The finalised decision and timestamp appear in the Go/No-Go report.

---

## 11. Communications

The Communications plan schedules stakeholder notifications before, during, and after the cut-over.

### Communication fields

| Field | Required | Description |
|---|---|---|
| Timing | Yes | Date and time the communication should go out |
| Audience | Yes | Target recipients (e.g. "All staff", "IT team") |
| Message Type | Yes | announcement / reminder / status-update / go-live / issue-alert / completion |
| Channel | Yes | email / slack / teams / sms / phone / meeting |
| Owner | No | Person responsible for sending it |
| Message Template | No | Draft message content |
| Status | No | pending (default) / sent / cancelled |

### Marking as sent

Click the **📤** icon on any communication row to instantly change its status to **sent**.

### Viewing a template

If a message template has been written, a **View** button appears in the row. Click it to see the full template text.

---

## 12. Issues

The Issues tracker captures problems that arise during the project. Unlike risks (potential problems), issues are things that have already occurred.

### Issue fields

| Field | Required | Description |
|---|---|---|
| Title | Yes | Short description |
| Description | No | Detailed description |
| Category | Yes | Drawn from configurable Issue Categories |
| Priority | Yes | critical / high / medium / low |
| Status | Yes | open (default) / in-progress / blocked / resolved / closed |
| Owner | No | Team member responsible for resolving |
| Resolution | No | How the issue was resolved (fill in when closing) |

> **Issue IDs** are assigned automatically (I-001, I-002, …).

### Status history

All status changes are recorded automatically. The **Time in Status** column shows how long the issue has been in its current state. Blocked issues are highlighted in red.

### Category filter

Use the **Category** filter in the filter bar to view issues of a specific type. Issue categories are fully configurable in **Project Settings** (see [Section 16](#16-project-settings)).

### Filtering

Filter by **Status**, **Priority**, and **Category** using the filter bar above the table.

---

## 13. Decisions

The Decision Log records key project decisions — what was decided, by whom, why, and what alternatives were considered.

### Decision fields

| Field | Required | Description |
|---|---|---|
| Title | Yes | Short description of the decision |
| Description/Context | No | Background information |
| Options Considered | No | Alternatives that were evaluated |
| Decision Made | No | What was actually decided |
| Status | Yes | pending (default) / approved / rejected / deferred |
| Decided By | No | Resource who made or authorised the decision |
| Impact | No | Downstream effects of the decision |

> **Decision IDs** are assigned automatically (D-001, D-002, …).

### Status history

All status changes are tracked with timestamps and duration. Filter by status using the filter bar.

---

## 14. Actions

Actions are discrete work items that need to be completed, often arising from issues, decisions, or risks.

### Action fields

| Field | Required | Description |
|---|---|---|
| Title | Yes | Short description |
| Description | No | Detailed description |
| Priority | Yes | critical / high / medium / low |
| Status | Yes | open (default) / in-progress / completed |
| Owner | No | Team member responsible |
| Due Date | No | Deadline for completion |
| Linked Item | No | Reference to a related task, issue, or risk (e.g. `T-010`, `I-003`) |
| Notes | No | Additional context |

> **Action IDs** are assigned automatically (A-001, A-002, …).

### Filtering

Filter by **Status** and **Priority** using the filter bar. Overdue open/in-progress actions are highlighted in the table.

---

## 15. Reports

The Reports view provides 12 printable report types. Each report is generated from live project data at the time you click **Generate Report**.

### Available reports

| Report | Description |
|---|---|
| **Cut-Over Task List** | Printable checklist of all tasks, grouped by category, with status checkboxes |
| **Timeline Report** | Key dates, milestones, and task schedule table |
| **Resource Assignment Matrix** | Team members with contact details and their assigned tasks |
| **Go/No-Go Checklist** | Full readiness criteria by category with overall decision |
| **Rollback Plan** | Trigger criteria, point of no return, and ordered rollback steps |
| **Risk Assessment** | Full risk register with descriptions, mitigations, and owners |
| **Communication Plan** | All scheduled communications sorted by timing |
| **Issues Register** | All issues with status, owner, and resolution notes |
| **Decision Log** | All decisions with context, options, outcome, and approvals |
| **Actions Register** | All actions with priority, owner, due date, and linked items |
| **Status Dashboard** | Executive summary of task completion, risks, go/no-go status, and key dates |
| **Task Performance Report** | Actual vs planned start, end, and duration for every task |

### Task Performance Report

This report is specifically designed for post-cut-over review. For each task it shows:

- **Planned Start** and **Actual Start** with start variance (early/on-time/late)
- **Planned End** and **Actual End** with end variance
- **Planned Duration** and **Actual Duration** with duration variance
- Summary stats: tasks started, completed, finished early, on time, late
- Average planned duration vs average actual duration

Variances are colour-coded: **green** for early or on time, **red** for late.

### Printing and PDF export

Click **🖨️ Print Report** in the report modal footer to open the browser print dialog. Select **Save as PDF** in the destination to save a PDF copy.

---

## 16. Project Settings

Open Settings by clicking the **⚙️** button in the header.

### Project information

| Field | Required | Description |
|---|---|---|
| Project Name | Yes | Shown in the header and all reports |
| Cut-Over Date & Time | Yes | Used for the countdown timer and timeline |
| Timezone | Yes | All dates/times are displayed in this timezone |
| Project Description | No | Free-text description of the project |

### Task categories

Categories group tasks and provide colour-coded badges across all views and reports. Each category has a **name** and a **colour**.

- **Add** — type a name, pick a colour, click **+ Add**
- **Rename** — click the name field and type; change is saved when you click away
- **Recolour** — click the colour swatch; change is saved automatically
- **Delete** — click 🗑️ (tasks referencing the category retain the old slug)

**Default task categories:**

| Name | Colour |
|---|---|
| Pre-Cutover | Purple |
| During Cutover | Orange |
| Post-Cutover | Green |
| Validation | Cyan |

### Issue categories

Issue categories work identically to task categories but apply only to the Issues view and Issues report. They are configured separately so issue types can differ from task types.

**Default issue categories:**

| Name | Colour |
|---|---|
| Technical | Purple |
| Data | Orange |
| Integration | Cyan |
| Security | Red |
| Operational | Green |
| Resource | Amber |
| Other | Grey |

### Danger zone

| Button | Action |
|---|---|
| **Reset All Data** | Clears all data for the current project and re-seeds defaults. Requires confirmation. |
| **Delete Project** | Permanently deletes the current project and all its data. Requires confirmation. Cannot be used if this is the only project. |

---

## 17. Data Import & Export

### Export to JSON

Click **📤 Export JSON** in the sidebar footer. A full snapshot of the active project is downloaded as a `.json` file. Filename format: `[project-name]-[YYYY-MM-DD].json`.

Use this for:
- Backing up a project
- Sharing a project with another user
- Archiving a completed project

### Import from JSON

Click **📥 Import** and select a previously exported `.json` file. The import:

- Loads all data into the currently active project
- Backfills missing task numbers sequentially
- Re-snaps dependent task start dates to dependency end + 1 second
- Auto-calculates missing durations from start/end dates
- Updates the project name in the registry from the imported file

> **Warning:** Import overwrites the current project's data. Export first if you need to keep it.

### Export to CSV

Click **📊 Export CSV ▾** to open the CSV submenu. Choose the data type to export:

| Option | Columns exported |
|---|---|
| **Tasks** | Task ID, Name, Category, Priority, Status, Assignee, Planned Start/End, Planned Duration, Actual Start/End, Actual Duration, Milestone, Description, Dependencies |
| **Resources** | Name, Role, Email, Phone, Availability, Status, Notes, Assigned Tasks |
| **Risks** | ID, Description, Severity, Probability, Impact, Mitigation, Owner, Status, Created |
| **Issues** | ID, Title, Category, Priority, Status, Owner, Raised Date, Due Date, Resolution, Description |
| **Decisions** | ID, Title, Status, Decided By, Impact, Options, Outcome, Created Date, Decided Date, Description |
| **Actions** | ID, Title, Priority, Status, Owner, Due Date, Linked Item, Notes, Description |
| **Communications** | Timing, Audience, Type, Channel, Owner, Status, Template/Message |

CSV files are UTF-8 encoded with a BOM for correct display in Microsoft Excel. Filename format: `[project-name]-[type]-[YYYY-MM-DD].csv`.

---

## 18. Reference

### Task statuses (fixed)

| Status | Meaning |
|---|---|
| Not Started | Work has not begun |
| In Progress | Work is underway — sets Actual Start automatically |
| Completed | Work is done — sets Actual End automatically |
| Blocked | Work cannot continue due to a dependency or issue |

### Priority levels

| Level | Use for |
|---|---|
| Critical | Must not slip — cut-over depends on it |
| High | Important, limited tolerance for delay |
| Medium | Standard tasks |
| Low | Nice-to-have or buffer tasks |

### Date & time format

All dates and times are displayed in the project timezone in **24-hour format**: `DD/MM/YYYY HH:MM:SS`

### Duration format

Durations are entered and displayed as `HH:MM:SS` (hours:minutes:seconds). Example: `02:30:00` = 2 hours 30 minutes.

### ID formats

| Type | Format | Example |
|---|---|---|
| Task | T-NNN | T-001 |
| Issue | I-NNN | I-007 |
| Decision | D-NNN | D-003 |
| Action | A-NNN | A-012 |
| Risk | R-NNN | R-002 |

### Data storage

All data is stored in your browser's `localStorage`. It is **not** synced to a server or shared with other browsers or users. To transfer data between machines, use **Export JSON** and **Import**.

Clearing your browser's site data will permanently delete all projects. Export regularly to keep backups.

### Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Multi-select dependencies | Hold **Ctrl** (Windows/Linux) or **Cmd** (Mac) while clicking |
| Close any modal | Click **Cancel** or **✕** |

---

*Project Planner — User Guide*
