// ============================================
// STATE MANAGER - PWA State Persistence
// Lưu và khôi phục trạng thái trang khi người dùng thoát/vào lại PWA
// ============================================

const stateManager = {
    // Key prefix cho sessionStorage
    STORAGE_KEY: 'fileshare_state',

    // ==================
    // LƯU TRẠNG THÁI
    // ==================

    // Lấy trạng thái hiện tại của trang
    getCurrentState() {
        const state = {
            // Thông tin trang
            url: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
            timestamp: Date.now(),

            // Vị trí scroll
            scrollY: window.scrollY,
            scrollX: window.scrollX,

            // Form data (nếu có)
            formData: this._getFormData(),

            // Filter state cho files.html
            activeFilter: this._getActiveFilter(),

            // Search query
            searchQuery: this._getSearchQuery()
        };

        return state;
    },

    // Thu thập dữ liệu form
    _getFormData() {
        const formData = {};

        // Lưu tất cả input, textarea, select
        document.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.id || el.name) {
                const key = el.id || el.name;

                if (el.type === 'checkbox' || el.type === 'radio') {
                    formData[key] = el.checked;
                } else {
                    formData[key] = el.value;
                }
            }
        });

        return formData;
    },

    // Lấy filter đang active (cho files.html)
    _getActiveFilter() {
        const activeBtn = document.querySelector('.filter-btn.active');
        return activeBtn ? activeBtn.dataset.type : 'all';
    },

    // Lấy search query
    _getSearchQuery() {
        const searchInput = document.querySelector('input[type="search"], #search-input, .search-input');
        return searchInput ? searchInput.value : '';
    },

    // Lưu trạng thái vào sessionStorage
    saveState() {
        try {
            const state = this.getCurrentState();
            const key = this.STORAGE_KEY + '_' + window.location.pathname;
            sessionStorage.setItem(key, JSON.stringify(state));

            // Lưu URL cuối cùng để khôi phục khi mở lại PWA
            sessionStorage.setItem(this.STORAGE_KEY + '_lastUrl', window.location.href);
        } catch (error) {
            console.warn('[StateManager] Không thể lưu trạng thái:', error);
        }
    },

    // ==================
    // KHÔI PHỤC TRẠNG THÁI
    // ==================

    // Lấy trạng thái đã lưu
    getSavedState() {
        try {
            const key = this.STORAGE_KEY + '_' + window.location.pathname;
            const saved = sessionStorage.getItem(key);

            if (!saved) return null;

            const state = JSON.parse(saved);

            // Kiểm tra xem state có quá cũ không (hết hạn sau 30 phút)
            if (Date.now() - state.timestamp > 30 * 60 * 1000) {
                sessionStorage.removeItem(key);
                return null;
            }

            return state;
        } catch (error) {
            console.warn('[StateManager] Không thể đọc trạng thái:', error);
            return null;
        }
    },

    // Khôi phục trạng thái
    restoreState() {
        const state = this.getSavedState();
        if (!state) return false;

        // Đợi DOM load xong rồi khôi phục
        setTimeout(() => {
            // Khôi phục scroll position
            if (state.scrollY || state.scrollX) {
                window.scrollTo(state.scrollX || 0, state.scrollY || 0);
            }

            // Khôi phục form data
            if (state.formData) {
                this._restoreFormData(state.formData);
            }

            // Khôi phục filter (cho files.html)
            if (state.activeFilter && state.activeFilter !== 'all') {
                this._restoreFilter(state.activeFilter);
            }

            console.log('[StateManager] Đã khôi phục trạng thái trang');
        }, 100);

        return true;
    },

    // Khôi phục dữ liệu form
    _restoreFormData(formData) {
        for (const [key, value] of Object.entries(formData)) {
            const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (!el) continue;

            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = value;
            } else {
                el.value = value;
            }

            // Trigger change event để cập nhật UI
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    },

    // Khôi phục filter
    _restoreFilter(filterType) {
        const filterBtn = document.querySelector(`.filter-btn[data-type="${filterType}"]`);
        if (filterBtn) {
            // Xóa active từ tất cả
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Thêm active cho button được chọn
            filterBtn.classList.add('active');
            // Trigger click để load files theo filter
            filterBtn.click();
        }
    },

    // ==================
    // REDIRECT VỀ TRANG CUỐI
    // ==================

    // Lấy URL cuối cùng (cho PWA)
    getLastUrl() {
        return sessionStorage.getItem(this.STORAGE_KEY + '_lastUrl');
    },

    // Kiểm tra và redirect nếu đang ở index nhưng trước đó ở trang khác
    checkAndRedirect() {
        // Chỉ redirect nếu đang ở index và có lastUrl khác
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            const lastUrl = this.getLastUrl();

            if (lastUrl && !lastUrl.includes('index.html') && lastUrl !== window.location.href) {
                // Có trang trước đó, hỏi người dùng muốn quay lại không
                // Hoặc tự động redirect (tùy thiết kế)
                console.log('[StateManager] Trang trước:', lastUrl);
            }
        }
    },

    // ==================
    // INITIALIZATION
    // ==================

    init() {
        // Lưu trạng thái khi thoát trang
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        // Lưu trạng thái khi tab bị ẩn (mobile)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.saveState();
            }
        });

        // Lưu trạng thái định kỳ mỗi 10 giây
        setInterval(() => {
            this.saveState();
        }, 10000);

        // Khôi phục trạng thái khi load trang
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.restoreState();
            });
        } else {
            this.restoreState();
        }

        console.log('[StateManager] Đã khởi tạo');
    }
};

// Tự động khởi tạo
stateManager.init();

// Export
window.stateManager = stateManager;
