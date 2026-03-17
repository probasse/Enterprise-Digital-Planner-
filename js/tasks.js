/**
 * Tasks Module - Handles task management operations
 */

const Tasks = {
    /**
     * Get all tasks
     */
    getAll() {
        return Storage.get(Storage.KEYS.TASKS) || [];
    },

    /**
     * Get task by ID
     */
    getById(id) {
        const tasks = this.getAll();
        return tasks.find(t => t.id === id);
    },

    /**
     * Get task by taskNumber (e.g. "T-001")
     */
    getByTaskNumber(taskNumber) {
        return this.getAll().find(t => t.taskNumber === taskNumber);
    },

    /**
     * Generate next sequential task number
     */
    getNextTaskNumber() {
        const seq = (Storage.get(Storage.KEYS.TASK_SEQ) || 0) + 1;
        Storage.set(Storage.KEYS.TASK_SEQ, seq);
        return 'T-' + String(seq).padStart(3, '0');
    },

    /**
     * Add new task
     */
    add(task) {
        const tasks = this.getAll();
        task.id = Storage.generateId();
        task.taskNumber = this.getNextTaskNumber();
        task.createdAt = new Date().toISOString();
        task.statusHistory = [{ status: task.status || 'not-started', enteredAt: task.createdAt }];
        tasks.push(task);
        Storage.set(Storage.KEYS.TASKS, tasks);
        Storage.addActivity('Task created', task.name);
        return task;
    },

    /**
     * Add a task with an explicit taskNumber (for CSV import).
     * Updates TASK_SEQ if the provided number is numerically higher.
     */
    addWithNumber(task, taskNumber) {
        const tasks = this.getAll();
        task.id = Storage.generateId();
        task.taskNumber = taskNumber;
        task.createdAt = new Date().toISOString();
        task.statusHistory = [{ status: task.status || 'not-started', enteredAt: task.createdAt }];
        tasks.push(task);
        Storage.set(Storage.KEYS.TASKS, tasks);
        // Advance sequence counter if this number is higher than current
        const match = taskNumber.match(/^T-(\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            const current = Storage.get(Storage.KEYS.TASK_SEQ) || 0;
            if (num > current) Storage.set(Storage.KEYS.TASK_SEQ, num);
        }
        Storage.addActivity('Task created', task.name);
        return task;
    },

    /**
     * Update existing task
     */
    update(id, updates) {
        const tasks = this.getAll();
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            const current = tasks[index];
            if (updates.status && updates.status !== current.status) {
                const now = new Date().toISOString();
                const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [{ status: current.status, enteredAt: current.createdAt }];
                history.push({ status: updates.status, enteredAt: now });
                updates.statusHistory = history;
                if (updates.status === 'in-progress' && !current.actualStart) {
                    updates.actualStart = now;
                }
                if (updates.status === 'completed' && !updates.actualEnd) {
                    updates.actualEnd = now;
                }
            }
            tasks[index] = { ...current, ...updates, updatedAt: new Date().toISOString() };
            Storage.set(Storage.KEYS.TASKS, tasks);
            Storage.addActivity('Task updated', tasks[index].name);
            return tasks[index];
        }
        return null;
    },

    /**
     * Delete task
     */
    delete(id) {
        const tasks = this.getAll();
        const task = tasks.find(t => t.id === id);
        const filtered = tasks.filter(t => t.id !== id);
        Storage.set(Storage.KEYS.TASKS, filtered);
        if (task) {
            Storage.addActivity('Task deleted', task.name);
        }
        return true;
    },

    /**
     * Update task status
     */
    updateStatus(id, status) {
        return this.update(id, { status });
    },

    getStatusDurations(task) {
        const history = Array.isArray(task.statusHistory) && task.statusHistory.length
            ? task.statusHistory
            : [{ status: task.status || 'not-started', enteredAt: task.createdAt }];
        const now = Date.now();
        return history.map((entry, i) => {
            const start = new Date(entry.enteredAt).getTime();
            const end = i < history.length - 1 ? new Date(history[i + 1].enteredAt).getTime() : now;
            const ms = end - start;
            return { status: entry.status, enteredAt: entry.enteredAt, durationMs: ms, durationLabel: Issues._fmtDuration(ms) };
        });
    },

    /**
     * Get tasks by category
     */
    getByCategory(category) {
        return this.getAll().filter(t => t.category === category);
    },

    /**
     * Get tasks by status
     */
    getByStatus(status) {
        return this.getAll().filter(t => t.status === status);
    },

    /**
     * Get tasks by assignee
     */
    getByAssignee(assigneeId) {
        return this.getAll().filter(t => t.assignee === assigneeId);
    },

    /**
     * Get filtered tasks
     */
    getFiltered(filters) {
        let tasks = this.getAll();

        const match = (vals, val) => !Array.isArray(vals)
            ? (vals && vals !== 'all' ? val === vals : true)
            : (vals.length === 0 ? true : vals.includes(val));

        if (!match(filters.category, null)) {
            tasks = tasks.filter(t => match(filters.category, t.category));
        }
        if (!match(filters.status, null)) {
            tasks = tasks.filter(t => match(filters.status, t.status));
        }
        if (!match(filters.priority, null)) {
            tasks = tasks.filter(t => match(filters.priority, t.priority));
        }
        if (filters.assignee !== undefined) {
            const vals = filters.assignee;
            const isAll = Array.isArray(vals) ? vals.length === 0 : (!vals || vals === 'all');
            if (!isAll) {
                const arr = Array.isArray(vals) ? vals : [vals];
                if (arr.includes('unassigned')) {
                    const others = arr.filter(v => v !== 'unassigned');
                    tasks = tasks.filter(t => !t.assignee || others.includes(t.assignee));
                } else {
                    tasks = tasks.filter(t => arr.includes(t.assignee));
                }
            }
        }

        return tasks;
    },

    /**
     * Get task statistics
     */
    getStats() {
        const tasks = this.getAll();
        const result = { total: tasks.length };
        Statuses.getAll().forEach(s => {
            result[s.value] = tasks.filter(t => t.status === s.value).length;
        });
        // Backward-compatible aliases used by renderDashboard()
        result.completed  = result['completed']   || 0;
        result.inProgress = result['in-progress'] || 0;
        result.notStarted = result['not-started'] || 0;
        result.blocked    = result['blocked']     || 0;
        return result;
    },

    /**
     * Get progress by category
     */
    getCategoryProgress() {
        const progress = {};
        Categories.getAll().forEach(cat => {
            const catTasks = this.getByCategory(cat.value);
            const completed = catTasks.filter(t => t.status === 'completed').length;
            progress[cat.value] = catTasks.length > 0 ? Math.round((completed / catTasks.length) * 100) : 0;
        });
        return progress;
    },

    /**
     * Get overall progress percentage
     */
    getOverallProgress() {
        const stats = this.getStats();
        return stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    },

    /**
     * Get upcoming critical tasks
     */
    getUpcomingCritical(limit = 5) {
        const now = new Date();
        return this.getAll()
            .filter(t => t.status !== 'completed' && (t.priority === 'critical' || t.priority === 'high'))
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
            .slice(0, limit);
    },

    /**
     * Get milestones
     */
    getMilestones() {
        return this.getAll().filter(t => t.milestone);
    },

    /**
     * Sort tasks by date
     */
    sortByDate(tasks, ascending = true) {
        return [...tasks].sort((a, b) => {
            const dateA = new Date(a.startDate);
            const dateB = new Date(b.startDate);
            return ascending ? dateA - dateB : dateB - dateA;
        });
    }
};

/**
 * Resources Module - Handles resource management
 */
const Resources = {
    /**
     * Get all resources
     */
    getAll() {
        return Storage.get(Storage.KEYS.RESOURCES) || [];
    },

    /**
     * Get resource by ID
     */
    getById(id) {
        const resources = this.getAll();
        return resources.find(r => r.id === id);
    },

    /**
     * Get resource name by ID
     */
    getName(id) {
        const resource = this.getById(id);
        return resource ? resource.name : 'Unassigned';
    },

    /**
     * Add new resource
     */
    add(resource) {
        const resources = this.getAll();
        resource.id = Storage.generateId();
        resources.push(resource);
        Storage.set(Storage.KEYS.RESOURCES, resources);
        Storage.addActivity('Resource added', resource.name);
        return resource;
    },

    /**
     * Update resource
     */
    update(id, updates) {
        const resources = this.getAll();
        const index = resources.findIndex(r => r.id === id);
        if (index !== -1) {
            resources[index] = { ...resources[index], ...updates };
            Storage.set(Storage.KEYS.RESOURCES, resources);
            Storage.addActivity('Resource updated', resources[index].name);
            return resources[index];
        }
        return null;
    },

    /**
     * Delete resource
     */
    delete(id) {
        const resources = this.getAll();
        const resource = resources.find(r => r.id === id);
        const filtered = resources.filter(r => r.id !== id);
        Storage.set(Storage.KEYS.RESOURCES, filtered);
        if (resource) {
            Storage.addActivity('Resource deleted', resource.name);
        }
        return true;
    },

    /**
     * Get assigned task count for resource
     */
    getAssignedTaskCount(resourceId) {
        return Tasks.getByAssignee(resourceId).length;
    }
};

/**
 * Risks Module - Handles risk management
 */
const Risks = {
    /**
     * Get all risks
     */
    getAll() {
        return Storage.get(Storage.KEYS.RISKS) || [];
    },

    /**
     * Get risk by ID
     */
    getById(id) {
        const risks = this.getAll();
        return risks.find(r => r.id === id);
    },

    /**
     * Add new risk
     */
    add(risk) {
        const risks = this.getAll();
        risk.id = Storage.generateId();
        risk.createdAt = new Date().toISOString();
        risk.statusHistory = [{ status: risk.status || 'open', enteredAt: risk.createdAt }];
        risks.push(risk);
        Storage.set(Storage.KEYS.RISKS, risks);
        Storage.addActivity('Risk added', risk.description.substring(0, 50));
        return risk;
    },

    /**
     * Update risk
     */
    update(id, updates) {
        const risks = this.getAll();
        const index = risks.findIndex(r => r.id === id);
        if (index !== -1) {
            const current = risks[index];
            if (updates.status && updates.status !== current.status) {
                const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [{ status: current.status, enteredAt: current.createdAt }];
                history.push({ status: updates.status, enteredAt: new Date().toISOString() });
                updates.statusHistory = history;
            }
            risks[index] = { ...current, ...updates };
            Storage.set(Storage.KEYS.RISKS, risks);
            Storage.addActivity('Risk updated', risks[index].description.substring(0, 50));
            return risks[index];
        }
        return null;
    },

    /**
     * Delete risk
     */
    delete(id) {
        const risks = this.getAll();
        const filtered = risks.filter(r => r.id !== id);
        Storage.set(Storage.KEYS.RISKS, filtered);
        Storage.addActivity('Risk deleted');
        return true;
    },

    /**
     * Get filtered risks
     */
    getFiltered(filters) {
        const match = (vals, val) => !Array.isArray(vals)
            ? (vals && vals !== 'all' ? val === vals : true)
            : (vals.length === 0 ? true : vals.includes(val));

        return this.getAll().filter(r =>
            match(filters.severity, r.severity) && match(filters.status, r.status)
        );
    },

    /**
     * Get risk statistics
     */
    getStatusDurations(risk) {
        const history = Array.isArray(risk.statusHistory) && risk.statusHistory.length
            ? risk.statusHistory
            : [{ status: risk.status || 'open', enteredAt: risk.createdAt }];
        const now = Date.now();
        return history.map((entry, i) => {
            const start = new Date(entry.enteredAt).getTime();
            const end = i < history.length - 1 ? new Date(history[i + 1].enteredAt).getTime() : now;
            const ms = Math.max(0, end - start);
            return { status: entry.status, enteredAt: entry.enteredAt, durationMs: ms, durationLabel: Issues._fmtDuration(ms) };
        });
    },

    getStats() {
        const risks = this.getAll();
        const openRisks = risks.filter(r => r.status === 'open');
        return {
            total: risks.length,
            open: openRisks.length,
            high: openRisks.filter(r => r.severity === 'high').length,
            medium: openRisks.filter(r => r.severity === 'medium').length,
            low: openRisks.filter(r => r.severity === 'low').length,
            mitigated: risks.filter(r => r.status === 'mitigated').length,
            closed: risks.filter(r => r.status === 'closed').length
        };
    }
};

/**
 * Rollback Module - Handles rollback plan
 */
const Rollback = {
    /**
     * Get rollback plan
     */
    get() {
        return Storage.get(Storage.KEYS.ROLLBACK) || { trigger: '', pointOfNoReturn: '', steps: [] };
    },

    /**
     * Save rollback plan
     */
    save(rollback) {
        Storage.set(Storage.KEYS.ROLLBACK, rollback);
        Storage.addActivity('Rollback plan updated');
    },

    /**
     * Add step
     */
    addStep(step) {
        const rollback = this.get();
        step.id = Storage.generateId();
        rollback.steps.push(step);
        rollback.steps.sort((a, b) => a.order - b.order);
        this.save(rollback);
        return step;
    },

    /**
     * Update step
     */
    updateStep(id, updates) {
        const rollback = this.get();
        const index = rollback.steps.findIndex(s => s.id === id);
        if (index !== -1) {
            rollback.steps[index] = { ...rollback.steps[index], ...updates };
            rollback.steps.sort((a, b) => a.order - b.order);
            this.save(rollback);
            return rollback.steps[index];
        }
        return null;
    },

    /**
     * Delete step
     */
    deleteStep(id) {
        const rollback = this.get();
        rollback.steps = rollback.steps.filter(s => s.id !== id);
        this.save(rollback);
        return true;
    },

    /**
     * Update trigger criteria
     */
    updateTrigger(trigger) {
        const rollback = this.get();
        rollback.trigger = trigger;
        this.save(rollback);
    },

    /**
     * Update point of no return
     */
    updatePointOfNoReturn(datetime) {
        const rollback = this.get();
        rollback.pointOfNoReturn = datetime;
        this.save(rollback);
    }
};

/**
 * GoNoGo Module - Handles Go/No-Go decision checklist
 */
const GoNoGo = {
    /**
     * Get Go/No-Go data
     */
    get() {
        return Storage.get(Storage.KEYS.GONOGO) || {
            decision: 'pending',
            notes: '',
            criteria: { technical: [], business: [], operational: [], resource: [] }
        };
    },

    /**
     * Save Go/No-Go data
     */
    save(data) {
        Storage.set(Storage.KEYS.GONOGO, data);
    },

    /**
     * Add criteria
     */
    addCriteria(category, text) {
        const gonogo = this.get();
        const criteria = {
            id: Storage.generateId(),
            text,
            status: 'pending'
        };
        gonogo.criteria[category].push(criteria);
        this.save(gonogo);
        Storage.addActivity('Go/No-Go criteria added', text);
        return criteria;
    },

    /**
     * Update criteria status
     */
    updateCriteriaStatus(category, id, status) {
        const gonogo = this.get();
        const criteria = gonogo.criteria[category].find(c => c.id === id);
        if (criteria) {
            criteria.status = status;
            this.save(gonogo);
            Storage.addActivity('Go/No-Go criteria updated', `${criteria.text}: ${status.toUpperCase()}`);
        }
    },

    /**
     * Delete criteria
     */
    deleteCriteria(category, id) {
        const gonogo = this.get();
        gonogo.criteria[category] = gonogo.criteria[category].filter(c => c.id !== id);
        this.save(gonogo);
    },

    /**
     * Update decision notes
     */
    updateNotes(notes) {
        const gonogo = this.get();
        gonogo.notes = notes;
        this.save(gonogo);
    },

    /**
     * Get statistics
     */
    getStats() {
        const gonogo = this.get();
        let go = 0, nogo = 0, pending = 0;
        
        Object.values(gonogo.criteria).forEach(categoryItems => {
            categoryItems.forEach(item => {
                if (item.status === 'go') go++;
                else if (item.status === 'nogo') nogo++;
                else pending++;
            });
        });
        
        return { go, nogo, pending, total: go + nogo + pending };
    },

    /**
     * Calculate decision
     */
    calculateDecision() {
        const stats = this.getStats();
        if (stats.nogo > 0) return 'nogo';
        if (stats.pending > 0) return 'pending';
        return 'go';
    },

    /**
     * Finalize decision
     */
    finalizeDecision() {
        const gonogo = this.get();
        gonogo.decision = this.calculateDecision();
        gonogo.finalizedAt = new Date().toISOString();
        this.save(gonogo);
        Storage.addActivity('Go/No-Go decision finalized', gonogo.decision.toUpperCase());
        return gonogo.decision;
    }
};

/**
 * Communications Module - Handles communication plan
 */
const Communications = {
    /**
     * Get all communications
     */
    getAll() {
        return Storage.get(Storage.KEYS.COMMUNICATIONS) || [];
    },

    /**
     * Get communication by ID
     */
    getById(id) {
        const comms = this.getAll();
        return comms.find(c => c.id === id);
    },

    /**
     * Add new communication
     */
    add(comm) {
        const comms = this.getAll();
        comm.id = Storage.generateId();
        comms.push(comm);
        comms.sort((a, b) => new Date(a.timing) - new Date(b.timing));
        Storage.set(Storage.KEYS.COMMUNICATIONS, comms);
        Storage.addActivity('Communication added', comm.audience);
        return comm;
    },

    /**
     * Update communication
     */
    update(id, updates) {
        const comms = this.getAll();
        const index = comms.findIndex(c => c.id === id);
        if (index !== -1) {
            comms[index] = { ...comms[index], ...updates };
            comms.sort((a, b) => new Date(a.timing) - new Date(b.timing));
            Storage.set(Storage.KEYS.COMMUNICATIONS, comms);
            Storage.addActivity('Communication updated');
            return comms[index];
        }
        return null;
    },

    /**
     * Delete communication
     */
    delete(id) {
        const comms = this.getAll();
        const filtered = comms.filter(c => c.id !== id);
        Storage.set(Storage.KEYS.COMMUNICATIONS, filtered);
        Storage.addActivity('Communication deleted');
        return true;
    },

    /**
     * Update status
     */
    updateStatus(id, status) {
        return this.update(id, { status });
    }
};

/**
 * Issues Module
 */
const Issues = {
    getAll() { return Storage.get(Storage.KEYS.ISSUES) || []; },
    getById(id) { return this.getAll().find(i => i.id === id); },
    add(issue) {
        const items = this.getAll();
        issue.id = Storage.generateId();
        issue.raisedDate = issue.raisedDate || new Date().toISOString();
        // Initialise history with the first status entry at raisedDate
        issue.statusHistory = [{ status: issue.status || 'open', enteredAt: issue.raisedDate }];
        items.push(issue);
        Storage.set(Storage.KEYS.ISSUES, items);
        Storage.addActivity('Issue raised', issue.title);
        return issue;
    },
    update(id, updates) {
        const items = this.getAll();
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            const current = items[idx];
            // Record a new history entry only when status actually changes
            if (updates.status && updates.status !== current.status) {
                const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [{ status: current.status, enteredAt: current.raisedDate }];
                history.push({ status: updates.status, enteredAt: new Date().toISOString() });
                updates.statusHistory = history;
            }
            items[idx] = { ...current, ...updates };
            Storage.set(Storage.KEYS.ISSUES, items);
            Storage.addActivity('Issue updated');
            return items[idx];
        }
        return null;
    },
    delete(id) {
        Storage.set(Storage.KEYS.ISSUES, this.getAll().filter(i => i.id !== id));
        Storage.addActivity('Issue deleted');
    },
    /**
     * Returns an array of { status, enteredAt, durationMs, durationLabel }
     * for each status this issue has been in. The last entry's duration
     * runs to now (if the issue is not resolved/closed) or to now anyway
     * so reports always show how long it has spent in its current status.
     */
    getStatusDurations(issue) {
        const history = Array.isArray(issue.statusHistory) && issue.statusHistory.length
            ? issue.statusHistory
            : [{ status: issue.status || 'open', enteredAt: issue.raisedDate }];

        const now = Date.now();
        return history.map((entry, i) => {
            const start = new Date(entry.enteredAt).getTime();
            const end = i < history.length - 1 ? new Date(history[i + 1].enteredAt).getTime() : now;
            const ms = Math.max(0, end - start);
            return {
                status: entry.status,
                enteredAt: entry.enteredAt,
                durationMs: ms,
                durationLabel: this._fmtDuration(ms)
            };
        });
    },
    _fmtDuration(ms) {
        const totalSec = Math.floor(ms / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        if (d > 0) return `${d}d ${h}h ${m}m`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    },
    getStats() {
        const items = this.getAll();
        return {
            total:      items.length,
            open:       items.filter(i => i.status === 'open').length,
            inProgress: items.filter(i => i.status === 'in-progress').length,
            blocked:    items.filter(i => i.status === 'blocked').length,
            resolved:   items.filter(i => i.status === 'resolved').length,
            closed:     items.filter(i => i.status === 'closed').length,
            critical:   items.filter(i => i.priority === 'critical').length,
            high:       items.filter(i => i.priority === 'high').length
        };
    }
};

/**
 * Decisions Module
 */
const Decisions = {
    getAll() { return Storage.get(Storage.KEYS.DECISIONS) || []; },
    getById(id) { return this.getAll().find(d => d.id === id); },
    add(decision) {
        const items = this.getAll();
        decision.id = Storage.generateId();
        decision.raisedDate = decision.raisedDate || new Date().toISOString();
        decision.statusHistory = [{ status: decision.status || 'pending', enteredAt: decision.raisedDate }];
        items.push(decision);
        Storage.set(Storage.KEYS.DECISIONS, items);
        Storage.addActivity('Decision logged', decision.title);
        return decision;
    },
    update(id, updates) {
        const items = this.getAll();
        const idx = items.findIndex(d => d.id === id);
        if (idx !== -1) {
            const current = items[idx];
            if (updates.status && updates.status !== current.status) {
                const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [{ status: current.status, enteredAt: current.raisedDate }];
                history.push({ status: updates.status, enteredAt: new Date().toISOString() });
                updates.statusHistory = history;
            }
            items[idx] = { ...current, ...updates };
            Storage.set(Storage.KEYS.DECISIONS, items);
            Storage.addActivity('Decision updated');
            return items[idx];
        }
        return null;
    },
    delete(id) {
        Storage.set(Storage.KEYS.DECISIONS, this.getAll().filter(d => d.id !== id));
        Storage.addActivity('Decision deleted');
    },
    getStatusDurations(decision) {
        const history = Array.isArray(decision.statusHistory) && decision.statusHistory.length
            ? decision.statusHistory
            : [{ status: decision.status || 'pending', enteredAt: decision.raisedDate }];
        const now = Date.now();
        return history.map((entry, i) => {
            const start = new Date(entry.enteredAt).getTime();
            const end = i < history.length - 1 ? new Date(history[i + 1].enteredAt).getTime() : now;
            const ms = Math.max(0, end - start);
            return { status: entry.status, enteredAt: entry.enteredAt, durationMs: ms, durationLabel: Issues._fmtDuration(ms) };
        });
    },
    getStats() {
        const items = this.getAll();
        return {
            total:    items.length,
            pending:  items.filter(d => d.status === 'pending').length,
            approved: items.filter(d => d.status === 'approved').length,
            rejected: items.filter(d => d.status === 'rejected').length,
            deferred: items.filter(d => d.status === 'deferred').length
        };
    }
};

/**
 * Actions Module
 */
const Actions = {
    getAll() { return Storage.get(Storage.KEYS.ACTIONS) || []; },
    getById(id) { return this.getAll().find(a => a.id === id); },
    add(action) {
        const items = this.getAll();
        action.id = Storage.generateId();
        action.createdDate = action.createdDate || new Date().toISOString();
        action.statusHistory = [{ status: action.status || 'open', enteredAt: action.createdDate }];
        items.push(action);
        Storage.set(Storage.KEYS.ACTIONS, items);
        Storage.addActivity('Action created', action.title);
        return action;
    },
    update(id, updates) {
        const items = this.getAll();
        const idx = items.findIndex(a => a.id === id);
        if (idx !== -1) {
            const current = items[idx];
            if (updates.status && updates.status !== current.status) {
                const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [{ status: current.status, enteredAt: current.createdDate }];
                history.push({ status: updates.status, enteredAt: new Date().toISOString() });
                updates.statusHistory = history;
            }
            items[idx] = { ...current, ...updates };
            Storage.set(Storage.KEYS.ACTIONS, items);
            Storage.addActivity('Action updated');
            return items[idx];
        }
        return null;
    },
    delete(id) {
        Storage.set(Storage.KEYS.ACTIONS, this.getAll().filter(a => a.id !== id));
        Storage.addActivity('Action deleted');
    },
    getStatusDurations(action) {
        const history = Array.isArray(action.statusHistory) && action.statusHistory.length
            ? action.statusHistory
            : [{ status: action.status || 'open', enteredAt: action.createdDate }];
        const now = Date.now();
        return history.map((entry, i) => {
            const start = new Date(entry.enteredAt).getTime();
            const end = i < history.length - 1 ? new Date(history[i + 1].enteredAt).getTime() : now;
            const ms = Math.max(0, end - start);
            return { status: entry.status, enteredAt: entry.enteredAt, durationMs: ms, durationLabel: Issues._fmtDuration(ms) };
        });
    },
    getStats() {
        const items = this.getAll();
        return {
            total:      items.length,
            open:       items.filter(a => a.status === 'open').length,
            inProgress: items.filter(a => a.status === 'in-progress').length,
            completed:  items.filter(a => a.status === 'completed').length,
            overdue:    items.filter(a => a.status !== 'completed' && a.dueDate && new Date(a.dueDate) < new Date()).length
        };
    }
};

/**
 * Categories Module - Handles task category management
 */
const Categories = {
    getAll() {
        return Storage.get(Storage.KEYS.CATEGORIES) || [];
    },

    getById(id) {
        return this.getAll().find(c => c.id === id);
    },

    getByValue(value) {
        return this.getAll().find(c => c.value === value);
    },

    getName(value) {
        const cat = this.getByValue(value);
        return cat ? cat.name : value;
    },

    getColor(value) {
        const cat = this.getByValue(value);
        return cat ? cat.color : '#6b7280';
    },

    add(name, color) {
        const cats = this.getAll();
        let value = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        // Deduplicate slug
        const existing = cats.map(c => c.value);
        let deduped = value, n = 2;
        while (existing.includes(deduped)) { deduped = `${value}-${n++}`; }
        value = deduped;
        const newCat = { id: Storage.generateId(), name: name.trim(), color, value };
        cats.push(newCat);
        Storage.set(Storage.KEYS.CATEGORIES, cats);
        Storage.addActivity('Category added', name);
        return newCat;
    },

    update(id, name, color) {
        const cats = this.getAll();
        const index = cats.findIndex(c => c.id === id);
        if (index !== -1) {
            cats[index].name = name.trim();
            cats[index].color = color;
            Storage.set(Storage.KEYS.CATEGORIES, cats);
            Storage.addActivity('Category updated', name);
        }
    },

    delete(id) {
        let cats = this.getAll();
        cats = cats.filter(c => c.id !== id);
        Storage.set(Storage.KEYS.CATEGORIES, cats);
        Storage.addActivity('Category deleted');
    }
};

/**
 * Statuses Module - Handles task status management
 */
const Statuses = {
    getAll() {
        return Storage.get(Storage.KEYS.STATUSES) || [];
    },

    getById(id) {
        return this.getAll().find(s => s.id === id);
    },

    getByValue(value) {
        return this.getAll().find(s => s.value === value);
    },

    getName(value) {
        const s = this.getByValue(value);
        return s ? s.name : value;
    },

    getColor(value) {
        const s = this.getByValue(value);
        return s ? s.color : '#6b7280';
    },

    add(name, color) {
        const statuses = this.getAll();
        let value = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        // Deduplicate slug
        const existing = statuses.map(s => s.value);
        let deduped = value, n = 2;
        while (existing.includes(deduped)) { deduped = `${value}-${n++}`; }
        value = deduped;
        const newStatus = { id: Storage.generateId(), name: name.trim(), color, value };
        statuses.push(newStatus);
        Storage.set(Storage.KEYS.STATUSES, statuses);
        Storage.addActivity('Status added', name);
        return newStatus;
    },

    update(id, name, color) {
        const statuses = this.getAll();
        const index = statuses.findIndex(s => s.id === id);
        if (index !== -1) {
            statuses[index].name = name.trim();
            statuses[index].color = color;
            Storage.set(Storage.KEYS.STATUSES, statuses);
            Storage.addActivity('Status updated', name);
        }
    },

    delete(id) {
        let statuses = this.getAll();
        statuses = statuses.filter(s => s.id !== id);
        Storage.set(Storage.KEYS.STATUSES, statuses);
        Storage.addActivity('Status deleted');
    }
};

/**
 * IssueCategories Module - Handles issue category management
 */
const IssueCategories = {
    getAll() {
        return Storage.get(Storage.KEYS.ISSUE_CATEGORIES) || [];
    },

    getById(id) {
        return this.getAll().find(c => c.id === id);
    },

    getByValue(value) {
        return this.getAll().find(c => c.value === value);
    },

    getName(value) {
        const cat = this.getByValue(value);
        return cat ? cat.name : value;
    },

    getColor(value) {
        const cat = this.getByValue(value);
        return cat ? cat.color : '#6b7280';
    },

    add(name, color) {
        const cats = this.getAll();
        let value = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const existing = cats.map(c => c.value);
        let deduped = value, n = 2;
        while (existing.includes(deduped)) { deduped = `${value}-${n++}`; }
        value = deduped;
        const newCat = { id: Storage.generateId(), name: name.trim(), color, value };
        cats.push(newCat);
        Storage.set(Storage.KEYS.ISSUE_CATEGORIES, cats);
        Storage.addActivity('Issue category added', name);
        return newCat;
    },

    update(id, name, color) {
        const cats = this.getAll();
        const index = cats.findIndex(c => c.id === id);
        if (index !== -1) {
            cats[index].name = name.trim();
            cats[index].color = color;
            Storage.set(Storage.KEYS.ISSUE_CATEGORIES, cats);
            Storage.addActivity('Issue category updated', name);
        }
    },

    delete(id) {
        let cats = this.getAll();
        cats = cats.filter(c => c.id !== id);
        Storage.set(Storage.KEYS.ISSUE_CATEGORIES, cats);
        Storage.addActivity('Issue category deleted');
    }
};
