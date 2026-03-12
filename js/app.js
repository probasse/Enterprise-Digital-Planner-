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
        Storage.addActivity('Project settings updated');
        this.closeModal('settingsModal');
        this.renderProjectSwitcher();
        this.renderDashboard();
        this.renderTaskList();
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
        const tasks = Tasks.sortByDate(Tasks.getFiltered(filters));
        const allTasks = Tasks.getAll();

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
            return `
            <tr class="clickable-row" onclick="if(!event.target.closest('button,select'))App.editTask('${escapeHtml(task.id)}')">
                <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                <td>
                    <select class="status-select" onchange="App.quickUpdateTaskStatus('${escapeHtml(task.id)}', this.value)">
                        ${statusOptions}
                    </select>
                </td>
                <td>${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                <td><span class="category-badge" style="background-color:${catColor}; color:#fff;">${catLabel}</span></td>
                <td><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td>
                <td>${escapeHtml(Resources.getName(task.assignee))}</td>
                <td class="datetime-cell">${this.formatDateTime24(task.startDate)}</td>
                <td class="datetime-cell">${this.formatDateTime24(task.endDate)}</td>
                <td class="duration-cell">${durationStr}</td>
                <td>${depLabels}</td>
                <td class="datetime-cell">${task.actualStart ? this.formatDateTime24(task.actualStart) : '-'}</td>
                <td class="datetime-cell">${task.actualEnd ? this.formatDateTime24(task.actualEnd) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteTask('${escapeHtml(task.id)}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        }).join('');

        document.getElementById('tasksTableBody').innerHTML = html || '<tr><td colspan="13" class="empty-state">No tasks found. Click "+ Add Task" to create one.</td></tr>';
        this.applyColumnVisibility();
    },

    bindTaskActions() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('recalcDatesBtn').addEventListener('click', () => this.recalculateAllDates());
        document.getElementById('taskCategoryFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskStatusFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskPriorityFilter').addEventListener('change', () => this.renderTaskList());
        document.getElementById('taskAssigneeFilter').addEventListener('change', () => this.renderTaskList());
        this.bindColumnVisibility();
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

        // Apply to every row's <td> by column index
        table.querySelectorAll('tbody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            for (let i = 0; i <= 9 && i < cells.length; i++) {
                cells[i].classList.toggle('col-hidden', vis[i] === false);
            }
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

    /**
     * Recalculate start/end dates for all tasks based on dependencies.
     * Processes tasks in topological (dependency) order.
     * For each task whose start date is at or before its latest dependency's end date,
     * snaps start to depEnd + 1s and recomputes end from durationSeconds.
     */
    recalculateAllDates() {
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
            const taskStart = t.startDate ? new Date(t.startDate).getTime() : null;

            // Only snap if task starts at or before the latest dep end
            if (taskStart === null || taskStart <= latestDepEnd) {
                const newStart = new Date(latestDepEnd + 1000);
                t.startDate = newStart.toISOString();
                if (t.durationSeconds && t.durationSeconds > 0) {
                    t.endDate = new Date(newStart.getTime() + t.durationSeconds * 1000).toISOString();
                }
                changed++;
            }
        });

        if (changed === 0) {
            alert('All task dates are already consistent with their dependencies. No changes made.');
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
        if (confirm('Are you sure you want to delete this task?')) {
            Tasks.delete(id);
            this.renderTaskList();
        }
    },

    quickUpdateTaskStatus(id, status) {
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
        const resources = Resources.getAll();

        const html = resources.map(r => {
            const taskCount = Resources.getAssignedTaskCount(r.id);
            const status = r.status || 'active';
            return `
            <tr class="clickable-row${status === 'inactive' ? ' inactive-resource-row' : ''}" onclick="if(!event.target.closest('button'))App.editResource('${escapeHtml(r.id)}')">
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.role)}</td>
                <td>${escapeHtml(r.email) || '-'}</td>
                <td>${escapeHtml(r.phone) || '-'}</td>
                <td>${taskCount}</td>
                <td><span class="availability-badge ${escapeHtml(r.availability)}">${escapeHtml(r.availability)}</span></td>
                <td><span class="status-badge ${escapeHtml(status)}">${escapeHtml(status)}</span></td>
                <td>
                    <button class="btn-icon" onclick="App.deleteResource('${escapeHtml(r.id)}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
        }).join('');

        document.getElementById('resourcesTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No resources found. Click "+ Add Resource" to add team members.</td></tr>';
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
        const risks = Risks.getFiltered(filters);

        const html = risks.map((r, index) => {
            const durations = Risks.getStatusDurations(r);
            const current = durations[durations.length - 1];
            return `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editRisk('${escapeHtml(r.id)}')">
                <td>R-${String(index + 1).padStart(3, '0')}</td>
                <td>${escapeHtml(r.description)}</td>
                <td><span class="severity-badge ${escapeHtml(r.severity)}">${escapeHtml(r.severity)}</span></td>
                <td>${escapeHtml(r.probability)}</td>
                <td>${escapeHtml(r.impact) || '-'}</td>
                <td>${escapeHtml(r.mitigation) || '-'}</td>
                <td>${escapeHtml(Resources.getName(r.owner))}</td>
                <td><span class="status-badge ${escapeHtml(r.status)}">${escapeHtml(r.status)}</span></td>
                <td>${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteRisk('${escapeHtml(r.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('risksTableBody').innerHTML = html || '<tr><td colspan="10" class="empty-state">No risks found. Click "+ Add Risk" to identify risks.</td></tr>';
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
        GoNoGo.updateCriteriaStatus(category, id, status);
        this.renderGoNoGo();
    },

    deleteGoNoGoCriteria(category, id) {
        if (confirm('Delete this criteria?')) {
            GoNoGo.deleteCriteria(category, id);
            this.renderGoNoGo();
        }
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
            Rollback.updateTrigger(e.target.value);
        });

        document.getElementById('pointOfNoReturn').addEventListener('change', (e) => {
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
        if (confirm('Delete this step?')) {
            Rollback.deleteStep(id);
            this.renderRollback();
        }
    },

    // ==================== COMMUNICATIONS ====================
    renderCommunications() {
        const comms = Communications.getAll();
        
        const html = comms.map(c => `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editCommunication('${escapeHtml(c.id)}')">
                <td>${new Date(c.timing).toLocaleString()}</td>
                <td>${escapeHtml(c.audience)}</td>
                <td>${escapeHtml(c.type)}</td>
                <td>${escapeHtml(c.channel)}</td>
                <td>${escapeHtml(Resources.getName(c.owner))}</td>
                <td><span class="status-badge ${escapeHtml(c.status)}">${escapeHtml(c.status)}</span></td>
                <td>${c.template ? '<button class="btn-sm" onclick="App.viewTemplate(\'' + escapeHtml(c.id) + '\')">View</button>' : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.markCommSent('${escapeHtml(c.id)}')">📤</button>
                    <button class="btn-icon" onclick="App.deleteCommunication('${escapeHtml(c.id)}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        document.getElementById('communicationTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No communications planned. Click "+ Add Communication" to plan communications.</td></tr>';
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

        const html = items.map((item, idx) => {
            const durations = Issues.getStatusDurations(item);
            const current = durations[durations.length - 1];
            const isBlocked = item.status === 'blocked';
            const catColor = IssueCategories.getColor(item.category);
            const catName = IssueCategories.getName(item.category) || item.category || '-';
            return `
            <tr class="clickable-row${isBlocked ? ' overdue-row' : ''}" onclick="if(!event.target.closest('button'))App.editIssue('${escapeHtml(item.id)}')">
                <td>I-${String(idx + 1).padStart(3, '0')}</td>
                <td>${escapeHtml(item.title)}</td>
                <td><span class="category-badge" style="background-color:${escapeHtml(catColor)}20;color:${escapeHtml(catColor)};border-color:${escapeHtml(catColor)}40;">${escapeHtml(catName)}</span></td>
                <td><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(Resources.getName(item.owner))}</td>
                <td>${item.raisedDate ? this.formatDateTime24(item.raisedDate) : '-'}</td>
                <td style="${isBlocked ? 'color:var(--danger);font-weight:bold;' : ''}">${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteIssue('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('issuesTableBody').innerHTML = html || '<tr><td colspan="9" class="empty-state">No issues found. Click "+ Add Issue" to log an issue.</td></tr>';
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

        const html = items.map((item, idx) => {
            const durations = Decisions.getStatusDurations(item);
            const current = durations[durations.length - 1];
            return `
            <tr class="clickable-row" onclick="if(!event.target.closest('button'))App.editDecision('${escapeHtml(item.id)}')">
                <td>D-${String(idx + 1).padStart(3, '0')}</td>
                <td>${escapeHtml(item.title)}</td>
                <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(Resources.getName(item.decidedBy))}</td>
                <td>${escapeHtml(item.impact || '-')}</td>
                <td>${item.raisedDate ? this.formatDateTime24(item.raisedDate) : '-'}</td>
                <td>${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteDecision('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('decisionsTableBody').innerHTML = html || '<tr><td colspan="8" class="empty-state">No decisions logged. Click "+ Add Decision" to record a decision.</td></tr>';
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
        const html = items.map((item, idx) => {
            const isOverdue = item.status !== 'completed' && item.dueDate && new Date(item.dueDate) < now;
            const durations = Actions.getStatusDurations(item);
            const current = durations[durations.length - 1];
            return `
            <tr class="clickable-row${isOverdue ? ' overdue-row' : ''}" onclick="if(!event.target.closest('button'))App.editAction('${escapeHtml(item.id)}')">
                <td>A-${String(idx + 1).padStart(3, '0')}</td>
                <td>${escapeHtml(item.title)}</td>
                <td><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(Resources.getName(item.owner))}</td>
                <td style="${isOverdue ? 'color:var(--danger);font-weight:bold;' : ''}">${item.dueDate ? this.formatDateTime24(item.dueDate) : '-'}</td>
                <td>${escapeHtml(item.linkedItem || '-')}</td>
                <td>${current ? escapeHtml(current.durationLabel) : '-'}</td>
                <td>
                    <button class="btn-icon" onclick="App.deleteAction('${escapeHtml(item.id)}')">🗑️</button>
                </td>
            </tr>
        `}).join('');

        document.getElementById('actionsTableBody').innerHTML = html || '<tr><td colspan="9" class="empty-state">No actions found. Click "+ Add Action" to create an action.</td></tr>';
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

        // CSV export dropdown toggle
        const csvBtn = document.getElementById('exportCsvBtn');
        const csvDrop = document.getElementById('csvExportDropdown');
        csvBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            csvDrop.style.display = csvDrop.style.display === 'none' ? 'block' : 'none';
        });
        csvDrop?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-csv]');
            if (btn) {
                this.exportCsv(btn.dataset.csv);
                csvDrop.style.display = 'none';
            }
        });
        document.addEventListener('click', () => { if (csvDrop) csvDrop.style.display = 'none'; });

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
                headers: ['ID','Title','Status','Decided By','Impact','Options','Outcome','Created Date','Decided Date','Description'],
                rows: () => Decisions.getAll().map((item, i) => [
                    `D-${String(i + 1).padStart(3, '0')}`,
                    item.title || '',
                    item.status || '',
                    Resources.getName(item.decidedBy) || '',
                    item.impact || '',
                    item.options || '',
                    item.outcome || '',
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

        Storage.createProject(name, desc, cutoverDate);
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
        document.getElementById('themeToggle').addEventListener('click', () => {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            Storage.set(Storage.KEYS.THEME, newTheme);
        });
    },

    loadSavedTheme() {
        const theme = Storage.get(Storage.KEYS.THEME) || 'light';
        document.documentElement.setAttribute('data-theme', theme);
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
        select.innerHTML = '<option value="">-- Select --</option>' +
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
            Resources.getAll().filter(r => r.status !== 'inactive').map(r =>
                `<option value="${escapeHtml(r.id)}" ${r.id === current ? 'selected' : ''}>${escapeHtml(r.name)} (${escapeHtml(r.role)})</option>`
            ).join('');
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