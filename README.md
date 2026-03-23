# Cut Over Planning Tool - User Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Tasks Management](#tasks-management)
5. [Kanban Board](#kanban-board)
6. [Timeline View](#timeline-view)
7. [Resources](#resources)
8. [Risk Management](#risk-management)
9. [Issues, Decisions & Actions (IDA)](#issues-decisions--actions-ida)
10. [Rollback Plan](#rollback-plan)
11. [Go/No-Go Checklist](#gono-go-checklist)
12. [Communication Plan](#communication-plan)
13. [Tags](#tags)
14. [Cross-Entity Linking](#cross-entity-linking)
15. [Reports](#reports)
16. [Firebase Multi-User Sync](#firebase-multi-user-sync)
17. [Settings & Data Management](#settings--data-management)
18. [Tips & Best Practices](#tips--best-practices)

---

## Overview

The **Cut Over Planning Tool** is a comprehensive web-based application designed to help software project teams plan, track, and execute system cutover activities. Whether you're migrating to a new system, deploying a major release, or performing a significant infrastructure change, this tool provides all the features needed to ensure a successful transition.

### Key Features
- **Dashboard** - Real-time overview with progress, IDA summaries, remaining effort, and activity feed
- **Task Management** - Track activities with categories, priorities, dependencies, and clickable status badges
- **Kanban Board** - Drag-and-drop task cards between status columns
- **Timeline View** - Visual Gantt-style chart of all tasks
- **Resource Management** - Assign team members and track availability
- **Risk Register** - Identify, assess, and mitigate risks
- **Issues, Decisions & Actions** - Full IDA tracking with status history
- **Tags** - Color-coded labels across all entity types
- **Cross-Entity Linking** - Connect Issues/Risks/Decisions/Actions to Tasks
- **Rollback Plan** - Document rollback procedures
- **Go/No-Go Checklist** - Structured decision-making framework
- **Communication Plan** - Manage stakeholder notifications
- **Reports** - Generate printable reports with CSV export
- **Firebase Sync** - Real-time multi-user collaboration via Firestore
- **Multi-Project Support** - Manage multiple cutover projects independently

---

## Getting Started

### Opening the Tool
1. Open the `index.html` file in a modern web browser (Chrome, Firefox, Safari, Edge)
2. The application loads with sample data for demonstration purposes
3. No install, no build step, no server required

### First Steps
1. Click the **Settings** button in the top-right corner
2. Update the **Project Name** to match your project
3. Set the **Cut Over Date & Time** for your planned cutover
4. Configure **Categories**, **Statuses**, **Issue Categories**, and **Tags** as needed
5. Click **Save Settings**

### Multi-Project Support
- Click the project name in the header to open the project switcher
- Create new projects, switch between projects, or duplicate an existing project
- Each project has fully isolated data (tasks, resources, settings, etc.)

---

## Dashboard

The Dashboard provides an at-a-glance view of your cutover status.

### Statistics Cards
| Card | Description |
|------|-------------|
| **Total Tasks** | Total number of cutover tasks |
| **Completed** | Tasks marked as completed |
| **In Progress** | Tasks currently being worked on |
| **Blocked** | Tasks that cannot proceed |
| **Open Risks** | Number of unresolved risks |
| **Go/No-Go** | Current decision status |
| **Remaining Effort** | Total duration of incomplete tasks (click to toggle minutes/hours/days) |

### Progress Section
- **Overall Progress Bar** - Percentage of completed tasks
- **Category Breakdown** - Progress by category (e.g., Pre-Cutover, During, Post-Cutover, Validation)

### IDA Summary Cards
Three cards showing status distribution for Issues, Decisions, and Actions with proportional colored bars.

### Countdown Timer
The countdown timer in the header shows the time remaining until your scheduled cutover date.

### Risk Summary
Visual bar chart showing the distribution of risks by severity (High, Medium, Low).

### Upcoming Critical Tasks
List of the next 5 critical tasks that need attention.

### Recent Activity
Live feed of recent actions (task updates, settings changes, status transitions, etc.).

---

## Tasks Management

### Viewing Tasks
Navigate to **Tasks** in the sidebar. Two view modes are available:
- **List View** (default) - Traditional table with sortable, resizable, reorderable columns
- **Kanban View** - Card-based board grouped by status (see [Kanban Board](#kanban-board))

Toggle between views using the **List/Kanban** buttons in the task header.

### Task Columns
| Column | Description |
|--------|-------------|
| **Task ID** | Auto-generated identifier (T-001, T-002, etc.) |
| **Status** | Clickable colored badge — click to cycle, right-click to reset to Not Started |
| **Task Name** | Name of the task (with tag badges if tagged) |
| **Category** | Color-coded category badge |
| **Priority** | Critical, High, Medium, or Low |
| **Assignee** | Team member responsible |
| **Start Date** | Planned start date |
| **End Date** | Planned end date |
| **Duration** | Calculated duration (HH:MM:SS) |
| **Dependencies** | Dependent task IDs |
| **Actual Start/End** | Auto-populated when status changes |

### Filtering Tasks
Use the multi-select dropdown filters at the top to filter by:
- **Category** - Filter by one or more categories
- **Status** - Filter by one or more statuses
- **Priority** - Filter by one or more priority levels
- **Assignee** - Filter by one or more team members (or Unassigned)
- **Tags** - Filter by one or more tags

### Column Visibility
Click the **Columns** button to show/hide specific columns.

### Adding a New Task
1. Click **+ Add Task** button
2. Fill in the required fields (Task Name, Category, Start/End dates)
3. Optional fields: Assignee, Dependencies, Description, Milestone, Tags
4. Click **Save Task**

### Status Badge Interaction
- **Left-click** the status badge to cycle through statuses (Not Started -> In Progress -> Completed -> Blocked -> ...)
- **Right-click** the status badge to reset to Not Started

### Mass Edit
Select multiple tasks via checkboxes, then use the mass action bar to update status, category, priority, or assignee for all selected tasks at once.

### Table Features
All tables in the app support:
- **Click-to-sort** any column header (ascending/descending)
- **Drag-to-reorder** columns
- **Resize** columns by dragging the column border
- Column order and widths are saved per project

---

## Kanban Board

The Kanban board provides a visual, drag-and-drop interface for managing task statuses.

### Accessing Kanban View
Click the **Kanban** toggle button in the Tasks view header.

### Board Layout
- One **column per status** (Not Started, In Progress, Completed, Blocked, plus any custom statuses)
- Column headers are color-coded to match status colors
- Each column shows a count of tasks

### Task Cards
Each card displays:
- Task number (T-NNN)
- Task name
- Priority badge (color-coded left border)
- Assignee name
- Tag badges

### Drag and Drop
- **Drag** a card from one column to another to change its status
- Status changes trigger the same logic as the list view (auto-set actual dates, auto-progress successors)
- **Click** a card to open the full task edit modal

### Filters
The same filters (Category, Status, Priority, Assignee, Tags) apply to both List and Kanban views.

---

## Timeline View

The Timeline provides a visual Gantt chart representation of all tasks.

### Navigation
- Use **-** and **+** buttons to zoom in/out (Day, Week, Month views)
- Scroll horizontally to navigate through time

### Visual Elements
| Element | Description |
|---------|-------------|
| **Colored bars** | Tasks colored by category |
| **Pink circles** | Milestones |
| **Red line** | Today's date |
| **Blue line** | Cutover date |

---

## Resources

### Managing Team Members
Navigate to **Resources** in the sidebar to manage your cutover team.

### Resource Fields
| Field | Description |
|-------|-------------|
| **Name** | Team member's name |
| **Role** | Job title or role |
| **Email** | Contact email |
| **Phone** | Contact phone number |
| **Status** | Active or Inactive (inactive resources are hidden from assignee dropdowns) |
| **Availability** | Available, Partially Available, or Unavailable |
| **Assigned Tasks** | Count of tasks assigned |

---

## Risk Management

### Risk Register
Navigate to **Risks** in the sidebar.

### Risk Fields
| Field | Description |
|-------|-------------|
| **ID** | Auto-generated (R-001, R-002, etc.) |
| **Description** | What is the risk? |
| **Severity** | High, Medium, or Low |
| **Probability** | Likelihood of occurrence |
| **Impact** | What happens if it occurs? |
| **Mitigation Plan** | How to reduce/eliminate the risk |
| **Owner** | Person responsible |
| **Status** | Open, Mitigated, or Closed |
| **Linked Task** | Optional link to a related task |
| **Tags** | Color-coded labels |
| **Time in Status** | Duration in current status |

### Status History
Each risk tracks a full status history with timestamps and durations, visible in the edit modal.

---

## Issues, Decisions & Actions (IDA)

### Issues
Navigate to **Issues** in the sidebar. Track problems and blockers.

| Field | Description |
|-------|-------------|
| **Title** | Issue description |
| **Category** | Configurable issue categories |
| **Priority** | Critical, High, Medium, Low |
| **Status** | Open, In Progress, Blocked, Resolved, Closed |
| **Owner** | Person responsible |
| **Due Date** | Resolution deadline |
| **Resolution** | How it was resolved |
| **Linked Task** | Optional link to a related task |
| **Tags** | Color-coded labels |

### Decisions
Navigate to **Decisions** in the sidebar. Track key decisions.

| Field | Description |
|-------|-------------|
| **Title** | Decision topic |
| **Status** | Pending, Approved, Rejected, Deferred |
| **Decided By** | Decision maker |
| **Decision Made** | What was decided |
| **Options Considered** | Alternatives evaluated |
| **Impact** | Impact of the decision |
| **Linked Task** | Optional link to a related task |
| **Tags** | Color-coded labels |

### Actions
Navigate to **Actions** in the sidebar. Track action items.

| Field | Description |
|-------|-------------|
| **Title** | Action description |
| **Priority** | Critical, High, Medium, Low |
| **Status** | Open, In Progress, Completed |
| **Owner** | Person responsible |
| **Due Date** | Deadline |
| **Linked Item** | Free-text reference |
| **Linked Task** | Optional link to a related task |
| **Tags** | Color-coded labels |

### Status History
All IDA items track full status history with timestamps and time-in-status durations.

---

## Rollback Plan

Navigate to **Rollback Plan** in the sidebar to document rollback procedures.

### Key Components
- **Rollback Trigger Criteria** - Conditions that would trigger a rollback
- **Point of No Return** - Date/time after which rollback may not be possible
- **Rollback Steps** - Ordered steps with title, description, owner, estimated duration, and notes

---

## Go/No-Go Checklist

Navigate to **Go/No-Go** in the sidebar.

### Categories
| Category | Examples |
|----------|----------|
| **Technical Readiness** | All systems tested, backups completed |
| **Business Readiness** | Users trained, processes documented |
| **Operational Readiness** | Monitoring in place, runbooks completed |
| **Resource Readiness** | All team members available |

### Decision Logic
- Any **NO-GO** -> Decision is **NO-GO**
- Any **PENDING** (with no NO-GO) -> Decision is **PENDING**
- All **GO** -> Decision is **GO**

---

## Communication Plan

Navigate to **Communication** in the sidebar.

| Field | Description |
|-------|-------------|
| **Timing** | When to send |
| **Audience** | Recipients |
| **Type** | Announcement, Reminder, Status Update, etc. |
| **Channel** | Email, Slack/Teams, SMS, Phone, Meeting |
| **Owner** | Person responsible |
| **Status** | Pending, Sent, Cancelled |
| **Template** | Pre-written message content |

---

## Tags

Tags are color-coded labels that can be applied to Tasks, Issues, Decisions, Actions, and Risks.

### Managing Tags
1. Go to **Settings** > **Tags** section
2. Enter a tag name and pick a color
3. Click **+ Add** to create the tag
4. Edit tag names or colors inline; delete with the trash icon

### Using Tags
- In any entity's edit modal, check/uncheck tags in the **Tags** checkbox area
- Tags appear as small colored badges below the name/title in table views
- Use the **Tags** multi-select filter in each view to filter by tags
- Tags are included in CSV and JSON exports/imports
- Tags appear in all report tables

---

## Cross-Entity Linking

Issues, Decisions, Actions, and Risks can be optionally linked to a Task for bidirectional navigation.

### Linking an Item to a Task
1. Open the Issue/Decision/Action/Risk modal
2. Select a task from the **Linked Task** dropdown
3. Save the item

### Navigation
- In Issue/Decision/Action/Risk table views, linked items show a clickable **T-NNN** badge. Click it to open the linked task.
- In the Task modal, a **Linked Items** section shows all Issues/Decisions/Actions/Risks that reference this task. Click any item to open its modal.

### Export/Import
- CSV exports include a **Linked Task** column with the task number
- CSV imports resolve task references by T-NNN number
- JSON export/import preserves links automatically

---

## Reports

Navigate to **Reports** in the sidebar.

### Available Reports
| Report | Description |
|--------|-------------|
| **Cut Over Task List** | Complete checklist of all tasks |
| **Timeline Report** | Visual timeline with milestones |
| **Resource Assignment Matrix** | Who is responsible for what |
| **Go/No-Go Checklist** | All decision criteria |
| **Rollback Plan** | Complete rollback procedures |
| **Risk Assessment** | All risks with severity, mitigation, and tags |
| **Communication Plan** | Stakeholder notification schedule |
| **Status Dashboard** | Executive summary of readiness |
| **Issues Register** | All issues with category, status, and tags |
| **Decision Log** | All decisions with status and tags |
| **Actions Register** | All actions with status and tags |

### Report Features
- Click **Generate Report** on any report card
- Click **Print Report** to print or save as PDF
- Click **Export CSV** to download report data as CSV
- All reports include Tags and Linked Task columns where applicable

---

## Firebase Multi-User Sync

The tool supports real-time multi-user collaboration via **Google Firebase Firestore**. This is optional — the app works fully offline with localStorage if Firebase is not configured.

### Prerequisites
1. A Firebase project with **Firestore** and **Authentication** enabled
2. Enable **Email/Password** and optionally **Google** sign-in providers in Firebase Console > Authentication > Sign-in method

### Firestore Security Rules
In Firebase Console > Firestore Database > Rules, set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }
    match /projectRegistry/{docId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Connecting Firebase
1. Open **Settings** > **Firebase Connection**
2. Enter your Firebase config (API Key, Project ID, Auth Domain, Storage Bucket, Messaging Sender ID, App ID)
3. Click **Save & Connect**
4. Sign in with email/password or Google
5. Once signed in, your data syncs automatically

### Sync Behavior
- **First setup (no cloud data):** Local data is pushed to Firestore automatically
- **Existing cloud data:** Cloud project list and data are pulled to the local browser on sign-in
- **Real-time sync:** Any change (task edit, status update, etc.) is synced to Firestore within 300ms. Other users with the same project open see changes automatically.
- **Offline:** Changes are queued locally and synced when connectivity returns (Firestore offline persistence)

### Manual Sync Controls
| Button | Action |
|--------|--------|
| **Push All Data to Cloud** | Uploads all local data to Firestore (overwrites cloud) |
| **Pull Data from Cloud** | Downloads all cloud data to local browser (overwrites local) |

### Sync Status Badge
The header shows a sync status indicator:
- **Local** (gray dot) - Firebase not configured or not signed in
- **Synced** (green dot) - Connected and synchronized
- **Syncing** (amber pulsing dot) - Data transfer in progress

### Security
- Firebase credentials are stored in **localStorage only** — never committed to source code
- All Firestore reads/writes require authentication (enforced by security rules)
- No API keys or secrets exist in the codebase

---

## Settings & Data Management

### Project Settings
Click **Settings** in the header to access:
- **Project Name**, **Description**, **Cut Over Date**
- **Timezone** - Affects display only; all dates stored as UTC
- **Edit Lock** - Prevent accidental changes (read-only mode)
- **Auto-Progress** - Automatically move successor tasks to In Progress when dependencies complete

### Configurable Lists
| List | Purpose |
|------|---------|
| **Categories** | Task categories with colors (e.g., Pre-Cutover, During, Post-Cutover) |
| **Statuses** | Task statuses with colors (e.g., Not Started, In Progress, Completed, Blocked) |
| **Issue Categories** | Issue classification (e.g., Technical, Data, Integration) |
| **Tags** | Cross-entity labels with colors |

### Theme
Click **Dark Mode** in the sidebar footer to switch between light and dark themes.

### Export / Import (JSON)
| Action | Description |
|--------|-------------|
| **Export JSON** | Downloads all project data as a `.json` file |
| **Import JSON** | Loads a `.json` file into the active project |

### Export / Import (CSV)
Each view (Tasks, Resources, Risks, Issues, Decisions, Actions, Communications) has:
- **Export CSV** - Downloads that view's data as a CSV file
- **Import CSV** - Imports data from a CSV file (auto-creates unknown categories, resources, tags)

---

## Tips & Best Practices

### Before Cutover
1. Ensure all Pre-Cutover tasks are completed
2. Verify all resources are confirmed and available
3. Review and mitigate all high-severity risks
4. Complete Go/No-Go checklist
5. Send pre-cutover communications
6. Print reports for offline reference

### During Cutover
1. Work through tasks in priority order
2. Use the Kanban board for real-time status tracking
3. Click status badges to quickly cycle task status
4. Send status updates per communication plan
5. Log issues immediately using the Issues view
6. Monitor Go/No-Go status continuously

### After Cutover
1. Complete all validation tasks
2. Send completion notices
3. Resolve all open issues and actions
4. Export final data for records
5. Document lessons learned

### Data Safety
- If using Firebase sync, your data is backed up in real-time to the cloud
- If using localStorage only, **export regularly** — clearing browser data permanently deletes your plan
- Keep exported `.json` files in cloud storage as backup

---

## Browser Support

| Browser | Status |
|---------|--------|
| Google Chrome | Recommended |
| Mozilla Firefox | Supported |
| Microsoft Edge | Supported |
| Safari | Supported |

---

## Data Storage

### localStorage (Default)
All data is stored in your browser's **localStorage** by default:
- Data persists between browser sessions on the same machine
- No internet connection required
- Data is tied to the specific browser and machine
- Clearing browser data permanently deletes your data
- Git commits do **not** include any project data

### Firebase Firestore (Optional)
When Firebase is configured and you're signed in:
- Data is synced in real-time to Google Firestore
- Multiple users can collaborate on the same project
- Data persists across browsers and machines
- Offline changes are queued and synced when reconnected

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | March 2026 | Initial release with core features |
| 1.1.0 | March 2026 | Added phases for task organization |
| 2.0.0 | March 2026 | Tags, Kanban board, cross-entity linking, Firebase multi-user sync, clickable status badges, dashboard IDA summaries, remaining effort card, recent activity feed, improved delete buttons |

---

*Cut Over Planning Tool - Making software transitions smooth and manageable.*
