/**
 * Storage Module - Handles LocalStorage persistence
 */

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const Storage = {
    // ── Global keys (not project-scoped) ──────────────────────────────────────
    GLOBAL_KEYS: {
        THEME:           'cutover_theme',
        PROJECTS:        'cutover_projects',
        ACTIVE_PROJECT:  'cutover_active_project',
        FIREBASE_CONFIG: 'cutover_firebase_config'
    },

    // ── Firebase / Firestore state ──────────────────────────────────────────────
    _db: null,
    _auth: null,
    _firebaseApp: null,
    _firestoreReady: false,
    _suppressSync: false,
    _unsubscribers: [],
    _syncDebounceTimers: {},

    // ── Per-project keys — dynamically namespaced by active project ID ─────────
    get KEYS() {
        const pid = this.getActiveProjectId();
        const ns  = pid ? `cutover_${pid}` : 'cutover_default';
        return {
            PROJECT:        `${ns}_project`,
            TASKS:          `${ns}_tasks`,
            RESOURCES:      `${ns}_resources`,
            RISKS:          `${ns}_risks`,
            ROLLBACK:       `${ns}_rollback`,
            GONOGO:         `${ns}_gonogo`,
            COMMUNICATIONS: `${ns}_communications`,
            ACTIVITY:       `${ns}_activity`,
            THEME:          this.GLOBAL_KEYS.THEME,   // alias kept for compatibility
            TASK_SEQ:       `${ns}_task_seq`,
            CATEGORIES:     `${ns}_categories`,
            STATUSES:       `${ns}_statuses`,
            TIMEZONE:       `${ns}_timezone`,
            ISSUES:         `${ns}_issues`,
            DECISIONS:      `${ns}_decisions`,
            ACTIONS:        `${ns}_actions`,
            TASK_COLUMNS:   `${ns}_task_columns`,
            TASK_NAME_WRAP: `${ns}_task_name_wrap`,
            TASK_COLUMN_ORDER: `${ns}_task_column_order`,
            RESOURCES_COLUMN_ORDER:      `${ns}_resources_col_order`,
            RISKS_COLUMN_ORDER:          `${ns}_risks_col_order`,
            COMMUNICATION_COLUMN_ORDER:  `${ns}_communication_col_order`,
            ISSUES_COLUMN_ORDER:         `${ns}_issues_col_order`,
            DECISIONS_COLUMN_ORDER:      `${ns}_decisions_col_order`,
            ACTIONS_COLUMN_ORDER:        `${ns}_actions_col_order`,
            TASKS_COL_WIDTHS:            `${ns}_tasks_col_widths`,
            RESOURCES_COL_WIDTHS:        `${ns}_resources_col_widths`,
            RISKS_COL_WIDTHS:            `${ns}_risks_col_widths`,
            COMMUNICATION_COL_WIDTHS:    `${ns}_communication_col_widths`,
            ISSUES_COL_WIDTHS:           `${ns}_issues_col_widths`,
            DECISIONS_COL_WIDTHS:        `${ns}_decisions_col_widths`,
            ACTIONS_COL_WIDTHS:          `${ns}_actions_col_widths`,
            ISSUE_CATEGORIES: `${ns}_issue_categories`,
            TAGS:             `${ns}_tags`,
            LOCKED:           `${ns}_locked`,
            SETTINGS:         `${ns}_settings`
        };
    },

    isLocked() {
        return !!Storage.get(Storage.KEYS.LOCKED);
    },

    setLocked(bool) {
        Storage.set(Storage.KEYS.LOCKED, bool);
    },

    // ── Project management ─────────────────────────────────────────────────────
    getActiveProjectId() {
        return localStorage.getItem(this.GLOBAL_KEYS.ACTIVE_PROJECT) || null;
    },

    getAllProjects() {
        return this.get(this.GLOBAL_KEYS.PROJECTS) || [];
    },

    setActiveProject(id) {
        localStorage.setItem(this.GLOBAL_KEYS.ACTIVE_PROJECT, id);
        if (this._firestoreReady && this._auth?.currentUser) {
            this._attachProjectListener(id);
        }
    },

    /**
     * Create a new project, register it, set it as active, and seed default data.
     * Returns the new project object.
     */
    createProject(name, description, cutoverDate) {
        const id = 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
        const project = { id, name: name || 'New Project', description: description || '', cutoverDate: cutoverDate || null, createdAt: new Date().toISOString() };
        const projects = this.getAllProjects();
        projects.push(project);
        this.set(this.GLOBAL_KEYS.PROJECTS, projects);
        this.setActiveProject(id);
        // Seed defaults for this brand-new project; overwrite the project record with user-supplied name/desc/date
        this.initializeDefaultData();
        // Overwrite the default project settings with what the user actually specified
        const seeded = this.get(this.KEYS.PROJECT) || {};
        this.set(this.KEYS.PROJECT, { ...seeded, name: project.name, description: project.description, cutoverDate: project.cutoverDate });
        return project;
    },

    /**
     * Copy all data from sourceId into the currently active project.
     * The new project's name/description/cutoverDate are preserved.
     * Called immediately after createProject() while the new project is active.
     */
    copyProjectData(sourceId) {
        const sourceNs = `cutover_${sourceId}`;
        const destNs   = `cutover_${this.getActiveProjectId()}`;

        // Keys to copy (everything except project settings and UI prefs)
        const dataSuffixes = [
            '_tasks', '_resources', '_risks', '_rollback', '_gonogo',
            '_communications', '_task_seq', '_categories', '_statuses',
            '_issues', '_decisions', '_actions', '_issue_categories', '_tags'
        ];
        dataSuffixes.forEach(suffix => {
            const raw = localStorage.getItem(sourceNs + suffix);
            if (raw !== null) {
                localStorage.setItem(destNs + suffix, raw);
            }
        });
    },

    /**
     * Delete a project: remove all its namespaced keys, remove from registry.
     * If the deleted project was active, switch to the first remaining project
     * (or create a fresh one if none remain).
     */
    deleteProject(id) {
        // Remove all keys belonging to this project
        const prefix = `cutover_${id}_`;
        Object.keys(localStorage)
            .filter(k => k.startsWith(prefix))
            .forEach(k => localStorage.removeItem(k));

        // Remove from registry
        const projects = this.getAllProjects().filter(p => p.id !== id);
        this.set(this.GLOBAL_KEYS.PROJECTS, projects);

        // If we deleted the active project, switch to another
        if (this.getActiveProjectId() === id) {
            if (projects.length > 0) {
                this.setActiveProject(projects[0].id);
            } else {
                localStorage.removeItem(this.GLOBAL_KEYS.ACTIVE_PROJECT);
                this.createProject('My Project', '', null);
            }
        }
    },

    /**
     * Migrate legacy un-namespaced data (from before multi-project support) into
     * a project named "Migrated Project" with ID "proj_legacy".
     */
    _migrateLegacyData() {
        const pid = 'proj_legacy';
        const legacySuffixes = [
            'project', 'tasks', 'resources', 'risks', 'rollback', 'gonogo',
            'communications', 'activity', 'task_seq', 'categories', 'statuses',
            'timezone', 'issues', 'decisions', 'actions'
        ];
        legacySuffixes.forEach(suffix => {
            const oldKey = `cutover_${suffix}`;
            const val = localStorage.getItem(oldKey);
            if (val !== null) {
                localStorage.setItem(`cutover_${pid}_${suffix}`, val);
                localStorage.removeItem(oldKey);
            }
        });
        // Also migrate task_columns if present
        const colVal = localStorage.getItem('cutover_task_columns');
        if (colVal !== null) {
            localStorage.setItem(`cutover_${pid}_task_columns`, colVal);
            localStorage.removeItem('cutover_task_columns');
        }

        // Determine project name from the migrated project settings
        let migratedName = 'Migrated Project';
        try {
            const proj = JSON.parse(localStorage.getItem(`cutover_${pid}_project`));
            if (proj && proj.name) migratedName = proj.name;
        } catch (_) {}

        const now = new Date().toISOString();
        const projects = [{ id: pid, name: migratedName, description: '', cutoverDate: null, createdAt: now }];
        this.set(this.GLOBAL_KEYS.PROJECTS, projects);
        this.setActiveProject(pid);
    },

    /**
     * Initialize storage with default data if empty
     */
    init() {
        const activeId = this.getActiveProjectId();
        if (!activeId) {
            // Check for legacy un-namespaced data (pre-multi-project)
            if (localStorage.getItem('cutover_project') !== null) {
                this._migrateLegacyData();
            } else {
                // Fresh install — create first project (seeds defaults internally)
                this.createProject('My Project', '', null);
            }
            return;
        }
        // Active project is set — ensure its data is seeded
        if (!this.get(this.KEYS.PROJECT)) {
            this.initializeDefaultData();
        } else {
            // Migrate: seed categories/statuses if missing (for existing users)
            if (!this.get(this.KEYS.CATEGORIES)) {
                const categories = [
                    { id: this.generateId(), name: 'Pre-Cutover',    color: '#7c3aed', value: 'pre-cutover' },
                    { id: this.generateId(), name: 'During Cutover', color: '#ea580c', value: 'during-cutover' },
                    { id: this.generateId(), name: 'Post-Cutover',   color: '#16a34a', value: 'post-cutover' },
                    { id: this.generateId(), name: 'Validation',     color: '#0891b2', value: 'validation' }
                ];
                this.set(this.KEYS.CATEGORIES, categories);
            }
            if (!this.get(this.KEYS.STATUSES)) {
                const statuses = [
                    { id: this.generateId(), name: 'Not Started', color: '#6b7280', value: 'not-started' },
                    { id: this.generateId(), name: 'In Progress',  color: '#2563eb', value: 'in-progress' },
                    { id: this.generateId(), name: 'Completed',    color: '#16a34a', value: 'completed' },
                    { id: this.generateId(), name: 'Blocked',      color: '#dc2626', value: 'blocked' }
                ];
                this.set(this.KEYS.STATUSES, statuses);
            }
            // Migrate: back-fill taskNumber on any tasks that are missing it
            this.backfillTaskNumbers();
            // Migrate: seed timezone from browser if missing
            if (!this.get(this.KEYS.TIMEZONE)) {
                this.set(this.KEYS.TIMEZONE, Intl.DateTimeFormat().resolvedOptions().timeZone);
            }
            // Migrate: seed issue categories if missing
            if (!this.get(this.KEYS.ISSUE_CATEGORIES)) {
                const issueCategories = [
                    { id: this.generateId(), name: 'Technical',   color: '#7c3aed', value: 'technical' },
                    { id: this.generateId(), name: 'Data',        color: '#ea580c', value: 'data' },
                    { id: this.generateId(), name: 'Integration', color: '#0891b2', value: 'integration' },
                    { id: this.generateId(), name: 'Security',    color: '#dc2626', value: 'security' },
                    { id: this.generateId(), name: 'Operational', color: '#16a34a', value: 'operational' },
                    { id: this.generateId(), name: 'Resource',    color: '#d97706', value: 'resource' },
                    { id: this.generateId(), name: 'Other',       color: '#6b7280', value: 'other' }
                ];
                this.set(this.KEYS.ISSUE_CATEGORIES, issueCategories);
            }
        }
    },

    /**
     * Ensure every task has a taskNumber; assign sequential ones to any that are missing.
     * Also syncs TASK_SEQ to the highest number found.
     */
    backfillTaskNumbers() {
        const tasks = this.get(this.KEYS.TASKS);
        if (!tasks || tasks.length === 0) return;

        const needsBackfill = tasks.some(t => !t.taskNumber);
        if (!needsBackfill) return;

        let maxSeq = this.get(this.KEYS.TASK_SEQ) || 0;

        // Find the highest existing sequence number
        tasks.forEach(t => {
            if (t.taskNumber) {
                const m = t.taskNumber.match(/^T-(\d+)$/);
                if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
            }
        });

        // Assign missing task numbers in current sort order
        tasks.forEach(t => {
            if (!t.taskNumber) {
                maxSeq++;
                t.taskNumber = 'T-' + String(maxSeq).padStart(3, '0');
            }
        });

        this.set(this.KEYS.TASKS, tasks);
        this.set(this.KEYS.TASK_SEQ, maxSeq);
    },

    /**
     * Get data from localStorage
     */
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return null;
        }
    },

    /**
     * Save data to localStorage
     */
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (this._firestoreReady && !this._suppressSync) {
                this._syncKeyToFirestore(key, data);
            }
            return true;
        } catch (e) {
            console.error('Error writing to localStorage:', e);
            return false;
        }
    },

    /**
     * Remove data from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error removing from localStorage:', e);
            return false;
        }
    },

    /**
     * Clear all data for the active project only (does not touch other projects or global keys)
     */
    clearAll() {
        const pid = this.getActiveProjectId();
        if (!pid) return;
        const prefix = `cutover_${pid}_`;
        Object.keys(localStorage)
            .filter(k => k.startsWith(prefix))
            .forEach(k => localStorage.removeItem(k));
    },

    /**
     * Export all data as JSON
     */
    exportData() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            project: this.get(this.KEYS.PROJECT),
            taskSeq: this.get(this.KEYS.TASK_SEQ) || 0,
            tasks: this.get(this.KEYS.TASKS),
            resources: this.get(this.KEYS.RESOURCES),
            risks: this.get(this.KEYS.RISKS),
            rollback: this.get(this.KEYS.ROLLBACK),
            gonogo: this.get(this.KEYS.GONOGO),
            communications: this.get(this.KEYS.COMMUNICATIONS),
            categories: this.get(this.KEYS.CATEGORIES),
            statuses: this.get(this.KEYS.STATUSES),
            issues: this.get(this.KEYS.ISSUES),
            decisions: this.get(this.KEYS.DECISIONS),
            actions: this.get(this.KEYS.ACTIONS),
            issueCategories: this.get(this.KEYS.ISSUE_CATEGORIES),
            tags: this.get(this.KEYS.TAGS),
            timezone: this.get(this.KEYS.TIMEZONE),
            locked: this.get(this.KEYS.LOCKED)
        };
        return JSON.stringify(data, null, 2);
    },

    /**
     * Import data from JSON
     */
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (data.project) {
                this.set(this.KEYS.PROJECT, data.project);
                // Sync the project registry name with the imported project name
                if (data.project.name) {
                    const pid = this.getActiveProjectId();
                    const projects = this.getAllProjects().map(p =>
                        p.id === pid ? { ...p, name: data.project.name, description: data.project.description || p.description, cutoverDate: data.project.cutoverDate || p.cutoverDate } : p
                    );
                    this.set(this.GLOBAL_KEYS.PROJECTS, projects);
                }
            }
            if (data.resources) this.set(this.KEYS.RESOURCES, data.resources);
            if (data.risks) this.set(this.KEYS.RISKS, data.risks);
            if (data.rollback) this.set(this.KEYS.ROLLBACK, data.rollback);
            if (data.gonogo) this.set(this.KEYS.GONOGO, data.gonogo);
            if (data.communications) this.set(this.KEYS.COMMUNICATIONS, data.communications);
            if (data.categories) this.set(this.KEYS.CATEGORIES, data.categories);
            if (data.statuses) this.set(this.KEYS.STATUSES, data.statuses);
            if (data.issues) this.set(this.KEYS.ISSUES, data.issues);
            if (data.decisions) this.set(this.KEYS.DECISIONS, data.decisions);
            if (data.actions) this.set(this.KEYS.ACTIONS, data.actions);
            if (data.issueCategories) this.set(this.KEYS.ISSUE_CATEGORIES, data.issueCategories);
            if (data.tags) this.set(this.KEYS.TAGS, data.tags);
            if (data.timezone != null) this.set(this.KEYS.TIMEZONE, data.timezone);
            if (data.locked != null)   this.set(this.KEYS.LOCKED, data.locked);

            // Back-fill taskNumber for any tasks that don't have one,
            // then sync TASK_SEQ to the highest number found.
            if (data.tasks) {
                // Seed maxSeq from the exported counter if present
                let maxSeq = (typeof data.taskSeq === 'number') ? data.taskSeq : 0;

                // First pass: find the highest existing sequence number in task data
                data.tasks.forEach(t => {
                    if (t.taskNumber) {
                        const m = t.taskNumber.match(/^T-(\d+)$/);
                        if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
                    }
                });

                // Second pass: assign taskNumber to tasks that are missing one
                data.tasks.forEach(t => {
                    if (!t.taskNumber) {
                        maxSeq++;
                        t.taskNumber = 'T-' + String(maxSeq).padStart(3, '0');
                    }
                });

                // Third pass: apply dependency and duration logic
                // Build a lookup map by task id for fast access
                const taskMap = {};
                data.tasks.forEach(t => { taskMap[t.id] = t; });

                data.tasks.forEach(t => {
                    // 1. Snap start date to 1 second after the latest dependency's end date.
                    //    Handles any number of dependencies (not just single).
                    if (t.dependencies && t.dependencies.length > 0) {
                        const depEnds = t.dependencies
                            .map(depId => taskMap[depId])
                            .filter(dep => dep && dep.endDate)
                            .map(dep => new Date(dep.endDate).getTime());
                        if (depEnds.length) {
                            const latestDepEnd = Math.max(...depEnds);
                            const newStartMs = latestDepEnd + 1000;
                            const taskStartMs = t.startDate ? new Date(t.startDate).getTime() : null;
                            if (taskStartMs === null || taskStartMs !== newStartMs) {
                                t.startDate = new Date(newStartMs).toISOString();
                                if (t.durationSeconds && t.durationSeconds > 0) {
                                    t.endDate = new Date(newStartMs + t.durationSeconds * 1000).toISOString();
                                }
                            }
                        }
                    }

                    // 2. Back-compute durationSeconds from startDate/endDate when missing
                    if (!t.durationSeconds && t.startDate && t.endDate) {
                        const ms = new Date(t.endDate) - new Date(t.startDate);
                        if (ms > 0) {
                            t.durationSeconds = Math.round(ms / 1000);
                        }
                    }
                });

                this.set(this.KEYS.TASKS, data.tasks);
                this.set(this.KEYS.TASK_SEQ, maxSeq);
            }

            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    },

    /**
     * Initialize with sample data for a software cutover project
     */
    initializeDefaultData() {
        // Set cutover date to 7 days from now
        const cutoverDate = new Date();
        cutoverDate.setDate(cutoverDate.getDate() + 7);
        cutoverDate.setHours(22, 0, 0, 0);

        // Project settings
        const project = {
            name: 'ERP System Migration',
            description: 'Migration from legacy ERP system to new cloud-based solution',
            cutoverDate: cutoverDate.toISOString(),
            createdAt: new Date().toISOString()
        };
        this.set(this.KEYS.PROJECT, project);

        // Sample resources
        const resources = [
            {
                id: this.generateId(),
                name: 'John Smith',
                role: 'Project Manager',
                email: 'john.smith@company.com',
                phone: '+1-555-0101',
                availability: 'available',
                notes: 'Primary point of contact for cutover decisions'
            },
            {
                id: this.generateId(),
                name: 'Sarah Johnson',
                role: 'Technical Lead',
                email: 'sarah.johnson@company.com',
                phone: '+1-555-0102',
                availability: 'available',
                notes: 'Responsible for all technical aspects'
            },
            {
                id: this.generateId(),
                name: 'Mike Chen',
                role: 'DBA',
                email: 'mike.chen@company.com',
                phone: '+1-555-0103',
                availability: 'available',
                notes: 'Database migration specialist'
            },
            {
                id: this.generateId(),
                name: 'Emily Davis',
                role: 'QA Lead',
                email: 'emily.davis@company.com',
                phone: '+1-555-0104',
                availability: 'available',
                notes: 'Validation and testing coordinator'
            },
            {
                id: this.generateId(),
                name: 'Tom Wilson',
                role: 'Infrastructure Engineer',
                email: 'tom.wilson@company.com',
                phone: '+1-555-0105',
                availability: 'available',
                notes: 'Server and network configuration'
            }
        ];
        this.set(this.KEYS.RESOURCES, resources);

        // Sample tasks
        const now = new Date();
        const tasks = [
            // Pre-cutover tasks
            {
                id: this.generateId(),
                name: 'Final backup of legacy system',
                category: 'pre-cutover',
                priority: 'critical',
                status: 'completed',
                startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[2].id,
                dependencies: [],
                description: 'Complete full backup of all legacy system databases and files',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Verify backup integrity',
                category: 'pre-cutover',
                priority: 'critical',
                status: 'completed',
                startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(now.getTime() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[2].id,
                dependencies: [],
                description: 'Run verification checks on all backup files',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Send pre-cutover notification to users',
                category: 'pre-cutover',
                priority: 'high',
                status: 'completed',
                startDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[0].id,
                dependencies: [],
                description: 'Notify all users about upcoming system downtime',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Freeze code changes',
                category: 'pre-cutover',
                priority: 'high',
                status: 'in-progress',
                startDate: now.toISOString(),
                endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[1].id,
                dependencies: [],
                description: 'Implement code freeze for all systems',
                milestone: true
            },
            {
                id: this.generateId(),
                name: 'Prepare rollback scripts',
                category: 'pre-cutover',
                priority: 'critical',
                status: 'in-progress',
                startDate: now.toISOString(),
                endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[2].id,
                dependencies: [],
                description: 'Create and test all rollback procedures',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Final Go/No-Go meeting',
                category: 'pre-cutover',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() - 4 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                assignee: resources[0].id,
                dependencies: [],
                description: 'Final decision meeting with all stakeholders',
                milestone: true
            },
            // During cutover tasks
            {
                id: this.generateId(),
                name: 'Disable user access to legacy system',
                category: 'during-cutover',
                priority: 'critical',
                status: 'not-started',
                startDate: cutoverDate.toISOString(),
                endDate: new Date(cutoverDate.getTime() + 0.5 * 60 * 60 * 1000).toISOString(),
                assignee: resources[4].id,
                dependencies: [],
                description: 'Block all user access to prevent data changes',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Execute data migration scripts',
                category: 'during-cutover',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 0.5 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                assignee: resources[2].id,
                dependencies: [],
                description: 'Run all data migration procedures',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Configure new system settings',
                category: 'during-cutover',
                priority: 'high',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                assignee: resources[1].id,
                dependencies: [],
                description: 'Apply production configuration settings',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Switch DNS/Load balancer to new system',
                category: 'during-cutover',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 4.5 * 60 * 60 * 1000).toISOString(),
                assignee: resources[4].id,
                dependencies: [],
                description: 'Point traffic to new system',
                milestone: true
            },
            // Post-cutover tasks
            {
                id: this.generateId(),
                name: 'Enable user access to new system',
                category: 'post-cutover',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 5.5 * 60 * 60 * 1000).toISOString(),
                assignee: resources[4].id,
                dependencies: [],
                description: 'Open system access for all users',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Monitor system performance',
                category: 'post-cutover',
                priority: 'high',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[4].id,
                dependencies: [],
                description: 'Active monitoring of system health and performance',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Send go-live notification',
                category: 'post-cutover',
                priority: 'high',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 6.5 * 60 * 60 * 1000).toISOString(),
                assignee: resources[0].id,
                dependencies: [],
                description: 'Notify all stakeholders that system is live',
                milestone: false
            },
            // Validation tasks
            {
                id: this.generateId(),
                name: 'Execute smoke tests',
                category: 'validation',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 7 * 60 * 60 * 1000).toISOString(),
                assignee: resources[3].id,
                dependencies: [],
                description: 'Run critical path smoke tests',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Verify data integrity',
                category: 'validation',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 5 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                assignee: resources[2].id,
                dependencies: [],
                description: 'Validate data migration accuracy',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Complete user acceptance testing',
                category: 'validation',
                priority: 'high',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[3].id,
                dependencies: [],
                description: 'Business users validate key functionality',
                milestone: false
            },
            {
                id: this.generateId(),
                name: 'Cutover Complete',
                category: 'validation',
                priority: 'critical',
                status: 'not-started',
                startDate: new Date(cutoverDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date(cutoverDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                assignee: resources[0].id,
                dependencies: [],
                description: 'Official sign-off on successful cutover',
                milestone: true
            }
        ];
        this.set(this.KEYS.TASKS, tasks);
        this.backfillTaskNumbers();

        // Sample risks
        const risks = [
            {
                id: this.generateId(),
                description: 'Data migration may take longer than estimated',
                severity: 'high',
                probability: 'medium',
                impact: 'Extended downtime affecting business operations',
                mitigation: 'Have additional DBA resources on standby. Parallel processing scripts ready.',
                owner: resources[2].id,
                status: 'open'
            },
            {
                id: this.generateId(),
                description: 'Network connectivity issues during cutover',
                severity: 'high',
                probability: 'low',
                impact: 'Unable to complete migration, potential data inconsistency',
                mitigation: 'Dedicated network team on standby. Backup network paths configured.',
                owner: resources[4].id,
                status: 'mitigated'
            },
            {
                id: this.generateId(),
                description: 'Key personnel unavailable during cutover window',
                severity: 'medium',
                probability: 'low',
                impact: 'Delayed decision making and troubleshooting',
                mitigation: 'Backup personnel identified and briefed. Contact list updated.',
                owner: resources[0].id,
                status: 'mitigated'
            },
            {
                id: this.generateId(),
                description: 'Third-party integrations fail after migration',
                severity: 'medium',
                probability: 'medium',
                impact: 'Business processes dependent on integrations will fail',
                mitigation: 'All integrations tested in staging. Vendor contacts available.',
                owner: resources[1].id,
                status: 'open'
            }
        ];
        this.set(this.KEYS.RISKS, risks);

        // Rollback plan
        const rollback = {
            trigger: 'Rollback will be triggered if:\n- Data integrity check fails with >1% error rate\n- Critical business functions are non-operational after 2 hours\n- System performance degradation >50%\n- Go/No-Go checklist has any NO-GO items after cutover',
            pointOfNoReturn: new Date(cutoverDate.getTime() + 12 * 60 * 60 * 1000).toISOString(),
            steps: [
                {
                    id: this.generateId(),
                    order: 1,
                    title: 'Stop all user activity',
                    description: 'Immediately disable user access to prevent further data changes',
                    owner: resources[4].id,
                    duration: 15,
                    notes: 'Use emergency access controls'
                },
                {
                    id: this.generateId(),
                    order: 2,
                    title: 'Switch traffic back to legacy system',
                    description: 'Revert DNS/load balancer configuration to point to legacy system',
                    owner: resources[4].id,
                    duration: 30,
                    notes: 'DNS TTL is set to 5 minutes'
                },
                {
                    id: this.generateId(),
                    order: 3,
                    title: 'Restore legacy database if needed',
                    description: 'Restore from backup taken immediately before cutover',
                    owner: resources[2].id,
                    duration: 120,
                    notes: 'Backup location: /backups/pre-cutover/'
                },
                {
                    id: this.generateId(),
                    order: 4,
                    title: 'Verify legacy system functionality',
                    description: 'Run smoke tests to confirm legacy system is operational',
                    owner: resources[3].id,
                    duration: 60,
                    notes: 'Use standard smoke test checklist'
                },
                {
                    id: this.generateId(),
                    order: 5,
                    title: 'Re-enable user access to legacy',
                    description: 'Open access for users to continue operations on legacy system',
                    owner: resources[4].id,
                    duration: 15,
                    notes: ''
                },
                {
                    id: this.generateId(),
                    order: 6,
                    title: 'Send rollback notification',
                    description: 'Notify all stakeholders about rollback and next steps',
                    owner: resources[0].id,
                    duration: 30,
                    notes: 'Use prepared rollback communication template'
                }
            ]
        };
        this.set(this.KEYS.ROLLBACK, rollback);

        // Go/No-Go checklist
        const gonogo = {
            decision: 'pending',
            notes: '',
            criteria: {
                technical: [
                    { id: this.generateId(), text: 'All pre-cutover tasks completed', status: 'pending' },
                    { id: this.generateId(), text: 'Backup verification successful', status: 'go' },
                    { id: this.generateId(), text: 'Rollback scripts tested', status: 'go' },
                    { id: this.generateId(), text: 'All environments ready', status: 'pending' },
                    { id: this.generateId(), text: 'Monitoring systems active', status: 'go' }
                ],
                business: [
                    { id: this.generateId(), text: 'Business stakeholder approval', status: 'pending' },
                    { id: this.generateId(), text: 'User communication sent', status: 'go' },
                    { id: this.generateId(), text: 'Support team briefed', status: 'go' },
                    { id: this.generateId(), text: 'Training completed', status: 'go' }
                ],
                operational: [
                    { id: this.generateId(), text: 'War room setup confirmed', status: 'go' },
                    { id: this.generateId(), text: 'Communication channels tested', status: 'go' },
                    { id: this.generateId(), text: 'Escalation path confirmed', status: 'go' }
                ],
                resource: [
                    { id: this.generateId(), text: 'All key personnel available', status: 'go' },
                    { id: this.generateId(), text: 'Backup resources identified', status: 'go' },
                    { id: this.generateId(), text: 'Vendor support confirmed', status: 'pending' }
                ]
            }
        };
        this.set(this.KEYS.GONOGO, gonogo);

        // Communications plan
        const communications = [
            {
                id: this.generateId(),
                timing: new Date(cutoverDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                audience: 'All Users',
                type: 'announcement',
                channel: 'email',
                owner: resources[0].id,
                template: 'Subject: Upcoming System Migration - Action Required\n\nDear Users,\n\nPlease be advised that our ERP system will be migrated to a new platform on [DATE]. The system will be unavailable from [TIME] to [TIME].\n\nPlease complete any pending transactions before the cutover window.',
                status: 'sent'
            },
            {
                id: this.generateId(),
                timing: new Date(cutoverDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                audience: 'All Users',
                type: 'reminder',
                channel: 'email',
                owner: resources[0].id,
                template: 'Subject: REMINDER - System Migration Tomorrow\n\nThis is a reminder that the system migration will begin tomorrow at [TIME]. Please save all work and log out before the maintenance window.',
                status: 'pending'
            },
            {
                id: this.generateId(),
                timing: cutoverDate.toISOString(),
                audience: 'IT Team',
                type: 'status-update',
                channel: 'slack',
                owner: resources[1].id,
                template: 'Cutover has begun. All team members please join the war room channel. Status updates every 30 minutes.',
                status: 'pending'
            },
            {
                id: this.generateId(),
                timing: new Date(cutoverDate.getTime() + 6 * 60 * 60 * 1000).toISOString(),
                audience: 'All Users',
                type: 'go-live',
                channel: 'email',
                owner: resources[0].id,
                template: 'Subject: System Migration Complete - New System Now Live\n\nThe system migration has been completed successfully. You can now access the new system at [URL].\n\nPlease contact the help desk if you experience any issues.',
                status: 'pending'
            },
            {
                id: this.generateId(),
                timing: new Date(cutoverDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
                audience: 'Management',
                type: 'status-update',
                channel: 'email',
                owner: resources[0].id,
                template: 'Subject: Cutover Status Report\n\nExecutive Summary:\n- Migration Status: [COMPLETE/IN PROGRESS]\n- Issues Encountered: [LIST]\n- Current System Health: [STATUS]',
                status: 'pending'
            }
        ];
        this.set(this.KEYS.COMMUNICATIONS, communications);

        // Default categories
        const categories = [
            { id: this.generateId(), name: 'Pre-Cutover',    color: '#7c3aed', value: 'pre-cutover' },
            { id: this.generateId(), name: 'During Cutover', color: '#ea580c', value: 'during-cutover' },
            { id: this.generateId(), name: 'Post-Cutover',   color: '#16a34a', value: 'post-cutover' },
            { id: this.generateId(), name: 'Validation',     color: '#0891b2', value: 'validation' }
        ];
        this.set(this.KEYS.CATEGORIES, categories);

        // Default statuses
        const statuses = [
            { id: this.generateId(), name: 'Not Started', color: '#6b7280', value: 'not-started' },
            { id: this.generateId(), name: 'In Progress',  color: '#2563eb', value: 'in-progress' },
            { id: this.generateId(), name: 'Completed',    color: '#16a34a', value: 'completed' },
            { id: this.generateId(), name: 'Blocked',      color: '#dc2626', value: 'blocked' }
        ];
        this.set(this.KEYS.STATUSES, statuses);

        // Default issue categories
        const issueCategories = [
            { id: this.generateId(), name: 'Technical',    color: '#7c3aed', value: 'technical' },
            { id: this.generateId(), name: 'Data',         color: '#ea580c', value: 'data' },
            { id: this.generateId(), name: 'Integration',  color: '#0891b2', value: 'integration' },
            { id: this.generateId(), name: 'Security',     color: '#dc2626', value: 'security' },
            { id: this.generateId(), name: 'Operational',  color: '#16a34a', value: 'operational' },
            { id: this.generateId(), name: 'Resource',     color: '#d97706', value: 'resource' },
            { id: this.generateId(), name: 'Other',        color: '#6b7280', value: 'other' }
        ];
        this.set(this.KEYS.ISSUE_CATEGORIES, issueCategories);

        // Activity log
        const activity = [
            {
                id: this.generateId(),
                action: 'Project initialized',
                timestamp: new Date().toISOString(),
                details: 'Cut over planning tool setup complete'
            }
        ];
        this.set(this.KEYS.ACTIVITY, activity);
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Add activity log entry
     */
    addActivity(action, details = '') {
        const activity = this.get(this.KEYS.ACTIVITY) || [];
        activity.unshift({
            id: this.generateId(),
            action,
            details,
            timestamp: new Date().toISOString()
        });
        // Keep only last 50 activities
        if (activity.length > 50) {
            activity.pop();
        }
        this.set(this.KEYS.ACTIVITY, activity);
    },

    // ==================== FIRESTORE SYNC ====================

    initFirestore(config) {
        try {
            if (this._firebaseApp) {
                this._firebaseApp.delete().catch(() => {});
            }
            this._firebaseApp = firebase.initializeApp(config);
            this._auth = firebase.auth();
            this._db = firebase.firestore();
            this._db.enablePersistence({ synchronizeTabs: true }).catch(err => {
                console.warn('Firestore persistence unavailable:', err.code);
            });
            this._firestoreReady = true;
            return true;
        } catch (e) {
            console.error('Firebase init failed:', e);
            this._firestoreReady = false;
            return false;
        }
    },

    _getProjectDocRef(projectId) {
        if (!this._db || !projectId) return null;
        return this._db.collection('projects').doc(projectId);
    },

    _keyToField(key) {
        const pid = this.getActiveProjectId();
        const prefix = pid ? `cutover_${pid}_` : 'cutover_default_';
        if (key.startsWith(prefix)) return key.slice(prefix.length);
        return null;
    },

    _syncKeyToFirestore(key, data) {
        if (!this._firestoreReady || !this._auth?.currentUser) return;
        const field = this._keyToField(key);
        if (!field) return;
        const pid = this.getActiveProjectId();
        const docRef = this._getProjectDocRef(pid);
        if (!docRef) return;
        clearTimeout(this._syncDebounceTimers[key]);
        this._syncDebounceTimers[key] = setTimeout(() => {
            docRef.set({ [field]: data, _lastModified: new Date().toISOString() }, { merge: true })
                .catch(err => console.error('Firestore sync error:', err));
        }, 300);
    },

    _syncProjectRegistry() {
        if (!this._firestoreReady || !this._auth?.currentUser) return;
        const projects = this.getAllProjects();
        this._db.collection('projectRegistry').doc('registry')
            .set({ projects, _lastModified: new Date().toISOString() }, { merge: true })
            .catch(err => console.error('Registry sync error:', err));
    },

    _detachAllListeners() {
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers = [];
    },

    _attachProjectListener(projectId) {
        this._detachAllListeners();
        const docRef = this._getProjectDocRef(projectId);
        if (!docRef) return;

        const _fieldMap = (pid) => {
            const ns = `cutover_${pid}`;
            return {
                project: `${ns}_project`, tasks: `${ns}_tasks`, resources: `${ns}_resources`,
                risks: `${ns}_risks`, rollback: `${ns}_rollback`, gonogo: `${ns}_gonogo`,
                communications: `${ns}_communications`, categories: `${ns}_categories`,
                statuses: `${ns}_statuses`, issues: `${ns}_issues`, decisions: `${ns}_decisions`,
                actions: `${ns}_actions`, issue_categories: `${ns}_issue_categories`,
                tags: `${ns}_tags`, task_seq: `${ns}_task_seq`, timezone: `${ns}_timezone`,
                locked: `${ns}_locked`, activity: `${ns}_activity`, settings: `${ns}_settings`,
                task_columns: `${ns}_task_columns`, task_name_wrap: `${ns}_task_name_wrap`,
                task_column_order: `${ns}_task_column_order`, resources_col_order: `${ns}_resources_col_order`,
                risks_col_order: `${ns}_risks_col_order`, communication_col_order: `${ns}_communication_col_order`,
                issues_col_order: `${ns}_issues_col_order`, decisions_col_order: `${ns}_decisions_col_order`,
                actions_col_order: `${ns}_actions_col_order`,
                tasks_col_widths: `${ns}_tasks_col_widths`, resources_col_widths: `${ns}_resources_col_widths`,
                risks_col_widths: `${ns}_risks_col_widths`, communication_col_widths: `${ns}_communication_col_widths`,
                issues_col_widths: `${ns}_issues_col_widths`, decisions_col_widths: `${ns}_decisions_col_widths`,
                actions_col_widths: `${ns}_actions_col_widths`
            };
        };

        const unsub = docRef.onSnapshot(snapshot => {
            if (!snapshot.exists) return;
            const data = snapshot.data();
            if (!data) return;
            this._suppressSync = true;
            const fm = _fieldMap(projectId);
            Object.entries(fm).forEach(([field, lsKey]) => {
                if (data[field] !== undefined) {
                    localStorage.setItem(lsKey, JSON.stringify(data[field]));
                }
            });
            this._suppressSync = false;
            if (typeof App !== 'undefined' && App.currentView) {
                App.refreshView(App.currentView);
                App.renderDashboard();
            }
        }, err => {
            console.error('Snapshot listener error:', err);
        });

        this._unsubscribers.push(unsub);
    },

    async _initialSync(projectId) {
        if (!this._firestoreReady || !this._auth?.currentUser) return;
        const docRef = this._getProjectDocRef(projectId);
        if (!docRef) return;
        try {
            const snapshot = await docRef.get();
            if (snapshot.exists && snapshot.data()?.tasks) {
                // Firestore has meaningful data — pull it to localStorage
                const data = snapshot.data();
                this._suppressSync = true;
                const ns = `cutover_${projectId}`;
                const fm = {
                    project: `${ns}_project`, tasks: `${ns}_tasks`, resources: `${ns}_resources`,
                    risks: `${ns}_risks`, rollback: `${ns}_rollback`, gonogo: `${ns}_gonogo`,
                    communications: `${ns}_communications`, categories: `${ns}_categories`,
                    statuses: `${ns}_statuses`, issues: `${ns}_issues`, decisions: `${ns}_decisions`,
                    actions: `${ns}_actions`, issue_categories: `${ns}_issue_categories`,
                    tags: `${ns}_tags`, task_seq: `${ns}_task_seq`, timezone: `${ns}_timezone`,
                    locked: `${ns}_locked`, activity: `${ns}_activity`, settings: `${ns}_settings`,
                    task_columns: `${ns}_task_columns`, task_name_wrap: `${ns}_task_name_wrap`,
                    task_column_order: `${ns}_task_column_order`, resources_col_order: `${ns}_resources_col_order`,
                    risks_col_order: `${ns}_risks_col_order`, communication_col_order: `${ns}_communication_col_order`,
                    issues_col_order: `${ns}_issues_col_order`, decisions_col_order: `${ns}_decisions_col_order`,
                    actions_col_order: `${ns}_actions_col_order`,
                    tasks_col_widths: `${ns}_tasks_col_widths`, resources_col_widths: `${ns}_resources_col_widths`,
                    risks_col_widths: `${ns}_risks_col_widths`, communication_col_widths: `${ns}_communication_col_widths`,
                    issues_col_widths: `${ns}_issues_col_widths`, decisions_col_widths: `${ns}_decisions_col_widths`,
                    actions_col_widths: `${ns}_actions_col_widths`
                };
                Object.entries(fm).forEach(([field, lsKey]) => {
                    if (data[field] !== undefined) {
                        localStorage.setItem(lsKey, JSON.stringify(data[field]));
                    }
                });
                this._suppressSync = false;
            } else {
                // Firestore empty or missing real data — push localStorage up
                await this._pushAllToFirestore(projectId);
            }
            this._attachProjectListener(projectId);
        } catch (err) {
            console.error('Initial sync error:', err);
        }
    },

    async _pushAllToFirestore(projectId) {
        const docRef = this._getProjectDocRef(projectId);
        if (!docRef) return;
        const ns = `cutover_${projectId}`;
        const data = {};
        const fields = ['project','tasks','resources','risks','rollback','gonogo',
            'communications','categories','statuses','issues','decisions','actions',
            'issue_categories','tags','task_seq','timezone','locked','activity','settings',
            'task_columns','task_name_wrap',
            'task_column_order','resources_col_order','risks_col_order',
            'communication_col_order','issues_col_order','decisions_col_order','actions_col_order',
            'tasks_col_widths','resources_col_widths','risks_col_widths',
            'communication_col_widths','issues_col_widths','decisions_col_widths','actions_col_widths'];
        fields.forEach(f => {
            const raw = localStorage.getItem(`${ns}_${f}`);
            if (raw !== null) { try { data[f] = JSON.parse(raw); } catch(e) {} }
        });
        data._lastModified = new Date().toISOString();
        await docRef.set(data, { merge: true });
    },

    disconnectFirestore() {
        this._detachAllListeners();
        if (this._firebaseApp) {
            this._firebaseApp.delete().catch(() => {});
            this._firebaseApp = null;
        }
        this._db = null;
        this._auth = null;
        this._firestoreReady = false;
    }
};

// Initialize storage on load
Storage.init();