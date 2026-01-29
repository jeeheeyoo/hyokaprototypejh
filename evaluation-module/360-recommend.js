/**
 * AI Recommended Members — collaboration-frequency based recommendations + radar chart (evaluation score overlay)
 */
(function () {
    'use strict';

    const RADAR_LABELS = [
        '業務遂行', '協働・コミュニケーション', 'リーダーシップ', '問題解決', '自己啓発',
        '責任感', '時間管理', '対立調整', 'ステークホルダー', '総合'
    ];

    const RADAR_COLORS = [
        'rgba(11, 99, 255, 0.6)',   // primary
        'rgba(22, 163, 74, 0.6)',   // success
        'rgba(245, 158, 11, 0.6)'   // warning
    ];

    const STORAGE_KEY_PREFIX = 'eval-scores-';

    const aiRecommendations = [
        { id: 'rec-1', name: 'Alex Kim', reasonSummary: '直近30日間の協働メッセージ頻度が高くおすすめです。', sources: ['Slack 78%'], scores: [4, 5, 4, 4, 4, 5, 4, 4, 5, 4] },
        { id: 'rec-2', name: 'Jordan Park', reasonSummary: 'Teamsチャネル活動・会議参加度が高いです。', sources: ['Teams 65%'], scores: [3, 4, 3, 4, 3, 4, 4, 4, 4, 4] },
        { id: 'rec-3', name: 'Sam Lee', reasonSummary: 'Gmailフィードバックメール交換頻度に基づくおすすめです。', sources: ['Gmail 72%'], scores: [5, 4, 4, 5, 5, 4, 4, 3, 4, 5] }
    ];

    function getScoresForMember(memberId) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PREFIX + memberId);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length === 10) return parsed;
            }
        } catch (_) {}
        return null;
    }

    function getMembersWithScores() {
        return aiRecommendations.map((rec, i) => {
            const saved = getScoresForMember(rec.id);
            const scores = saved || rec.scores || [4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
            return { id: rec.id, name: rec.name, scores, color: RADAR_COLORS[i % RADAR_COLORS.length] };
        });
    }

    function getAverageScore(members) {
        if (!members.length) return 0;
        let sum = 0;
        let count = 0;
        members.forEach(m => {
            m.scores.forEach(s => { sum += s; count += 1; });
        });
        return count ? Math.round(sum / count * 10) / 10 : 0;
    }

    function getAiMessageForAverage(avg) {
        if (avg <= 2.9) return '全体的にやや低めです。入力された評価は正確ですか？';
        if (avg >= 4.1) return '全体的にやや高めです。入力された評価は正確ですか？';
        if (avg >= 3 && avg <= 4) return 'バランスが良いです。';
        if (avg > 4 && avg < 4.1) return 'バランスが良いです。';
        if (avg > 2.9 && avg < 3) return 'バランスが良いです。';
        return 'バランスが良いです。';
    }

    function escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function drawRadarChart() {
        const svgEl = document.getElementById('radarChartSvg');
        const legendEl = document.getElementById('radarLegend');
        const avgEl = document.getElementById('radarAverageScore');
        const msgEl = document.getElementById('radarAiMessage');
        if (!svgEl || !legendEl) return;

        const members = getMembersWithScores();
        const avg = getAverageScore(members);
        const aiMessage = getAiMessageForAverage(avg);
        if (avgEl) avgEl.textContent = avg.toFixed(1);
        if (msgEl) {
            msgEl.textContent = aiMessage;
            msgEl.className = 'radar-ai-message radar-ai-message--' + (avg <= 2.9 ? 'low' : avg >= 4.1 ? 'high' : 'balanced');
        }
        const numAxes = RADAR_LABELS.length;
        const cx = 200;
        const cy = 200;
        const maxR = 140;
        const minScore = 1;
        const maxScore = 5;

        function scoreToRadius(score) {
            const n = Math.max(minScore, Math.min(maxScore, score));
            return ((n - minScore) / (maxScore - minScore)) * maxR;
        }

        function angleForIndex(i) {
            const deg = -90 + (i / numAxes) * 360;
            return (deg * Math.PI) / 180;
        }

        function point(axisIndex, radius) {
            const a = angleForIndex(axisIndex);
            return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
        }

        const ns = 'http://www.w3.org/2000/svg';
        const frag = document.createDocumentFragment();

        // Grid circles (1~5)
        for (let s = 1; s <= 5; s++) {
            const r = scoreToRadius(s);
            const circle = document.createElementNS(ns, 'circle');
            circle.setAttribute('cx', cx);
            circle.setAttribute('cy', cy);
            circle.setAttribute('r', r);
            circle.setAttribute('fill', 'none');
            circle.setAttribute('stroke', 'var(--360-border, #e2e8f0)');
            circle.setAttribute('stroke-width', '0.5');
            frag.appendChild(circle);
        }

        // Axes and labels
        for (let i = 0; i < numAxes; i++) {
            const end = point(i, maxR);
            const line = document.createElementNS(ns, 'line');
            line.setAttribute('x1', cx);
            line.setAttribute('y1', cy);
            line.setAttribute('x2', end.x);
            line.setAttribute('y2', end.y);
            line.setAttribute('stroke', 'var(--360-border, #e2e8f0)');
            line.setAttribute('stroke-width', '0.5');
            frag.appendChild(line);

            const labelPos = point(i, maxR + 28);
            const text = document.createElementNS(ns, 'text');
            text.setAttribute('x', labelPos.x);
            text.setAttribute('y', labelPos.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', 'var(--360-text-secondary, #475569)');
            text.textContent = RADAR_LABELS[i];
            frag.appendChild(text);
        }

        // Member polygons (overlay)
        members.forEach(m => {
            const pts = m.scores.map((score, i) => point(i, scoreToRadius(score)));
            const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ') + ' Z';
            const poly = document.createElementNS(ns, 'path');
            poly.setAttribute('d', d);
            poly.setAttribute('fill', m.color);
            poly.setAttribute('stroke', m.color.replace('0.6', '1'));
            poly.setAttribute('stroke-width', '1.5');
            frag.appendChild(poly);
        });

        svgEl.innerHTML = '';
        svgEl.appendChild(frag);

        legendEl.innerHTML = members.map((m, i) => `
          <span class="radar-legend-item">
            <span class="radar-legend-dot" style="background:${RADAR_COLORS[i % RADAR_COLORS.length].replace('0.6', '1')}"></span>
            <span class="radar-legend-name">${escapeHtml(m.name)}</span>
          </span>
        `).join('');
    }

    function render() {
        const list = document.getElementById('aiRecommendationsList');
        if (list) {
            list.innerHTML = aiRecommendations.map(rec => {
                const evalUrl = '360-eval-input.html?member=' + encodeURIComponent(rec.id) + '&name=' + encodeURIComponent(rec.name || '');
                return `
          <li class="ai-rec-item">
            <span class="rec-avatar">${escapeHtml((rec.name || '?').charAt(0))}</span>
            <div class="rec-body">
              <div class="rec-name">${escapeHtml(rec.name)}</div>
              <div class="rec-why">${escapeHtml(rec.reasonSummary)}</div>
            </div>
            <div class="rec-actions">
              <a href="${evalUrl}" class="btn-rec" title="評価入力"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></a>
              <button type="button" class="btn-rec" title="プロフィールを見る"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button>
            </div>
          </li>
        `;
            }).join('');
        }
        drawRadarChart();
    }

    // ========== Chat (fixed box + Drawer) ==========
    let chatHistory = [];

    function openDrawer() {
        const drawer = document.getElementById('chatDrawer');
        const backdrop = document.getElementById('chatDrawerBackdrop');
        if (drawer) drawer.classList.add('open');
        if (backdrop) {
            backdrop.classList.add('open');
            backdrop.setAttribute('aria-hidden', 'false');
        }
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        const drawer = document.getElementById('chatDrawer');
        const backdrop = document.getElementById('chatDrawerBackdrop');
        if (drawer) drawer.classList.remove('open');
        if (backdrop) {
            backdrop.classList.remove('open');
            backdrop.setAttribute('aria-hidden', 'true');
        }
        document.body.style.overflow = '';
    }

    function renderChatMessages() {
        const list = document.getElementById('chatMessagesList');
        if (!list) return;
        if (!chatHistory.length) {
            list.innerHTML = '<li class="chat-empty">チャット履歴はまだありません。下の入力欄から質問や指示を送ってください。</li>';
            return;
        }
        list.innerHTML = chatHistory.map(msg => `
          <li class="chat-msg chat-msg--${msg.role}">
            <span class="chat-msg-role">${msg.role === 'user' ? 'あなた' : 'AI'}</span>
            <div class="chat-msg-content">${escapeHtml(msg.text)}</div>
            <time class="chat-msg-time">${msg.time || ''}</time>
          </li>
        `).join('');
        list.scrollTop = list.scrollHeight;
    }

    function simulateAiReply(userText) {
        const t = (userText || '').trim();
        if (/おすすめ|メンバー|推薦|推奨/.test(t)) return 'Slack/Teams/Gmailデータに基づく協働頻度の高いメンバーをおすすめしています。リストの[+]から評価入力へ移動できます。';
        if (/評価|点数|スコア/.test(t)) return '評価入力ページで10項目に1～5点を付けることができます。保存した点数はこのページのレーダーチャートに反映されます。';
        if (/グラフ|レーダー|チャート/.test(t)) return '右のレーダーチャートは全被評価者の項目別点数をオーバーレイ表示しています。平均点数とAIメッセージもご確認ください。';
        return 'ご質問ありがとうございます。おすすめメンバー・評価入力・レーダーチャートについて、他に知りたいことがあればお聞かせください。';
    }

    function doSendMessage(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return;

        const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        chatHistory.push({ role: 'user', text: trimmed, time: now });
        openDrawer();
        renderChatMessages();

        setTimeout(() => {
            const aiText = simulateAiReply(trimmed);
            chatHistory.push({ role: 'agent', text: aiText, time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
            renderChatMessages();
        }, 600);
    }

    function sendMessageFromFixed() {
        const input = document.getElementById('chatInput');
        if (!input) return;
        const text = input.value;
        if (!(text || '').trim()) return;
        input.value = '';
        doSendMessage(text);
    }

    function sendMessageFromDrawer() {
        const input = document.getElementById('chatDrawerInput');
        if (!input) return;
        const text = input.value;
        if (!(text || '').trim()) return;
        input.value = '';
        doSendMessage(text);
    }

    function initChat() {
        const sendBtn = document.getElementById('chatSendBtn');
        const chatInput = document.getElementById('chatInput');
        const drawerSendBtn = document.getElementById('chatDrawerSendBtn');
        const drawerInput = document.getElementById('chatDrawerInput');
        const drawerClose = document.getElementById('chatDrawerClose');
        const backdrop = document.getElementById('chatDrawerBackdrop');

        if (sendBtn) sendBtn.addEventListener('click', sendMessageFromFixed);
        if (chatInput) {
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageFromFixed();
                }
            });
        }
        if (drawerSendBtn) drawerSendBtn.addEventListener('click', sendMessageFromDrawer);
        if (drawerInput) {
            drawerInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessageFromDrawer();
                }
            });
        }
        if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            render();
            initChat();
        });
    } else {
        render();
        initChat();
    }
})();
