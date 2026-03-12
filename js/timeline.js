/**
 * Timeline Module - Handles timeline visualization
 */

const Timeline = {
    zoomLevels: ['Day View', 'Week View', 'Month View'],
    currentZoom: 1, // Week View by default
    cellWidth: 100,

    /**
     * Initialize timeline
     */
    init() {
        this.render();
        this.bindEvents();
    },

    /**
     * Bind timeline events
     */
    bindEvents() {
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
    },

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.currentZoom > 0) {
            this.currentZoom--;
            this.render();
        }
    },

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.currentZoom < this.zoomLevels.length - 1) {
            this.currentZoom++;
            this.render();
        }
    },

    /**
     * Get date range for timeline
     */
    getDateRange() {
        const tasks = Tasks.getAll();
        const project = Storage.get(Storage.KEYS.PROJECT);
        
        if (tasks.length === 0) {
            const now = new Date();
            return {
                start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
            };
        }

        let minDate = new Date(tasks[0].startDate);
        let maxDate = new Date(tasks[0].endDate);

        tasks.forEach(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;
        });

        // Add padding
        minDate.setDate(minDate.getDate() - 2);
        maxDate.setDate(maxDate.getDate() + 2);

        return { start: minDate, end: maxDate };
    },

    /**
     * Generate timeline header cells
     */
    generateHeaderCells(startDate, endDate) {
        const cells = [];
        const current = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const project = Storage.get(Storage.KEYS.PROJECT);
        const cutoverDate = project ? new Date(project.cutoverDate) : null;

        while (current <= endDate) {
            const isToday = current.toDateString() === today.toDateString();
            const isCutover = cutoverDate && current.toDateString() === cutoverDate.toDateString();
            
            let label = '';
            switch (this.currentZoom) {
                case 0: // Day View
                    label = current.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    current.setHours(current.getHours() + 6);
                    break;
                case 1: // Week View
                    label = current.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    current.setDate(current.getDate() + 1);
                    break;
                case 2: // Month View
                    label = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    current.setDate(current.getDate() + 3);
                    break;
            }

            cells.push({
                label,
                isToday,
                isCutover,
                date: new Date(current)
            });
        }

        return cells;
    },

    /**
     * Calculate task position on timeline
     */
    calculateTaskPosition(task, startDate, totalDuration) {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        const timelineStart = startDate.getTime();
        
        const startOffset = ((taskStart.getTime() - timelineStart) / totalDuration) * 100;
        const duration = ((taskEnd.getTime() - taskStart.getTime()) / totalDuration) * 100;

        return {
            left: Math.max(0, startOffset),
            width: Math.max(1, Math.min(duration, 100 - startOffset))
        };
    },

    /**
     * Render timeline
     */
    render() {
        const { start, end } = this.getDateRange();
        const totalDuration = end.getTime() - start.getTime();
        const headerCells = this.generateHeaderCells(start, end);
        const tasks = Tasks.sortByDate(Tasks.getAll());
        const project = Storage.get(Storage.KEYS.PROJECT);
        const cutoverDate = project ? new Date(project.cutoverDate) : null;

        // Update zoom level display
        document.getElementById('zoomLevel').textContent = this.zoomLevels[this.currentZoom];

        // Render header
        const headerHtml = headerCells.map(cell => 
            `<div class="timeline-header-cell ${cell.isToday ? 'today' : ''}">${cell.label}</div>`
        ).join('');
        document.getElementById('timelineHeader').innerHTML = headerHtml;

        // Calculate today line position
        const today = new Date();
        const todayPosition = ((today.getTime() - start.getTime()) / totalDuration) * 100;

        // Calculate cutover line position
        let cutoverPosition = null;
        if (cutoverDate) {
            cutoverPosition = ((cutoverDate.getTime() - start.getTime()) / totalDuration) * 100;
        }

        // Render task rows
        let bodyHtml = '';
        
        if (tasks.length === 0) {
            bodyHtml = '<div class="empty-state"><div class="empty-state-icon">📅</div><h3>No Tasks Yet</h3><p>Add tasks to see them on the timeline</p></div>';
        } else {
            tasks.forEach(task => {
                const pos = this.calculateTaskPosition(task, start, totalDuration);
                const assignee = Resources.getName(task.assignee);
                
                bodyHtml += `
                    <div class="timeline-row">
                        <div class="timeline-task-label" title="${escapeHtml(task.name)}">
                            ${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}
                        </div>
                        <div class="timeline-task-bar-container">
                            <div class="timeline-task-bar ${escapeHtml(task.category)} ${task.milestone ? 'milestone' : ''}"
                                 style="left: ${pos.left}%; width: ${pos.width}%;"
                                 title="${escapeHtml(task.name)}&#10;${escapeHtml(assignee)}&#10;${this.formatDateRange(task.startDate, task.endDate)}">
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        // Add today line
        if (todayPosition >= 0 && todayPosition <= 100) {
            bodyHtml += `<div class="timeline-today-line" style="left: calc(200px + ${todayPosition}%);"></div>`;
        }

        // Add cutover line
        if (cutoverPosition !== null && cutoverPosition >= 0 && cutoverPosition <= 100) {
            bodyHtml += `<div class="timeline-cutover-line" style="left: calc(200px + ${cutoverPosition}%);"></div>`;
        }

        document.getElementById('timelineBody').innerHTML = bodyHtml;
    },

    /**
     * Format date range for display
     */
    formatDateRange(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
};