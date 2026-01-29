/**
 * Inbox — AI-first approval inbox prototype
 * Tabs: To review / Later / Archive / Graph
 * Interactions: open, approve, archive, later, compare/overlay (graph tab)
 */

(function () {
    'use strict';

    // ========== Sample Data (spec) ==========
    const BUBBLE_PEOPLE_RAW = [
        { name: 'Alex Kim', team: 'デザイン', department: 'デザイン部', role: 'Manager', scores: [4, 5, 4, 4, 4, 5, 4, 4, 5, 4] },
        { name: 'Jordan Park', team: '企画', department: '企画部', role: 'Manager', scores: [3, 4, 3, 4, 3, 4, 4, 4, 4, 4] },
        { name: 'Sam Lee', team: '開発', department: '開発部', role: 'Senior Manager', scores: [5, 4, 4, 5, 5, 4, 4, 3, 4, 5] },
        { name: 'Casey Han', team: 'デザイン', department: 'デザイン部', role: 'Senior Manager', scores: [1, 2, 2, 1, 2, 1, 2, 2, 1, 2] },
        { name: 'Riley Jung', team: '開発', department: '開発部', role: 'Senior Manager', scores: [4, 3, 5, 4, 4, 5, 3, 4, 4, 4] }
    ];
    const MORE_NAMES = ['Member 6', 'Member 7', 'Member 8', 'Member 9', 'Member 10', 'Member 11', 'Member 12', 'Member 13', 'Member 14', 'Member 15', 'Member 16', 'Member 17', 'Member 18', 'Member 19', 'Member 20', 'Member 21', 'Member 22', 'Member 23', 'Member 24', 'Member 25', 'Member 26', 'Member 27', 'Member 28', 'Member 29', 'Member 30'];
    const TEAMS = ['デザイン', '企画', '開発'];
    const DEPTS = ['デザイン部', '企画部', '開発部'];
    const ROLES = ['Manager', 'Senior Manager', 'Assistant', 'Staff'];
    function randScores() {
        return Array.from({ length: 10 }, () => Math.floor(Math.random() * 3) + 3);
    }
    function randScoresLow() {
        return Array.from({ length: 10 }, () => Math.floor(Math.random() * 2) + 1);
    }
    function randScoresMid() {
        return Array.from({ length: 10 }, () => Math.random() < 0.7 ? 3 : 4);
    }
    const BUBBLE_PEOPLE_COUNT = 100;
    function getRoleByIndex(i) {
        if (i < 3) return 'Manager';
        if (i < 13) return 'Senior Manager';
        if (i < 40) return 'Assistant';
        return 'Staff';
    }
    const BUBBLE_PEOPLE = (function () {
        const list = BUBBLE_PEOPLE_RAW.map(function (p, i) { return { id: 'rec-' + (i + 1), ...p, role: p.role || getRoleByIndex(i) }; });
        var idx = BUBBLE_PEOPLE_RAW.length + 1;
        MORE_NAMES.forEach(function (name, i) {
            var i0 = list.length;
            var team = TEAMS[i % 3];
            var dept = DEPTS[i % 3];
            var scores = (i0 % 20 === 3) ? randScoresLow() : (i0 % 4 === 2) ? randScoresMid() : randScores();
            list.push({ id: 'rec-' + (idx++), name: name, team: team, department: dept, role: getRoleByIndex(i0), scores: scores });
        });
        while (list.length < BUBBLE_PEOPLE_COUNT) {
            var i0 = list.length;
            var team = TEAMS[i0 % 3];
            var dept = DEPTS[i0 % 3];
            var scores = (i0 % 20 === 3) ? randScoresLow() : (i0 % 4 === 2) ? randScoresMid() : randScores();
            list.push({ id: 'rec-' + (idx++), name: 'メンバー' + (i0 + 1), team: team, department: dept, role: getRoleByIndex(i0), scores: scores });
        }
        return list;
    })();

    const STORAGE_KEY_PREFIX = 'eval-scores-';

    const TASK_TEMPLATE = {
        summary: 'AIが8名のフィードバックを3つの重要項目に要約しました。',
        aiMessage: '要点：協働(80)、リーダーシップ(65)、問題解決(72)。推奨：リーダーシップメンタリング、プロジェクトリード参加。',
        metrics: [
            { label: '協働', value: 80, category: '技術・協働' },
            { label: 'リーダーシップ', value: 65, category: 'リーダーシップ' },
            { label: '問題解決', value: 72, category: '技術・問題解決' }
        ],
        metricsDetailed: [
            { category: '技術・協働', subitems: [{ label: 'コードレビュー', value: 82 }, { label: '会議貢献', value: 78 }] },
            { category: 'リーダーシップ', subitems: [{ label: '意思決定', value: 62 }, { label: 'メンタリング', value: 68 }] }
        ],
        kpiMetrics: [
            { label: '四半期KPI達成率', value: 92, source: 'HR-OKR' },
            { label: 'プロジェクト完了数', value: 3, source: 'PM-System' }
        ],
        projectsCompleted: 3,
        aiConfidence: 94,
        dataSourcesSummary: 'Slack（メッセージ頻度）、Gmail（フィードバックメール）、HR-OKR',
        viewed: false,
        peerMetrics: [
            { personId: 'p-lee', name: '同僚 Lee', metrics: [{ label: '協働', value: 76 }, { label: 'リーダーシップ', value: 60 }] },
            { personId: 'p-kim', name: '同僚 Kim', metrics: [{ label: '協働', value: 84 }, { label: 'リーダーシップ', value: 70 }] }
        ]
    };

    const sampleTasks = BUBBLE_PEOPLE.map(function (p, i) {
        const base = new Date('2026-01-28T09:00:00+09:00');
        const createdAt = new Date(base.getTime() - i * 3600000).toISOString();
        const status = i === 0 ? 'urgent' : (i === 1 ? 'later' : (i % 3 === 0 ? 'urgent' : 'later'));
        return {
            id: 'task-' + String(i + 1).padStart(3, '0'),
            title: p.name + '（' + p.department + '）の下期評価レポートを生成しました。',
            ...TASK_TEMPLATE,
            createdAt: createdAt,
            status: status
        };
    });

    // ========== State ==========
    let tasks = sampleTasks.map(t => ({ ...t }));
    let currentTab = 'urgent';
    let selectedTaskId = null;
    let compareProfileIds = [];

    // ========== DOM ==========
    const taskListEl = document.getElementById('taskList');
    const graphTabPanel = document.getElementById('graphTabPanel');
    const countUrgent = document.getElementById('countUrgent');
    const countLater = document.getElementById('countLater');
    const countArchive = document.getElementById('countArchive');
    const taskDialog = document.getElementById('taskDialog');
    const closeTaskDialogBtn = document.getElementById('closeTaskDialog');
    const dialogApprove = document.getElementById('dialogApprove');
    const dialogApproveComment = document.getElementById('dialogApproveComment');
    const dialogArchive = document.getElementById('dialogArchive');
    const dialogClose = document.getElementById('dialogClose');
    const dialogCompareToggle = document.getElementById('dialogCompareToggle');
    const comparePane = document.getElementById('comparePane');
    const closeComparePaneBtn = document.getElementById('closeComparePane');

    // ========== Helpers ==========
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getScoresForBubble(memberId) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + memberId);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length === 10) return parsed;
            }
        } catch (_) {}
        return null;
    }

    /**
     * Full person list (1 person = 1 bubble).
     * x: Performance — goal achievement, OKR/KPI, output metrics
     * y: Competency/Potential — problem-solving, collaboration, initiative, growth, leadership
     * size: Impact/importance — role weight, project impact, org contribution
     */
    function getBubbleData() {
        return BUBBLE_PEOPLE.map(function (p) {
            const scores = getScoresForBubble(p.id) || p.scores || [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
            var performance = scores.slice(5, 10).reduce(function (a, b) { return a + b; }, 0) / 5;
            var competency = scores.slice(0, 5).reduce(function (a, b) { return a + b; }, 0) / 5;
            var impact = (performance + competency) / 2;
            impact = Math.max(1, Math.min(5, impact + (p.id.length % 5) * 0.08));
            var size = Math.max(1.2, impact * 1.3);
            if (p.role === 'Manager') size *= 1.8;
            else if (p.role === 'Senior Manager') size *= 1.4;
            return { ...p, scores, avg: (performance + competency) / 2, x: performance, y: competency, size: size };
        });
    }

    function getTasksByTab(tab) {
        if (tab === 'graph') return [];
        if (tab === 'urgent') return tasks.filter(t => t.status === 'urgent');
        if (tab === 'later') return tasks.filter(t => t.status === 'later');
        if (tab === 'archive') return tasks.filter(t => t.status === 'archived' || t.status === 'approved');
        return [];
    }

    function moveTask(taskId, status) {
        const t = tasks.find(x => x.id === taskId);
        if (!t) return;
        t.status = status;
        updateCounts();
        renderList();
    }

    function updateCounts() {
        const urgent = tasks.filter(t => t.status === 'urgent').length;
        const later = tasks.filter(t => t.status === 'later').length;
        const archive = tasks.filter(t => t.status === 'archived' || t.status === 'approved').length;
        if (countUrgent) countUrgent.textContent = urgent;
        if (countLater) countLater.textContent = later;
        if (countArchive) countArchive.textContent = archive;
    }

    function maybeSwitchToGraphIfUrgentEmpty() {
        const urgentCount = tasks.filter(t => t.status === 'urgent').length;
        if (urgentCount !== 0 || currentTab !== 'urgent') return;
        const overlay = document.getElementById('graphGeneratingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            setTimeout(function () {
                overlay.classList.add('hidden');
                setTab('graph');
            }, 1500);
        } else {
            setTab('graph');
        }
    }

    function showSnackbar(message, options = {}) {
        const el = document.getElementById('snackbar');
        if (!el) return;
        const { undoLabel, onUndo } = options;
        el.innerHTML = '';
        const text = document.createTextNode(message);
        el.appendChild(text);
        if (undoLabel && typeof onUndo === 'function') {
            const undo = document.createElement('button');
            undo.className = 'snackbar-undo';
            undo.textContent = undoLabel;
            undo.type = 'button';
            undo.addEventListener('click', () => { onUndo(); el.classList.remove('show'); });
            el.appendChild(undo);
        }
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 4000);
    }

    // ========== Render List ==========
    function renderList() {
        const list = getTasksByTab(currentTab);
        if (!taskListEl) return;

        if (currentTab === 'graph') {
            taskListEl.classList.add('hidden');
            if (graphTabPanel) graphTabPanel.classList.remove('hidden');
            renderGraphTab();
            return;
        }
        if (graphTabPanel) graphTabPanel.classList.add('hidden');
        taskListEl.classList.remove('hidden');

        if (list.length === 0) {
            taskListEl.innerHTML = '<li class="task-item-360 task-empty">このタブに項目はありません。</li>';
            return;
        }

        taskListEl.innerHTML = list.map(task => {
            const isSelected = task.id === selectedTaskId;
            return `
<li class="task-item-360 ${isSelected ? 'selected' : ''}" data-id="${task.id}" role="button" tabindex="0">
  <span class="status-pill-360">${task.aiConfidence}%</span>
  <div class="task-meta">
    <div class="task-title">${escapeHtml(task.title)}</div>
    <div class="task-subtitle">${escapeHtml(task.summary)}</div>
    <div class="task-time">${formatDate(task.createdAt)}</div>
  </div>
  <div class="task-actions">
    ${currentTab !== 'archive' ? `<button type="button" class="btn-approve-list" data-action="approve" data-id="${task.id}" title="承認 (A)">承認</button>` : ''}
    <button type="button" class="btn-item-action" data-action="archive" data-id="${task.id}" title="アーカイブ (V)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg></button>
    <button type="button" class="btn-item-action" data-action="later" data-id="${task.id}" title="後で確認"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></button>
    <button type="button" class="btn-item-action" data-action="open" data-id="${task.id}" title="開く"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
  </div>
</li>`;
        }).join('');

        taskListEl.querySelectorAll('.task-item-360[data-id]').forEach(item => {
            const id = item.dataset.id;
            item.addEventListener('click', (e) => {
                if (e.target.closest('.task-actions')) return;
                openDialog(id);
            });
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!e.target.closest('.task-actions')) openDialog(id);
                }
            });
        });

        taskListEl.querySelectorAll('.task-actions [data-action]').forEach(btn => {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (action === 'approve') approveAndArchive(id);
                else if (action === 'archive') archiveOnly(id);
                else if (action === 'later') moveToLater(id);
                else if (action === 'open') openDialog(id);
            });
        });
    }

    function escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    // ========== Dialog ==========
    function drawRadarPlaceholder(container, metrics) {
        if (!container || !metrics || !metrics.length) return;
        const size = 160;
        const center = size / 2;
        const maxR = center - 20;
        const points = metrics.map((m, i) => {
            const angle = (i / metrics.length) * 2 * Math.PI - Math.PI / 2;
            const r = (m.value / 100) * maxR;
            return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle), label: m.label };
        });
        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
        const labels = points.map(p => `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#475569">${p.label}</text>`).join('');
        container.innerHTML = `<svg width="100%" height="180" viewBox="0 0 ${size} ${size}">
          <polygon points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="rgba(11,99,255,0.2)" stroke="#0b63ff" stroke-width="1.5"/>
          ${labels}
        </svg>`;
    }

    function drawBarPlaceholder(container, kpiMetrics) {
        if (!container || !kpiMetrics || !kpiMetrics.length) return;
        const max = Math.max(...kpiMetrics.map(m => m.value), 1);
        const bars = kpiMetrics.map(m => `
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="flex:0 0 140px;font-size:11px;color:#475569">${m.label}</span>
            <div style="flex:1;height:20px;background:#e2e8f0;border-radius:4px;overflow:hidden">
              <div style="width:${(m.value / max) * 100}%;height:100%;background:#0b63ff;border-radius:4px"></div>
            </div>
            <span style="font-size:12px;font-weight:600;color:#0f172a">${m.value}</span>
          </div>
        `).join('');
        container.innerHTML = bars;
    }

    function openDialog(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        task.viewed = true;
        selectedTaskId = taskId;

        const titleEl = document.getElementById('taskDialogTitle');
        const aiMsgEl = document.getElementById('dialogAiMessage');
        const provenanceEl = document.getElementById('dialogProvenance');
        const detailedEl = document.getElementById('dialogMetricsDetailed');
        const peerEl = document.getElementById('dialogPeerComparison');

        if (titleEl) titleEl.textContent = task.title;
        if (aiMsgEl) aiMsgEl.textContent = task.aiMessage;
        if (provenanceEl) {
            provenanceEl.innerHTML = `
              <dt>データ出典</dt><dd>${escapeHtml(task.dataSourcesSummary)}</dd>
              <dt>AI信頼度</dt><dd>${task.aiConfidence}%</dd>
              <dt>作成日</dt><dd>${formatDate(task.createdAt)}</dd>
            `;
        }
        if (detailedEl) {
            detailedEl.innerHTML = task.metricsDetailed.map(cat => `
              <p><strong>${escapeHtml(cat.category)}</strong></p>
              <ul style="margin:0.25rem 0 0 1rem;padding:0">${cat.subitems.map(s => `<li>${escapeHtml(s.label)}: ${s.value}</li>`).join('')}</ul>
            `).join('');
        }
        if (peerEl) {
            if (!task.peerMetrics || !task.peerMetrics.length) {
                peerEl.innerHTML = '<p>同僚比較データはありません。</p>';
            } else {
                peerEl.innerHTML = task.peerMetrics.map(p => `
                  <p><strong>${escapeHtml(p.name || p.personId)}</strong>: ${(p.metrics || []).map(m => `${m.label} ${m.value}`).join(', ')}</p>
                `).join('');
            }
        }

        drawRadarPlaceholder(document.getElementById('dialogRadarChart'), task.metrics);
        drawBarPlaceholder(document.getElementById('dialogBarChart'), task.kpiMetrics);

        taskDialog.classList.add('active');
        document.body.style.overflow = 'hidden';
        renderList();
    }

    function closeDialog(autoArchived = false) {
        taskDialog.classList.remove('active');
        document.body.style.overflow = '';
        if (selectedTaskId) {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task && autoArchived) {
                task.status = 'archived';
                updateCounts();
                renderList();
                showSnackbar('自動でアーカイブしました');
                maybeSwitchToGraphIfUrgentEmpty();
            }
        }
        selectedTaskId = null;
        renderList();
    }

    function approveAndArchive(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        task.status = 'approved';
        updateCounts();
        closeDialog(false);
        if (taskId === selectedTaskId) {
            taskDialog.classList.remove('active');
            document.body.style.overflow = '';
            selectedTaskId = null;
            if (detailPlaceholder) detailPlaceholder.classList.remove('hidden');
            if (detailContent) detailContent.classList.add('hidden');
        }
        showSnackbar('承認しました — アーカイブ済み');
        renderList();
        maybeSwitchToGraphIfUrgentEmpty();
    }

    function archiveOnly(taskId) {
        moveTask(taskId, 'archived');
        if (taskId === selectedTaskId) closeDialog(false);
        showSnackbar('アーカイブしました');
        renderList();
        maybeSwitchToGraphIfUrgentEmpty();
    }

    function moveToLater(taskId) {
        moveTask(taskId, 'later');
        showSnackbar('後で確認へ移動 — 元に戻す', {
            undoLabel: '元に戻す',
            onUndo: () => {
                moveTask(taskId, currentTab === 'urgent' ? 'urgent' : 'later');
                renderList();
            }
        });
        renderList();
    }

    // ========== Tabs ==========
    function setTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.tab-360').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        renderList();
    }

    // ========== Graph tab: bubble chart + filter ==========
    const BUBBLE_COLORS = ['#0b63ff', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#e11d48'];

    function getDepartmentColorMap(people) {
        var deptList = people.map(function (p) { return p.department || ''; }).filter(Boolean);
        deptList = [...new Set(deptList)].sort();
        var map = {};
        deptList.forEach(function (d, i) {
            map[d] = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
        });
        return map;
    }

    /** People in the given department (1 person = 1 bubble). */
    function getBubbleDataByDepartment(department) {
        if (!department) return [];
        const allPeople = getBubbleData();
        return allPeople.filter(function (p) { return p.department === department; });
    }

    function getBubbleTooltipText(el) {
        const type = (el.getAttribute('data-tooltip-type') || 'person').toLowerCase();
        const name = el.getAttribute('data-name') || '';
        const department = el.getAttribute('data-department') || '';
        const team = el.getAttribute('data-team') || '';
        if (type === 'team') return team || '—';
        if (type === 'department') return department || '—';
        return name ? (department ? name + ' · ' + department : name) : '—';
    }

    function getBubbleAriaLabel(p) {
        const type = (p.tooltipType || 'person').toLowerCase();
        if (type === 'team') return (p.team || 'チーム') + ' チーム';
        if (type === 'department') return (p.department || '部署') + ' 部署';
        return (p.name || '') + (p.department ? ', ' + p.department : '');
    }

    function graphSlotSuffix(slotIndex) {
        return slotIndex === 'single' ? 'Single' : slotIndex;
    }

    function bindBubbleTooltips(svg, slotIndex) {
        const suffix = graphSlotSuffix(slotIndex);
        const tooltipEl = document.getElementById('graphBubbleTooltip' + suffix);
        const wrap = document.getElementById('graphTabChart' + suffix);
        if (!tooltipEl || !svg || !wrap) return;
        const circles = svg.querySelectorAll('circle[data-tooltip-type]');
        circles.forEach(function (circle) {
            circle.addEventListener('mouseenter', function () {
                tooltipEl.textContent = getBubbleTooltipText(circle);
                tooltipEl.classList.add('is-visible');
                tooltipEl.setAttribute('aria-hidden', 'false');
            });
            circle.addEventListener('mousemove', function (e) {
                const rect = wrap.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const offset = 10;
                tooltipEl.style.left = (x + offset) + 'px';
                tooltipEl.style.top = (y + offset) + 'px';
            });
            circle.addEventListener('mouseleave', function () {
                tooltipEl.classList.remove('is-visible');
                tooltipEl.setAttribute('aria-hidden', 'true');
            });
        });
    }

    /** data: array of people (1 person = 1 bubble). globalDeptToColor keeps department colors consistent in 4-way split. */
    function drawBubbleChart(data, slotIndex, globalDeptToColor) {
        const suffix = graphSlotSuffix(slotIndex);
        const svg = document.getElementById('graphBubbleSvg' + suffix);
        const legend = document.getElementById('graphBubbleLegend' + suffix);
        if (!svg || !legend) return;

        if (!data || data.length === 0) {
            svg.innerHTML = '';
            legend.innerHTML = '<span class="graph-bubble-empty">部署を選択してください。</span>';
            return;
        }
        var people = Array.isArray(data) ? data : [];
        var first = people[0];
        if (people.length > 0 && (typeof first !== 'object' || first === null || !('name' in first) || !('x' in first))) {
            people = getBubbleData();
        }

        const w = 260;
        const h = 220;
        const pad = { left: 38, right: 18, top: 18, bottom: 38 };
        const xMin = 0, xMax = 5, yMin = 0, yMax = 5;
        const xScale = (v) => pad.left + ((v - xMin) / (xMax - xMin)) * (w - pad.left - pad.right);
        const yScale = (v) => h - pad.bottom - ((v - yMin) / (yMax - yMin)) * (h - pad.top - pad.bottom);
        const n = people.length;
        const rMax = n > 80 ? 3 : n > 50 ? 4 : n > 20 ? 5 : 8;
        const rMin = n > 50 ? 1.2 : 2.5;
        const sizeScale = n > 20 ? 0.35 : 0.5;

        const ns = 'http://www.w3.org/2000/svg';
        const frag = document.createDocumentFragment();

        // Grid lines (0–5 scale)
        for (let v = 0; v <= 5; v++) {
            const lineX = document.createElementNS(ns, 'line');
            lineX.setAttribute('x1', xScale(v));
            lineX.setAttribute('y1', pad.top);
            lineX.setAttribute('x2', xScale(v));
            lineX.setAttribute('y2', h - pad.bottom);
            lineX.setAttribute('stroke', 'var(--360-border, #e2e8f0)');
            lineX.setAttribute('stroke-width', '0.5');
            frag.appendChild(lineX);
            const lineY = document.createElementNS(ns, 'line');
            lineY.setAttribute('x1', pad.left);
            lineY.setAttribute('y1', yScale(v));
            lineY.setAttribute('x2', w - pad.right);
            lineY.setAttribute('y2', yScale(v));
            lineY.setAttribute('stroke', 'var(--360-border, #e2e8f0)');
            lineY.setAttribute('stroke-width', '0.5');
            frag.appendChild(lineY);
        }

        // Axis tick numbers (1–5)
        for (var v = 1; v <= 5; v++) {
            var tx = document.createElementNS(ns, 'text');
            tx.setAttribute('x', xScale(v));
            tx.setAttribute('y', h - 4);
            tx.setAttribute('text-anchor', 'middle');
            tx.setAttribute('font-size', '9');
            tx.setAttribute('fill', 'var(--360-text-secondary, #475569)');
            tx.textContent = String(v);
            frag.appendChild(tx);
            var ty = document.createElementNS(ns, 'text');
            ty.setAttribute('x', pad.left - 6);
            ty.setAttribute('y', yScale(v) + 3);
            ty.setAttribute('text-anchor', 'end');
            ty.setAttribute('font-size', '9');
            ty.setAttribute('fill', 'var(--360-text-secondary, #475569)');
            ty.textContent = String(v);
            frag.appendChild(ty);
        }

        // Axes labels: x=Performance, y=Competency/Potential, bubble=Impact
        const xLabel = document.createElementNS(ns, 'text');
        xLabel.setAttribute('x', (pad.left + w - pad.right) / 2);
        xLabel.setAttribute('y', h - 8);
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('font-size', '10');
        xLabel.setAttribute('fill', 'var(--360-text-secondary, #475569)');
        xLabel.textContent = '成果';
        frag.appendChild(xLabel);
        const yLabel = document.createElementNS(ns, 'text');
        yLabel.setAttribute('x', 12);
        yLabel.setAttribute('y', (pad.top + h - pad.bottom) / 2);
        yLabel.setAttribute('text-anchor', 'middle');
        yLabel.setAttribute('transform', 'rotate(-90, 12, ' + ((pad.top + h - pad.bottom) / 2) + ')');
        yLabel.setAttribute('font-size', '10');
        yLabel.setAttribute('fill', 'var(--360-text-secondary, #475569)');
        yLabel.textContent = 'コンピテンシー／ポテンシャル';
        frag.appendChild(yLabel);

        // Offset overlapping points slightly (jitter)
        people.forEach(function (p) { p.plotX = p.x; p.plotY = p.y; });
        var grid = {};
        people.forEach(function (p) {
            var k = Math.round(p.x * 12) / 12 + ',' + Math.round(p.y * 12) / 12;
            if (!grid[k]) grid[k] = [];
            grid[k].push(p);
        });
        var offsetRadius = 0.06;
        for (var k in grid) {
            var arr = grid[k];
            if (arr.length > 1) {
                arr.forEach(function (p, i) {
                    var angle = (2 * Math.PI * i) / arr.length;
                    p.plotX = p.x + offsetRadius * Math.cos(angle);
                    p.plotY = p.y + offsetRadius * Math.sin(angle);
                });
            }
        }

        // Bubbles: 1 person = 1 bubble, same color per dept, Manager/Senior Manager larger
        var deptToColor = globalDeptToColor || getDepartmentColorMap(people);
        people.forEach(function (p, i) {
            var cx = xScale(p.plotX);
            var cy = yScale(p.plotY);
            var rCap = (p.role === 'Manager') ? rMax * 1.6 : (p.role === 'Senior Manager') ? rMax * 1.3 : rMax;
            var r = Math.min(rCap, Math.max(rMin, p.size * sizeScale));
            var color = deptToColor[p.department || ''] || BUBBLE_COLORS[0];
            var circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', color);
            circle.setAttribute('fill-opacity', '0.7');
            circle.setAttribute('stroke', color);
            circle.setAttribute('stroke-width', '0.8');
            circle.setAttribute('data-tooltip-type', p.tooltipType || 'person');
            circle.setAttribute('data-name', p.name || '');
            circle.setAttribute('data-department', p.department || '');
            circle.setAttribute('data-team', p.team || '');
            circle.setAttribute('role', 'img');
            circle.setAttribute('aria-label', getBubbleAriaLabel(p));
            frag.appendChild(circle);
        });

        svg.innerHTML = '';
        svg.appendChild(frag);
        bindBubbleTooltips(svg, slotIndex);

        legend.innerHTML = '';
    }

    function renderGraphTab() {
        const all = getBubbleData();
        const departments = [...new Set(all.map(p => p.department))].sort();
        const optionHtml = '<option value="">部署を選択</option>' + departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
        const singleOptionHtml = '<option value="all">全体</option>' + departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

        const panel = document.getElementById('graphTabPanel');
        const singleSelect = document.getElementById('graphSelectDeptSingle');

        if (singleSelect) {
            if (!singleSelect.dataset.graphListener) {
                singleSelect.dataset.graphListener = '1';
                singleSelect.addEventListener('change', function () { redrawSingleChart(); });
            }
            const prevSingle = singleSelect.value;
            singleSelect.innerHTML = singleOptionHtml;
            if (prevSingle && (prevSingle === 'all' || departments.indexOf(prevSingle) !== -1)) {
                singleSelect.value = prevSingle;
            } else {
                singleSelect.value = 'all';
            }
        }

        for (let i = 0; i < 4; i++) {
            const select = document.getElementById('graphSelectDept' + i);
            if (select) {
                if (!select.dataset.graphListener) {
                    select.dataset.graphListener = '1';
                    select.addEventListener('change', function () { redrawAllGraphSlots(); });
                }
                const prev = select.value;
                select.innerHTML = optionHtml;
                if (prev && departments.indexOf(prev) !== -1) {
                    select.value = prev;
                } else if (!prev && departments.length > 0) {
                    select.value = departments[i % departments.length];
                }
            }
        }

        var globalDeptToColor = getDepartmentColorMap(all);

        function redrawSingleChart() {
            const dept = singleSelect ? singleSelect.value : '';
            const data = (dept === 'all' || dept === '') ? getBubbleData() : getBubbleDataByDepartment(dept);
            drawBubbleChart(data, 'single', globalDeptToColor);
        }

        function redrawAllGraphSlots() {
            for (let i = 0; i < 4; i++) {
                const select = document.getElementById('graphSelectDept' + i);
                const department = select ? select.value : '';
                const data = getBubbleDataByDepartment(department);
                drawBubbleChart(data, i, globalDeptToColor);
            }
        }

        if (!panel.dataset.graphSwitchListener) {
            panel.dataset.graphSwitchListener = '1';
            panel.querySelectorAll('.graph-view-switch-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    const view = btn.dataset.view;
                    panel.classList.remove('graph-view-single', 'graph-view-split');
                    panel.classList.add('graph-view-' + view);
                    panel.querySelectorAll('.graph-view-switch-btn').forEach(function (b) {
                        b.classList.toggle('active', b === btn);
                        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                    });
                    if (view === 'single') redrawSingleChart();
                    else redrawAllGraphSlots();
                });
            });
        }

        if (panel.classList.contains('graph-view-single')) {
            redrawSingleChart();
        } else {
            redrawAllGraphSlots();
        }
    }

    // ========== Compare Pane ==========
    function openComparePane() {
        comparePane.classList.remove('hidden');
        comparePane.classList.add('active');
        document.getElementById('compareRadarChart').innerHTML = '<p>複数プロファイルを選択するとレーダーオーバーレイが表示されます。</p>';
    }

    function closeComparePane() {
        comparePane.classList.add('hidden');
        comparePane.classList.remove('active');
    }

    // ========== Event Bindings ==========
    document.querySelectorAll('.tab-360').forEach(t => {
        t.addEventListener('click', () => setTab(t.dataset.tab));
    });

    if (closeTaskDialogBtn) closeTaskDialogBtn.addEventListener('click', () => closeDialog(true));
    if (taskDialog) {
        taskDialog.addEventListener('click', (e) => {
            if (e.target === taskDialog) closeDialog(true);
        });
    }

    if (dialogApprove) dialogApprove.addEventListener('click', () => selectedTaskId && approveAndArchive(selectedTaskId));
    if (dialogArchive) dialogArchive.addEventListener('click', () => selectedTaskId && archiveOnly(selectedTaskId));
    if (dialogClose) dialogClose.addEventListener('click', () => closeDialog(true));
    if (dialogCompareToggle) dialogCompareToggle.addEventListener('click', openComparePane);

    if (closeComparePaneBtn) closeComparePaneBtn.addEventListener('click', closeComparePane);
    if (comparePane) comparePane.addEventListener('click', (e) => { if (e.target === comparePane) closeComparePane(); });

    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (comparePane.classList.contains('active')) closeComparePane();
            else if (taskDialog.classList.contains('active')) closeDialog(true);
        }
        if (taskDialog.classList.contains('active') && selectedTaskId) {
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                approveAndArchive(selectedTaskId);
            }
            if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                archiveOnly(selectedTaskId);
            }
        }
    });

    // ========== Init ==========
    function init() {
        updateCounts();
        renderList();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
