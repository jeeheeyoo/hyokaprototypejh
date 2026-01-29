/**
 * 評価入力ページ — 10項目、AI自動回答、項目別［承認］［再生成］
 */
(function () {
    'use strict';

    const EVAL_QUESTIONS = [
        { id: 1, question: '業務遂行能力についてどのように評価しますか？', aiAnswer: '目標達成率が高く、与えられた業務を期限までに完了する能力に優れています。複雑な課題にも体系的に取り組みます。' },
        { id: 2, question: '協働・コミュニケーション能力はいかがですか？', aiAnswer: 'チームメンバーと円滑にコミュニケーションを取り、意見の調整やフィードバックの伝達が明確です。会議やプロジェクトの協働に積極的に貢献しています。' },
        { id: 3, question: 'リーダーシップと意思決定能力を評価してください。', aiAnswer: '必要に応じて主導的に方向性を示し、チーム目標達成のため合理的な意思決定をしています。メンターリングにも貢献しています。' },
        { id: 4, question: '問題解決と創造性はいかがですか？', aiAnswer: '障害要因を素早く把握し代替案を提示します。新しい方法を試すことに躊躇がなく、改善案を積極的に提案します。' },
        { id: 5, question: '自己啓発・学習意欲はいかがですか？', aiAnswer: '関連分野の学習を継続しており、フィードバックを反映して成長しようとする姿勢が顕著です。新規ツールやプロセスの習得が早いです。' },
        { id: 6, question: '責任感と信頼性についてお聞かせください。', aiAnswer: '担当する役割に責任を持ち、約束を守る傾向にあります。緊急時もフォローアップを明確にし共有します。' },
        { id: 7, question: '時間管理と業務の優先順位づけはいかがですか？', aiAnswer: '重要・緊急度を区別して業務を処理し、期限を守る傾向にあります。負荷が高まったときは適宜調整を依頼します。' },
        { id: 8, question: '対立調整やチーム雰囲気づくりで貢献した点はありますか？', aiAnswer: '意見が対立した際は中立的な立場で調整を試み、チーム内の信頼と協力の雰囲気維持に貢献しています。' },
        { id: 9, question: '顧客・社内ステークホルダーへの対応はいかがですか？', aiAnswer: '要件を正確に把握し、期待に沿った成果物の提供に努めています。フィードバックへの対応が迅速です。' },
        { id: 10, question: '全体的な総合評価と改善が必要な点を記入してください。', aiAnswer: '全体的に目標達成と協働で優れた成果を示しました。リーダーシップと意思決定の経験をさらに積むと成長の可能性が高いです。' }
    ];

    const REGEN_ALTERNATIVES = [
        '別の観点で整理した評価です。前回の回答と比較して選択してください。',
        '要点のみ要約したバージョンです。必要に応じて文言を補完してご利用ください。',
        '具体的な事例を反映した修正案です。実際の状況に合わせて調整できます。'
    ];

    const STORAGE_KEY_PREFIX = 'eval-scores-';

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            member: params.get('member') || '',
            name: decodeURIComponent(params.get('name') || 'メンバー')
        };
    }

    function escapeHtml(s) {
        if (!s) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function showSnackbar(message) {
        const el = document.getElementById('snackbar');
        if (!el) return;
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }

    function getRandomRegenAnswer(questionIndex) {
        const q = EVAL_QUESTIONS[questionIndex];
        const alt = REGEN_ALTERNATIVES[Math.floor(Math.random() * REGEN_ALTERNATIVES.length)];
        return q.aiAnswer + ' ' + alt;
    }

    function render() {
        const { name, member: memberId } = getUrlParams();
        const titleEl = document.getElementById('evalPageTitle');
        const introEl = document.getElementById('evalIntro');
        if (titleEl) titleEl.textContent = '評価入力 — ' + escapeHtml(name);
        if (introEl) introEl.textContent = escapeHtml(name) + 'さんへのAI自動回答です。各項目を確認のうえ、承認または再生成できます。';

        const listEl = document.getElementById('evalFormList');
        if (!listEl) return;

        const answers = EVAL_QUESTIONS.map(q => ({ ...q, approved: false, score: 4 }));
        if (memberId) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_PREFIX + memberId);
                if (raw) {
                    const arr = JSON.parse(raw);
                    if (Array.isArray(arr) && arr.length === 10) {
                        arr.forEach((s, i) => {
                            if (answers[i]) answers[i].score = Math.max(1, Math.min(5, Number(s) || 4));
                        });
                    }
                }
            } catch (_) {}
        }

        function saveScores() {
            if (!memberId) return;
            try {
                localStorage.setItem(STORAGE_KEY_PREFIX + memberId, JSON.stringify(answers.map(a => a.score)));
            } catch (_) {}
        }

        function updateItem(index) {
            const item = listEl.querySelector(`.eval-form-item[data-index="${index}"]`);
            if (!item) return;
            const answerEl = item.querySelector('.eval-answer-text');
            const approveBtn = item.querySelector('.eval-btn-approve');
            if (answerEl) answerEl.value = answers[index].aiAnswer;
            if (approveBtn) {
                approveBtn.textContent = answers[index].approved ? '承認済み' : '承認';
                approveBtn.disabled = answers[index].approved;
                approveBtn.classList.toggle('eval-btn-approved', answers[index].approved);
            }
            item.querySelectorAll('.eval-rating-option').forEach((opt, i) => {
                opt.classList.toggle('selected', answers[index].score === i + 1);
                opt.setAttribute('aria-pressed', answers[index].score === i + 1 ? 'true' : 'false');
            });
        }

        listEl.innerHTML = EVAL_QUESTIONS.map((q, index) => `
          <li class="eval-form-item" data-index="${index}">
            <div class="eval-question-row">
              <span class="eval-question-num">${index + 1}.</span>
              <span class="eval-question-text">${escapeHtml(q.question)}</span>
            </div>
            <div class="eval-rating-row">
              <span class="eval-rating-label">点数</span>
              <div class="eval-rating-bar" role="group" aria-label="1～5点を選択">
                ${[1, 2, 3, 4, 5].map(n => `
                  <button type="button" class="eval-rating-option ${answers[index].score === n ? 'selected' : ''}" data-index="${index}" data-score="${n}" aria-pressed="${answers[index].score === n ? 'true' : 'false'}">${n}点</button>
                `).join('')}
              </div>
            </div>
            <div class="eval-answer-row">
              <textarea class="eval-answer-text" rows="3" data-index="${index}">${escapeHtml(q.aiAnswer)}</textarea>
            </div>
            <div class="eval-actions-row">
              <button type="button" class="btn-360 btn-primary-360 eval-btn-approve" data-index="${index}">承認</button>
              <button type="button" class="btn-360 btn-secondary-360 eval-btn-regen" data-index="${index}">再生成</button>
            </div>
          </li>
        `).join('');

        listEl.querySelectorAll('.eval-btn-approve').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                answers[index].approved = true;
                updateItem(index);
                saveScores();
                showSnackbar('項目' + (index + 1) + 'を承認しました。');
            });
        });

        listEl.querySelectorAll('.eval-btn-regen').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                answers[index].aiAnswer = getRandomRegenAnswer(index);
                updateItem(index);
                showSnackbar('項目' + (index + 1) + 'の回答を再生成しました。');
            });
        });

        listEl.querySelectorAll('.eval-answer-text').forEach(ta => {
            ta.addEventListener('input', () => {
                const index = parseInt(ta.dataset.index, 10);
                answers[index].aiAnswer = ta.value;
            });
        });

        listEl.querySelectorAll('.eval-rating-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                const score = parseInt(btn.dataset.score, 10);
                answers[index].score = score;
                updateItem(index);
                saveScores();
            });
        });

        window.addEventListener('beforeunload', saveScores);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
