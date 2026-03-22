/**
 * Reports Module - Generates various cutover reports
 */

const Reports = {
    /**
     * Generate report by type
     */
    generate(type) {
        const generators = {
            'task-list': this.generateTaskListReport,
            'timeline': this.generateTimelineReport,
            'resource-matrix': this.generateResourceMatrixReport,
            'gonogo': this.generateGoNoGoReport,
            'rollback': this.generateRollbackReport,
            'risk-assessment': this.generateRiskAssessmentReport,
            'communication': this.generateCommunicationReport,
            'issues': this.generateIssuesReport,
            'decisions': this.generateDecisionsReport,
            'actions': this.generateActionsReport,
            'status-dashboard': this.generateStatusDashboardReport,
            'task-performance': this.generateTaskPerformanceReport,
            'task-overdue': this.generateTaskOverdueReport
        };

        const generator = generators[type];
        if (generator) {
            return generator.call(this);
        }
        return { title: 'Unknown Report', content: 'Report type not found.' };
    },

    /**
     * Get report header HTML
     */
    getReportHeader(title, subtitle = '') {
        const project = Storage.get(Storage.KEYS.PROJECT);
        const now = new Date();
        
        return `
            <div class="report-header">
                <h1>${title}</h1>
                ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
                <div class="report-subtitle">${project ? escapeHtml(project.name) : 'Cut Over Project'}</div>
                <div class="report-date">Generated: ${now.toLocaleString()}</div>
            </div>
        `;
    },

    /**
     * Format date for reports
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    catBadge(value) {
        const cat = Categories.getByValue(value);
        const label = cat ? escapeHtml(cat.name) : escapeHtml(value);
        const color = cat ? escapeHtml(cat.color) : '#6b7280';
        return `<span class="category-badge" style="background-color:${color}; color:#fff;">${label}</span>`;
    },

    statusBadge(value) {
        const s = Statuses.getByValue(value);
        const label = s ? escapeHtml(s.name) : escapeHtml(value);
        const color = s ? escapeHtml(s.color) : '#6b7280';
        return `<span class="status-badge" style="background-color:${color}; color:#fff;">${label}</span>`;
    },

    /**
     * Format ISO date as DD/MM/YYYY HH:MM (24h)
     */
    fmt24(isoString) {
        if (!isoString) return '-';
        const d = new Date(isoString);
        if (isNaN(d)) return '-';
        const tz = Storage.get(Storage.KEYS.TIMEZONE) || Intl.DateTimeFormat().resolvedOptions().timeZone;
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
     * Convert stored durationSeconds to HH:MM:SS string
     */
    fmtDuration(secs) {
        if (!secs || secs <= 0) return '-';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    },

    /**
     * Resolve dependency IDs to task numbers (e.g. "T-001, T-002")
     */
    depLabels(deps, allTasks) {
        if (!deps || deps.length === 0) return '-';
        return deps.map(id => {
            const t = allTasks.find(x => x.id === id);
            return t ? escapeHtml(t.taskNumber || t.id) : escapeHtml(id);
        }).join(', ');
    },

    /**
     * Escape a single value for CSV: wrap in quotes, double any internal quotes.
     */
    _csvCell(v) {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/\r?\n/g, ' ');
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    },

    /**
     * Convert a rows array (first row = headers) to a CSV string with BOM.
     */
    _rowsToCsv(rows) {
        return '\uFEFF' + rows.map(r => r.map(c => this._csvCell(c)).join(',')).join('\r\n');
    },

    /**
     * Plain-text version of depLabels (no escapeHtml) for CSV output.
     */
    _depLabelsCsv(deps, allTasks) {
        if (!deps || deps.length === 0) return '';
        return deps.map(id => {
            const t = allTasks.find(x => x.id === id);
            return t ? (t.taskNumber || t.id) : id;
        }).join('; ');
    },

    /**
     * 1. Cut Over Task List Report
     */
    generateTaskListReport() {
        const tasks = Tasks.sortByDate(Tasks.getAll());
        const stats = Tasks.getStats();

        let content = this.getReportHeader('Cut Over Task List', 'Complete checklist of all cutover tasks');

        // Summary stats
        content += `
            <div class="report-section">
                <h2>Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${stats.completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${stats.inProgress}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${stats.blocked}</div>
                        <div class="stat-label">Blocked</div>
                    </div>
                </div>
            </div>
        `;

        // Tasks by category
        const categories = Categories.getAll().map(c => ({ key: c.value, label: c.name + ' Tasks' }));

        categories.forEach(cat => {
            const catTasks = tasks.filter(t => t.category === cat.key);
            if (catTasks.length > 0) {
                content += `
                    <div class="report-section">
                        <h2>${cat.label}</h2>
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th style="width: 40px;">✓</th>
                                    <th>Task ID</th>
                                    <th>Task</th>
                                    <th>Priority</th>
                                    <th>Assignee</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Duration</th>
                                    <th>Depends On</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                catTasks.forEach(task => {
                    const checkbox = task.status === 'completed' ? '☑' : '☐';
                    content += `
                        <tr>
                            <td style="text-align: center; font-size: 1.2rem;">${checkbox}</td>
                            <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                            <td>${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                            <td><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td>
                            <td>${escapeHtml(Resources.getName(task.assignee))}</td>
                            <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.startDate)}</td>
                            <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.endDate)}</td>
                            <td style="white-space:nowrap;font-family:monospace;">${this.fmtDuration(task.durationSeconds)}</td>
                            <td style="font-family:monospace;">${this.depLabels(task.dependencies, tasks)}</td>
                            <td>${this.statusBadge(task.status)}</td>
                        </tr>
                    `;
                });

                content += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });

        const csvRows = [
            ['Task ID','Task Name','Milestone','Priority','Assignee','Category','Start','End','Duration','Dependencies','Status'],
            ...tasks.map(t => [
                t.taskNumber || '',
                t.name,
                t.milestone ? 'Yes' : 'No',
                t.priority,
                Resources.getName(t.assignee),
                t.category || '',
                this.fmt24(t.startDate),
                this.fmt24(t.endDate),
                this.fmtDuration(t.durationSeconds),
                this._depLabelsCsv(t.dependencies, tasks),
                t.status
            ])
        ];
        return { title: 'Cut Over Task List', content, csv: csvRows };
    },

    /**
     * 2. Timeline Report
     */
    generateTimelineReport() {
        const tasks = Tasks.sortByDate(Tasks.getAll());
        const project = Storage.get(Storage.KEYS.PROJECT);
        const milestones = Tasks.getMilestones();
        
        let content = this.getReportHeader('Timeline Report', 'Project timeline with milestones');

        // Project dates
        content += `
            <div class="report-section">
                <h2>Key Dates</h2>
                <table class="report-table">
                    <tbody>
                        <tr>
                            <td><strong>Cut Over Date</strong></td>
                            <td>${project ? this.formatDate(project.cutoverDate) : 'Not set'}</td>
                        </tr>
                        <tr>
                            <td><strong>First Task</strong></td>
                            <td>${tasks.length > 0 ? this.formatDate(tasks[0].startDate) : 'N/A'}</td>
                        </tr>
                        <tr>
                            <td><strong>Last Task</strong></td>
                            <td>${tasks.length > 0 ? this.formatDate(tasks[tasks.length - 1].endDate) : 'N/A'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        // Milestones
        content += `
            <div class="report-section">
                <h2>Milestones</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Milestone</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Owner</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        milestones.forEach(m => {
            content += `
                <tr>
                    <td><span class="task-number-badge">${escapeHtml(m.taskNumber || '-')}</span></td>
                    <td>🔹 ${escapeHtml(m.name)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(m.startDate)}</td>
                    <td>${this.statusBadge(m.status)}</td>
                    <td>${escapeHtml(Resources.getName(m.assignee))}</td>
                </tr>
            `;
        });

        if (milestones.length === 0) {
            content += '<tr><td colspan="5" style="text-align: center;">No milestones defined</td></tr>';
        }
        
        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Task Timeline
        content += `
            <div class="report-section">
                <h2>Task Timeline</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Task</th>
                            <th>Category</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tasks.forEach(task => {
            const dur = task.durationSeconds
                ? this.fmtDuration(task.durationSeconds)
                : (() => {
                    const diffMs = new Date(task.endDate) - new Date(task.startDate);
                    if (isNaN(diffMs) || diffMs <= 0) return '-';
                    const h = Math.floor(diffMs / 3600000);
                    const m = Math.floor((diffMs % 3600000) / 60000);
                    const s = Math.floor((diffMs % 60000) / 1000);
                    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
                })();

            content += `
                <tr>
                    <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                    <td>${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                    <td>${this.catBadge(task.category)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.startDate)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.endDate)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${dur}</td>
                </tr>
            `;
        });
        
        content += `
                    </tbody>
                </table>
            </div>
        `;

        return { title: 'Timeline Report', content };
    },

    /**
     * 3. Resource Assignment Matrix Report
     */
    generateResourceMatrixReport() {
        const resources = Resources.getAll();
        const tasks = Tasks.getAll();
        
        let content = this.getReportHeader('Resource Assignment Matrix', 'Who is responsible for what');

        // Resource summary
        content += `
            <div class="report-section">
                <h2>Team Resources</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Availability</th>
                            <th>Assigned Tasks</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        resources.forEach(r => {
            const taskCount = Resources.getAssignedTaskCount(r.id);
            content += `
                <tr>
                    <td><strong>${escapeHtml(r.name)}</strong></td>
                    <td>${escapeHtml(r.role)}</td>
                    <td>${escapeHtml(r.email) || '-'}</td>
                    <td>${escapeHtml(r.phone) || '-'}</td>
                    <td><span class="availability-badge ${escapeHtml(r.availability)}">${escapeHtml(r.availability)}</span></td>
                    <td>${taskCount}</td>
                </tr>
            `;
        });
        
        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Assignments by resource
        resources.forEach(r => {
            const assignedTasks = Tasks.getByAssignee(r.id);
            if (assignedTasks.length > 0) {
                content += `
                    <div class="report-section">
                        <h2>${escapeHtml(r.name)} - Assigned Tasks</h2>
                        <p><strong>Role:</strong> ${escapeHtml(r.role)}</p>
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Task ID</th>
                                    <th>Task</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Start</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                Tasks.sortByDate(assignedTasks).forEach(task => {
                    content += `
                        <tr>
                            <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                            <td>${escapeHtml(task.name)}</td>
                            <td>${this.catBadge(task.category)}</td>
                            <td><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td>
                            <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.startDate)}</td>
                            <td style="white-space:nowrap;font-family:monospace;">${this.fmtDuration(task.durationSeconds)}</td>
                            <td>${this.statusBadge(task.status)}</td>
                        </tr>
                    `;
                });
                
                content += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
        });

        const csvRows = [
            ['Name','Role','Email','Phone','Availability','Assigned Tasks'],
            ...resources.map(r => [
                r.name,
                r.role,
                r.email || '',
                r.phone || '',
                r.availability || '',
                Resources.getAssignedTaskCount(r.id)
            ])
        ];
        return { title: 'Resource Assignment Matrix', content, csv: csvRows };
    },

    /**
     * 4. Go/No-Go Checklist Report
     */
    generateGoNoGoReport() {
        const gonogo = GoNoGo.get();
        const stats = GoNoGo.getStats();
        const decision = GoNoGo.calculateDecision();
        
        let content = this.getReportHeader('Go/No-Go Checklist', 'Decision criteria for proceeding with cutover');

        // Decision summary
        const decisionClass = decision === 'go' ? 'success' : decision === 'nogo' ? 'danger' : 'warning';
        content += `
            <div class="report-section">
                <h2>Decision Status</h2>
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 3rem; font-weight: bold; color: var(--${decisionClass});">
                        ${decision.toUpperCase()}
                    </div>
                </div>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${stats.go}</div>
                        <div class="stat-label">GO</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.nogo}</div>
                        <div class="stat-label">NO-GO</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${stats.pending}</div>
                        <div class="stat-label">PENDING</div>
                    </div>
                </div>
            </div>
        `;

        // Criteria by category
        const categories = [
            { key: 'technical', label: 'Technical Readiness' },
            { key: 'business', label: 'Business Readiness' },
            { key: 'operational', label: 'Operational Readiness' },
            { key: 'resource', label: 'Resource Readiness' }
        ];

        categories.forEach(cat => {
            const items = gonogo.criteria[cat.key] || [];
            content += `
                <div class="report-section">
                    <h2>${cat.label}</h2>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th style="width: 60px;">Status</th>
                                <th>Criteria</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            items.forEach(item => {
                const statusIcon = item.status === 'go' ? '✅' : item.status === 'nogo' ? '❌' : '⏳';
                content += `
                    <tr>
                        <td style="text-align: center; font-size: 1.5rem;">${statusIcon}</td>
                        <td>${escapeHtml(item.text)}</td>
                    </tr>
                `;
            });
            
            if (items.length === 0) {
                content += '<tr><td colspan="2" style="text-align: center;">No criteria defined</td></tr>';
            }
            
            content += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        // Decision notes
        if (gonogo.notes) {
            content += `
                <div class="report-section">
                    <h2>Decision Notes</h2>
                    <p>${escapeHtml(gonogo.notes).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        const gonogoData = GoNoGo.get();
        const allCriteria = ['technical','business','operational','resource'].flatMap(cat =>
            (gonogoData.criteria[cat] || []).map(item => [cat, item.text, item.status])
        );
        const csvRows = [
            ['Category','Criteria','Status'],
            ...allCriteria
        ];
        return { title: 'Go/No-Go Checklist', content, csv: csvRows };
    },

    /**
     * 5. Rollback Plan Report
     */
    generateRollbackReport() {
        const rollback = Rollback.get();
        const project = Storage.get(Storage.KEYS.PROJECT);
        
        let content = this.getReportHeader('Rollback Plan', 'Step-by-step rollback procedures');

        // Trigger criteria
        content += `
            <div class="report-section">
                <h2>Rollback Trigger Criteria</h2>
                <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; border-left: 4px solid var(--danger);">
                    <p>${rollback.trigger ? escapeHtml(rollback.trigger).replace(/\n/g, '<br>') : 'No trigger criteria defined'}</p>
                </div>
            </div>
        `;

        // Point of no return
        content += `
            <div class="report-section">
                <h2>Critical Timing</h2>
                <table class="report-table">
                    <tbody>
                        <tr>
                            <td><strong>Cut Over Start</strong></td>
                            <td>${project ? this.formatDate(project.cutoverDate) : 'Not set'}</td>
                        </tr>
                        <tr>
                            <td><strong>Point of No Return</strong></td>
                            <td>${rollback.pointOfNoReturn ? this.formatDate(rollback.pointOfNoReturn) : 'Not set'}</td>
                        </tr>
                    </tbody>
                </table>
                <p style="margin-top: 12px; color: var(--text-secondary);">
                    <strong>Note:</strong> After the Point of No Return, rollback may not be possible or may require significantly more effort.
                </p>
            </div>
        `;

        // Rollback steps
        content += `
            <div class="report-section">
                <h2>Rollback Procedure</h2>
        `;
        
        if (rollback.steps && rollback.steps.length > 0) {
            const totalDuration = rollback.steps.reduce((sum, s) => sum + (s.duration || 0), 0);
            content += `<p><strong>Estimated Total Duration:</strong> ${totalDuration} minutes</p>`;
            
            rollback.steps.sort((a, b) => a.order - b.order).forEach(step => {
                content += `
                    <div style="display: flex; gap: 16px; margin: 16px 0; padding: 16px; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="width: 40px; height: 40px; background: var(--accent-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
                            ${step.order}
                        </div>
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0;">${escapeHtml(step.title)}</h3>
                            <p style="margin: 0 0 8px 0; color: var(--text-secondary);">${escapeHtml(step.description)}</p>
                            <div style="display: flex; gap: 20px; font-size: 0.85rem; color: var(--text-muted);">
                                <span><strong>Owner:</strong> ${escapeHtml(Resources.getName(step.owner))}</span>
                                <span><strong>Duration:</strong> ${step.duration || 0} minutes</span>
                            </div>
                            ${step.notes ? `<p style="margin-top: 8px; font-style: italic; color: var(--text-muted);">Note: ${escapeHtml(step.notes)}</p>` : ''}
                        </div>
                    </div>
                `;
            });
        } else {
            content += '<p>No rollback steps defined.</p>';
        }
        
        content += '</div>';

        const rollbackData = Rollback.get();
        const steps = rollbackData.steps || [];
        const csvRows = [
            ['Step','Title','Description','Owner','Duration (min)','Notes'],
            ...steps.sort((a,b) => a.order - b.order).map(s => [
                s.order,
                s.title,
                s.description || '',
                Resources.getName(s.owner),
                s.duration || 0,
                s.notes || ''
            ])
        ];
        return { title: 'Rollback Plan', content, csv: csvRows };
    },

    /**
     * 6. Risk Assessment Report
     */
    generateRiskAssessmentReport() {
        const risks = Risks.getAll();
        const stats = Risks.getStats();

        let content = this.getReportHeader('Risk Assessment', 'Identified risks with mitigation plans');

        // Risk summary
        content += `
            <div class="report-section">
                <h2>Risk Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total Risks</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.high}</div>
                        <div class="stat-label">High Severity</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${stats.medium}</div>
                        <div class="stat-label">Medium Severity</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${stats.low}</div>
                        <div class="stat-label">Low Severity</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${stats.mitigated}</div>
                        <div class="stat-label">Mitigated</div>
                    </div>
                </div>
            </div>
        `;

        // Risk details
        content += `
            <div class="report-section">
                <h2>Risk Register</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Risk Description</th>
                            <th>Severity</th>
                            <th>Probability</th>
                            <th>Impact</th>
                            <th>Owner</th>
                            <th>Status</th>
                            <th>Time in Current Status</th>
                            <th>Total Age</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        risks.forEach((risk, idx) => {
            const durations = Risks.getStatusDurations(risk);
            const currentDuration = durations.length ? durations[durations.length - 1] : null;
            const totalMs = durations.reduce((s, d) => s + d.durationMs, 0);
            const totalLabel = Issues._fmtDuration(totalMs);
            content += `
                <tr>
                    <td>R-${String(idx + 1).padStart(3, '0')}</td>
                    <td>${escapeHtml(risk.description)}</td>
                    <td><span class="severity-badge ${escapeHtml(risk.severity)}">${escapeHtml(risk.severity)}</span></td>
                    <td>${escapeHtml(risk.probability)}</td>
                    <td>${escapeHtml(risk.impact) || '-'}</td>
                    <td>${escapeHtml(Resources.getName(risk.owner))}</td>
                    <td><span class="status-badge ${escapeHtml(risk.status)}">${escapeHtml(risk.status)}</span></td>
                    <td>${currentDuration ? escapeHtml(currentDuration.durationLabel) : '-'}</td>
                    <td>${escapeHtml(totalLabel)}</td>
                    <td>${(risk.tags || []).map(v => { const tag = Tags.getByValue(v); return tag ? '<span style="background:' + escapeHtml(tag.color) + '20;color:' + escapeHtml(tag.color) + ';padding:2px 6px;border-radius:3px;font-size:0.7rem;">' + escapeHtml(tag.name) + '</span>' : ''; }).join(' ') || '-'}</td>
                </tr>
            `;
        });

        if (risks.length === 0) {
            content += '<tr><td colspan="10" style="text-align: center;">No risks identified</td></tr>';
        }

        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Mitigation plans for open risks
        const openRisks = risks.filter(r => r.status === 'open');
        if (openRisks.length > 0) {
            content += `
                <div class="report-section">
                    <h2>Mitigation Plans for Open Risks</h2>
            `;

            openRisks.forEach((risk, index) => {
                content += `
                    <div style="margin: 16px 0; padding: 16px; background: var(--bg-tertiary); border-radius: 8px; border-left: 4px solid var(--${risk.severity === 'high' ? 'danger' : risk.severity === 'medium' ? 'warning' : 'success'});">
                        <h3 style="margin: 0 0 8px 0;">Risk ${index + 1}: ${escapeHtml(risk.description)}</h3>
                        <p style="margin: 0;"><strong>Mitigation Plan:</strong></p>
                        <p style="margin: 8px 0 0 0; color: var(--text-secondary);">${escapeHtml(risk.mitigation) || 'No mitigation plan defined'}</p>
                    </div>
                `;
            });

            content += '</div>';
        }

        // Per-risk status history breakdown
        const withHistory = risks.filter(r => Array.isArray(r.statusHistory) && r.statusHistory.length > 1);
        if (withHistory.length > 0) {
            content += `<div class="report-section"><h2>Status Duration Breakdown</h2>`;
            withHistory.forEach(risk => {
                const durations = Risks.getStatusDurations(risk);
                const rows = durations.map(d => `
                    <tr>
                        <td><span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td>
                        <td>${this.fmt24(d.enteredAt)}</td>
                        <td><strong>${escapeHtml(d.durationLabel)}</strong></td>
                    </tr>
                `).join('');
                content += `
                    <div style="margin: 16px 0;">
                        <div style="font-weight:600; margin-bottom:6px;">R-${String(risks.indexOf(risk) + 1).padStart(3,'0')}: ${escapeHtml(risk.description.substring(0, 80))}</div>
                        <table class="report-table" style="margin:0;">
                            <thead><tr><th>Status</th><th>Entered At</th><th>Duration</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            });
            content += `</div>`;
        }

        const csvRows = [
            ['ID','Description','Severity','Probability','Impact','Owner','Status','Mitigation','Tags'],
            ...risks.map((risk, idx) => [
                'R-' + String(idx + 1).padStart(3, '0'),
                risk.description,
                risk.severity,
                risk.probability,
                risk.impact || '',
                Resources.getName(risk.owner),
                risk.status,
                risk.mitigation || '',
                (risk.tags || []).map(v => Tags.getName(v)).join('; ')
            ])
        ];
        return { title: 'Risk Assessment', content, csv: csvRows };
    },

    /**
     * 7. Communication Plan Report
     */
    generateCommunicationReport() {
        const communications = Communications.getAll();
        const project = Storage.get(Storage.KEYS.PROJECT);
        
        let content = this.getReportHeader('Communication Plan', 'Stakeholder notifications schedule');

        // Communication summary
        const sent = communications.filter(c => c.status === 'sent').length;
        const pending = communications.filter(c => c.status === 'pending').length;
        
        content += `
            <div class="report-section">
                <h2>Communication Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${communications.length}</div>
                        <div class="stat-label">Total Communications</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${sent}</div>
                        <div class="stat-label">Sent</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                </div>
            </div>
        `;

        // Communication schedule
        content += `
            <div class="report-section">
                <h2>Communication Schedule</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Timing</th>
                            <th>Audience</th>
                            <th>Type</th>
                            <th>Channel</th>
                            <th>Owner</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        communications.forEach(comm => {
            content += `
                <tr>
                    <td>${this.formatDate(comm.timing)}</td>
                    <td>${escapeHtml(comm.audience)}</td>
                    <td>${escapeHtml(comm.type)}</td>
                    <td>${escapeHtml(comm.channel)}</td>
                    <td>${escapeHtml(Resources.getName(comm.owner))}</td>
                    <td><span class="status-badge ${escapeHtml(comm.status)}">${escapeHtml(comm.status)}</span></td>
                </tr>
            `;
        });
        
        if (communications.length === 0) {
            content += '<tr><td colspan="6" style="text-align: center;">No communications planned</td></tr>';
        }
        
        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Communication templates
        communications.forEach((comm, index) => {
            if (comm.template) {
                content += `
                    <div class="report-section">
                        <h2>Template: ${escapeHtml(comm.type)} to ${escapeHtml(comm.audience)}</h2>
                        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; font-family: monospace; white-space: pre-wrap;">
${escapeHtml(comm.template)}
                        </div>
                    </div>
                `;
            }
        });

        const csvRows = [
            ['Timing','Audience','Type','Channel','Owner','Status','Template'],
            ...communications.map(c => [
                this.fmt24(c.timing),
                c.audience,
                c.type,
                c.channel,
                Resources.getName(c.owner),
                c.status,
                c.template || ''
            ])
        ];
        return { title: 'Communication Plan', content, csv: csvRows };
    },

    /**
     * 8. Status Dashboard Report
     */
    generateStatusDashboardReport() {
        const project = Storage.get(Storage.KEYS.PROJECT);
        const taskStats = Tasks.getStats();
        const riskStats = Risks.getStats();
        const gonogoStats = GoNoGo.getStats();
        const categoryProgress = Tasks.getCategoryProgress();
        const overallProgress = Tasks.getOverallProgress();
        const issueStats = Issues.getStats();
        const decisionStats = Decisions.getStats();
        const actionStats = Actions.getStats();
        const gonogo = GoNoGo.get();
        
        let content = this.getReportHeader('Status Dashboard', 'Executive summary of cutover status');

        // Overall status
        const gonogoDecision = GoNoGo.calculateDecision();
        const statusColor = gonogoDecision === 'go' ? 'success' : gonogoDecision === 'nogo' ? 'danger' : 'warning';
        
        content += `
            <div class="report-section">
                <h2>Overall Status</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${overallProgress}%</div>
                        <div class="stat-label">Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--${statusColor});">${gonogoDecision.toUpperCase()}</div>
                        <div class="stat-label">Go/No-Go Status</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${riskStats.open}</div>
                        <div class="stat-label">Open Risks</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${taskStats.blocked}</div>
                        <div class="stat-label">Blocked Tasks</div>
                    </div>
                </div>
            </div>
        `;

        // Cut over timing
        if (project) {
            const cutoverDate = new Date(project.cutoverDate);
            const now = new Date();
            const daysUntil = Math.ceil((cutoverDate - now) / (1000 * 60 * 60 * 24));
            
            content += `
                <div class="report-section">
                    <h2>Cut Over Timing</h2>
                    <table class="report-table">
                        <tbody>
                            <tr>
                                <td><strong>Project</strong></td>
                                <td>${escapeHtml(project.name)}</td>
                            </tr>
                            <tr>
                                <td><strong>Cut Over Date</strong></td>
                                <td>${this.formatDate(project.cutoverDate)}</td>
                            </tr>
                            <tr>
                                <td><strong>Time Until Cut Over</strong></td>
                                <td>${daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? 'Today!' : `${Math.abs(daysUntil)} days ago`}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Task progress by category (dynamic)
        const catRows = Categories.getAll().map(cat => {
            const pct = categoryProgress[cat.value] || 0;
            return `
                <tr>
                    <td>${escapeHtml(cat.name)}</td>
                    <td>${pct}%</td>
                    <td>
                        <div style="background: var(--bg-tertiary); height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: ${escapeHtml(cat.color)}; height: 100%; width: ${pct}%;"></div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        content += `
            <div class="report-section">
                <h2>Progress by Category</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Progress</th>
                            <th style="width: 200px;">Bar</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${catRows}
                    </tbody>
                </table>
            </div>
        `;

        // Task summary
        content += `
            <div class="report-section">
                <h2>Task Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${taskStats.total}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${taskStats.completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--info);">${taskStats.inProgress}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${taskStats.notStarted}</div>
                        <div class="stat-label">Not Started</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${taskStats.blocked}</div>
                        <div class="stat-label">Blocked</div>
                    </div>
                </div>
            </div>
        `;

        // Go/No-Go summary
        content += `
            <div class="report-section">
                <h2>Go/No-Go Criteria Status</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${gonogoStats.go}</div>
                        <div class="stat-label">GO</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${gonogoStats.nogo}</div>
                        <div class="stat-label">NO-GO</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${gonogoStats.pending}</div>
                        <div class="stat-label">PENDING</div>
                    </div>
                </div>
            </div>
        `;

        // Risk summary
        content += `
            <div class="report-section">
                <h2>Risk Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${riskStats.high}</div>
                        <div class="stat-label">High</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${riskStats.medium}</div>
                        <div class="stat-label">Medium</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${riskStats.low}</div>
                        <div class="stat-label">Low</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${riskStats.mitigated}</div>
                        <div class="stat-label">Mitigated</div>
                    </div>
                </div>
            </div>
        `;

        // Issues / Decisions / Actions summary
        content += `
            <div class="report-section">
                <h2>Issues, Decisions & Actions</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${issueStats.open + issueStats.inProgress}</div>
                        <div class="stat-label">Open Issues</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${issueStats.blocked}</div>
                        <div class="stat-label">Blocked Issues</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${issueStats.critical}</div>
                        <div class="stat-label">Critical Issues</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${decisionStats.pending}</div>
                        <div class="stat-label">Pending Decisions</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${actionStats.open + actionStats.inProgress}</div>
                        <div class="stat-label">Open Actions</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${actionStats.overdue}</div>
                        <div class="stat-label">Overdue Actions</div>
                    </div>
                </div>
            </div>
        `;

        return { title: 'Status Dashboard', content };
    },

    /**
     * 9. Issues Register Report
     */
    generateIssuesReport() {
        const items = Issues.getAll();
        const stats = Issues.getStats();

        let content = this.getReportHeader('Issues Register', 'All raised issues with status and resolution');

        content += `
            <div class="report-section">
                <h2>Issue Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.open}</div>
                        <div class="stat-label">Open</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${stats.inProgress}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.blocked}</div>
                        <div class="stat-label">Blocked</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${stats.resolved + stats.closed}</div>
                        <div class="stat-label">Resolved/Closed</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.critical}</div>
                        <div class="stat-label">Critical</div>
                    </div>
                </div>
            </div>
        `;

        // Main issue table with current status duration
        content += `
            <div class="report-section">
                <h2>Issue Details</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Time in Current Status</th>
                            <th>Total Age</th>
                            <th>Owner</th>
                            <th>Raised</th>
                            <th>Resolution</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach((item, idx) => {
            const durations = Issues.getStatusDurations(item);
            const currentDuration = durations.length ? durations[durations.length - 1] : null;
            const totalMs = durations.reduce((s, d) => s + d.durationMs, 0);
            const totalLabel = Issues._fmtDuration(totalMs);
            const isBlocked = item.status === 'blocked';
            content += `
                <tr${isBlocked ? ' style="background: rgba(220,38,38,0.07);"' : ''}>
                    <td>I-${String(idx + 1).padStart(3, '0')}</td>
                    <td>${escapeHtml(item.title)}</td>
                    <td>${escapeHtml(item.category || '-')}</td>
                    <td><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                    <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                    <td${isBlocked ? ' style="color:var(--danger);font-weight:bold;"' : ''}>${currentDuration ? escapeHtml(currentDuration.durationLabel) : '-'}</td>
                    <td>${escapeHtml(totalLabel)}</td>
                    <td>${escapeHtml(Resources.getName(item.owner))}</td>
                    <td>${this.fmt24(item.raisedDate)}</td>
                    <td>${escapeHtml(item.resolution || '-')}</td>
                    <td>${(item.tags || []).map(v => { const tag = Tags.getByValue(v); return tag ? '<span style="background:' + escapeHtml(tag.color) + '20;color:' + escapeHtml(tag.color) + ';padding:2px 6px;border-radius:3px;font-size:0.7rem;">' + escapeHtml(tag.name) + '</span>' : ''; }).join(' ') || '-'}</td>
                </tr>
            `;
        });

        if (items.length === 0) {
            content += '<tr><td colspan="11" style="text-align:center;">No issues logged</td></tr>';
        }

        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Per-issue status history breakdown (only for issues that have moved through statuses)
        const withHistory = items.filter(i => Array.isArray(i.statusHistory) && i.statusHistory.length > 1);
        if (withHistory.length > 0) {
            content += `<div class="report-section"><h2>Status Duration Breakdown</h2>`;
            withHistory.forEach((item, idx) => {
                const durations = Issues.getStatusDurations(item);
                const rows = durations.map(d => `
                    <tr>
                        <td><span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td>
                        <td>${this.fmt24(d.enteredAt)}</td>
                        <td><strong>${escapeHtml(d.durationLabel)}</strong></td>
                    </tr>
                `).join('');
                content += `
                    <div style="margin: 16px 0;">
                        <div style="font-weight:600; margin-bottom:6px;">I-${String(items.indexOf(item) + 1).padStart(3,'0')}: ${escapeHtml(item.title)}</div>
                        <table class="report-table" style="margin:0;">
                            <thead><tr><th>Status</th><th>Entered At</th><th>Duration</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            });
            content += `</div>`;
        }

        const csvRowsIssues = [
            ['ID','Title','Category','Priority','Status','Owner','Raised','Resolution','Tags'],
            ...items.map((item, idx) => [
                'I-' + String(idx + 1).padStart(3, '0'),
                item.title,
                item.category || '',
                item.priority,
                item.status,
                Resources.getName(item.owner),
                this.fmt24(item.raisedDate),
                item.resolution || '',
                (item.tags || []).map(v => Tags.getName(v)).join('; ')
            ])
        ];
        return { title: 'Issues Register', content, csv: csvRowsIssues };
    },

    /**
     * 10. Decision Log Report
     */
    generateDecisionsReport() {
        const items = Decisions.getAll();
        const stats = Decisions.getStats();

        let content = this.getReportHeader('Decision Log', 'Key decisions made during cutover planning');

        content += `
            <div class="report-section">
                <h2>Decision Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${stats.pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${stats.approved}</div>
                        <div class="stat-label">Approved</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.rejected}</div>
                        <div class="stat-label">Rejected</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${stats.deferred}</div>
                        <div class="stat-label">Deferred</div>
                    </div>
                </div>
            </div>
        `;

        content += `
            <div class="report-section">
                <h2>Decision Details</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Time in Current Status</th>
                            <th>Total Age</th>
                            <th>Decision Made</th>
                            <th>Decided By</th>
                            <th>Impact</th>
                            <th>Raised</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach((item, idx) => {
            const durations = Decisions.getStatusDurations(item);
            const currentDuration = durations.length ? durations[durations.length - 1] : null;
            const totalMs = durations.reduce((s, d) => s + d.durationMs, 0);
            const totalLabel = Issues._fmtDuration(totalMs);
            content += `
                <tr>
                    <td>D-${String(idx + 1).padStart(3, '0')}</td>
                    <td>${escapeHtml(item.title)}</td>
                    <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                    <td>${currentDuration ? escapeHtml(currentDuration.durationLabel) : '-'}</td>
                    <td>${escapeHtml(totalLabel)}</td>
                    <td>${escapeHtml(item.decisionMade || '-')}</td>
                    <td>${escapeHtml(Resources.getName(item.decidedBy))}</td>
                    <td>${escapeHtml(item.impact || '-')}</td>
                    <td>${this.fmt24(item.raisedDate)}</td>
                    <td>${(item.tags || []).map(v => { const tag = Tags.getByValue(v); return tag ? '<span style="background:' + escapeHtml(tag.color) + '20;color:' + escapeHtml(tag.color) + ';padding:2px 6px;border-radius:3px;font-size:0.7rem;">' + escapeHtml(tag.name) + '</span>' : ''; }).join(' ') || '-'}</td>
                </tr>
            `;
        });

        if (items.length === 0) {
            content += '<tr><td colspan="10" style="text-align:center;">No decisions logged</td></tr>';
        }

        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Per-decision status history breakdown
        const withHistory = items.filter(i => Array.isArray(i.statusHistory) && i.statusHistory.length > 1);
        if (withHistory.length > 0) {
            content += `<div class="report-section"><h2>Status Duration Breakdown</h2>`;
            withHistory.forEach(item => {
                const durations = Decisions.getStatusDurations(item);
                const rows = durations.map(d => `
                    <tr>
                        <td><span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td>
                        <td>${this.fmt24(d.enteredAt)}</td>
                        <td><strong>${escapeHtml(d.durationLabel)}</strong></td>
                    </tr>
                `).join('');
                content += `
                    <div style="margin: 16px 0;">
                        <div style="font-weight:600; margin-bottom:6px;">D-${String(items.indexOf(item) + 1).padStart(3,'0')}: ${escapeHtml(item.title)}</div>
                        <table class="report-table" style="margin:0;">
                            <thead><tr><th>Status</th><th>Entered At</th><th>Duration</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            });
            content += `</div>`;
        }

        const csvRowsDecisions = [
            ['ID','Title','Status','Decision Made','Decided By','Impact','Raised','Tags'],
            ...items.map((item, idx) => [
                'D-' + String(idx + 1).padStart(3, '0'),
                item.title,
                item.status,
                item.decisionMade || '',
                Resources.getName(item.decidedBy),
                item.impact || '',
                this.fmt24(item.raisedDate),
                (item.tags || []).map(v => Tags.getName(v)).join('; ')
            ])
        ];
        return { title: 'Decision Log', content, csv: csvRowsDecisions };
    },

    /**
     * 11. Actions Register Report
     */
    generateActionsReport() {
        const items = Actions.getAll();
        const stats = Actions.getStats();
        const now = new Date();

        let content = this.getReportHeader('Actions Register', 'Outstanding actions with owners and due dates');

        content += `
            <div class="report-section">
                <h2>Action Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${stats.total}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--warning);">${stats.open}</div>
                        <div class="stat-label">Open</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--info);">${stats.inProgress}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--success);">${stats.completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value" style="color: var(--danger);">${stats.overdue}</div>
                        <div class="stat-label">Overdue</div>
                    </div>
                </div>
            </div>
        `;

        content += `
            <div class="report-section">
                <h2>Action Details</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Time in Current Status</th>
                            <th>Total Age</th>
                            <th>Owner</th>
                            <th>Due Date</th>
                            <th>Linked Item</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        items.forEach((item, idx) => {
            const isOverdue = item.status !== 'completed' && item.dueDate && new Date(item.dueDate) < now;
            const durations = Actions.getStatusDurations(item);
            const currentDuration = durations.length ? durations[durations.length - 1] : null;
            const totalMs = durations.reduce((s, d) => s + d.durationMs, 0);
            const totalLabel = Issues._fmtDuration(totalMs);
            content += `
                <tr${isOverdue ? ' style="background: rgba(220,38,38,0.07);"' : ''}>
                    <td>A-${String(idx + 1).padStart(3, '0')}</td>
                    <td>${escapeHtml(item.title)}</td>
                    <td><span class="priority-badge ${escapeHtml(item.priority)}">${escapeHtml(item.priority)}</span></td>
                    <td><span class="status-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
                    <td>${currentDuration ? escapeHtml(currentDuration.durationLabel) : '-'}</td>
                    <td>${escapeHtml(totalLabel)}</td>
                    <td>${escapeHtml(Resources.getName(item.owner))}</td>
                    <td${isOverdue ? ' style="color:var(--danger);font-weight:bold;"' : ''}>${item.dueDate ? this.fmt24(item.dueDate) : '-'}</td>
                    <td>${escapeHtml(item.linkedItem || '-')}</td>
                    <td>${(item.tags || []).map(v => { const tag = Tags.getByValue(v); return tag ? '<span style="background:' + escapeHtml(tag.color) + '20;color:' + escapeHtml(tag.color) + ';padding:2px 6px;border-radius:3px;font-size:0.7rem;">' + escapeHtml(tag.name) + '</span>' : ''; }).join(' ') || '-'}</td>
                </tr>
            `;
        });

        if (items.length === 0) {
            content += '<tr><td colspan="10" style="text-align:center;">No actions created</td></tr>';
        }

        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Per-action status history breakdown
        const withHistory = items.filter(a => Array.isArray(a.statusHistory) && a.statusHistory.length > 1);
        if (withHistory.length > 0) {
            content += `<div class="report-section"><h2>Status Duration Breakdown</h2>`;
            withHistory.forEach(item => {
                const durations = Actions.getStatusDurations(item);
                const rows = durations.map(d => `
                    <tr>
                        <td><span class="status-badge ${escapeHtml(d.status)}">${escapeHtml(d.status)}</span></td>
                        <td>${this.fmt24(d.enteredAt)}</td>
                        <td><strong>${escapeHtml(d.durationLabel)}</strong></td>
                    </tr>
                `).join('');
                content += `
                    <div style="margin: 16px 0;">
                        <div style="font-weight:600; margin-bottom:6px;">A-${String(items.indexOf(item) + 1).padStart(3,'0')}: ${escapeHtml(item.title)}</div>
                        <table class="report-table" style="margin:0;">
                            <thead><tr><th>Status</th><th>Entered At</th><th>Duration</th></tr></thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                `;
            });
            content += `</div>`;
        }

        const csvRowsActions = [
            ['ID','Title','Priority','Status','Owner','Due Date','Linked Item','Tags'],
            ...items.map((item, idx) => [
                'A-' + String(idx + 1).padStart(3, '0'),
                item.title,
                item.priority,
                item.status,
                Resources.getName(item.owner),
                item.dueDate ? this.fmt24(item.dueDate) : '',
                item.linkedItem || '',
                (item.tags || []).map(v => Tags.getName(v)).join('; ')
            ])
        ];
        return { title: 'Actions Register', content, csv: csvRowsActions };
    },

    /**
     * Task Performance Report — Actual vs Planned
     */
    generateTaskPerformanceReport() {
        const tasks = Tasks.sortByDate(Tasks.getAll());

        // Summary counters
        let started = 0, completed = 0, earlyCount = 0, lateCount = 0, onTimeCount = 0;
        let totalPlannedSecs = 0, totalActualSecs = 0, plannedCount = 0, actualCount = 0;

        tasks.forEach(task => {
            if (task.actualStart) started++;
            if (task.actualEnd)   completed++;
            if (task.durationSeconds > 0) { totalPlannedSecs += task.durationSeconds; plannedCount++; }
            if (task.actualStart && task.actualEnd) {
                const secs = (new Date(task.actualEnd) - new Date(task.actualStart)) / 1000;
                if (secs > 0) { totalActualSecs += secs; actualCount++; }
                // Variance vs planned end
                if (task.endDate && task.actualEnd) {
                    const diff = new Date(task.actualEnd) - new Date(task.endDate);
                    if (diff < -60000) earlyCount++;
                    else if (diff > 60000) lateCount++;
                    else onTimeCount++;
                }
            }
        });

        let content = this.getReportHeader('Task Performance Report', 'Actual vs Planned start, end and duration');

        // Summary stats
        content += `
            <div class="report-section">
                <h2>Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${tasks.length}</div>
                        <div class="stat-label">Total Tasks</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${started}</div>
                        <div class="stat-label">Started</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${completed}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${earlyCount}</div>
                        <div class="stat-label">Finished Early</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${onTimeCount}</div>
                        <div class="stat-label">On Time</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${lateCount}</div>
                        <div class="stat-label">Finished Late</div>
                    </div>
                </div>
                ${plannedCount > 0 ? `
                <div style="margin-top:12px; font-size:0.9rem; color:var(--text-secondary);">
                    Avg planned duration: <strong>${this.fmtDuration(Math.round(totalPlannedSecs / plannedCount))}</strong>
                    ${actualCount > 0 ? ` &nbsp;|&nbsp; Avg actual duration: <strong>${this.fmtDuration(Math.round(totalActualSecs / actualCount))}</strong>` : ''}
                </div>` : ''}
            </div>
        `;

        // Detail table
        content += `
            <div class="report-section">
                <h2>Task Detail</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Task Name</th>
                            <th>Assignee</th>
                            <th>Status</th>
                            <th>Planned Start</th>
                            <th>Actual Start</th>
                            <th>Start Variance</th>
                            <th>Planned End</th>
                            <th>Actual End</th>
                            <th>End Variance</th>
                            <th>Planned Duration</th>
                            <th>Actual Duration</th>
                            <th>Duration Variance</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        tasks.forEach(task => {
            const plannedDurSecs = task.durationSeconds || 0;
            let actualDurSecs = 0;
            if (task.actualStart && task.actualEnd) {
                actualDurSecs = Math.round((new Date(task.actualEnd) - new Date(task.actualStart)) / 1000);
            }

            const startVariance  = this._variance(task.startDate, task.actualStart);
            const endVariance    = this._variance(task.endDate,   task.actualEnd);
            const durVarianceSecs = actualDurSecs > 0 && plannedDurSecs > 0 ? actualDurSecs - plannedDurSecs : null;

            content += `
                <tr>
                    <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                    <td>${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                    <td>${escapeHtml(Resources.getName(task.assignee))}</td>
                    <td>${this.statusBadge(task.status)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.startDate)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${task.actualStart ? this.fmt24(task.actualStart) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td style="white-space:nowrap;">${startVariance.html}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.endDate)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${task.actualEnd ? this.fmt24(task.actualEnd) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td style="white-space:nowrap;">${endVariance.html}</td>
                    <td style="font-family:monospace;">${this.fmtDuration(plannedDurSecs)}</td>
                    <td style="font-family:monospace;">${actualDurSecs > 0 ? this.fmtDuration(actualDurSecs) : '<span style="color:var(--text-muted)">—</span>'}</td>
                    <td style="white-space:nowrap;">${durVarianceSecs !== null ? this._varianceFromSecs(durVarianceSecs).html : '<span style="color:var(--text-muted)">—</span>'}</td>
                </tr>
            `;
        });

        content += `
                    </tbody>
                </table>
            </div>
        `;

        const csvRowsPerf = [
            ['Task ID','Task Name','Assignee','Status',
             'Planned Start','Actual Start','Start Variance (s)',
             'Planned End','Actual End','End Variance (s)',
             'Planned Duration','Actual Duration','Duration Variance (s)'],
            ...tasks.map(task => {
                const plannedDurSecs = task.durationSeconds || 0;
                let actualDurSecs = 0;
                if (task.actualStart && task.actualEnd) {
                    actualDurSecs = Math.round((new Date(task.actualEnd) - new Date(task.actualStart)) / 1000);
                }
                const sv = this._variance(task.startDate, task.actualStart);
                const ev = this._variance(task.endDate, task.actualEnd);
                const dv = actualDurSecs > 0 && plannedDurSecs > 0 ? actualDurSecs - plannedDurSecs : '';
                return [
                    task.taskNumber || '',
                    task.name,
                    Resources.getName(task.assignee),
                    task.status,
                    this.fmt24(task.startDate),
                    task.actualStart ? this.fmt24(task.actualStart) : '',
                    sv.secs !== null ? sv.secs : '',
                    this.fmt24(task.endDate),
                    task.actualEnd ? this.fmt24(task.actualEnd) : '',
                    ev.secs !== null ? ev.secs : '',
                    this.fmtDuration(plannedDurSecs),
                    actualDurSecs > 0 ? this.fmtDuration(actualDurSecs) : '',
                    dv
                ];
            })
        ];
        return { title: 'Task Performance Report', content, csv: csvRowsPerf };
    },

    /**
     * Compute variance between a planned ISO date and an actual ISO date.
     * Returns { html, secs } — positive = late, negative = early.
     */
    _variance(planned, actual) {
        if (!planned || !actual) return { html: '<span style="color:var(--text-muted)">—</span>', secs: null };
        const secs = Math.round((new Date(actual) - new Date(planned)) / 1000);
        return this._varianceFromSecs(secs);
    },

    _varianceFromSecs(secs) {
        if (secs === 0) return { html: '<span style="color:var(--success)">On time</span>', secs };
        const abs = Math.abs(secs);
        const label = this.fmtDuration(abs);
        if (secs < 0) return { html: `<span style="color:var(--success)">-${label} early</span>`, secs };
        return { html: `<span style="color:var(--danger)">+${label} late</span>`, secs };
    },

    /**
     * 13. Overdue Tasks Report
     * Shows all tasks whose planned start date has passed and that are not completed.
     */
    generateTaskOverdueReport() {
        const now = new Date();
        const allTasks = Tasks.sortByDate(Tasks.getAll());

        // A task is overdue if startDate < now AND status is not 'completed'
        const overdue = allTasks.filter(t =>
            t.startDate && new Date(t.startDate) < now && t.status !== 'completed'
        );

        // Sort by startDate ascending so the most overdue appear first
        overdue.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        let content = this.getReportHeader(
            'Overdue Tasks Report',
            `Tasks whose planned start has passed but are not yet completed — generated at ${this.fmt24(now.toISOString())}`
        );

        // Summary stats
        const notStarted = overdue.filter(t => !t.actualStart).length;
        const inProgress = overdue.filter(t => t.actualStart && !t.actualEnd).length;
        const blocked    = overdue.filter(t => t.status === 'blocked').length;

        content += `
            <div class="report-section">
                <h2>Summary</h2>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="stat-value">${overdue.length}</div>
                        <div class="stat-label">Overdue Tasks</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${notStarted}</div>
                        <div class="stat-label">Not Yet Started</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${inProgress}</div>
                        <div class="stat-label">In Progress</div>
                    </div>
                    <div class="report-stat">
                        <div class="stat-value">${blocked}</div>
                        <div class="stat-label">Blocked</div>
                    </div>
                </div>
            </div>
        `;

        if (overdue.length === 0) {
            content += `
                <div class="report-section">
                    <p style="color:var(--success); font-weight:600;">No overdue tasks — all tasks are on schedule or completed.</p>
                </div>
            `;
            return { title: 'Overdue Tasks Report', content, csv: [['Task ID','Task Name','Priority','Assignee','Category','Status','Planned Start','Overdue By','Planned End','Notes']] };
        }

        content += `
            <div class="report-section">
                <h2>Overdue Task Detail</h2>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Task ID</th>
                            <th>Task Name</th>
                            <th>Priority</th>
                            <th>Assignee</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Planned Start</th>
                            <th>Overdue By</th>
                            <th>Planned End</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        overdue.forEach(task => {
            const overdueMs  = now - new Date(task.startDate);
            const overdueSecs = Math.round(overdueMs / 1000);

            content += `
                <tr>
                    <td><span class="task-number-badge">${escapeHtml(task.taskNumber || '-')}</span></td>
                    <td>${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}</td>
                    <td><span class="priority-badge ${escapeHtml(task.priority)}">${escapeHtml(task.priority)}</span></td>
                    <td>${escapeHtml(Resources.getName(task.assignee))}</td>
                    <td>${this.catBadge(task.category)}</td>
                    <td>${this.statusBadge(task.status)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.startDate)}</td>
                    <td style="white-space:nowrap;color:var(--danger);font-weight:600;">${this.fmtDuration(overdueSecs)}</td>
                    <td style="white-space:nowrap;font-family:monospace;">${this.fmt24(task.endDate)}</td>
                    <td>${escapeHtml(task.notes || '')}</td>
                </tr>
            `;
        });

        content += `
                    </tbody>
                </table>
            </div>
        `;

        const csvRowsOverdue = [
            ['Task ID','Task Name','Priority','Assignee','Category','Status','Planned Start','Overdue By','Planned End','Notes'],
            ...overdue.map(task => {
                const overdueSecs = Math.round((now - new Date(task.startDate)) / 1000);
                return [
                    task.taskNumber || '',
                    task.name,
                    task.priority,
                    Resources.getName(task.assignee),
                    task.category || '',
                    task.status,
                    this.fmt24(task.startDate),
                    this.fmtDuration(overdueSecs),
                    this.fmt24(task.endDate),
                    task.notes || ''
                ];
            })
        ];
        return { title: 'Overdue Tasks Report', content, csv: csvRowsOverdue };
    }
};