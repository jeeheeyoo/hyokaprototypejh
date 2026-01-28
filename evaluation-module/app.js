// ==========================================
// Mock Data Generation
// ==========================================
const generateMockData = () => {
    const names = [
        '田中 太郎', '佐藤 花子', '鈴木 一郎', '高橋 美咲', '渡辺 健太',
        '伊藤 由美', '山本 翔太', '中村 恵', '小林 大輔', '加藤 真理子',
        '吉田 隆', '山田 あかり', '佐々木 誠', '松本 さくら', '井上 拓也',
        '木村 彩香', '林 雄一', '清水 優子', '山崎 浩二', '森 美穂',
        '池田 晃', '橋本 麻衣', '阿部 慎一', '石川 理恵', '藤田 圭介'
    ];

    const departments = ['営業部', '開発部', 'マーケティング部', '人事部', '企画部'];
    const periods = ['2024年度 下期', '2024年度 上期', '2023年度 下期'];
    const evaluationTypes = ['自己評価', '上司評価', '360度評価', 'プロジェクト評価'];
    const statuses = ['完了', 'レビュー中', '未完了', '保留'];

    const data = [];
    for (let i = 0; i < 50; i++) {
        const score = Math.floor(Math.random() * 31) + 70; // 70-100
        data.push({
            id: i + 1,
            name: names[Math.floor(Math.random() * names.length)],
            employeeId: `EMP${String(1000 + i).padStart(4, '0')}`,
            department: departments[Math.floor(Math.random() * departments.length)],
            period: periods[Math.floor(Math.random() * periods.length)],
            evaluationType: evaluationTypes[Math.floor(Math.random() * evaluationTypes.length)],
            score: score,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            submittedDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('ja-JP'),
            reviewedDate: Math.random() > 0.5 ? new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('ja-JP') : '-',
            scores: {
                technical: Math.floor(Math.random() * 31) + 70,
                communication: Math.floor(Math.random() * 31) + 70,
                leadership: Math.floor(Math.random() * 31) + 70,
                problemSolving: Math.floor(Math.random() * 31) + 70,
                teamwork: Math.floor(Math.random() * 31) + 70
            },
            comments: 'この評価期間において、優れた成果を上げることができました。特にプロジェクトマネジメントにおいて顕著な進歩が見られます。'
        });
    }
    return data;
};

// ==========================================
// Application State
// ==========================================
let allData = generateMockData();
let filteredData = [...allData];
let currentPage = 1;
const itemsPerPage = 10;
let currentSort = { field: null, direction: 'asc' };

// ==========================================
// DOM Elements
// ==========================================
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const periodFilter = document.getElementById('periodFilter');
const departmentFilter = document.getElementById('departmentFilter');
const resetFiltersBtn = document.getElementById('resetFilters');
const tableBody = document.getElementById('tableBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const displayCount = document.getElementById('displayCount');
const detailModal = document.getElementById('detailModal');
const closeModalBtn = document.getElementById('closeModal');
const modalBody = document.getElementById('modalBody');
const exportBtn = document.getElementById('exportBtn');
const linkBtn = document.getElementById('linkBtn');

// Bulk Action Elements
const selectAllCheckbox = document.getElementById('selectAll');
const bulkActionToolbar = document.getElementById('bulkActionToolbar');
const selectedCountDisplay = document.getElementById('selectedCount');
const bulkFeedbackBtn = document.getElementById('bulkFeedbackBtn');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const bulkFeedbackModal = document.getElementById('bulkFeedbackModal');
const closeBulkModalBtn = document.getElementById('closeBulkModal');
const bulkSelectedCount = document.getElementById('bulkSelectedCount');
const bulkSatisfactionSlider = document.getElementById('bulkSatisfactionScore');
const bulkScoreValueDisplay = document.getElementById('bulkScoreValue');
const bulkFeedbackComment = document.getElementById('bulkFeedbackComment');
const cancelBulkBtn = document.getElementById('cancelBulkBtn');
const submitBulkBtn = document.getElementById('submitBulkBtn');
const bulkProgressContainer = document.getElementById('bulkProgressContainer');
const bulkProgressFill = document.getElementById('bulkProgressFill');
const bulkProgressText = document.getElementById('bulkProgressText');

// Bulk Selection State
const bulkSelection = {
    selectedIds: new Set(),
    isAllSelected: false
};

// Stats elements
const totalCount = document.getElementById('totalCount');
const completeCount = document.getElementById('completeCount');
const reviewCount = document.getElementById('reviewCount');
const averageScore = document.getElementById('averageScore');

// ==========================================
// Utility Functions
// ==========================================
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const getStatusClass = (status) => {
    const statusMap = {
        '完了': 'status-complete',
        'レビュー中': 'status-review',
        '未完了': 'status-incomplete',
        '保留': 'status-hold'
    };
    return statusMap[status] || 'status-incomplete';
};

// ==========================================
// Data Filtering and Sorting
// ==========================================
const applyFilters = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    const periodValue = periodFilter.value;
    const departmentValue = departmentFilter.value;

    filteredData = allData.filter(item => {
        const matchesSearch = !searchTerm ||
            item.name.toLowerCase().includes(searchTerm) ||
            item.department.toLowerCase().includes(searchTerm) ||
            item.employeeId.toLowerCase().includes(searchTerm);

        const matchesStatus = !statusValue || item.status === statusValue;
        const matchesPeriod = !periodValue || item.period === periodValue;
        const matchesDepartment = !departmentValue || item.department === departmentValue;

        return matchesSearch && matchesStatus && matchesPeriod && matchesDepartment;
    });

    // Apply current sort if any
    if (currentSort.field) {
        applySorting(currentSort.field, currentSort.direction);
    }

    currentPage = 1;
    updateStats();
    renderTable();
    updatePagination();
};

const applySorting = (field, direction) => {
    filteredData.sort((a, b) => {
        let aValue = a[field];
        let bValue = b[field];

        // Handle number sorting for score
        if (field === 'score') {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Handle string sorting
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (direction === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
    });
};

const resetFilters = () => {
    searchInput.value = '';
    statusFilter.value = '';
    periodFilter.value = '';
    departmentFilter.value = '';
    currentSort = { field: null, direction: 'asc' };

    // Reset sort indicators
    document.querySelectorAll('.results-table th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
    });

    applyFilters();
};

// ==========================================
// Table Rendering
// ==========================================
const renderTable = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: var(--color-text-tertiary);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.3;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style="font-size: 1.125rem; font-weight: 600;">該当するデータが見つかりません</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">検索条件を変更してお試しください</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = pageData.map(item => {
        const isSelected = bulkSelection.selectedIds.has(item.id);
        return `
        <tr class="${isSelected ? 'selected' : ''}">
            <td>
                <input type="checkbox" class="checkbox-select-item" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>
                <div class="employee-name">${item.name}</div>
                <span class="employee-id">${item.employeeId}</span>
            </td>
            <td>${item.department}</td>
            <td>${item.period}</td>
            <td><span class="evaluation-type">${item.evaluationType}</span></td>
            <td>
                <div class="score-badge">${item.score}</div>
            </td>
            <td>
                <span class="status-badge ${getStatusClass(item.status)}">${item.status}</span>
            </td>
            <td>
                <button class="btn-action" onclick="showDetails(${item.id})">詳細を表示</button>
            </td>
        </tr>
    `}).join('');

    displayCount.textContent = filteredData.length;

    // Update select all checkbox state
    const allOnPageSelected = pageData.length > 0 && pageData.every(item => bulkSelection.selectedIds.has(item.id));
    selectAllCheckbox.checked = allOnPageSelected;
};

// ==========================================
// Pagination
// ==========================================
const updatePagination = () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    pageInfo.textContent = `ページ ${currentPage} / ${totalPages || 1}`;
};

const goToPage = (page) => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderTable();
    updatePagination();
};

// ==========================================
// Statistics
// ==========================================
const updateStats = () => {
    totalCount.textContent = filteredData.length;

    const complete = filteredData.filter(item => item.status === '完了').length;
    completeCount.textContent = complete;

    const review = filteredData.filter(item => item.status === 'レビュー中').length;
    reviewCount.textContent = review;

    const avgScore = filteredData.length > 0
        ? (filteredData.reduce((sum, item) => sum + item.score, 0) / filteredData.length).toFixed(1)
        : '0.0';
    averageScore.textContent = avgScore;
};

// ==========================================
// Modal Functions
// ==========================================
const showDetails = (id) => {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>基本情報</h3>
            <div class="detail-row">
                <span class="detail-label">従業員名</span>
                <span class="detail-value">${item.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">従業員ID</span>
                <span class="detail-value">${item.employeeId}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">部署</span>
                <span class="detail-value">${item.department}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">評価期間</span>
                <span class="detail-value">${item.period}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">評価タイプ</span>
                <span class="detail-value">${item.evaluationType}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>評価スコア</h3>
            <div class="detail-row">
                <span class="detail-label">総合スコア</span>
                <span class="detail-value" style="font-size: 1.25rem; color: var(--color-primary);">${item.score}</span>
            </div>
            <div class="score-breakdown">
                <div class="score-item">
                    <div class="score-item-label">技術力</div>
                    <div class="score-item-value">${item.scores.technical}</div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">コミュニケーション</div>
                    <div class="score-item-value">${item.scores.communication}</div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">リーダーシップ</div>
                    <div class="score-item-value">${item.scores.leadership}</div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">問題解決力</div>
                    <div class="score-item-value">${item.scores.problemSolving}</div>
                </div>
                <div class="score-item">
                    <div class="score-item-label">チームワーク</div>
                    <div class="score-item-value">${item.scores.teamwork}</div>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>評価ステータス</h3>
            <div class="detail-row">
                <span class="detail-label">ステータス</span>
                <span class="detail-value">
                    <span class="status-badge ${getStatusClass(item.status)}">${item.status}</span>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">提出日</span>
                <span class="detail-value">${item.submittedDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">レビュー日</span>
                <span class="detail-value">${item.reviewedDate}</span>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>コメント</h3>
            <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.6; padding: 1rem; background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
                ${item.comments}
            </p>
        </div>
        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-border);">
            <button class="btn-primary" style="width: 100%;" onclick="startFeedbackFlow(${item.id})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                フィードバックを送信
            </button>
        </div>
    `;

    detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    detailModal.classList.remove('active');
    document.body.style.overflow = '';
};

// ==========================================
// Event Listeners
// ==========================================
searchInput.addEventListener('input', debounce(applyFilters, 300));
statusFilter.addEventListener('change', applyFilters);
periodFilter.addEventListener('change', applyFilters);
departmentFilter.addEventListener('change', applyFilters);
resetFiltersBtn.addEventListener('click', resetFilters);

prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));

closeModalBtn.addEventListener('click', closeModal);
detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        closeModal();
    }
});

// Sorting functionality
document.querySelectorAll('.results-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
        const sortField = th.dataset.sort;

        // Reset other headers
        document.querySelectorAll('.results-table th').forEach(header => {
            if (header !== th) {
                header.classList.remove('sorted-asc', 'sorted-desc');
            }
        });

        // Toggle sort direction
        if (currentSort.field === sortField) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.field = sortField;
            currentSort.direction = 'asc';
        }

        // Update visual indicator
        th.classList.remove('sorted-asc', 'sorted-desc');
        th.classList.add(`sorted-${currentSort.direction}`);

        applySorting(currentSort.field, currentSort.direction);
        renderTable();
    });
});

// Export functionality (mock)
exportBtn.addEventListener('click', () => {
    alert('エクスポート機能は実装中です。\n現在の表示データをCSVまたはExcel形式でダウンロードできます。');
});

// Link functionality (mock)
linkBtn.addEventListener('click', () => {
    alert('外部システムとの連携を開始します。\n人事データベースとの同期処理が実行されます。');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) {
        closeModal();
    }
});

// ==========================================
// Feedback Flow
// ==========================================

// Feedback flow state
const feedbackFlow = {
    currentStep: 'evaluationInputScreen',
    currentEvaluationId: null,
    data: {
        score: 50,
        comment: ''
    }
};

// Generate mock history data
const generateEvaluationHistory = () => {
    return [
        {
            period: '2024年度 上期',
            score: 92,
            comment: '全体的に優れたパフォーマンスを発揮し、チーム目標を上回る成果を達成しました。'
        },
        {
            period: '2023年度 下期',
            score: 88,
            comment: 'プロジェクトリーダーとして優れた指導力を発揮し、期待以上の成果を上げました。'
        },
        {
            period: '2023年度 上期',
            score: 95,
            comment: '技術力とコミュニケーション能力が高く、期待される役割を十分に果たしました。'
        }
    ];
};

// DOM elements for feedback flow
const feedbackModal = document.getElementById('feedbackModal');
const closeFeedbackModalBtn = document.getElementById('closeFeedbackModal');
const satisfactionSlider = document.getElementById('satisfactionScore');
const scoreValueDisplay = document.getElementById('scoreValue');
const feedbackComment = document.getElementById('feedbackComment');

// Screen elements
const evaluationInputScreen = document.getElementById('evaluationInputScreen');
const cancelConfirmScreen = document.getElementById('cancelConfirmScreen');
const agreementScreen = document.getElementById('agreementScreen');
const disagreementScreen = document.getElementById('disagreementScreen');
const nextActionScreen = document.getElementById('nextActionScreen');
const historyScreen = document.getElementById('historyScreen');

// Button elements
const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
const backToInputBtn = document.getElementById('backToInputBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const toNextActionBtn = document.getElementById('toNextActionBtn');
const requestRevisionBtn = document.getElementById('requestRevisionBtn');
const endProcessBtn = document.getElementById('endProcessBtn');
const viewHistoryBtn = document.getElementById('viewHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');

// Show specific feedback screen
const showFeedbackScreen = (screenId) => {
    // Hide all screens
    [evaluationInputScreen, cancelConfirmScreen, agreementScreen,
        disagreementScreen, nextActionScreen, historyScreen].forEach(screen => {
            screen.classList.add('hidden');
        });

    // Show requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        feedbackFlow.currentStep = screenId;
    }
};

// Start feedback flow
const startFeedbackFlow = (evaluationId) => {
    feedbackFlow.currentEvaluationId = evaluationId;
    feedbackFlow.data = { score: 50, comment: '' };

    // Reset form
    satisfactionSlider.value = 50;
    scoreValueDisplay.textContent = 50;
    feedbackComment.value = '';

    // Close detail modal
    closeModal();

    // Show feedback modal
    showFeedbackScreen('evaluationInputScreen');
    feedbackModal.classList.add('active');
    document.body.style.overflow = 'hidden';
};

// Close feedback modal
const closeFeedbackModal = () => {
    feedbackModal.classList.remove('active');
    document.body.style.overflow = '';
    feedbackFlow.currentStep = 'evaluationInputScreen';
};

// Update slider value display
satisfactionSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    scoreValueDisplay.textContent = value;
    feedbackFlow.data.score = parseInt(value);
});

// Cancel feedback
cancelFeedbackBtn.addEventListener('click', () => {
    showFeedbackScreen('cancelConfirmScreen');
});

// Back to input from cancel confirm
backToInputBtn.addEventListener('click', () => {
    showFeedbackScreen('evaluationInputScreen');
});

// Confirm cancel
confirmCancelBtn.addEventListener('click', () => {
    closeFeedbackModal();
});

// Submit feedback
submitFeedbackBtn.addEventListener('click', () => {
    feedbackFlow.data.comment = feedbackComment.value;

    // Conditional logic: score >= 90
    if (feedbackFlow.data.score >= 90) {
        showFeedbackScreen('agreementScreen');
    } else {
        showFeedbackScreen('disagreementScreen');
    }

    console.log('✅ フィードバック送信:', feedbackFlow.data);
});

// To next action
toNextActionBtn.addEventListener('click', () => {
    showFeedbackScreen('nextActionScreen');
});

// Request revision (disagreement flow)
requestRevisionBtn.addEventListener('click', () => {
    // Reset and go back to input
    showFeedbackScreen('evaluationInputScreen');
});

// End process
endProcessBtn.addEventListener('click', () => {
    closeFeedbackModal();
    console.log('✅ 評価プロセス終了');
});

// View history
viewHistoryBtn.addEventListener('click', () => {
    // Generate and display history
    const history = generateEvaluationHistory();
    const historyTableBody = document.getElementById('historyTableBody');

    historyTableBody.innerHTML = history.map(item => `
        <tr>
            <td>${item.period}</td>
            <td><span class="history-score">${item.score}</span></td>
            <td>${item.comment}</td>
        </tr>
    `).join('');

    showFeedbackScreen('historyScreen');
});

// Close history
closeHistoryBtn.addEventListener('click', () => {
    closeFeedbackModal();
});

// Close feedback modal button
closeFeedbackModalBtn.addEventListener('click', () => {
    closeFeedbackModal();
});

// Close modal on outside click
feedbackModal.addEventListener('click', (e) => {
    if (e.target === feedbackModal) {
        closeFeedbackModal();
    }
});

// Keyboard shortcut for feedback modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (feedbackModal.classList.contains('active')) {
            closeFeedbackModal();
        } else if (bulkFeedbackModal.classList.contains('active')) {
            closeBulkModal();
        } else if (detailModal.classList.contains('active')) {
            closeModal();
        }
    }
});

// ==========================================
// Bulk Action Logic
// ==========================================

// Update bulk toolbar visibility and counts
const updateBulkToolbar = () => {
    const count = bulkSelection.selectedIds.size;
    if (count > 0) {
        bulkActionToolbar.classList.remove('hidden');
        selectedCountDisplay.textContent = count;
        bulkSelectedCount.textContent = count;
    } else {
        bulkActionToolbar.classList.add('hidden');
    }
};

// Select All functionality (current page)
selectAllCheckbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    pageData.forEach(item => {
        if (isChecked) {
            bulkSelection.selectedIds.add(item.id);
        } else {
            bulkSelection.selectedIds.delete(item.id);
        }
    });

    // Update UI checkboxes
    document.querySelectorAll('.checkbox-select-item').forEach(cb => {
        cb.checked = isChecked;
        const tr = cb.closest('tr');
        if (isChecked) {
            tr.classList.add('selected');
        } else {
            tr.classList.remove('selected');
        }
    });

    updateBulkToolbar();
});

// Individual selection
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('checkbox-select-item')) {
        const id = parseInt(e.target.dataset.id);
        const tr = e.target.closest('tr');

        if (e.target.checked) {
            bulkSelection.selectedIds.add(id);
            tr.classList.add('selected');
        } else {
            bulkSelection.selectedIds.delete(id);
            tr.classList.remove('selected');
        }

        // Update select all checkbox state
        const checkboxes = document.querySelectorAll('.checkbox-select-item');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;

        updateBulkToolbar();
    }
});

// Clear selection
clearSelectionBtn.addEventListener('click', () => {
    bulkSelection.selectedIds.clear();
    renderTable();
    updateBulkToolbar();
});

// Bulk Feedback Modal
const openBulkModal = () => {
    bulkFeedbackModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Reset form
    bulkSatisfactionSlider.value = 50;
    bulkScoreValueDisplay.textContent = 50;
    bulkFeedbackComment.value = '';
    bulkProgressContainer.classList.add('hidden');
    submitBulkBtn.disabled = false;
    cancelBulkBtn.disabled = false;
};

const closeBulkModal = () => {
    bulkFeedbackModal.classList.remove('active');
    document.body.style.overflow = '';
};

bulkFeedbackBtn.addEventListener('click', openBulkModal);
closeBulkModalBtn.addEventListener('click', closeBulkModal);
cancelBulkBtn.addEventListener('click', closeBulkModal);

// Slider update
bulkSatisfactionSlider.addEventListener('input', (e) => {
    bulkScoreValueDisplay.textContent = e.target.value;
});

// Simulate individual feedback submission
const simulateFeedbackSubmission = (id, score, comment) => {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`✅ ID: ${id} にフィードバック送信: ${score}点`);
            resolve();
        }, 300);
    });
};

// Bulk submit
submitBulkBtn.addEventListener('click', async () => {
    const score = parseInt(bulkSatisfactionSlider.value);
    const comment = bulkFeedbackComment.value;
    const selectedIds = Array.from(bulkSelection.selectedIds);
    const total = selectedIds.length;

    // Disable buttons
    submitBulkBtn.disabled = true;
    cancelBulkBtn.disabled = true;

    // Show progress
    bulkProgressContainer.classList.remove('hidden');
    bulkProgressFill.style.width = '0%';
    bulkProgressText.textContent = `0/${total} 送信完了`;

    let completed = 0;

    for (const id of selectedIds) {
        await simulateFeedbackSubmission(id, score, comment);
        completed++;

        const progress = (completed / total) * 100;
        bulkProgressFill.style.width = `${progress}%`;
        bulkProgressText.textContent = `${completed}/${total} 送信完了`;
    }

    // Completion handling
    setTimeout(() => {
        alert(`${total}件の評価にフィードバックを送信しました。`);
        closeBulkModal();
        bulkSelection.selectedIds.clear();
        renderTable();
        updateBulkToolbar();
    }, 500);
});

// Click outside to close bulk modal
bulkFeedbackModal.addEventListener('click', (e) => {
    if (e.target === bulkFeedbackModal && !submitBulkBtn.disabled) {
        closeBulkModal();
    }
});

// Make startFeedbackFlow available globally
window.startFeedbackFlow = startFeedbackFlow;

// ==========================================
// Initialize
// ==========================================
const init = () => {
    applyFilters();
    console.log('✅ 評価モジュールが正常に初期化されました');
    console.log(`📊 ${allData.length}件の評価データを読み込みました`);
};

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Make showDetails available globally for onclick handlers
window.showDetails = showDetails;
