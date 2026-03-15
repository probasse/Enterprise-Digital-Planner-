/**
 * Main Application Module
 */

const App = {
    currentView: 'dashboard',
    currentReportType: 'status-dashboard',

    /**
     * Initialize application
     */
    init() {
        this.bindNavigation();
        this.bindGlobalActions();
        this.bindViewCsvButtons();
        this.bindProjectSwitcher();
        this.bindDashboardActions();
        this.bindTaskActions();
        this.bindResourceActions();
        this.bindRiskActions();
        this.bindGoNoGoActions();
        this.bindRollbackActions();
        this.bindCommunicationActions();
        this.bindIssueActions();
        this.bindDecisionActions();
        this.bindActionActions();
        this.bindReportActions();
        this.bindThemeToggle();
        this.bindSidebarToggle();
        this.loadSavedTheme();
        this.loadSavedSidebarState();
        this.renderProjectSwitcher();
        this.showView('dashboard');
        this.updateCountdown();
        setInterval(() => this.updateCountdown(), 1000);
    },

    /**
     * Bind navigation events
     */
    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.showView(view);
            });
        });
    },

    /**
     * Show a specific view
     */
    showView(viewName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });

        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}View`);
        });

        this.currentView = viewName;

        // Clear task mass-selection when leaving the tasks view
        if (viewName !== 'tasks' && this._massSelected && this._massSelected.size > 0) {
            this._massSelected = new Set();
            this._updateMassActionBar();
        }

        const titles = {
            dashboard: 'Dashboard', tasks: 'Tasks', resources: 'Resources',
            risks: 'Risk Register', timeline: 'Timeline', gonogo: 'Go / No-Go',
            rollback: 'Rollback Plan', communication: 'Communications',
            issues: 'Issues', decisions: 'Decisions', actions: 'Actions',
            reports: 'Reports'
        };
        const titleEl = document.getElementById('viewTitle');
        if (titleEl) titleEl.textContent = titles[viewName] || viewName;

        this._updateLockBadge();
        this.refreshView(viewName);
    },

    /**
     * Refresh current view data
     */
    refreshView(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'tasks':
                this.renderTaskList();
                break;
            case 'resources':
                this.renderResourceList();
                break;
            case 'risks':
                this.renderRiskList();
                break;
            case 'timeline':
                Timeline.render();
                break;
            case 'gonogo':
                this.renderGoNoGo();
                break;
            case 'rollback':
                this.renderRollback();
                break;
            case 'communication':
                this.renderCommunications();
                break;
            case 'issues':
                this.populateIssueCategoryFilterDropdown();
                this.renderIssueList();
                break;
            case 'decisions':
                this.renderDecisionList();
                break;
            case 'actions':
                this.renderActionList();
                break;
            case 'reports':
                this.renderReport(this.currentReportType);
                break;
        }
    },

    // ==================== DASHBOARD ====================
    renderDashboard() {
        const project = Storage.get(Storage.KEYS.PROJECT);
        const stats = Tasks.getStats();
        const progress = Tasks.getOverallProgress();
        const categoryProgress = Tasks.getCategoryProgress();
        const riskStats = Risks.getStats();
        const gonogoStats = GoNoGo.getStats();
        const upcomingTasks = Tasks.getUpcomingCritical(5);

        document.getElementById('activeProjectLabel').textContent = project?.name || 'Cut Over Project';
        
        // Stats
        const totalTasksEl = document.getElementById('totalTasks');
        const completedTasksEl = document.getElementById('completedTasks');
        const inProgressTasksEl = document.getElementById('inProgressTasks');
        const blockedTasksEl = document.getElementById('blockedTasks');
        const totalRisksEl = document.getElementById('totalRisks');
        const goNoGoStatusEl = document.getElementById('goNoGoStatus');
        
        if (totalTasksEl) totalTasksEl.textContent = stats.total;
        if (completedTasksEl) completedTasksEl.textContent = stats.completed;
        if (inProgressTasksEl) inProgressTasksEl.textContent = stats.inProgress;
        if (blockedTasksEl) blockedTasksEl.textContent = stats.blocked;
        if (totalRisksEl) totalRisksEl.textContent = riskStats.open;
        if (goNoGoStatusEl) goNoGoStatusEl.textContent = GoNoGo.calculateDecision().toUpperCase();

        // Progress bar
        const progressBar = document.getElementById('overallProgress');
        const progressText = document.getElementById('progressText');
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}%`;

        // Category progress (dynamic)
        const catHtml = Categories.getAll().map(cat => {
            const pct = categoryProgress[cat.value] || 0;
            return `
            <div class="breakdown-item">
                <span class="breakdown-dot" style="background-color:${escapeHtml(cat.color)};"></span>
                <span>${escapeHtml(cat.name)}: <strong>${pct}%</strong></span>
            </div>`;
        }).join('');
        const catProgressList = document.getElementById('categoryProgressList');
        if (catProgressList) catProgressList.innerHTML = catHtml;

        // Risk bars
        const highRiskBar = document.getElementById('highRiskBar');
        const mediumRiskBar = document.getElementById('mediumRiskBar');
        const lowRiskBar = document.getElementById('lowRiskBar');
        
        if (highRiskBar) highRiskBar.querySelector('.risk-count').textContent = riskStats.high;
        if (mediumRiskBar) mediumRiskBar.querySelector('.risk-count').textContent = riskStats.medium;
        if (lowRiskBar) lowRiskBar.querySelector('.risk-count').textContent = riskStats.low;

        // Upcoming tasks
        const upcomingHtml = upcomingTasks.map(task => `
            <li class="upcoming-item">
                <span class="task-name">${escapeHtml(task.name)}</span>
                <span class="task-date">${new Date(task.startDate).toLocaleDateString()}</span>
                <span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span>
            </li>
        `).join('');
        const upcomingList = document.getElementById('upcomingTasks');
        if (upcomingList) upcomingList.innerHTML = upcomingHtml || '<li class="no-items">No upcoming critical tasks</li>';

        this.updateCountdown();
    },

    updateCountdown() {
        // Update timezone badge
        const tzBadge = document.getElementById('timezoneBadge');
        if (tzBadge) tzBadge.textContent = this.getTimezone();

        const project = Storage.get(Storage.KEYS.PROJECT);
        if (project?.cutoverDate) {
            const cutover = new Date(project.cutoverDate);
            const now = new Date();
            const diff = cutover - now;

            if (diff > 0) {
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                const pad = n => String(n).padStart(2, '0');
                document.getElementById('countdownTimer').textContent = `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
            } else {
                document.getElementById('countdownTimer').textContent = 'CUTOVER TIME!';
            }
        }
    },

    bindDashboardActions() {
        // Dashboard actions bound in bindGlobalActions
    },

    showProjectModal() {
        const project = Storage.get(Storage.KEYS.PROJECT) || {};
        document.getElementById('settingsProjectName').value = project.name || '';
        document.getElementById('settingsDescription').value = project.description || '';
        document.getElementById('settingsCutoverDate').value = project.cutoverDate ? this.toLocalInput(project.cutoverDate) : '';
        this.populateTimezoneDropdown();
        document.getElementById('settingsLocked').checked = Storage.isLocked();
        this._syncThemeCheckbox();
        this.renderCategoriesList();
        this.bindCategoryActions();
        this.renderIssueCategoriesList();
        this.bindIssueCategoryActions();
        this.openModal('settingsModal');
    },

    saveProject() {
        const tz = document.getElementById('settingsTimezone').value;
        Storage.set(Storage.KEYS.TIMEZONE, tz);
        const project = {
            name: document.getElementById('settingsProjectName').value,
            description: document.getElementById('settingsDescription').value,
            cutoverDate: this.fromLocalInput(document.getElementById('settingsCutoverDate').value)
        };
        Storage.set(Storage.KEYS.PROJECT, project);
        // Sync name in the project registry
        const pid = Storage.getActiveProjectId();
        const projects = Storage.getAllProjects().map(p =>
            p.id === pid ? { ...p, name: project.name, description: project.description, cutoverDate: project.cutoverDate } : p
        );
        Storage.set(Storage.GLOBAL_KEYS.PROJECTS, projects);
        Storage.setLocked(document.getElementById('settingsLocked').checked);
        Storage.addActivity('Project settings updated');
        this.closeModal('settingsModal');
        this.renderProjectSwitcher();
        this._updateLockBadge();
        this.renderDashboard();
        this.renderTaskList();
    },

    // ==================== EDIT LOCK ====================
    _assertNotLocked() {
        if (Storage.isLocked()) {
            alert('This project is locked. Disable Edit Lock in Settings to make changes.');
            return true;
        }
        return false;
    },

    _updateLockBadge() {
        const lb = document.getElementById('lockBadge');
        if (lb) lb.style.display = Storage.isLocked() ? 'inline-flex' : 'none';
    },

    /**
     * Returns the active timezone (saved preference or browser default)
     */
    getTimezone() {
        return Storage.get(Storage.KEYS.TIMEZONE) || Intl.DateTimeFormat().resolvedOptions().timeZone;
    },

    /**
     * Populate the timezone <select> with all IANA timezones, selecting the saved one
     */
    populateTimezoneDropdown() {
        const select = document.getElementById('settingsTimezone');
        const saved = this.getTimezone();
        const zones = Intl.supportedValuesOf('timeZone');
        select.innerHTML = zones.map(tz =>
            `<option value="${tz}"${tz === saved ? ' selected' : ''}>${tz.replace(/_/g, ' ')}</option>`
        ).join('');
    },

    // ==================== TASKS ====================
    /**
     * Format an ISO date string as DD/MM/YYYY HH:MM:SS (24h) in the selected timezone
     */
    formatDateTime24(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (isNaN(d)) return '-';
        const tz = this.getTimezone();
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).formatToParts(d);
        const p = {};
        parts.forEach(({ type, value }) => { p[type] = value; });
        return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
    },

    /**
     * Convert duration seconds to HH:MM:SS string
     */
    secondsToHms(totalSeconds) {
        if (!totalSeconds || totalSeconds <= 0) return '';
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },

    /**
     * Parse HH:MM:SS (or HH:MM) string to total seconds; returns null if invalid
     */
    hmsToSeconds(str) {
        if (!str || !str.trim()) return null;
        const parts = str.trim().split(':').map(Number);
        if (parts.some(isNaN)) return null;
        if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
        if (parts.length === 2) return parts[0]*3600 + parts[1]*60;
        return null;
    },

    renderTaskList() {
        // Repopulate dynamic filter dropdowns each render
        this.populateCategoryFilterDropdown();
        this.populateAssigneeFilterDropdown();
        this.populateStatusFilterDropdown();

        const filters = {
            category: document.getElementById('taskCategoryFilter').value,
            status:   document.getElementById('taskStatusFilter').value,
            priority: document.getElementById('taskPriorityFilter').value,
            assignee: document.getElementById('taskAssigneeFilter').value
        };
        let tasks = Tasks.sortByDate(Tasks.getFiltered(filters));
        const allTasks = Tasks.getAll();
        // Sort keys for computed columns (duration in seconds, dep count for stable sort)
        const taskSortKeys = {
            8: tasks.map(t => t.durationSeconds || 0),
            9: tasks.map(t => (t.dependencies || []).length),
        };
        tasks = this._applyTableSort('tasks-table', tasks, {
            0: 'taskNumber', 1: 'status', 2: 'name', 3: 'category',
            4: 'priority', 5: 'assignee', 6: 'startDate', 7: 'endDate',
            10: 'actualStart', 11: 'actualEnd'
        }, taskSortKeys);

        const html = tasks.map(task => {
            const cat = Categories.getByValue(task.category);
            const catLabel = cat ? escapeHtml(cat.name) : escapeHtml(task.category);
            const catColor = cat ? escapeHtml(cat.color) : '#6b7280';
            const statusOptions = Statuses.getAll().map(s =>
                `<option value="${escapeHtml(s.value)}" ${task.status === s.value ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
            ).join('');
            const depLabels = (task.dependencies || []).map(depId => {
                const dep = allTasks.find(t => t.id === depId);
                return dep ? escapeHtml(dep.taskNumber || dep.id) : escapeHtml(depId);
            }).join(', ') || '-';
            const durationStr = task.durationSeconds ? escapeHtml(this.secondsToHms(task.durationSeconds)) : '-';
            const isSelected = (this._massSelected || new Set()).has(task.id);
            return `
            <tr class="clickable-row${isSelected ? ' mass-selected' : ''}" onclick="if(!event.target.closest('button,select,.col-checkbox'))App.editTask('${escapeHtml(task.id)}')">
                <td class="col-checkbox"><input type="checkbox" class="task-row-checkbox" data-id="${escapeHtml(task.id)}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();App.toggleTaskSelection('${escapeHtml(task.id)}',this.checked)"></td>
                <td data-col="0"><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                <td data-col="1">
                    <select class="status-select" onchange="App.quickUpdateTaskStatus('${escapeHtml(task.id)}', this.value)">
                        ${statusOptions}
                    </select>
                </td>
                <td data-col="2">${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                <td data-col="3"><span class="category-badge" style="background-color:${catColor}; color:#fff;">${catLabel}</span></td>
                <td data-col="4"><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td>
                <td data-col="5">${escapeHtml(Resources.getName(task.assignee))}</td>
                <td data-col="6" class="datetime-cell">${this.formatDateTime24(task.startDate)}</td>
                <td data-col="7" class="datetime-cell">${this.formatDateTime24(task.endDate)}</td>
                <td data-col="8" class="duration-cell">${durationStr}</td>
                <td data-col="9">${depLabels}</td>
                <td data-col="10" class="datetime-cell">${task.actualStart ? this.formatDateTime24(task.actualStart) : '-'}</td>
                <td data-col="11" class="datetime-cell">${task.actualEnd ? this.formatDateTime24(task.actualEnd) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteTask('${escapeHtml(task.id)}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        }).join('');

        document.getElementById('tasksTableBody').innerHTML = html || '<tr><td colspan="13" class="empty-state">No tasks found. Click "+ Add Task" to create one.</td></tr>';

        // Update total duration badge
        // Merge overlapping intervals to avoid double-counting parallel tasks
        // without inflating the total with gaps between sequential tasks.
        const _wallClock = (taskList) => {
            const intervals = taskList
                .filter(t => t.startDate && t.endDate)
                .map(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()])
                .filter(([s, e]) => e > s)
                .sort((a, b) => a[0] - b[0]);
            if (!intervals.length) return taskList.reduce((s, t) => s + (t.durationSeconds || 0), 0);
            let total = 0, curStart = intervals[0][0], curEnd = intervals[0][1];
            for (let i = 1; i < intervals.length; i++) {
                const [s, e] = intervals[i];
                if (s <= curEnd) { if (e > curEnd) curEnd = e; }
                else { total += curEnd - curStart; curStart = s; curEnd = e; }
            }
            total += curEnd - curStart;
            return total / 1000;
        };
        const totalSecs = _wallClock(tasks);
        const durEl = document.getElementById('tasksTotalDuration');
        if (durEl) {
            if (totalSecs > 0) {
                durEl.textContent = `Total: ${this.secondsToHms(totalSecs)}`;
                durEl.style.display = '';
            } else {
                durEl.style.display = 'none';
            }
        }
        this.applyColumnOrder();
        this.applyColumnVisibility();
        this.applyTableColumnWidths('tasks-table', Storage.KEYS.TASKS_COL_WIDTHS, 12);
        this._updateSortIndicators('tasks-table');
        this.bindColumnDrag();
        this.bindTableColumnResize('tasks-table', Storage.KEYS.TASKS_COL_WIDTHS, 12);
        this.bindTableColumnSort('tasks-table', () => this.renderTaskList());
    },

    showDurationBreakdown() {
        const filters = {
            category: document.getElementById('taskCategoryFilter').value,
            status:   document.getElementById('taskStatusFilter').value,
            priority: document.getElementById('taskPriorityFilter').value,
            assignee: document.getElementById('taskAssigneeFilter').value
        };
        const tasks = Tasks.getFiltered(filters);

        // Group by category — merge overlapping intervals per category to avoid double-counting parallel tasks
        const wallClockSecs = (taskList) => {
            const intervals = taskList
                .filter(t => t.startDate && t.endDate)
                .map(t => [new Date(t.startDate).getTime(), new Date(t.endDate).getTime()])
                .filter(([s, e]) => e > s)
                .sort((a, b) => a[0] - b[0]);
            if (!intervals.length) return taskList.reduce((s, t) => s + (t.durationSeconds || 0), 0);
            let total = 0, curStart = intervals[0][0], curEnd = intervals[0][1];
            for (let i = 1; i < intervals.length; i++) {
                const [s, e] = intervals[i];
                if (s <= curEnd) { if (e > curEnd) curEnd = e; }
                else { total += curEnd - curStart; curStart = s; curEnd = e; }
            }
            total += curEnd - curStart;
            return total / 1000;
        };

        const byCategory = {};
        tasks.forEach(t => {
            const key = t.category || 'uncategorized';
            if (!byCategory[key]) byCategory[key] = [];
            byCategory[key].push(t);
        });

        // Total = merged-interval sum of all tasks combined (not sum of per-category spans)
        const totalSecs = wallClockSecs(tasks);

        // Build rows sorted by duration desc
        const rows = Object.entries(byCategory)
            .map(([catValue, taskList]) => [catValue, wallClockSecs(taskList)])
            .sort((a, b) => b[1] - a[1])
            .map(([catValue, secs]) => {
                const cat = Categories.getByValue(catValue);
                const label = cat ? escapeHtml(cat.name) : escapeHtml(catValue);
                const color = cat ? escapeHtml(cat.color) : '#6b7280';
                const pct = totalSecs > 0 ? Math.round(secs / totalSecs * 100) : 0;
                const dur = secs > 0 ? escapeHtml(this.secondsToHms(secs)) : '—';
                return `
                <div class="dur-breakdown-row">
                    <span class="dur-breakdown-dot" style="background:${color}"></span>
                    <span class="dur-breakdown-label">${label}</span>
                    <div class="dur-breakdown-bar-wrap">
                        <div class="dur-breakdown-bar" style="width:${pct}%;background:${color}"></div>
                    </div>
                    <span class="dur-breakdown-pct">${pct}%</span>
                    <span class="dur-breakdown-time">${dur}</span>
                </div>`;
            }).join('');

        const totalRow = `
            <div class="dur-breakdown-total">
                <span>Total</span>
                <span>${escapeHtml(this.secondsToHms(totalSecs))}</span>
            </div>`;

        document.getElementById('durationBreakdownBody').innerHTML =
            (totalSecs > 0 ? rows + totalRow : '<p class="empty-state">No duration data available.</p>');
        this.openModal('durationBreakdownModal');
    },

    bindTaskActions() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('recalcDatesBtn').addEventListener('click', () => this.recalculateAllDates());
        document.getElementById('taskCategoryFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskStatusFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskPriorityFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskAssigneeFilter').addEventListener('change', () => this.renderTaskList());
        this.bindColumnVisibility();

        // Header select-all checkbox
        document.getElementById('taskSelectAllHeader').addEventListener('change', (e) => {
            this._massSelectAllVisible(e.target.checked);
        });

        // Mass-action bar controls
        document.getElementById('massSelectAll').addEventListener('change', (e) => {
            this._massSelectAllVisible(e.target.checked);
        });
        document.getElementById('massClearSelection').addEventListener('click', () => {
            this._massSelected = new Set();
            this._updateMassActionBar();
            this.renderTaskList();
        });
        document.getElementById('massSetStatus').addEventListener('click', () => this._showMassEditModal('status'));
        document.getElementById('massSetCategory').addEventListener('click', () => this._showMassEditModal('category'));
        document.getElementById('massSetAssignee').addEventListener('click', () => this._showMassEditModal('assignee'));
        document.getElementById('massSetDuration').addEventListener('click', () => this._showMassEditModal('duration'));
        document.getElementById('massAddDependency').addEventListener('click', () => this._showMassEditModal('add-dependency'));
        document.getElementById('massRemoveDependency').addEventListener('click', () => this._showMassEditModal('remove-dependency'));
        document.getElementById('massDelete').addEventListener('click', () => this._massDeleteSelected());
        document.getElementById('massEditApplyBtn').addEventListener('click', () => this._applyMassEdit());
    },

    // ========== Column Visibility ==========
    getColumnVisibility() {
        const saved = Storage.get(Storage.KEYS.TASK_COLUMNS);
        // Default: all 10 columns visible (indices 0–9)
        const defaults = {};
        for (let i = 0; i <= 9; i++) defaults[i] = true;
        return saved ? Object.assign(defaults, saved) : defaults;
    },

    saveColumnVisibility(vis) {
        Storage.set(Storage.KEYS.TASK_COLUMNS, vis);
    },

    applyColumnVisibility() {
        const vis = this.getColumnVisibility();
        const table = document.querySelector('.tasks-table');
        if (!table) return;

        // Apply to header <th> elements
        table.querySelectorAll('thead th[data-col]').forEach(th => {
            const col = parseInt(th.dataset.col, 10);
            th.classList.toggle('col-hidden', vis[col] === false);
        });

        // Apply to every row's <td> by data-col attribute
        table.querySelectorAll('tbody tr').forEach(row => {
            row.querySelectorAll('td[data-col]').forEach(td => {
                const col = parseInt(td.dataset.col, 10);
                td.classList.toggle('col-hidden', vis[col] === false);
            });
        });

        // Sync checkboxes
        const dropdown = document.getElementById('colVisibilityDropdown');
        if (dropdown) {
            dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const col = parseInt(cb.dataset.col, 10);
                cb.checked = vis[col] !== false;
            });
        }
    },

    bindColumnVisibility() {
        const btn = document.getElementById('colVisibilityBtn');
        const dropdown = document.getElementById('colVisibilityDropdown');
        if (!btn || !dropdown) return;

        // Load saved visibility and apply
        this.applyColumnVisibility();

        // Toggle dropdown open/close
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display !== 'none';
            dropdown.style.display = isOpen ? 'none' : 'flex';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        // Handle checkbox changes
        dropdown.addEventListener('change', (e) => {
            if (e.target.type !== 'checkbox') return;
            const col = parseInt(e.target.dataset.col, 10);
            const vis = this.getColumnVisibility();
            vis[col] = e.target.checked;
            this.saveColumnVisibility(vis);
            this.applyColumnVisibility();
        });
    },

    // ========== Column Order (Drag-and-Drop) ==========
    _colDragBound: false,
    _dragSrcCol: null,

    getColumnOrder() {
        const saved = Storage.get(Storage.KEYS.TASK_COLUMN_ORDER);
        const defaults = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        if (!saved || !Array.isArray(saved) || saved.length !== 12) return defaults;
        return saved;
    },

    saveColumnOrder(order) {
        Storage.set(Storage.KEYS.TASK_COLUMN_ORDER, order);
    },

    applyColumnOrder() {
        this.applyTableColumnOrder('tasks-table', Storage.KEYS.TASK_COLUMN_ORDER, 12);
    },

    bindColumnDrag() {
        if (this._colDragBound) return;
        this.bindTableColumnDrag('tasks-table', Storage.KEYS.TASK_COLUMN_ORDER, 12, '_colDragBound');
        this._colDragBound = true;
    },

    // ── Generic column order helpers (used by all tables) ──────────────────────

    applyTableColumnOrder(tableSelector, storageKey, colCount) {
        const table = this._resolveTable(tableSelector);
        if (!table) return;

        const saved = Storage.get(storageKey);
        const defaults = Array.from({ length: colCount }, (_, i) => i);
        const order = (saved && Array.isArray(saved) && saved.length === colCount) ? saved : defaults;

        // Reorder <th> elements in thead
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            const ths = {};
            headerRow.querySelectorAll('th[data-col]').forEach(th => {
                ths[parseInt(th.dataset.col, 10)] = th;
            });
            const actionsTh = headerRow.querySelector('th:not([data-col])');
            Object.values(ths).forEach(th => th.remove());
            order.forEach(idx => { if (ths[idx]) headerRow.insertBefore(ths[idx], actionsTh); });
        }

        // Reorder <td> elements in each tbody row
        table.querySelectorAll('tbody tr').forEach(row => {
            const tds = {};
            row.querySelectorAll('td[data-col]').forEach(td => {
                tds[parseInt(td.dataset.col, 10)] = td;
            });
            const actionsTd = row.querySelector('td:not([data-col])');
            Object.values(tds).forEach(td => td.remove());
            order.forEach(idx => { if (tds[idx]) row.insertBefore(tds[idx], actionsTd); });
        });
    },

    _tableDragBound: {},

    bindTableColumnDrag(tableSelector, storageKey, colCount, legacyBoundFlag) {
        // Guard: only attach once per table
        if (this._tableDragBound[tableSelector]) return;

        const table = this._resolveTable(tableSelector);
        if (!table) return;
        const thead = table.querySelector('thead');
        if (!thead) return;

        let dragSrcCol = null;

        thead.addEventListener('dragstart', (e) => {
            const th = e.target.closest('th[data-col]');
            if (!th) return;
            dragSrcCol = parseInt(th.dataset.col, 10);
            e.dataTransfer.effectAllowed = 'move';
        });

        thead.addEventListener('dragover', (e) => {
            const th = e.target.closest('th[data-col]');
            if (!th) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            thead.querySelectorAll('th[data-col]').forEach(t => t.classList.remove('drag-over'));
            th.classList.add('drag-over');
        });

        thead.addEventListener('dragleave', (e) => {
            const th = e.target.closest('th[data-col]');
            if (th) th.classList.remove('drag-over');
        });

        thead.addEventListener('drop', (e) => {
            const th = e.target.closest('th[data-col]');
            if (!th) return;
            e.preventDefault();
            const destCol = parseInt(th.dataset.col, 10);
            th.classList.remove('drag-over');
            if (dragSrcCol === null || dragSrcCol === destCol) return;

            const saved = Storage.get(storageKey);
            const defaults = Array.from({ length: colCount }, (_, i) => i);
            const order = (saved && Array.isArray(saved) && saved.length === colCount) ? saved : defaults;
            const srcPos = order.indexOf(dragSrcCol);
            const destPos = order.indexOf(destCol);
            if (srcPos === -1 || destPos === -1) return;
            order.splice(srcPos, 1);
            order.splice(destPos, 0, dragSrcCol);
            Storage.set(storageKey, order);
            this.applyTableColumnOrder(tableSelector, storageKey, colCount);
            // Re-apply widths after reorder so they follow the column
            const widthKeyMap = {
                'tasks-table': 'TASKS_COL_WIDTHS', 'resources-table': 'RESOURCES_COL_WIDTHS',
                'risks-table': 'RISKS_COL_WIDTHS', 'communication-table': 'COMMUNICATION_COL_WIDTHS',
                'issuesTable': 'ISSUES_COL_WIDTHS', 'decisionsTable': 'DECISIONS_COL_WIDTHS',
                'actionsTable': 'ACTIONS_COL_WIDTHS'
            };
            const wk = widthKeyMap[tableSelector];
            if (wk) this.applyTableColumnWidths(tableSelector, Storage.KEYS[wk], colCount);
            // Re-apply visibility for tasks table
            if (tableSelector === 'tasks-table') this.applyColumnVisibility();
        });

        thead.addEventListener('dragend', () => {
            thead.querySelectorAll('th[data-col]').forEach(t => t.classList.remove('drag-over'));
            dragSrcCol = null;
        });

        this._tableDragBound[tableSelector] = true;
    },

    // ========== Column Sort ==========
    _tableSort: {
        'tasks-table':         { col: null, dir: 'asc' },
        'resources-table':     { col: null, dir: 'asc' },
        'risks-table':         { col: null, dir: 'asc' },
        'communication-table': { col: null, dir: 'asc' },
        'issuesTable':         { col: null, dir: 'asc' },
        'decisionsTable':      { col: null, dir: 'asc' },
        'actionsTable':        { col: null, dir: 'asc' },
    },
    _tableSortBound: {},
    _tableResizeBound: {},

    /** Resolve a table element from its selector string (CSS class or element id). */
    _resolveTable(tableSelector) {
        if (tableSelector.includes('-') && !tableSelector.includes('Table')) {
            return document.querySelector(`.${tableSelector}`);
        }
        return document.getElementById(tableSelector) || document.querySelector(`.${tableSelector}`);
    },

    /** Sort items by a field; nulls always last. Returns a new array. */
    _sortItems(items, field, dir) {
        return [...items].sort((a, b) => {
            const av = a[field];
            const bv = b[field];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const an = Number(av), bn = Number(bv);
            let cmp;
            if (Number.isFinite(an) && Number.isFinite(bn)) {
                cmp = an - bn;
            } else if (typeof av === 'string' && typeof bv === 'string' &&
                       /^\d{4}-/.test(av) && /^\d{4}-/.test(bv)) {
                cmp = new Date(av) - new Date(bv);
            } else {
                cmp = String(av).localeCompare(String(bv));
            }
            return dir === 'desc' ? -cmp : cmp;
        });
    },

    /**
     * Sort an items array according to the current _tableSort state.
     * colFieldMap: { colIndex: fieldName } maps data-col to record field names.
     * sortKeys (optional): { colIndex: value[] } for computed sort values (parallel to items).
     * Returns sorted array (and reorders sortKeys in-place if provided).
     */
    _applyTableSort(tableId, items, colFieldMap, sortKeys) {
        const state = this._tableSort[tableId];
        if (!state || state.col === null) return items;
        const col = state.col;
        const dir = state.dir;
        // Computed sort via parallel sortKeys array
        if (sortKeys && sortKeys[col] !== undefined) {
            const vals = sortKeys[col];
            const indices = items.map((_, i) => i);
            indices.sort((a, b) => {
                const av = vals[a], bv = vals[b];
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                const an = Number(av), bn = Number(bv);
                let cmp = Number.isFinite(an) && Number.isFinite(bn)
                    ? an - bn
                    : String(av).localeCompare(String(bv));
                return dir === 'desc' ? -cmp : cmp;
            });
            // Reorder all parallel arrays to match
            const reorder = arr => indices.map(i => arr[i]);
            const sorted = reorder(items);
            if (sortKeys) {
                Object.keys(sortKeys).forEach(k => { sortKeys[k] = reorder(sortKeys[k]); });
            }
            return sorted;
        }
        // Field-based sort
        const field = colFieldMap[col];
        if (!field) return items;
        return this._sortItems(items, field, dir);
    },

    /** Inject/update sort indicator spans and sorted-asc/desc classes on all th[data-col]. */
    _updateSortIndicators(tableId) {
        const table = this._resolveTable(tableId);
        if (!table) return;
        const state = this._tableSort[tableId] || { col: null, dir: 'asc' };
        table.querySelectorAll('thead th[data-col]').forEach(th => {
            const col = parseInt(th.dataset.col, 10);
            // Remove old indicator span
            const old = th.querySelector('.sort-indicator');
            if (old) old.remove();
            // Remove sort classes
            th.classList.remove('sorted-asc', 'sorted-desc');
            // Append indicator
            const span = document.createElement('span');
            span.className = 'sort-indicator';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = '▲';
            if (state.col === col) {
                th.classList.add(state.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
                span.textContent = state.dir === 'asc' ? '▲' : '▼';
            }
            th.appendChild(span);
        });
    },

    /** Bind click-to-sort on a table's thead. rerenderFn re-renders the table. */
    bindTableColumnSort(tableId, rerenderFn) {
        if (this._tableSortBound[tableId]) return;
        const table = this._resolveTable(tableId);
        if (!table) return;
        const thead = table.querySelector('thead');
        if (!thead) return;

        thead.addEventListener('click', (e) => {
            // Ignore clicks on resize handles
            if (e.target.closest('.col-resize-handle')) return;
            const th = e.target.closest('th[data-col]');
            if (!th) return;
            const col = parseInt(th.dataset.col, 10);
            const state = this._tableSort[tableId];
            if (state.col === col) {
                state.dir = state.dir === 'asc' ? 'desc' : 'asc';
            } else {
                state.col = col;
                state.dir = 'asc';
            }
            rerenderFn();
        });

        this._tableSortBound[tableId] = true;
    },

    // ========== Column Widths ==========
    _getColWidths(widthsKey, colCount) {
        const saved = Storage.get(widthsKey);
        if (saved && Array.isArray(saved) && saved.length === colCount) return saved;
        return Array(colCount).fill(null);
    },

    _saveColWidths(widthsKey, widths) {
        Storage.set(widthsKey, widths);
    },

    /** Apply persisted column widths to th elements. Call after column reorder. */
    applyTableColumnWidths(tableSelector, widthsKey, colCount) {
        const table = this._resolveTable(tableSelector);
        if (!table) return;
        const widths = this._getColWidths(widthsKey, colCount);
        table.querySelectorAll('thead th[data-col]').forEach(th => {
            const col = parseInt(th.dataset.col, 10);
            if (col < colCount && widths[col] != null) {
                th.style.width = widths[col] + 'px';
            }
        });
    },

    /** Inject resize handles into th[data-col] and bind drag-resize events. */
    bindTableColumnResize(tableSelector, widthsKey, colCount) {
        if (this._tableResizeBound[tableSelector]) return;
        const table = this._resolveTable(tableSelector);
        if (!table) return;
        const thead = table.querySelector('thead');
        if (!thead) return;

        // Inject handles
        thead.querySelectorAll('th[data-col]').forEach(th => {
            if (th.querySelector('.col-resize-handle')) return;
            const handle = document.createElement('span');
            handle.className = 'col-resize-handle';
            handle.dataset.resizeCol = th.dataset.col;
            th.appendChild(handle);
        });

        // Bind drag sequence via event delegation on thead
        thead.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.col-resize-handle');
            if (!handle) return;
            e.stopPropagation();
            e.preventDefault();

            const th = handle.closest('th');
            const colIdx = parseInt(handle.dataset.resizeCol, 10);
            const startX = e.clientX;
            const startWidth = th.offsetWidth;
            handle.classList.add('resizing');

            const onMove = (me) => {
                const newWidth = Math.max(40, startWidth + (me.clientX - startX));
                th.style.width = newWidth + 'px';
            };
            const onUp = () => {
                handle.classList.remove('resizing');
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                // Persist
                const widths = this._getColWidths(widthsKey, colCount);
                widths[colIdx] = th.offsetWidth;
                this._saveColWidths(widthsKey, widths);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        this._tableResizeBound[tableSelector] = true;
    },

    /**
     * Recalculate start/end dates for all tasks based on dependencies.
     * Processes tasks in topological (dependency) order.
     * For each task whose start date is at or before its latest dependency's end date,
     * snaps start to depEnd + 1s and recomputes end from durationSeconds.
     */
    recalculateAllDates() {
        if (this._assertNotLocked()) return;
        const tasks = Tasks.getAll();
        if (!tasks.length) return;

        const taskMap = {};
        tasks.forEach(t => { taskMap[t.id] = t; });

        // Topological sort
        const visited = new Set();
        const order = [];
        const visit = (id) => {
            if (visited.has(id)) return;
            visited.add(id);
            const t = taskMap[id];
            if (t) (t.dependencies || []).forEach(depId => visit(depId));
            order.push(id);
        };
        tasks.forEach(t => visit(t.id));

        let changed = 0;
        order.forEach(id => {
            const t = taskMap[id];
            if (!t || !t.dependencies || t.dependencies.length === 0) return;

            // Find the latest end date among all dependencies
            const depEnds = t.dependencies
                .map(depId => taskMap[depId])
                .filter(dep => dep?.endDate)
                .map(dep => new Date(dep.endDate).getTime());
            if (!depEnds.length) return;

            const latestDepEnd = Math.max(...depEnds);
            const newStart = new Date(latestDepEnd + 1000);
            const newStartMs = newStart.getTime();
            const taskStartMs = t.startDate ? new Date(t.startDate).getTime() : null;

            // Snap if start doesn't match exactly (closes both gaps and overlaps)
            if (taskStartMs === null || taskStartMs !== newStartMs) {
                t.startDate = newStart.toISOString();
                if (t.durationSeconds && t.durationSeconds > 0) {
                    t.endDate = new Date(newStartMs + t.durationSeconds * 1000).toISOString();
                }
                changed++;
            }
        });

        if (changed === 0) {
            alert('All task dates already start immediately after their dependencies. No changes made.');
            return;
        }

        // Save all tasks back
        Storage.set(Storage.KEYS.TASKS, tasks);
        Storage.addActivity(`Recalculated dates for ${changed} task${changed !== 1 ? 's' : ''} based on dependencies`);
        this.renderTaskList();
        alert(`Updated ${changed} task${changed !== 1 ? 's' : ''}. Dates now reflect dependency order.`);
    },

    showTaskModal(task = null) {
        document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'Add Task';
        document.getElementById('taskId').value = task?.id || '';
        document.getElementById('taskDisplayNumber').textContent = task?.taskNumber || '(assigned on save)';
        document.getElementById('taskName').value = task?.name || '';
        document.getElementById('taskStartDate').value = this.toLocalInput(task?.startDate);
        document.getElementById('taskEndDate').value   = this.toLocalInput(task?.endDate);
        document.getElementById('taskDuration').value = task?.durationSeconds ? this.secondsToHms(task.durationSeconds) : '';
        document.getElementById('taskDescription').value = task?.description || '';
        document.getElementById('taskMilestone').checked = task?.milestone || false;
        document.getElementById('taskPriority').value = task?.priority || 'medium';

        this.populateCategoryDropdown('taskCategory', task?.category || 'pre-cutover');
        this.populateStatusDropdown('taskStatus', task?.status || 'not-started');
        this.populateAssigneeDropdown('taskAssignee', task?.assignee);
        this.populateTaskDependencyDropdown(task?.id, task?.dependencies || []);

        const actualDatesRow = document.getElementById('taskActualDatesRow');
        if (task && (task.actualStart || task.actualEnd)) {
            document.getElementById('taskActualStart').value = task.actualStart ? this.formatDateTime24(task.actualStart) : '-';
            document.getElementById('taskActualEnd').value   = task.actualEnd   ? this.formatDateTime24(task.actualEnd)   : '-';
            actualDatesRow.style.display = '';
        } else {
            actualDatesRow.style.display = 'none';
        }

        const historyEl = document.getElementById('taskStatusHistory');
        const historyContent = document.getElementById('taskStatusHistoryContent');
        if (task) {
            const durations = Tasks.getStatusDurations(task);
            historyContent.innerHTML = durations.map(d => `
                <div class="status-history-row">
                    <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                    <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                    <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                </div>
            `).join('');
            historyEl.style.display = '';
        } else {
            historyEl.style.display = 'none';
            historyContent.innerHTML = '';
        }

        this.bindTaskModalEvents();
        this.openModal('taskModal');
    },

    /**
     * Convert a UTC ISO string to a datetime-local input value (YYYY-MM-DDTHH:MM:SS)
     * expressed in the selected project timezone.
     */
    toLocalInput(isoString) {
        if (!isoString) return '';
        const d = new Date(isoString);
        if (isNaN(d)) return '';
        const tz = this.getTimezone();
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).formatToParts(d);
        const p = {};
        parts.forEach(({ type, value }) => { p[type] = value; });
        // en-CA gives YYYY-MM-DD, so p.year/month/day are already zero-padded
        return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
    },

    /**
     * Convert a datetime-local input value (YYYY-MM-DDTHH:MM[:SS], in the selected
     * project timezone) back to a UTC ISO string.
     */
    fromLocalInput(localStr) {
        if (!localStr) return '';
        const tz = this.getTimezone();
        // Use Temporal-style parsing via a known trick: format a reference point and
        // find the UTC offset for this wall-clock time in the target timezone.
        // We construct the date as if it were UTC, then correct for the tz offset.
        const [datePart, timePart = '00:00:00'] = localStr.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second = 0] = timePart.split(':').map(Number);

        // Find the UTC offset at this wall-clock moment in the target timezone
        // by formatting a candidate UTC instant and comparing
        const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        const tzParts = (dt) => {
            const p = {};
            formatter.formatToParts(dt).forEach(({ type, value }) => { p[type] = value; });
            return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
        };
        const c = tzParts(candidate);
        // Diff in ms between what the tz shows and what we want
        const tzShown = Date.UTC(c.y, c.mo - 1, c.d, c.h, c.mi, c.s);
        const wanted  = Date.UTC(year, month - 1, day, hour, minute, second);
        const offsetMs = tzShown - wanted;
        return new Date(candidate.getTime() - offsetMs).toISOString();
    },

    bindTaskModalEvents() {
        // Returns the latest end date (UTC ms) among all selected dependencies, or null
        const latestDepEnd = () => {
            const selected = Array.from(document.getElementById('taskDependencies').selectedOptions).map(o => o.value);
            if (selected.length === 0) return null;
            const ends = selected
                .map(id => Tasks.getById(id))
                .filter(t => t?.endDate)
                .map(t => new Date(t.endDate).getTime());
            return ends.length ? Math.max(...ends) : null;
        };

        // Recompute end date from current start input + duration
        const recalcEnd = () => {
            const startVal = document.getElementById('taskStartDate').value;
            const durVal   = document.getElementById('taskDuration').value;
            if (!startVal || !durVal) return;
            const secs = this.hmsToSeconds(durVal);
            if (secs === null) return;
            const startMs = new Date(startVal).getTime();
            document.getElementById('taskEndDate').value = this.toLocalInput(new Date(startMs + secs * 1000).toISOString());
        };

        // Snap start to 1s after latest dep end, then recompute end date
        const snapStart = () => {
            const depEndMs = latestDepEnd();
            if (depEndMs === null) return;
            document.getElementById('taskStartDate').value = this.toLocalInput(new Date(depEndMs + 1000).toISOString());
            recalcEnd();
        };

        // Dependency change → snap start to latest dep end + 1s
        document.getElementById('taskDependencies').onchange = snapStart;

        // Duration change → if deps selected, re-snap (keeps start aligned); else just recalc end
        document.getElementById('taskDuration').onchange = () => {
            if (latestDepEnd() !== null) snapStart(); else recalcEnd();
        };

        // Manual start change → only recalculate end date
        document.getElementById('taskStartDate').onchange = recalcEnd;

        // Snap button → explicit user action, always snaps
        document.getElementById('snapToDependencyBtn').onclick = () => {
            if (latestDepEnd() === null) { alert('Select at least one dependency first.'); return; }
            snapStart();
        };

        // Status change in modal → live-update actual dates if task already exists
        document.getElementById('taskStatus').onchange = () => {
            const id = document.getElementById('taskId').value;
            if (!id) return;
            const newStatus = document.getElementById('taskStatus').value;
            const task = Tasks.updateStatus(id, newStatus);
            if (task) {
                this._refreshTaskModalActualDates(task);
                this._refreshTaskRowActualDates(id, task);
                // Also refresh status history panel
                const historyContent = document.getElementById('taskStatusHistoryContent');
                if (historyContent) {
                    const durations = Tasks.getStatusDurations(task);
                    historyContent.innerHTML = durations.map(d => `
                        <div class="status-history-row">
                            <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                            <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                            <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                        </div>
                    `).join('');
                    document.getElementById('taskStatusHistory').style.display = '';
                }
            }
        };
    },

    saveTask() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('taskId').value;
        const startVal    = document.getElementById('taskStartDate').value;
        const endVal      = document.getElementById('taskEndDate').value;
        const durationRaw = document.getElementById('taskDuration').value;
        const durationSecs = this.hmsToSeconds(durationRaw);

        const deps = Array.from(document.getElementById('taskDependencies').selectedOptions).map(o => o.value);

        const taskData = {
            name:            document.getElementById('taskName').value,
            category:        document.getElementById('taskCategory').value,
            priority:        document.getElementById('taskPriority').value,
            status:          document.getElementById('taskStatus').value,
            startDate:       this.fromLocalInput(startVal),
            endDate:         this.fromLocalInput(endVal),
            durationSeconds: durationSecs,
            assignee:        document.getElementById('taskAssignee').value,
            dependencies:    deps,
            description:     document.getElementById('taskDescription').value,
            milestone:       document.getElementById('taskMilestone').checked
        };

        if (id) {
            Tasks.update(id, taskData);
        } else {
            Tasks.add(taskData);
        }

        this.closeModal('taskModal');
        this.renderTaskList();
    },

    editTask(id) {
        const task = Tasks.getById(id);
        if (task) this.showTaskModal(task);
    },

    deleteTask(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Are you sure you want to delete this task?')) {
            Tasks.delete(id);
            this.renderTaskList();
        }
    },

    quickUpdateTaskStatus(id, status) {
        if (this._assertNotLocked()) return;
        const task = Tasks.updateStatus(id, status);
        this.renderDashboard();
        // Live-update the actual dates row in the task list without full re-render
        if (task) this._refreshTaskRowActualDates(id, task);
        // Live-update if this task's modal is currently open
        const openId = document.getElementById('taskId')?.value;
        if (openId === id && task) this._refreshTaskModalActualDates(task);
    },

    _refreshTaskRowActualDates(id, task) {
        const rows = document.querySelectorAll('#tasksTableBody tr');
        rows.forEach(row => {
            const onclick = row.getAttribute('onclick') || '';
            if (!onclick.includes(id)) return;
            const cells = row.querySelectorAll('td');
            // col 10 = Actual Start, col 11 = Actual End
            if (cells[10]) cells[10].textContent = task.actualStart ? this.formatDateTime24(task.actualStart) : '-';
            if (cells[11]) cells[11].textContent = task.actualEnd   ? this.formatDateTime24(task.actualEnd)   : '-';
        });
    },

    _refreshTaskModalActualDates(task) {
        const row = document.getElementById('taskActualDatesRow');
        if (!row) return;
        if (task.actualStart || task.actualEnd) {
            document.getElementById('taskActualStart').value = task.actualStart ? this.formatDateTime24(task.actualStart) : '-';
            document.getElementById('taskActualEnd').value   = task.actualEnd   ? this.formatDateTime24(task.actualEnd)   : '-';
            row.style.display = '';
        }
    },

    // ==================== RESOURCES ====================
    renderResourceList() {
        let resources = Resources.getAll();
        const taskCounts = resources.map(r => Resources.getAssignedTaskCount(r.id));
        const resSortKeys = { 4: taskCounts };
        resources = this._applyTableSort('resources-table', resources, {
            0: 'name', 1: 'role', 2: 'email', 3: 'phone', 5: 'availability', 6: 'status'
        }, resSortKeys);

        const html = resources.map((r, i) => {
            const taskCount = resSortKeys[4][i];
            const status = r.status || 'active';
            return `
            <tr class="clickable-row${status === 'inactive' ? ' inactive-resource-row' : ''}" onclick="if(!event.target.closest('button'))App.editResource('${escapeHtml(r.id)}')">
                <td data-col="0">${escapeHtml(r.name)}</td>
                <td data-col="1">${escapeHtml(r.role)}</td>
                <td data-col="2">${escapeHtml(r.email) || '-'}</td>
                <td data-col="3">${escapeHtml(r.phone) || '-'}</td>
                <td data-col="4">${taskCount}</td>
                <td data-col="5"><span class="availability-badge ${escapeHtml(r.availability)}">${escapeHtml(r.availability)}</span></td>
                <td data-col="6"><span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span></td>
                <td>
                    <button class="btn-icon" onclick="App.deleteResource('${escapeHtml(r.id)}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        }).join('');

        document.getElementById('resourcesTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No resources found. Click "+ Add Resource" to add team members.</td></tr>';
        this.applyTableColumnOrder('resources-table', Storage.KEYS.RESOURCES_COLUMN_ORDER, 7);
        this.applyTableColumnWidths('resources-table', Storage.KEYS.RESOURCES_COL_WIDTHS, 7);
        this._updateSortIndicators('resources-table');
        this.bindTableColumnDrag('resources-table', Storage.KEYS.RESOURCES_COLUMN_ORDER, 7);
        this.bindTableColumnResize('resources-table', Storage.KEYS.RESOURCES_COL_WIDTHS, 7);
        this.bindTableColumnSort('resources-table', () => this.renderResourceList());
    },

    bindResourceActions() {
        document.getElementById('addResourceBtn').addEventListener('click', () => this.showResourceModal());
    },

    showResourceModal(resource = null) {
        document.getElementById('resourceModalTitle').textContent = resource ? 'Edit Resource' : 'Add Resource';
        document.getElementById('resourceId').value = resource?.id || '';
        document.getElementById('resourceName').value = resource?.name || '';
        document.getElementById('resourceRole').value = resource?.role || '';
        document.getElementById('resourceEmail').value = resource?.email || '';
        document.getElementById('resourcePhone').value = resource?.phone || '';
        document.getElementById('resourceAvailability').value = resource?.availability || 'available';
        document.getElementById('resourceStatus').value = resource?.status || 'active';
        document.getElementById('resourceNotes').value = resource?.notes || '';
        this.openModal('resourceModal');
    },

    saveResource() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('resourceId').value;
        const data = {
            name: document.getElementById('resourceName').value,
            role: document.getElementById('resourceRole').value,
            email: document.getElementById('resourceEmail').value,
            phone: document.getElementById('resourcePhone').value,
            availability: document.getElementById('resourceAvailability').value,
            status: document.getElementById('resourceStatus').value,
            notes: document.getElementById('resourceNotes').value
        };

        if (id) {
            Resources.update(id, data);
        } else {
            Resources.add(data);
        }

        this.closeModal('resourceModal');
        this.renderResourceList();
    },

    editResource(id) {
        const resource = Resources.getById(id);
        if (resource) this.showResourceModal(resource);
    },

    deleteResource(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this resource?')) {
            Resources.delete(id);
            this.renderResourceList();
        }
    },

    // ==================== RISKS ====================
    renderRiskList() {
        const filters = {
            severity: document.getElementById('riskSeverityFilter').value,
            status: document.getElementById('riskStatusFilter').value
        };
        let risks = Risks.getFiltered(filters);
        // Pre-compute sort keys for computed/display-only columns
        const riskDurations = risks.map(r => { const d = Risks.getStatusDurations(r); return d[d.length-1]; });
        const riskSortKeys = {
            0: risks.map((_, i) => i),   // sequence index
            8: riskDurations.map(d => d ? d.durationMs || 0 : 0),
        };
        risks = this._applyTableSort('risks-table', risks, {
            1: 'description', 2: 'severity', 3: 'probability', 4: 'impact',
            5: 'mitigation', 6: 'owner', 7: 'status'
        }, riskSortKeys);

        const html = risks.map((r, index) => {
            const durCurrent = Risks.getStatusDurations(r);
            const durDisplay = durCurrent[durCurrent.length - 1];
            return `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editRisk('${escapeHtml(r.id)}')">
                <td data-col="0">R-${String(index + 1).padStart(3, '0')}</td>
                <td data-col="1">${escapeHtml(r.description)}</td>
                <td data-col="2"><span class="severity-badge ${escapeHtml(r.severity)}">${escapeHtml(r.severity)}</span></td>
                <td data-col="3">${escapeHtml(r.probability)}</td>
                <td data-col="4">${escapeHtml(r.impact) || '-'}</td>
                <td data-col="5">${escapeHtml(r.mitigation) || '-'}</td>
                <td data-col="6">${escapeHtml(Resources.getName(r.owner))}</td>
                <td data-col="7"><span class="status-badge ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
                <td data-col="8">${durDisplay ? escapeHtml(durDisplay.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteRisk('${escapeHtml(r.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('risksTableBody').innerHTML = html || '<tr><td colspan="10" class="empty-state">No risks found. Click "+ Add Risk" to identify risks.</td></tr>';
        this.applyTableColumnOrder('risks-table', Storage.KEYS.RISKS_COLUMN_ORDER, 9);
        this.applyTableColumnWidths('risks-table', Storage.KEYS.RISKS_COL_WIDTHS, 9);
        this._updateSortIndicators('risks-table');
        this.bindTableColumnDrag('risks-table', Storage.KEYS.RISKS_COLUMN_ORDER, 9);
        this.bindTableColumnResize('risks-table', Storage.KEYS.RISKS_COL_WIDTHS, 9);
        this.bindTableColumnSort('risks-table', () => this.renderRiskList());
    },

    // ==================== MASS EDIT ====================

    // Persistent selection set across renders (cleared on view switch)
    _massSelected: new Set(),
    _massEditAction: null,

    toggleTaskSelection(id, checked) {
        if (!this._massSelected) this._massSelected = new Set();
        if (checked) {
            this._massSelected.add(id);
        } else {
            this._massSelected.delete(id);
        }
        this._updateMassActionBar();
        // Sync header checkbox state
        const visibleIds = this._getVisibleTaskIds();
        const allChecked = visibleIds.length > 0 && visibleIds.every(id => this._massSelected.has(id));
        const headerCb = document.getElementById('taskSelectAllHeader');
        if (headerCb) headerCb.checked = allChecked;
        const barCb = document.getElementById('massSelectAll');
        if (barCb) barCb.checked = allChecked;
        // Highlight row
        const cb = document.querySelector(`.task-row-checkbox[data-id="${CSS.escape(id)}"]`);
        if (cb) cb.closest('tr').classList.toggle('mass-selected', checked);
    },

    _getVisibleTaskIds() {
        return Array.from(document.querySelectorAll('.task-row-checkbox')).map(cb => cb.dataset.id);
    },

    _massSelectAllVisible(checked) {
        if (!this._massSelected) this._massSelected = new Set();
        const ids = this._getVisibleTaskIds();
        ids.forEach(id => {
            if (checked) this._massSelected.add(id);
            else this._massSelected.delete(id);
        });
        // Update all checkboxes and row highlights
        document.querySelectorAll('.task-row-checkbox').forEach(cb => {
            cb.checked = checked;
            cb.closest('tr').classList.toggle('mass-selected', checked);
        });
        const headerCb = document.getElementById('taskSelectAllHeader');
        if (headerCb) headerCb.checked = checked;
        const barCb = document.getElementById('massSelectAll');
        if (barCb) barCb.checked = checked;
        this._updateMassActionBar();
    },

    _updateMassActionBar() {
        const count = this._massSelected ? this._massSelected.size : 0;
        const bar = document.getElementById('massActionBar');
        if (!bar) return;
        bar.style.display = count > 0 ? 'flex' : 'none';
        const countEl = document.getElementById('massSelectionCount');
        if (countEl) countEl.textContent = `${count} task${count !== 1 ? 's' : ''} selected`;
    },

    _showMassEditModal(action) {
        this._massEditAction = action;
        const title = {
            'status': 'Set Status',
            'category': 'Set Category',
            'assignee': 'Set Assignee',
            'duration': 'Set Duration',
            'add-dependency': 'Add Dependency',
            'remove-dependency': 'Remove Dependency'
        }[action] || 'Mass Update';
        document.getElementById('massEditTitle').textContent = title;

        const body = document.getElementById('massEditBody');
        const allTasks = Tasks.getAll();

        if (action === 'status') {
            const opts = Statuses.getAll().map(s =>
                `<option value="${escapeHtml(s.value)}">${escapeHtml(s.name)}</option>`
            ).join('');
            body.innerHTML = `<div class="form-group"><label>New Status</label><select id="massEditValue">${opts}</select></div>`;
        } else if (action === 'category') {
            const opts = Categories.getAll().map(c =>
                `<option value="${escapeHtml(c.value)}">${escapeHtml(c.name)}</option>`
            ).join('');
            body.innerHTML = `<div class="form-group"><label>New Category</label><select id="massEditValue">${opts}</select></div>`;
        } else if (action === 'assignee') {
            body.innerHTML = `<div class="form-group"><label>New Assignee</label><select id="massEditValue"></select></div>`;
            this.populateAssigneeDropdown('massEditValue', '');
        } else if (action === 'duration') {
            body.innerHTML = `
                <div class="form-group">
                    <label>Duration (HH:MM or HH:MM:SS)</label>
                    <input type="text" id="massEditValue" placeholder="e.g. 02:00 or 01:30:00">
                    <p class="help-text">End Date will be recalculated as Start Date + new duration for each selected task.</p>
                </div>`;
        } else if (action === 'add-dependency') {
            const selectedIds = Array.from(this._massSelected);
            const opts = allTasks
                .filter(t => !selectedIds.includes(t.id))
                .map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.taskNumber || t.id)} — ${escapeHtml(t.name)}</option>`)
                .join('');
            body.innerHTML = `
                <div class="form-group">
                    <label>Add this task as a dependency of the selected tasks</label>
                    <select id="massEditValue">${opts}</select>
                    <p class="help-text">The chosen task must complete before the selected tasks can start.</p>
                </div>`;
        } else if (action === 'remove-dependency') {
            // Collect union of dependencies across selected tasks
            const selectedIds = Array.from(this._massSelected);
            const depIdSet = new Set();
            selectedIds.forEach(id => {
                const t = Tasks.getById(id);
                if (t) (t.dependencies || []).forEach(d => depIdSet.add(d));
            });
            if (depIdSet.size === 0) {
                body.innerHTML = `<p class="help-text">The selected tasks have no dependencies to remove.</p>`;
                document.getElementById('massEditApplyBtn').style.display = 'none';
                this.openModal('massEditModal');
                return;
            }
            const opts = Array.from(depIdSet).map(depId => {
                const dt = allTasks.find(t => t.id === depId);
                const label = dt ? `${escapeHtml(dt.taskNumber || dt.id)} — ${escapeHtml(dt.name)}` : escapeHtml(depId);
                return `<option value="${escapeHtml(depId)}">${label}</option>`;
            }).join('');
            body.innerHTML = `
                <div class="form-group">
                    <label>Remove this dependency from the selected tasks</label>
                    <select id="massEditValue">${opts}</select>
                </div>`;
        }
        document.getElementById('massEditApplyBtn').style.display = '';
        this.openModal('massEditModal');
    },

    _applyMassEdit() {
        if (this._assertNotLocked()) return;
        const action = this._massEditAction;
        const valueEl = document.getElementById('massEditValue');
        const value = valueEl ? valueEl.value : '';
        const selectedIds = Array.from(this._massSelected);
        let changed = 0;

        selectedIds.forEach(id => {
            const task = Tasks.getById(id);
            if (!task) return;
            if (action === 'status') {
                Tasks.updateStatus(id, value);
                changed++;
            } else if (action === 'category') {
                Tasks.update(id, { category: value });
                changed++;
            } else if (action === 'assignee') {
                Tasks.update(id, { assignee: value });
                changed++;
            } else if (action === 'duration') {
                const secs = this.hmsToSeconds(value);
                if (secs !== null && secs > 0) {
                    const updates = { durationSeconds: secs };
                    if (task.startDate) {
                        updates.endDate = new Date(new Date(task.startDate).getTime() + secs * 1000).toISOString();
                    }
                    Tasks.update(id, updates);
                    changed++;
                }
            } else if (action === 'add-dependency') {
                if (value && value !== id) {
                    const deps = new Set(task.dependencies || []);
                    deps.add(value);
                    Tasks.update(id, { dependencies: Array.from(deps) });
                    changed++;
                }
            } else if (action === 'remove-dependency') {
                const deps = (task.dependencies || []).filter(d => d !== value);
                Tasks.update(id, { dependencies: deps });
                changed++;
            }
        });

        this.closeModal('massEditModal');
        if (changed) {
            this._massSelected = new Set();
            this._updateMassActionBar();
            this.renderTaskList();
        }
    },

    _massDeleteSelected() {
        if (this._assertNotLocked()) return;
        const count = this._massSelected ? this._massSelected.size : 0;
        if (!count) return;
        if (!confirm(`Delete ${count} selected task${count !== 1 ? 's' : ''}? This cannot be undone.`)) return;
        Array.from(this._massSelected).forEach(id => Tasks.delete(id));
        this._massSelected = new Set();
        this._updateMassActionBar();
        this.renderTaskList();
    },

    bindRiskActions() {
        document.getElementById('addRiskBtn').addEventListener('click', () => this.showRiskModal());
        document.getElementById('riskSeverityFilter').addEventListener('change', () => this.renderRiskList());
        document.getElementById('riskStatusFilter').addEventListener('change', () => this.renderRiskList());
    },

    showRiskModal(risk = null) {
        document.getElementById('riskModalTitle').textContent = risk ? 'Edit Risk' : 'Add Risk';
        document.getElementById('riskId').value = risk?.id || '';
        document.getElementById('riskDescription').value = risk?.description || '';
        document.getElementById('riskSeverity').value = risk?.severity || 'medium';
        document.getElementById('riskProbability').value = risk?.probability || 'medium';
        document.getElementById('riskImpact').value = risk?.impact || '';
        document.getElementById('riskMitigation').value = risk?.mitigation || '';
        document.getElementById('riskStatus').value = risk?.status || 'open';
        this.populateAssigneeDropdown('riskOwner', risk?.owner);

        const historyEl = document.getElementById('riskStatusHistory');
        const historyContent = document.getElementById('riskStatusHistoryContent');
        if (risk) {
            const durations = Risks.getStatusDurations(risk);
            historyContent.innerHTML = durations.map(d => `
                <div class="status-history-row">
                    <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                    <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                    <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                </div>
            `).join('');
            historyEl.style.display = '';
        } else {
            historyEl.style.display = 'none';
            historyContent.innerHTML = '';
        }

        this.openModal('riskModal');
    },

    saveRisk() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('riskId').value;
        const data = {
            description: document.getElementById('riskDescription').value,
            severity: document.getElementById('riskSeverity').value,
            probability: document.getElementById('riskProbability').value,
            impact: document.getElementById('riskImpact').value,
            mitigation: document.getElementById('riskMitigation').value,
            owner: document.getElementById('riskOwner').value,
            status: document.getElementById('riskStatus').value
        };

        if (id) {
            Risks.update(id, data);
        } else {
            Risks.add(data);
        }

        this.closeModal('riskModal');
        this.renderRiskList();
    },

    editRisk(id) {
        const risk = Risks.getById(id);
        if (risk) this.showRiskModal(risk);
    },

    deleteRisk(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this risk?')) {
            Risks.delete(id);
            this.renderRiskList();
        }
    },

    // ==================== GO/NO-GO ====================
    renderGoNoGo() {
        const gonogo = GoNoGo.get();
        const stats = GoNoGo.getStats();
        const decision = GoNoGo.calculateDecision();

        document.getElementById('gonogoDecision').textContent = decision.toUpperCase();
        document.getElementById('gonogoDecision').className = `status-value ${decision}`;
        
        document.getElementById('goCount').textContent = stats.go;
        document.getElementById('nogoCount').textContent = stats.nogo;
        document.getElementById('pendingCount').textContent = stats.pending;

        const categories = ['technical', 'business', 'operational', 'resource'];
        categories.forEach(cat => {
            const items = gonogo.criteria[cat] || [];
            const html = items.map(item => `
                <div class="checklist-item">
                    <div class="checklist-status">
                        <button class="status-btn go ${item.status === 'go' ? 'active' : ''}" onclick="App.setGoNoGoStatus('${escapeHtml(cat)}', '${escapeHtml(item.id)}', 'go')">✅ GO</button>
                        <button class="status-btn nogo ${item.status === 'nogo' ? 'active' : ''}" onclick="App.setGoNoGoStatus('${escapeHtml(cat)}', '${escapeHtml(item.id)}', 'nogo')">❌ NO-GO</button>
                        <button class="status-btn pending ${item.status === 'pending' ? 'active' : ''}" onclick="App.setGoNoGoStatus('${escapeHtml(cat)}', '${escapeHtml(item.id)}', 'pending')">⏳ PENDING</button>
                    </div>
                    <span class="checklist-text">${escapeHtml(item.text)}</span>
                    <button class="btn-icon" onclick="App.deleteGoNoGoCriteria('${escapeHtml(cat)}', '${escapeHtml(item.id)}')">🗑️</button>
                </div>
            `).join('');
            document.getElementById(`${cat}Checklist`).innerHTML = html || '<p class="empty-text">No criteria added yet</p>';
        });
    },

    bindGoNoGoActions() {
        document.querySelectorAll('.add-criteria-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (this._assertNotLocked()) return;
                const category = e.target.dataset.category;
                const text = prompt('Enter criteria:');
                if (text) {
                    GoNoGo.addCriteria(category, text);
                    this.renderGoNoGo();
                }
            });
        });
    },

    setGoNoGoStatus(category, id, status) {
        if (this._assertNotLocked()) return;
        GoNoGo.updateCriteriaStatus(category, id, status);
        this.renderGoNoGo();
    },

    deleteGoNoGoCriteria(category, id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this criteria?')) {
            GoNoGo.deleteCriteria(category, id);
            this.renderGoNoGo();
        }
    },

    saveGonogoCriteria() {
        if (this._assertNotLocked()) return;
        const category = document.getElementById('criteriaCategory').value;
        const id = document.getElementById('criteriaId').value;
        const text = document.getElementById('criteriaText').value.trim();
        if (!text) return;
        if (id) {
            GoNoGo.updateCriteriaText(category, id, text);
        } else {
            GoNoGo.addCriteria(category, text);
        }
        this.closeModal('criteriaModal');
        this.renderGoNoGo();
    },

    // ==================== ROLLBACK ====================
    renderRollback() {
        const rollback = Rollback.get();
        document.getElementById('rollbackTrigger').value = rollback.trigger || '';
        document.getElementById('pointOfNoReturn').value = rollback.pointOfNoReturn ? new Date(rollback.pointOfNoReturn).toISOString().slice(0, 16) : '';

        const html = (rollback.steps || []).map(step => `
            <div class="rollback-step clickable-row" onclick="if(!event.target.closest('button'))App.editRollbackStep('${escapeHtml(step.id)}')">
                <div class="step-number">${step.order}</div>
                <div class="step-content">
                    <h4>${escapeHtml(step.title)}</h4>
                    <p>${escapeHtml(step.description)}</p>
                    <p class="step-meta">Owner: ${escapeHtml(Resources.getName(step.owner))} | Duration: ${step.duration} min</p>
                </div>
                <div class="step-actions">
                    <button class="btn-icon" onclick="App.deleteRollbackStep('${escapeHtml(step.id)}')">🗑️</button>
                </div>
            </div>
        `).join('');
        document.getElementById('rollbackSteps').innerHTML = html || '<div class="empty-state"><p>No rollback steps defined</p></div>';
    },

    bindRollbackActions() {
        document.getElementById('addRollbackStepBtn').addEventListener('click', () => this.showRollbackStepModal());

        document.getElementById('rollbackTrigger').addEventListener('change', (e) => {
            if (this._assertNotLocked()) { e.target.value = Rollback.get().trigger || ''; return; }
            Rollback.updateTrigger(e.target.value);
        });

        document.getElementById('pointOfNoReturn').addEventListener('change', (e) => {
            if (this._assertNotLocked()) { e.target.value = Rollback.get().pointOfNoReturn ? new Date(Rollback.get().pointOfNoReturn).toISOString().slice(0, 16) : ''; return; }
            Rollback.updatePointOfNoReturn(e.target.value ? new Date(e.target.value).toISOString() : '');
        });
    },

    showRollbackStepModal(step = null) {
        document.getElementById('rollbackStepId').value = step?.id || '';
        document.getElementById('rollbackStepOrder').value = step?.order || (Rollback.get().steps?.length || 0) + 1;
        document.getElementById('rollbackStepTitle').value = step?.title || '';
        document.getElementById('rollbackStepDescription').value = step?.description || '';
        document.getElementById('rollbackStepDuration').value = step?.duration || 30;
        document.getElementById('rollbackStepNotes').value = step?.notes || '';
        this.populateAssigneeDropdown('rollbackStepOwner', step?.owner);
        this.openModal('rollbackModal');
    },

    saveRollbackStep() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('rollbackStepId').value;
        const data = {
            order: parseInt(document.getElementById('rollbackStepOrder').value),
            title: document.getElementById('rollbackStepTitle').value,
            description: document.getElementById('rollbackStepDescription').value,
            owner: document.getElementById('rollbackStepOwner').value,
            duration: parseInt(document.getElementById('rollbackStepDuration').value),
            notes: document.getElementById('rollbackStepNotes').value
        };

        if (id) {
            Rollback.updateStep(id, data);
        } else {
            Rollback.addStep(data);
        }

        this.closeModal('rollbackModal');
        this.renderRollback();
    },

    editRollbackStep(id) {
        const rollback = Rollback.get();
        const step = rollback.steps.find(s => s.id === id);
        if (step) this.showRollbackStepModal(step);
    },

    deleteRollbackStep(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this step?')) {
            Rollback.deleteStep(id);
            this.renderRollback();
        }
    },

    // ==================== COMMUNICATIONS ====================
    renderCommunications() {
        let comms = Communications.getAll();
        comms = this._applyTableSort('communication-table', comms, {
            0: 'timing', 1: 'audience', 2: 'type', 3: 'channel', 4: 'owner', 5: 'status'
        });

        const html = comms.map(c => `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editCommunication('${escapeHtml(c.id)}')">
                <td data-col="0">${new Date(c.timing).toLocaleString()}</td>
                <td data-col="1">${escapeHtml(c.audience)}</td>
                <td data-col="2">${escapeHtml(c.type)}</td>
                <td data-col="3">${escapeHtml(c.channel)}</td>
                <td data-col="4">${escapeHtml(Resources.getName(c.owner))}</td>
                <td data-col="5"><span class="status-badge ${escapeHtml(c.status)}">${escapeHtml(c.status)}</span></td>
                <td data-col="6">${c.template ? '<button class="btn-sm" onclick="App.viewTemplate(\'' + escapeHtml(c.id) + '\')">View</button>' : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.markCommSent('${escapeHtml(c.id)}')">📤</button>
                    <button class="btn-icon" onclick="App.deleteCommunication('${escapeHtml(c.id)}')">🗑️</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('communicationTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No communications planned. Click "+ Add Communication" to plan communications.</td></tr>';
        this.applyTableColumnOrder('communication-table', Storage.KEYS.COMMUNICATION_COLUMN_ORDER, 7);
        this.applyTableColumnWidths('communication-table', Storage.KEYS.COMMUNICATION_COL_WIDTHS, 7);
        this._updateSortIndicators('communication-table');
        this.bindTableColumnDrag('communication-table', Storage.KEYS.COMMUNICATION_COLUMN_ORDER, 7);
        this.bindTableColumnResize('communication-table', Storage.KEYS.COMMUNICATION_COL_WIDTHS, 7);
        this.bindTableColumnSort('communication-table', () => this.renderCommunications());
    },

    viewTemplate(id) {
        const comm = Communications.getById(id);
        if (comm && comm.template) {
            alert(comm.template);
        }
    },

    bindCommunicationActions() {
        document.getElementById('addCommunicationBtn').addEventListener('click', () => this.showCommunicationModal());
    },

    showCommunicationModal(comm = null) {
        document.getElementById('communicationId').value = comm?.id || '';
        document.getElementById('commTiming').value = comm?.timing ? new Date(comm.timing).toISOString().slice(0, 16) : '';
        document.getElementById('commAudience').value = comm?.audience || '';
        document.getElementById('commType').value = comm?.type || 'announcement';
        document.getElementById('commChannel').value = comm?.channel || 'email';
        document.getElementById('commTemplate').value = comm?.template || '';
        document.getElementById('commStatus').value = comm?.status || 'pending';
        this.populateAssigneeDropdown('commOwner', comm?.owner);
        this.openModal('communicationModal');
    },

    saveCommunication() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('communicationId').value;
        const data = {
            timing: new Date(document.getElementById('commTiming').value).toISOString(),
            audience: document.getElementById('commAudience').value,
            type: document.getElementById('commType').value,
            channel: document.getElementById('commChannel').value,
            owner: document.getElementById('commOwner').value,
            template: document.getElementById('commTemplate').value,
            status: document.getElementById('commStatus').value
        };

        if (id) {
            Communications.update(id, data);
        } else {
            Communications.add(data);
        }

        this.closeModal('communicationModal');
        this.renderCommunications();
    },

    editCommunication(id) {
        const comm = Communications.getById(id);
        if (comm) this.showCommunicationModal(comm);
    },

    deleteCommunication(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this communication?')) {
            Communications.delete(id);
            this.renderCommunications();
        }
    },

    markCommSent(id) {
        Communications.updateStatus(id, 'sent');
        this.renderCommunications();
    },

    // ==================== ISSUES ====================
    renderIssueList() {
        const statusFilter = document.getElementById('issueStatusFilter').value;
        const priorityFilter = document.getElementById('issuePriorityFilter').value;
        const categoryFilter = document.getElementById('issueCategoryFilter').value;
        let items = Issues.getAll();
        if (statusFilter) items = items.filter(i => i.status === statusFilter);
        if (priorityFilter) items = items.filter(i => i.priority === priorityFilter);
        if (categoryFilter) items = items.filter(i => i.category === categoryFilter);

        const issueDurations = items.map(item => { const d = Issues.getStatusDurations(item); return d[d.length-1]; });
        const issueSortKeys = {
            0: items.map((_, i) => i),
            7: issueDurations.map(d => d ? d.durationMs || 0 : 0),
        };
        items = this._applyTableSort('issuesTable', items, {
            1: 'title', 2: 'category', 3: 'priority', 4: 'status', 5: 'owner', 6: 'raisedDate'
        }, issueSortKeys);

        const html = items.map((item, idx) => {
            const durations = Issues.getStatusDurations(item);
            const current = durations[durations.length - 1];
            const isBlocked = item.status === 'blocked';
            const catColor = IssueCategories.getColor(item.category);
            const catName = IssueCategories.getName(item.category) || item.category || '-';
            return `
            <tr class="clickable-row${isBlocked ? ' overdue-row' : ''}" onclick="if(!event.target.closest('button'))App.editIssue('${escapeHtml(item.id)}')">
                <td data-col="0">I-${String(idx + 1).padStart(3, '0')}</td>
                <td data-col="1">${escapeHtml(item.title)}</td>
                <td data-col="2"><span class="category-badge" style="background-color:${escapeHtml(catColor)}20;color:${escapeHtml(catColor)};border-color:${escapeHtml(catColor)}40;">${escapeHtml(catName)}</span></td>
                <td data-col="3"><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                <td data-col="4"><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td data-col="5">${escapeHtml(Resources.getName(item.owner))}</td>
                <td data-col="6">${item.raisedDate ? this.formatDateTime24(item.raisedDate) : '-'}</td>
                <td data-col="7" style="${isBlocked ? 'color:var(--danger);font-weight:bold;' : ''}">${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteIssue('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('issuesTableBody').innerHTML = html || '<tr><td colspan="9" class="empty-state">No issues found. Click "+ Add Issue" to log an issue.</td></tr>';
        this.applyTableColumnOrder('issuesTable', Storage.KEYS.ISSUES_COLUMN_ORDER, 8);
        this.applyTableColumnWidths('issuesTable', Storage.KEYS.ISSUES_COL_WIDTHS, 8);
        this._updateSortIndicators('issuesTable');
        this.bindTableColumnDrag('issuesTable', Storage.KEYS.ISSUES_COLUMN_ORDER, 8);
        this.bindTableColumnResize('issuesTable', Storage.KEYS.ISSUES_COL_WIDTHS, 8);
        this.bindTableColumnSort('issuesTable', () => this.renderIssueList());
    },

    bindIssueActions() {
        document.getElementById('addIssueBtn').addEventListener('click', () => this.showIssueModal());
        document.getElementById('issueStatusFilter').addEventListener('change', () => this.renderIssueList());
        document.getElementById('issuePriorityFilter').addEventListener('change', () => this.renderIssueList());
        document.getElementById('issueCategoryFilter').addEventListener('change', () => this.renderIssueList());
    },

    showIssueModal(issue = null) {
        document.getElementById('issueModalTitle').textContent = issue ? 'Edit Issue' : 'Add Issue';
        document.getElementById('issueId').value = issue?.id || '';
        document.getElementById('issueTitle').value = issue?.title || '';
        document.getElementById('issueDescription').value = issue?.description || '';
        this.populateIssueCategoryDropdown('issueCategory', issue?.category);
        document.getElementById('issuePriority').value = issue?.priority || 'medium';
        document.getElementById('issueStatus').value = issue?.status || 'open';
        document.getElementById('issueResolution').value = issue?.resolution || '';
        this.populateAssigneeDropdown('issueOwner', issue?.owner);

        const historyEl = document.getElementById('issueStatusHistory');
        const historyContent = document.getElementById('issueStatusHistoryContent');
        if (issue) {
            const durations = Issues.getStatusDurations(issue);
            historyContent.innerHTML = durations.map(d => `
                <div class="status-history-row">
                    <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                    <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                    <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                </div>
            `).join('');
            historyEl.style.display = '';
        } else {
            historyEl.style.display = 'none';
            historyContent.innerHTML = '';
        }

        this.openModal('issueModal');
    },

    saveIssue() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('issueId').value;
        const data = {
            title: document.getElementById('issueTitle').value,
            description: document.getElementById('issueDescription').value,
            category: document.getElementById('issueCategory').value,
            priority: document.getElementById('issuePriority').value,
            status: document.getElementById('issueStatus').value,
            owner: document.getElementById('issueOwner').value,
            resolution: document.getElementById('issueResolution').value
        };
        if (id) {
            Issues.update(id, data);
        } else {
            Issues.add(data);
        }
        this.closeModal('issueModal');
        this.renderIssueList();
    },

    editIssue(id) {
        const issue = Issues.getById(id);
        if (issue) this.showIssueModal(issue);
    },

    deleteIssue(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this issue?')) {
            Issues.delete(id);
            this.renderIssueList();
        }
    },

    // ==================== DECISIONS ====================
    renderDecisionList() {
        const statusFilter = document.getElementById('decisionStatusFilter').value;
        let items = Decisions.getAll();
        if (statusFilter) items = items.filter(d => d.status === statusFilter);

        const decDurations = items.map(item => { const d = Decisions.getStatusDurations(item); return d[d.length-1]; });
        const decSortKeys = {
            0: items.map((_, i) => i),
            6: decDurations.map(d => d ? d.durationMs || 0 : 0),
        };
        items = this._applyTableSort('decisionsTable', items, {
            1: 'title', 2: 'status', 3: 'decidedBy', 4: 'impact', 5: 'raisedDate'
        }, decSortKeys);

        const html = items.map((item, idx) => {
            const durations = Decisions.getStatusDurations(item);
            const current = durations[durations.length - 1];
            return `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editDecision('${escapeHtml(item.id)}')">
                <td data-col="0">D-${String(idx + 1).padStart(3, '0')}</td>
                <td data-col="1">${escapeHtml(item.title)}</td>
                <td data-col="2"><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td data-col="3">${escapeHtml(Resources.getName(item.decidedBy))}</td>
                <td data-col="4">${escapeHtml(item.impact || '-')}</td>
                <td data-col="5">${item.raisedDate ? this.formatDateTime24(item.raisedDate) : '-'}</td>
                <td data-col="6">${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteDecision('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('decisionsTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No decisions logged. Click "+ Add Decision" to record a decision.</td></tr>';
        this.applyTableColumnOrder('decisionsTable', Storage.KEYS.DECISIONS_COLUMN_ORDER, 7);
        this.applyTableColumnWidths('decisionsTable', Storage.KEYS.DECISIONS_COL_WIDTHS, 7);
        this._updateSortIndicators('decisionsTable');
        this.bindTableColumnDrag('decisionsTable', Storage.KEYS.DECISIONS_COLUMN_ORDER, 7);
        this.bindTableColumnResize('decisionsTable', Storage.KEYS.DECISIONS_COL_WIDTHS, 7);
        this.bindTableColumnSort('decisionsTable', () => this.renderDecisionList());
    },

    bindDecisionActions() {
        document.getElementById('addDecisionBtn').addEventListener('click', () => this.showDecisionModal());
        document.getElementById('decisionStatusFilter').addEventListener('change', () => this.renderDecisionList());
    },

    showDecisionModal(decision = null) {
        document.getElementById('decisionModalTitle').textContent = decision ? 'Edit Decision' : 'Add Decision';
        document.getElementById('decisionId').value = decision?.id || '';
        document.getElementById('decisionTitle').value = decision?.title || '';
        document.getElementById('decisionDescription').value = decision?.description || '';
        document.getElementById('decisionMade').value = decision?.decisionMade || '';
        document.getElementById('decisionOptions').value = decision?.optionsConsidered || '';
        document.getElementById('decisionStatus').value = decision?.status || 'pending';
        document.getElementById('decisionImpact').value = decision?.impact || '';
        this.populateAssigneeDropdown('decisionDecidedBy', decision?.decidedBy);

        const historyEl = document.getElementById('decisionStatusHistory');
        const historyContent = document.getElementById('decisionStatusHistoryContent');
        if (decision) {
            const durations = Decisions.getStatusDurations(decision);
            historyContent.innerHTML = durations.map(d => `
                <div class="status-history-row">
                    <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                    <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                    <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                </div>
            `).join('');
            historyEl.style.display = '';
        } else {
            historyEl.style.display = 'none';
            historyContent.innerHTML = '';
        }

        this.openModal('decisionModal');
    },

    saveDecision() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('decisionId').value;
        const data = {
            title: document.getElementById('decisionTitle').value,
            description: document.getElementById('decisionDescription').value,
            decisionMade: document.getElementById('decisionMade').value,
            optionsConsidered: document.getElementById('decisionOptions').value,
            status: document.getElementById('decisionStatus').value,
            decidedBy: document.getElementById('decisionDecidedBy').value,
            impact: document.getElementById('decisionImpact').value
        };
        if (id) {
            Decisions.update(id, data);
        } else {
            Decisions.add(data);
        }
        this.closeModal('decisionModal');
        this.renderDecisionList();
    },

    editDecision(id) {
        const decision = Decisions.getById(id);
        if (decision) this.showDecisionModal(decision);
    },

    deleteDecision(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this decision?')) {
            Decisions.delete(id);
            this.renderDecisionList();
        }
    },

    // ==================== ACTIONS ====================
    renderActionList() {
        const statusFilter = document.getElementById('actionStatusFilter').value;
        const priorityFilter = document.getElementById('actionPriorityFilter').value;
        let items = Actions.getAll();
        if (statusFilter) items = items.filter(a => a.status === statusFilter);
        if (priorityFilter) items = items.filter(a => a.priority === priorityFilter);

        const now = new Date();
        const actDurations = items.map(item => { const d = Actions.getStatusDurations(item); return d[d.length-1]; });
        const actSortKeys = {
            0: items.map((_, i) => i),
            7: actDurations.map(d => d ? d.durationMs || 0 : 0),
        };
        items = this._applyTableSort('actionsTable', items, {
            1: 'title', 2: 'priority', 3: 'status', 4: 'owner', 5: 'dueDate', 6: 'linkedItem'
        }, actSortKeys);

        const html = items.map((item, idx) => {
            const isOverdue = item.status !== 'completed' && item.dueDate && new Date(item.dueDate) < now;
            const durations = Actions.getStatusDurations(item);
            const current = durations[durations.length - 1];
            return `
            <tr class="clickable-row${isOverdue ? ' overdue-row' : ''}" onclick="if(!event.target.closest('button'))App.editAction('${escapeHtml(item.id)}')">
                <td data-col="0">A-${String(idx + 1).padStart(3, '0')}</td>
                <td data-col="1">${escapeHtml(item.title)}</td>
                <td data-col="2"><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                <td data-col="3"><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td data-col="4">${escapeHtml(Resources.getName(item.owner))}</td>
                <td data-col="5" style="${isOverdue ? 'color:var(--danger);font-weight:bold;' : ''}">${item.dueDate ? this.formatDateTime24(item.dueDate) : '-'}</td>
                <td data-col="6">${escapeHtml(item.linkedItem || '-')}</td>
                <td data-col="7">${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteAction('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('actionsTableBody').innerHTML = html || '<tr><td colspan="9" class="empty-state">No actions found. Click "+ Add Action" to create an action.</td></tr>';
        this.applyTableColumnOrder('actionsTable', Storage.KEYS.ACTIONS_COLUMN_ORDER, 8);
        this.applyTableColumnWidths('actionsTable', Storage.KEYS.ACTIONS_COL_WIDTHS, 8);
        this._updateSortIndicators('actionsTable');
        this.bindTableColumnDrag('actionsTable', Storage.KEYS.ACTIONS_COLUMN_ORDER, 8);
        this.bindTableColumnResize('actionsTable', Storage.KEYS.ACTIONS_COL_WIDTHS, 8);
        this.bindTableColumnSort('actionsTable', () => this.renderActionList());
    },

    bindActionActions() {
        document.getElementById('addActionBtn').addEventListener('click', () => this.showActionModal());
        document.getElementById('actionStatusFilter').addEventListener('change', () => this.renderActionList());
        document.getElementById('actionPriorityFilter').addEventListener('change', () => this.renderActionList());
    },

    showActionModal(action = null) {
        document.getElementById('actionModalTitle').textContent = action ? 'Edit Action' : 'Add Action';
        document.getElementById('actionId').value = action?.id || '';
        document.getElementById('actionTitle').value = action?.title || '';
        document.getElementById('actionDescription').value = action?.description || '';
        document.getElementById('actionPriority').value = action?.priority || 'medium';
        document.getElementById('actionStatus').value = action?.status || 'open';
        document.getElementById('actionDueDate').value = action?.dueDate ? this.toLocalInput(action.dueDate) : '';
        document.getElementById('actionLinkedItem').value = action?.linkedItem || '';
        this.populateAssigneeDropdown('actionOwner', action?.owner);

        const historyEl = document.getElementById('actionStatusHistory');
        const historyContent = document.getElementById('actionStatusHistoryContent');
        if (action) {
            const durations = Actions.getStatusDurations(action);
            historyContent.innerHTML = durations.map(d => `
                <div class="status-history-row">
                    <span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span>
                    <span class="status-history-since">${this.formatDateTime24(d.enteredAt)}</span>
                    <span class="status-history-duration">${escapeHtml(d.durationLabel)}</span>
                </div>
            `).join('');
            historyEl.style.display = '';
        } else {
            historyEl.style.display = 'none';
            historyContent.innerHTML = '';
        }

        this.openModal('actionModal');
    },

    saveAction() {
        if (this._assertNotLocked()) return;
        const id = document.getElementById('actionId').value;
        const dueDateLocal = document.getElementById('actionDueDate').value;
        const data = {
            title: document.getElementById('actionTitle').value,
            description: document.getElementById('actionDescription').value,
            priority: document.getElementById('actionPriority').value,
            status: document.getElementById('actionStatus').value,
            owner: document.getElementById('actionOwner').value,
            dueDate: dueDateLocal ? this.fromLocalInput(dueDateLocal) : '',
            linkedItem: document.getElementById('actionLinkedItem').value
        };
        if (id) {
            Actions.update(id, data);
        } else {
            Actions.add(data);
        }
        this.closeModal('actionModal');
        this.renderActionList();
    },

    editAction(id) {
        const action = Actions.getById(id);
        if (action) this.showActionModal(action);
    },

    deleteAction(id) {
        if (this._assertNotLocked()) return;
        if (confirm('Delete this action?')) {
            Actions.delete(id);
            this.renderActionList();
        }
    },

    // ==================== REPORTS ====================
    bindReportActions() {
        document.querySelectorAll('.generate-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportCard = e.target.closest('.report-card');
                const type = reportCard.dataset.report;
                this.showReport(type);
            });
        });
    },

    showReport(type) {
        const report = Reports.generate(type);
        document.getElementById('reportModalTitle').textContent = report.title;
        document.getElementById('reportContent').innerHTML = report.content;
        this.openModal('reportModal');
    },

    renderReport(type) {
        const report = Reports.generate(type);
        document.getElementById('reportContent').innerHTML = report.content;
    },

    // ==================== GLOBAL ACTIONS ====================
    bindGlobalActions() {
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('importData')?.addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importData(e));
        document.getElementById('importCsvFile')?.addEventListener('change', (e) => this.importCsv(e));

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal.id);
            });
        });

        // Modal save buttons
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.saveProject());
        document.getElementById('saveTaskBtn')?.addEventListener('click', () => this.saveTask());
        document.getElementById('saveResourceBtn')?.addEventListener('click', () => this.saveResource());
        document.getElementById('saveRiskBtn')?.addEventListener('click', () => this.saveRisk());
        document.getElementById('saveRollbackStepBtn')?.addEventListener('click', () => this.saveRollbackStep());
        document.getElementById('saveCommunicationBtn')?.addEventListener('click', () => this.saveCommunication());
        document.getElementById('saveIssueBtn')?.addEventListener('click', () => this.saveIssue());
        document.getElementById('saveDecisionBtn')?.addEventListener('click', () => this.saveDecision());
        document.getElementById('saveActionBtn')?.addEventListener('click', () => this.saveAction());
        document.getElementById('saveCriteriaBtn')?.addEventListener('click', () => this.saveGonogoCriteria());
        document.getElementById('printReportBtn')?.addEventListener('click', () => window.print());
        document.getElementById('projectSettings')?.addEventListener('click', () => this.showProjectModal());
        document.getElementById('resetDataBtn')?.addEventListener('click', () => this.resetData());
        document.getElementById('deleteProjectBtn')?.addEventListener('click', () => {
            this.closeModal('settingsModal');
            this.deleteProject(Storage.getActiveProjectId());
        });
        document.getElementById('saveNewProjectBtn')?.addEventListener('click', () => this.saveNewProject());
    },

    // Per-view CSV export/import buttons (data-export-csv / data-import-csv attributes)
    bindViewCsvButtons() {
        document.addEventListener('click', (e) => {
            const exportBtn = e.target.closest('[data-export-csv]');
            if (exportBtn) {
                this.exportCsv(exportBtn.dataset.exportCsv);
                return;
            }
            const importBtn = e.target.closest('[data-import-csv]');
            if (importBtn) {
                this._pendingCsvImportType = importBtn.dataset.importCsv;
                document.getElementById('importCsvFile').click();
            }
        });
    },

    exportData() {
        const data = Storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const proj = Storage.get(Storage.KEYS.PROJECT);
        const name = (proj?.name || 'cutover-plan').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        a.download = `${name}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportCsv(type) {
        const proj = Storage.get(Storage.KEYS.PROJECT);
        const projName = (proj?.name || 'project').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        const date = new Date().toISOString().split('T')[0];
        const allTasks = Tasks.getAll();

        const configs = {
            tasks: {
                filename: `${projName}-tasks-${date}.csv`,
                headers: ['Task ID','Task Name','Category','Priority','Status','Assignee','Planned Start','Planned End','Duration (HH:MM:SS)','Actual Start','Actual End','Actual Duration (HH:MM:SS)','Milestone','Description','Dependencies'],
                rows: () => Tasks.sortByDate(allTasks).map(t => {
                    const actualDurSecs = t.actualStart && t.actualEnd
                        ? Math.round((new Date(t.actualEnd) - new Date(t.actualStart)) / 1000) : null;
                    const deps = (t.dependencies || []).map(id => {
                        const dep = allTasks.find(x => x.id === id);
                        return dep ? (dep.taskNumber || dep.id) : id;
                    }).join('; ');
                    return [
                        t.taskNumber || '',
                        t.name || '',
                        Categories.getName(t.category) || t.category || '',
                        t.priority || '',
                        Statuses.getName(t.status) || t.status || '',
                        Resources.getName(t.assignee) || '',
                        this.formatDateTime24(t.startDate),
                        this.formatDateTime24(t.endDate),
                        this._csvFmtDuration(t.durationSeconds),
                        t.actualStart ? this.formatDateTime24(t.actualStart) : '',
                        t.actualEnd   ? this.formatDateTime24(t.actualEnd)   : '',
                        actualDurSecs  ? this._csvFmtDuration(actualDurSecs) : '',
                        t.milestone ? 'Yes' : 'No',
                        t.description || '',
                        deps
                    ];
                })
            },
            resources: {
                filename: `${projName}-resources-${date}.csv`,
                headers: ['Name','Role','Email','Phone','Availability','Status','Notes','Assigned Tasks'],
                rows: () => Resources.getAll().map(r => {
                    const assigned = allTasks.filter(t => t.assignee === r.id).map(t => t.taskNumber || t.name).join('; ');
                    return [
                        r.name || '',
                        r.role || '',
                        r.email || '',
                        r.phone || '',
                        r.availability || '',
                        r.status || 'active',
                        r.notes || '',
                        assigned
                    ];
                })
            },
            risks: {
                filename: `${projName}-risks-${date}.csv`,
                headers: ['ID','Description','Severity','Probability','Impact','Mitigation','Owner','Status','Created'],
                rows: () => Risks.getAll().map((r, i) => [
                    `R-${String(i + 1).padStart(3, '0')}`,
                    r.description || '',
                    r.severity || '',
                    r.probability || '',
                    r.impact || '',
                    r.mitigation || '',
                    Resources.getName(r.owner) || '',
                    r.status || '',
                    this.formatDateTime24(r.createdAt)
                ])
            },
            issues: {
                filename: `${projName}-issues-${date}.csv`,
                headers: ['ID','Title','Category','Priority','Status','Owner','Raised Date','Due Date','Resolution','Description'],
                rows: () => Issues.getAll().map((item, i) => [
                    `I-${String(i + 1).padStart(3, '0')}`,
                    item.title || '',
                    IssueCategories.getName(item.category) || item.category || '',
                    item.priority || '',
                    item.status || '',
                    Resources.getName(item.owner) || '',
                    this.formatDateTime24(item.raisedDate),
                    item.dueDate ? this.formatDateTime24(item.dueDate) : '',
                    item.resolution || '',
                    item.description || ''
                ])
            },
            decisions: {
                filename: `${projName}-decisions-${date}.csv`,
                headers: ['ID','Title','Status','Decided By','Impact','Options Considered','Decision Made','Created Date','Decided Date','Description'],
                rows: () => Decisions.getAll().map((item, i) => [
                    `D-${String(i + 1).padStart(3, '0')}`,
                    item.title || '',
                    item.status || '',
                    Resources.getName(item.decidedBy) || '',
                    item.impact || '',
                    item.optionsConsidered || '',
                    item.decisionMade || '',
                    this.formatDateTime24(item.createdDate),
                    item.decidedDate ? this.formatDateTime24(item.decidedDate) : '',
                    item.description || ''
                ])
            },
            actions: {
                filename: `${projName}-actions-${date}.csv`,
                headers: ['ID','Title','Priority','Status','Owner','Due Date','Linked Item','Notes','Description'],
                rows: () => Actions.getAll().map((item, i) => [
                    `A-${String(i + 1).padStart(3, '0')}`,
                    item.title || '',
                    item.priority || '',
                    item.status || '',
                    Resources.getName(item.owner) || '',
                    item.dueDate ? this.formatDateTime24(item.dueDate) : '',
                    item.linkedItem || '',
                    item.notes || '',
                    item.description || ''
                ])
            },
            communications: {
                filename: `${projName}-communications-${date}.csv`,
                headers: ['Timing','Audience','Type','Channel','Owner','Status','Template/Message'],
                rows: () => Communications.getAll().map(c => [
                    c.timing ? this.formatDateTime24(c.timing) : '',
                    c.audience || '',
                    c.type || '',
                    c.channel || '',
                    Resources.getName(c.owner) || '',
                    c.status || '',
                    c.template || ''
                ])
            },
            rollback: {
                filename: `${projName}-rollback-${date}.csv`,
                headers: ['Step','Title','Description','Owner','Duration (min)','Notes'],
                rows: () => {
                    const rb = Rollback.get();
                    const meta = [
                        ['#TRIGGER', rb.trigger || '', '', '', '', ''],
                        ['#POINT_OF_NO_RETURN', rb.pointOfNoReturn || '', '', '', '', '']
                    ];
                    const steps = (rb.steps || []).map(s => [
                        s.order || '',
                        s.title || '',
                        s.description || '',
                        Resources.getName(s.owner) || '',
                        s.duration || '',
                        s.notes || ''
                    ]);
                    return [...meta, ...steps];
                }
            },
            gonogo: {
                filename: `${projName}-gonogo-${date}.csv`,
                headers: ['Category','Criteria','Status'],
                rows: () => {
                    const gng = GoNoGo.get();
                    const rows = [];
                    ['technical','business','operational','resource'].forEach(cat => {
                        (gng.criteria[cat] || []).forEach(item => {
                            rows.push([cat, item.text || '', item.status || '']);
                        });
                    });
                    return rows;
                }
            }
        };

        const config = configs[type];
        if (!config) return;

        const csv = [config.headers, ...config.rows()]
            .map(row => row.map(cell => this._csvCell(String(cell ?? ''))).join(','))
            .join('\r\n');

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = config.filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    _csvCell(value) {
        // Wrap in quotes if the value contains a comma, newline, or double-quote
        const str = value.replace(/\r?\n/g, ' ');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    },

    _csvFmtDuration(secs) {
        if (!secs || secs <= 0) return '';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },

    importCsv(e) {
        const file = e.target.files[0];
        if (!file) return;
        const type = this._pendingCsvImportType;
        if (!type) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const rows = this._parseCsv(event.target.result);
                if (rows.length < 2) { alert('CSV is empty or has no data rows.'); return; }
                const headers = rows[0];
                const dataRows = rows.slice(1);
                const count = this._importCsvRows(type, headers, dataRows);
                alert(`Imported ${count} record(s) from CSV.`);
                this.refreshView(this.currentView);
            } catch (err) {
                alert('Error importing CSV: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    _parseCsv(text) {
        // Strip UTF-8 BOM if present
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        // Normalise line endings to \n
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        const rows = [];
        let row = [];
        let i = 0;
        const len = text.length;

        while (i < len) {
            if (text[i] === '"') {
                // Quoted field
                let field = '';
                i++; // skip opening quote
                while (i < len) {
                    if (text[i] === '"' && text[i + 1] === '"') {
                        field += '"';
                        i += 2;
                    } else if (text[i] === '"') {
                        i++; // skip closing quote
                        break;
                    } else {
                        field += text[i++];
                    }
                }
                row.push(field);
                if (i < len && text[i] === ',') i++; // skip field separator
            } else if (text[i] === '\n') {
                // End of line — push current row and start fresh
                if (row.length > 0) rows.push(row);
                row = [];
                i++;
            } else {
                // Unquoted field — read until comma or newline
                let field = '';
                while (i < len && text[i] !== ',' && text[i] !== '\n') {
                    field += text[i++];
                }
                row.push(field);
                if (i < len && text[i] === ',') i++; // skip field separator
                // If we stopped at \n, let the next iteration handle it
            }
        }
        if (row.length > 0) rows.push(row);
        // Remove rows that are entirely empty strings (blank trailing lines)
        return rows.filter(r => r.some(cell => cell.trim() !== ''));
    },

    _csvLookupResource(name) {
        if (!name) return '';
        const lower = name.trim().toLowerCase();
        const match = Resources.getAll().find(r => (r.name || '').toLowerCase() === lower);
        return match ? match.id : '';
    },

    _csvParseDate(str) {
        if (!str || !str.trim()) return null;
        const d = new Date(str.trim());
        return isNaN(d.getTime()) ? null : d.toISOString();
    },

    _importCsvRows(type, headers, dataRows) {
        const col = (row, name) => {
            const idx = headers.indexOf(name);
            return idx >= 0 ? (row[idx] || '').trim() : '';
        };
        let count = 0;

        // Helper: find or create a task Category by name, return its value slug
        const resolveCategory = (nameRaw) => {
            if (!nameRaw) return Categories.getAll()[0]?.value || 'general';
            const cats = Categories.getAll();
            const match = cats.find(c => c.name.toLowerCase() === nameRaw.toLowerCase());
            if (match) return match.value;
            // Auto-create with a neutral grey colour
            const created = Categories.add(nameRaw, '#6b7280');
            return created.value;
        };

        // Helper: find or create a task Status by name, return its value slug
        const resolveStatus = (nameRaw) => {
            if (!nameRaw) return Statuses.getAll()[0]?.value || 'not-started';
            const all = Statuses.getAll();
            const match = all.find(s => s.name.toLowerCase() === nameRaw.toLowerCase()
                                     || s.value.toLowerCase() === nameRaw.toLowerCase());
            if (match) return match.value;
            return all[0]?.value || 'not-started'; // unknown status → default
        };

        // Helper: find or create an IssueCategory by name, return its value slug
        const resolveIssueCategory = (nameRaw) => {
            if (!nameRaw) return IssueCategories.getAll()[0]?.value || 'general';
            const cats = IssueCategories.getAll();
            const match = cats.find(c => c.name.toLowerCase() === nameRaw.toLowerCase());
            if (match) return match.value;
            const created = IssueCategories.add(nameRaw, '#6b7280');
            return created.value;
        };

        // Helper: find or auto-create a resource by name, return its id
        const resolveResource = (nameRaw) => {
            if (!nameRaw) return '';
            const id = this._csvLookupResource(nameRaw);
            if (id) return id;
            // Auto-create placeholder resource
            const created = Resources.add({
                name: nameRaw,
                role: 'Imported',
                email: '',
                phone: '',
                availability: '',
                status: 'active',
                notes: 'Auto-created during CSV import'
            });
            return created.id;
        };

        if (type === 'tasks') {
            const existing = Tasks.getAll();
            // Pass 1: import all task rows, tracking taskNumber→id and raw dependency strings
            const importedTaskMap = {}; // taskNumber → internal id
            const pendingDeps = [];    // [{id, rawDeps}]

            dataRows.forEach(row => {
                const taskNum = col(row, 'Task ID');
                const name = col(row, 'Task Name') || 'Imported Task';
                const catRaw  = col(row, 'Category');
                const category = resolveCategory(catRaw);
                const statusRaw = col(row, 'Status');
                const status = resolveStatus(statusRaw);
                const priorityRaw = col(row, 'Priority').toLowerCase();
                const priority = ['critical','high','medium','low'].includes(priorityRaw) ? priorityRaw : 'medium';
                const data = {
                    name,
                    category,
                    priority,
                    status,
                    assignee: resolveResource(col(row, 'Assignee')),
                    startDate: this._csvParseDate(col(row, 'Planned Start')),
                    endDate: this._csvParseDate(col(row, 'Planned End')),
                    milestone: col(row, 'Milestone').toLowerCase() === 'yes',
                    description: col(row, 'Description') || '',
                    dependencies: []
                };
                // Duration: parse HH:MM:SS if present
                const durRaw = col(row, 'Duration (HH:MM:SS)') || col(row, 'Duration');
                if (durRaw) {
                    const secs = this.hmsToSeconds(durRaw);
                    if (secs) data.durationSeconds = secs;
                }
                const existingMatch = taskNum ? existing.find(t => t.taskNumber === taskNum) : null;
                let taskId;
                if (existingMatch) {
                    Tasks.update(existingMatch.id, data);
                    taskId = existingMatch.id;
                } else if (taskNum) {
                    const created = Tasks.addWithNumber(data, taskNum);
                    taskId = created.id;
                } else {
                    const created = Tasks.add(data);
                    taskId = created.id;
                }
                if (taskNum) importedTaskMap[taskNum] = taskId;
                // Stash raw dependency string for second pass
                const rawDeps = col(row, 'Dependencies');
                if (rawDeps) pendingDeps.push({ id: taskId, rawDeps });
                count++;
            });

            // Pass 2: resolve dependency taskNumber labels → internal IDs
            if (pendingDeps.length > 0) {
                // Build a full taskNumber→id map (existing + newly imported)
                const allTasks = Tasks.getAll();
                const numberToId = {};
                allTasks.forEach(t => { if (t.taskNumber) numberToId[t.taskNumber] = t.id; });
                pendingDeps.forEach(({ id, rawDeps }) => {
                    const depIds = rawDeps.split(/[;,]/).map(s => s.trim()).filter(Boolean).map(label => numberToId[label]).filter(Boolean);
                    if (depIds.length > 0) Tasks.update(id, { dependencies: depIds });
                });
            }
        } else if (type === 'resources') {
            dataRows.forEach(row => {
                const name = col(row, 'Name');
                if (!name) return;
                const email = col(row, 'Email') || '';
                // Dedup: same name (case-insensitive) — ignore email to handle blank vs undefined
                const dup = Resources.getAll().find(r =>
                    (r.name || '').toLowerCase() === name.toLowerCase()
                );
                if (dup) return;
                Resources.add({
                    name,
                    role: col(row, 'Role') || 'Unassigned',
                    email,
                    phone: col(row, 'Phone') || '',
                    availability: col(row, 'Availability') || '',
                    status: col(row, 'Status') || 'active',
                    notes: col(row, 'Notes') || ''
                });
                count++;
            });
        } else if (type === 'risks') {
            dataRows.forEach(row => {
                const desc = col(row, 'Description') || col(row, 'Risk') || col(row, 'Title');
                if (!desc) return;
                const sev = col(row, 'Severity').toLowerCase();
                const prob = col(row, 'Probability').toLowerCase();
                Risks.add({
                    description: desc,
                    severity: ['high','medium','low'].includes(sev) ? sev : 'medium',
                    probability: ['high','medium','low'].includes(prob) ? prob : 'medium',
                    impact: col(row, 'Impact') || '',
                    mitigation: col(row, 'Mitigation') || '',
                    owner: resolveResource(col(row, 'Owner')),
                    status: col(row, 'Status') || 'open'
                });
                count++;
            });
        } else if (type === 'issues') {
            dataRows.forEach(row => {
                const title = col(row, 'Title') || col(row, 'Issue');
                if (!title) return;
                const catRaw = col(row, 'Category');
                Issues.add({
                    title,
                    category: resolveIssueCategory(catRaw),
                    priority: col(row, 'Priority') || 'medium',
                    status: col(row, 'Status') || 'open',
                    owner: resolveResource(col(row, 'Owner')),
                    raisedDate: this._csvParseDate(col(row, 'Raised Date')),
                    dueDate: this._csvParseDate(col(row, 'Due Date')),
                    resolution: col(row, 'Resolution') || '',
                    description: col(row, 'Description') || ''
                });
                count++;
            });
        } else if (type === 'decisions') {
            dataRows.forEach(row => {
                const title = col(row, 'Title') || col(row, 'Decision');
                if (!title) return;
                Decisions.add({
                    title,
                    status: col(row, 'Status') || 'pending',
                    decidedBy: resolveResource(col(row, 'Decided By')),
                    impact: col(row, 'Impact') || '',
                    optionsConsidered: col(row, 'Options Considered') || '',
                    decisionMade: col(row, 'Decision Made') || '',
                    createdDate: this._csvParseDate(col(row, 'Created Date')),
                    decidedDate: this._csvParseDate(col(row, 'Decided Date')),
                    description: col(row, 'Description') || ''
                });
                count++;
            });
        } else if (type === 'actions') {
            dataRows.forEach(row => {
                const title = col(row, 'Title') || col(row, 'Action');
                if (!title) return;
                Actions.add({
                    title,
                    priority: col(row, 'Priority') || 'medium',
                    status: col(row, 'Status') || 'open',
                    owner: resolveResource(col(row, 'Owner')),
                    dueDate: this._csvParseDate(col(row, 'Due Date')),
                    linkedItem: col(row, 'Linked Item') || '',
                    notes: col(row, 'Notes') || '',
                    description: col(row, 'Description') || ''
                });
                count++;
            });
        } else if (type === 'communications') {
            dataRows.forEach(row => {
                const audience = col(row, 'Audience');
                if (!audience) return;
                Communications.add({
                    timing: this._csvParseDate(col(row, 'Timing')),
                    audience,
                    type: col(row, 'Type') || 'announcement',
                    channel: col(row, 'Channel') || 'email',
                    owner: resolveResource(col(row, 'Owner')),
                    status: col(row, 'Status') || 'pending',
                    template: col(row, 'Template/Message') || ''
                });
                count++;
            });
        } else if (type === 'rollback') {
            dataRows.forEach(row => {
                const first = (row[0] || '').trim();
                if (first === '#TRIGGER') {
                    Rollback.updateTrigger(row[1] || '');
                } else if (first === '#POINT_OF_NO_RETURN') {
                    Rollback.updatePointOfNoReturn(row[1] || '');
                } else if (first === 'Step' || !first) {
                    // skip repeated header or empty rows
                } else {
                    const stepNum = parseInt(first, 10);
                    const title = (row[1] || '').trim() || 'Imported Step';
                    Rollback.addStep({
                        order: isNaN(stepNum) ? 999 : stepNum,
                        title,
                        description: (row[2] || '').trim(),
                        owner: resolveResource((row[3] || '').trim()),
                        duration: parseInt(row[4], 10) || 0,
                        notes: (row[5] || '').trim()
                    });
                    count++;
                }
            });
        } else if (type === 'gonogo') {
            const validCats = ['technical','business','operational','resource'];
            dataRows.forEach(row => {
                const cat = (col(row, 'Category') || '').trim().toLowerCase();
                const text = col(row, 'Criteria');
                const status = col(row, 'Status') || 'pending';
                if (!text || !validCats.includes(cat)) return;
                const criteria = GoNoGo.addCriteria(cat, text);
                if (status !== 'pending') {
                    GoNoGo.updateCriteriaStatus(cat, criteria.id, status);
                }
                count++;
            });
        }
        return count;
    },

    importData(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (Storage.importData(event.target.result)) {
                    alert('Data imported successfully');
                    this.renderProjectSwitcher();
                    this.refreshView(this.currentView);
                } else {
                    alert('Error importing data');
                }
            };
            reader.readAsText(file);
        }
        // Reset the file input so the same file can be re-imported
        e.target.value = '';
    },

    resetData() {
        if (confirm('Are you sure you want to reset all data for this project? This cannot be undone.')) {
            Storage.clearAll();
            Storage.initializeDefaultData();
            this.renderProjectSwitcher();
            this.showView('dashboard');
            alert('Project data has been reset');
        }
    },

    // ==================== PROJECT SWITCHER ====================
    bindProjectSwitcher() {
        const btn = document.getElementById('projectSwitchBtn');
        const dropdown = document.getElementById('projectDropdown');
        if (!btn || !dropdown) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.style.display !== 'none';
            dropdown.style.display = isOpen ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        document.getElementById('newProjectBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            this.showNewProjectModal();
        });
    },

    renderProjectSwitcher() {
        const projects = Storage.getAllProjects();
        const activeId = Storage.getActiveProjectId();
        const activeProject = projects.find(p => p.id === activeId);

        // Update button label
        const label = document.getElementById('activeProjectLabel');
        if (label) label.textContent = activeProject?.name || 'Project';

        // Build dropdown list
        const list = document.getElementById('projectDropdownList');
        if (!list) return;

        list.innerHTML = projects.map(p => `
            <div class="project-dropdown-item ${p.id === activeId ? 'active-project' : ''}"
                 onclick="App.switchProject('${escapeHtml(p.id)}')">
                <span class="project-item-check">${p.id === activeId ? '✓' : ''}</span>
                <span class="project-item-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span>
                <button class="project-item-delete" title="Delete project"
                    onclick="event.stopPropagation(); App.deleteProject('${escapeHtml(p.id)}')" >✕</button>
            </div>
        `).join('') || '<div style="padding:10px 14px;font-size:0.85rem;color:var(--text-muted)">No projects</div>';
    },

    showNewProjectModal() {
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDescription').value = '';
        document.getElementById('newProjectCutoverDate').value = '';
        document.getElementById('copyCurrentProjectData').checked = false;
        this.openModal('newProjectModal');
    },

    saveNewProject() {
        const name = document.getElementById('newProjectName').value.trim();
        if (!name) {
            document.getElementById('newProjectName').focus();
            return;
        }
        const desc = document.getElementById('newProjectDescription').value.trim();
        const dateVal = document.getElementById('newProjectCutoverDate').value;
        const cutoverDate = dateVal ? this.fromLocalInput(dateVal) : null;
        const copyData = document.getElementById('copyCurrentProjectData').checked;

        const sourceId = copyData ? Storage.getActiveProjectId() : null;
        Storage.createProject(name, desc, cutoverDate);
        if (sourceId) {
            Storage.copyProjectData(sourceId);
        }
        this.closeModal('newProjectModal');
        this.reloadApp();
    },

    switchProject(id) {
        if (id === Storage.getActiveProjectId()) {
            document.getElementById('projectDropdown').style.display = 'none';
            return;
        }
        Storage.setActiveProject(id);
        document.getElementById('projectDropdown').style.display = 'none';
        this.reloadApp();
    },

    deleteProject(id) {
        const projects = Storage.getAllProjects();
        if (projects.length <= 1) {
            alert('Cannot delete the only project. Create another project first.');
            return;
        }
        const project = projects.find(p => p.id === id);
        if (!confirm(`Delete project "${project?.name || id}" and all its data? This cannot be undone.`)) return;
        Storage.deleteProject(id);
        this.reloadApp();
    },

    /**
     * Reload the full app state after a project switch without a page reload.
     * Re-renders all dynamic content for the newly active project.
     */
    reloadApp() {
        this.renderProjectSwitcher();
        this.showView('dashboard');
    },

    // ==================== THEME ====================
    bindThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;
        // It's now a checkbox inside the settings modal — sync state on open
        toggle.addEventListener('change', () => {
            const newTheme = toggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            Storage.set(Storage.KEYS.THEME, newTheme);
        });
    },

    _syncThemeCheckbox() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = (document.documentElement.getAttribute('data-theme') === 'dark');
    },

    loadSavedTheme() {
        const theme = Storage.get(Storage.KEYS.THEME) || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        this._syncThemeCheckbox();
    },

    // ==================== SIDEBAR TOGGLE ====================
    bindSidebarToggle() {
        const sidebar  = document.querySelector('.sidebar');
        const main     = document.querySelector('.main-content');
        const overlay  = document.getElementById('sidebarOverlay');

        const isMobile = () => window.innerWidth <= 768;

        const closeMobileSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };

        document.getElementById('sidebarToggle').addEventListener('click', () => {
            if (isMobile()) {
                const open = sidebar.classList.toggle('open');
                overlay.classList.toggle('active', open);
            } else {
                const collapsed = sidebar.classList.toggle('collapsed');
                main.classList.toggle('sidebar-collapsed', collapsed);
                Storage.set('cutover_sidebar_collapsed', collapsed);
                document.getElementById('sidebarToggle').title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
            }
        });

        overlay?.addEventListener('click', closeMobileSidebar);

        // Close mobile sidebar when a nav item is clicked
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => { if (isMobile()) closeMobileSidebar(); });
        });

        // On resize from mobile → desktop, clean up mobile state
        window.addEventListener('resize', () => {
            if (!isMobile()) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    },

    loadSavedSidebarState() {
        const collapsed = Storage.get('cutover_sidebar_collapsed');
        if (collapsed === true) {
            document.querySelector('.sidebar').classList.add('collapsed');
            document.querySelector('.main-content').classList.add('sidebar-collapsed');
            document.getElementById('sidebarToggle').title = 'Expand sidebar';
        }
    },

    // ==================== UTILITIES ====================
    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    populateAssigneeDropdown(selectId, selectedValue = '') {
        const resources = Resources.getAll().filter(r => r.status !== 'inactive');
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Unassigned</option>' +
            resources.map(r => `<option value="${escapeHtml(r.id)}" ${r.id === selectedValue ? 'selected' : ''}>${escapeHtml(r.name)} (${escapeHtml(r.role)})</option>`).join('');
    },

    populateCategoryDropdown(selectId, selectedValue = '') {
        const cats = Categories.getAll();
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = cats.map(c =>
            `<option value="${escapeHtml(c.value)}" ${c.value === selectedValue ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
        ).join('');
    },

    populateStatusDropdown(selectId, selectedValue = '') {
        const statuses = Statuses.getAll();
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = statuses.map(s =>
            `<option value="${escapeHtml(s.value)}" ${s.value === selectedValue ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
        ).join('');
    },

    populateIssueCategoryDropdown(selectId, selectedValue = '') {
        const cats = IssueCategories.getAll();
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">-- Select Category --</option>' +
            cats.map(c =>
                `<option value="${escapeHtml(c.value)}" ${c.value === selectedValue ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
            ).join('');
    },

    populateIssueCategoryFilterDropdown() {
        const select = document.getElementById('issueCategoryFilter');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">All Categories</option>' +
            IssueCategories.getAll().map(c =>
                `<option value="${escapeHtml(c.value)}" ${c.value === current ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
            ).join('');
    },

    // Filter bar helpers — preserve current selection across re-renders
    populateCategoryFilterDropdown() {
        const select = document.getElementById('taskCategoryFilter');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="all">All Categories</option>' +
            Categories.getAll().map(c =>
                `<option value="${escapeHtml(c.value)}" ${c.value === current ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
            ).join('');
    },

    populateStatusFilterDropdown() {
        const select = document.getElementById('taskStatusFilter');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="all">All Status</option>' +
            Statuses.getAll().map(s =>
                `<option value="${escapeHtml(s.value)}" ${s.value === current ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
            ).join('');
    },

    populateAssigneeFilterDropdown() {
        const select = document.getElementById('taskAssigneeFilter');
        if (!select) return;
        const current = select.value;
        select.innerHTML = '<option value="all">All Assignees</option>' +
            '<option value="unassigned">Unassigned</option>' +
            Resources.getAll().filter(r => r.status !== 'inactive').map(r =>
                `<option value="${escapeHtml(r.id)}" ${r.id === current ? 'selected' : ''}>${escapeHtml(r.name)} (${escapeHtml(r.role)})</option>`
            ).join('');
        select.value = current;
    },

    populateTaskDependencyDropdown(currentTaskId, selectedIds = []) {
        const select = document.getElementById('taskDependencies');
        if (!select) return;
        // All tasks except the current one being edited
        const allTasks = Tasks.getAll().filter(t => t.id !== currentTaskId);
        select.innerHTML = allTasks.map(t => {
            const label = `${escapeHtml(t.taskNumber || t.id)} – ${escapeHtml(t.name)}`;
            const sel = selectedIds.includes(t.id) ? 'selected' : '';
            return `<option value="${escapeHtml(t.id)}" ${sel}>${label}</option>`;
        }).join('');
    },

    // ==================== CATEGORIES SETTINGS ====================
    renderCategoriesList() {
        const cats = Categories.getAll();
        const html = cats.map(c => `
            <div class="phase-item" data-id="${escapeHtml(c.id)}">
                <span class="phase-order color-swatch" style="background-color:${escapeHtml(c.color)};"></span>
                <input type="text" class="phase-name-input category-name-input" value="${escapeHtml(c.name)}" data-id="${escapeHtml(c.id)}">
                <input type="color" class="category-color-input" value="${escapeHtml(c.color)}" data-id="${escapeHtml(c.id)}">
                <button class="btn-icon delete-category-btn" data-id="${escapeHtml(c.id)}" title="Delete">🗑️</button>
            </div>
        `).join('');
        document.getElementById('categoriesList').innerHTML = html || '<p class="empty-text">No categories defined</p>';
    },

    bindCategoryActions() {
        const addBtn = document.getElementById('addCategoryBtn');
        addBtn.onclick = () => {
            const nameInput = document.getElementById('newCategoryName');
            const colorInput = document.getElementById('newCategoryColor');
            const name = nameInput.value.trim();
            if (name) {
                Categories.add(name, colorInput.value);
                nameInput.value = '';
                colorInput.value = '#6b7280';
                this.renderCategoriesList();
                this.bindCategoryActions();
            }
        };

        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('Delete this category? Tasks using it will still reference the old slug.')) {
                    Categories.delete(id);
                    this.renderCategoriesList();
                    this.bindCategoryActions();
                }
            };
        });

        document.querySelectorAll('.category-name-input').forEach(input => {
            input.onblur = (e) => {
                const id = e.target.dataset.id;
                const name = e.target.value.trim();
                const row = e.target.closest('.phase-item');
                const colorInput = row.querySelector('.category-color-input');
                if (name) Categories.update(id, name, colorInput.value);
            };
        });

        document.querySelectorAll('.category-color-input').forEach(input => {
            input.onchange = (e) => {
                const id = e.target.dataset.id;
                const row = e.target.closest('.phase-item');
                const nameInput = row.querySelector('.category-name-input');
                const swatch = row.querySelector('.color-swatch');
                const name = nameInput.value.trim();
                if (name) Categories.update(id, name, e.target.value);
                if (swatch) swatch.style.backgroundColor = e.target.value;
            };
        });
    },

    // ==================== STATUSES SETTINGS ====================
    renderStatusesList() {
        const statuses = Statuses.getAll();
        const html = statuses.map(s => `
            <div class="phase-item" data-id="${escapeHtml(s.id)}">
                <span class="phase-order color-swatch" style="background-color:${escapeHtml(s.color)};"></span>
                <input type="text" class="phase-name-input status-name-input" value="${escapeHtml(s.name)}" data-id="${escapeHtml(s.id)}">
                <input type="color" class="status-color-input" value="${escapeHtml(s.color)}" data-id="${escapeHtml(s.id)}">
                <button class="btn-icon delete-status-btn" data-id="${escapeHtml(s.id)}" title="Delete">🗑️</button>
            </div>
        `).join('');
        document.getElementById('statusesList').innerHTML = html || '<p class="empty-text">No statuses defined</p>';
    },

    bindStatusActions() {
        const addBtn = document.getElementById('addStatusBtn');
        addBtn.onclick = () => {
            const nameInput = document.getElementById('newStatusName');
            const colorInput = document.getElementById('newStatusColor');
            const name = nameInput.value.trim();
            if (name) {
                Statuses.add(name, colorInput.value);
                nameInput.value = '';
                colorInput.value = '#6b7280';
                this.renderStatusesList();
                this.bindStatusActions();
            }
        };

        document.querySelectorAll('.delete-status-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('Delete this status? Tasks using it will still reference the old slug.')) {
                    Statuses.delete(id);
                    this.renderStatusesList();
                    this.bindStatusActions();
                }
            };
        });

        document.querySelectorAll('.status-name-input').forEach(input => {
            input.onblur = (e) => {
                const id = e.target.dataset.id;
                const name = e.target.value.trim();
                const row = e.target.closest('.phase-item');
                const colorInput = row.querySelector('.status-color-input');
                if (name) Statuses.update(id, name, colorInput.value);
            };
        });

        document.querySelectorAll('.status-color-input').forEach(input => {
            input.onchange = (e) => {
                const id = e.target.dataset.id;
                const row = e.target.closest('.phase-item');
                const nameInput = row.querySelector('.status-name-input');
                const swatch = row.querySelector('.color-swatch');
                const name = nameInput.value.trim();
                if (name) Statuses.update(id, name, e.target.value);
                if (swatch) swatch.style.backgroundColor = e.target.value;
            };
        });
    },

    // ==================== ISSUE CATEGORIES SETTINGS ====================
    renderIssueCategoriesList() {
        const cats = IssueCategories.getAll();
        const html = cats.map(c => `
            <div class="phase-item" data-id="${escapeHtml(c.id)}">
                <span class="phase-order color-swatch" style="background-color:${escapeHtml(c.color)};"></span>
                <input type="text" class="phase-name-input issue-category-name-input" value="${escapeHtml(c.name)}" data-id="${escapeHtml(c.id)}">
                <input type="color" class="issue-category-color-input" value="${escapeHtml(c.color)}" data-id="${escapeHtml(c.id)}">
                <button class="btn-icon delete-issue-category-btn" data-id="${escapeHtml(c.id)}" title="Delete">🗑️</button>
            </div>
        `).join('');
        document.getElementById('issueCategoriesList').innerHTML = html || '<p class="empty-text">No issue categories defined</p>';
    },

    bindIssueCategoryActions() {
        const addBtn = document.getElementById('addIssueCategoryBtn');
        addBtn.onclick = () => {
            const nameInput = document.getElementById('newIssueCategoryName');
            const colorInput = document.getElementById('newIssueCategoryColor');
            const name = nameInput.value.trim();
            if (name) {
                IssueCategories.add(name, colorInput.value);
                nameInput.value = '';
                colorInput.value = '#6b7280';
                this.renderIssueCategoriesList();
                this.bindIssueCategoryActions();
            }
        };

        document.querySelectorAll('.delete-issue-category-btn').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('Delete this issue category? Issues using it will still reference the old slug.')) {
                    IssueCategories.delete(id);
                    this.renderIssueCategoriesList();
                    this.bindIssueCategoryActions();
                }
            };
        });

        document.querySelectorAll('.issue-category-name-input').forEach(input => {
            input.onblur = (e) => {
                const id = e.target.dataset.id;
                const name = e.target.value.trim();
                const row = e.target.closest('.phase-item');
                const colorInput = row.querySelector('.issue-category-color-input');
                if (name) IssueCategories.update(id, name, colorInput.value);
            };
        });

        document.querySelectorAll('.issue-category-color-input').forEach(input => {
            input.onchange = (e) => {
                const id = e.target.dataset.id;
                const row = e.target.closest('.phase-item');
                const nameInput = row.querySelector('.issue-category-name-input');
                const swatch = row.querySelector('.color-swatch');
                const name = nameInput.value.trim();
                if (name) IssueCategories.update(id, name, e.target.value);
                if (swatch) swatch.style.backgroundColor = e.target.value;
            };
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Timeline.init();
    App.init();
});