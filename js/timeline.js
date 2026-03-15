/**
 * Timeline Module - Handles timeline visualization
 */

const Timeline = {
    zoomLevels: ['Day View', 'Week View', 'Month View'],
    currentZoom: 1, // Week View by default

    // Pixels per time unit at each zoom level
    // Day View:   px per hour  (step = 1h)
    // Week View:  px per day   (step = 1d)
    // Month View: px per 3days (step = 3d)
    pxPerUnit: [60, 120, 90],
    LABEL_WIDTH: 200, // px — must match CSS .timeline-task-label width

    init() {
        this.render();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
    },

    zoomIn() {
        if (this.currentZoom > 0) { this.currentZoom--; this.render(); }
    },

    zoomOut() {
        if (this.currentZoom < this.zoomLevels.length - 1) { this.currentZoom++; this.render(); }
    },

    /** Returns step duration in ms for the current zoom level. */
    stepMs() {
        switch (this.currentZoom) {
            case 0: return 60 * 60 * 1000;              // 1 hour
            case 1: return 24 * 60 * 60 * 1000;         // 1 day
            case 2: return 3 * 24 * 60 * 60 * 1000;     // 3 days
        }
    },

    /** Snap a timestamp down to the start of its step bucket. */
    snapToStep(ms) {
        const step = this.stepMs();
        return Math.floor(ms / step) * step;
    },

    getDateRange() {
        const tasks = Tasks.getAll().filter(t => t.startDate && t.endDate);

        if (tasks.length === 0) {
            const now = Date.now();
            return {
                start: new Date(now - 7 * 24 * 60 * 60 * 1000),
                end:   new Date(now + 14 * 24 * 60 * 60 * 1000)
            };
        }

        let minMs = Infinity, maxMs = -Infinity;
        tasks.forEach(t => {
            const s = new Date(t.startDate).getTime();
            const e = new Date(t.endDate).getTime();
            if (isFinite(s) && s < minMs) minMs = s;
            if (isFinite(e) && e > maxMs) maxMs = e;
        });

        const step = this.stepMs();
        // 2-step padding on each side
        return {
            start: new Date(this.snapToStep(minMs) - 2 * step),
            end:   new Date(this.snapToStep(maxMs) + 3 * step)
        };
    },

    /** Convert an absolute timestamp to an x-pixel offset (relative to the track, not the label). */
    toPx(ms, startMs) {
        const step  = this.stepMs();
        const ppx   = this.pxPerUnit[this.currentZoom];
        return ((ms - startMs) / step) * ppx;
    },

    render() {
        const { start, end } = this.getDateRange();
        const startMs  = start.getTime();
        const endMs    = end.getTime();
        const step     = this.stepMs();
        const ppx      = this.pxPerUnit[this.currentZoom];
        const tasks    = Tasks.sortByDate(Tasks.getAll().filter(t => t.startDate && t.endDate));
        const project  = Storage.get(Storage.KEYS.PROJECT);
        const cutoverMs = project && project.cutoverDate ? new Date(project.cutoverDate).getTime() : null;
        const todayMs   = Date.now();

        document.getElementById('zoomLevel').textContent = this.zoomLevels[this.currentZoom];

        // ── Track width (pixel) ───────────────────────────────────────────────
        const steps      = Math.ceil((endMs - startMs) / step);
        const trackWidth = steps * ppx; // px width of the scrollable track

        // ── Build header cells ────────────────────────────────────────────────
        const today = new Date(); today.setHours(0,0,0,0);
        let headerHtml = `<div class="tl-label-spacer" style="width:${this.LABEL_WIDTH}px;flex-shrink:0"></div>`;
        headerHtml += `<div class="tl-track-header" style="width:${trackWidth}px;position:relative;flex-shrink:0">`;

        for (let t = this.snapToStep(startMs); t < endMs; t += step) {
            const x    = this.toPx(t, startMs);
            const d    = new Date(t);
            const isTodayCell = d.toDateString() === today.toDateString();
            let label  = '';
            switch (this.currentZoom) {
                case 0: label = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); break;
                case 1: label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); break;
                case 2: label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); break;
            }
            headerHtml += `<div class="tl-header-cell ${isTodayCell ? 'today' : ''}"
                style="position:absolute;left:${x}px;width:${ppx}px;">${label}</div>`;
        }
        headerHtml += '</div>';

        // ── Build rows ────────────────────────────────────────────────────────
        let rowsHtml = '';
        if (tasks.length === 0) {
            rowsHtml = `<div class="empty-state"><div class="empty-state-icon">📅</div>
                <h3>No Tasks Yet</h3><p>Add tasks to see them on the timeline</p></div>`;
        } else {
            tasks.forEach(task => {
                const taskStartMs = new Date(task.startDate).getTime();
                const taskEndMs   = new Date(task.endDate).getTime();
                const x     = this.toPx(taskStartMs, startMs);
                const w     = Math.max(4, this.toPx(taskEndMs, startMs) - x);
                const assignee = escapeHtml(Resources.getName(task.assignee) || '');
                const tooltip  = `${escapeHtml(task.name)}&#10;${assignee}&#10;${this.formatDateRange(task.startDate, task.endDate)}`;

                // Vertical grid lines for this row
                let gridLines = '';
                for (let t = this.snapToStep(startMs); t < endMs; t += step) {
                    gridLines += `<div class="tl-grid-line" style="left:${this.toPx(t, startMs)}px"></div>`;
                }

                rowsHtml += `
                <div class="tl-row">
                    <div class="tl-label" style="width:${this.LABEL_WIDTH}px" title="${escapeHtml(task.name)}">
                        ${task.milestone ? '🔹 ' : ''}${escapeHtml(task.name)}
                    </div>
                    <div class="tl-track" style="width:${trackWidth}px;position:relative;flex-shrink:0">
                        ${gridLines}
                        <div class="tl-bar ${escapeHtml(task.category || '')} ${task.milestone ? 'milestone' : ''}"
                             style="left:${x}px;width:${task.milestone ? '24px' : w + 'px'};"
                             title="${tooltip}"></div>
                    </div>
                </div>`;
            });
        }

        // ── Today + cutover vertical lines ────────────────────────────────────
        const todayX    = this.toPx(todayMs, startMs);
        const cutoverX  = cutoverMs !== null ? this.toPx(cutoverMs, startMs) : null;

        // Only show if within the visible track range
        let overlayHtml = '';
        if (todayX >= 0 && todayX <= trackWidth) {
            overlayHtml += `<div class="tl-today-line" style="left:${this.LABEL_WIDTH + todayX}px"></div>`;
        }
        if (cutoverX !== null && cutoverX >= 0 && cutoverX <= trackWidth) {
            overlayHtml += `<div class="tl-cutover-line" style="left:${this.LABEL_WIDTH + cutoverX}px"></div>`;
        }

        // ── Inject into DOM ───────────────────────────────────────────────────
        const container = document.getElementById('timelineContainer');
        container.innerHTML = `
            <div class="tl-scroll-wrap">
                <div class="tl-header-row">${headerHtml}</div>
                <div class="tl-body" style="position:relative">${rowsHtml}${overlayHtml}</div>
            </div>`;
    },

    formatDateRange(startDate, endDate) {
        const opts = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return `${new Date(startDate).toLocaleDateString('en-US', opts)} – ${new Date(endDate).toLocaleDateString('en-US', opts)}`;
    }
};
