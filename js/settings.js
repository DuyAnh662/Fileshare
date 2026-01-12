// ============================================
// SETTINGS
// ============================================

// Settings Manager
const settings = {
    defaults: {
        theme: 'light'
    },

    get(key) {
        const stored = localStorage.getItem('fileshare_settings');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return parsed[key] ?? this.defaults[key];
            } catch (e) {
                return this.defaults[key];
            }
        }
        return this.defaults[key];
    },

    set(key, value) {
        let stored = {};
        try {
            stored = JSON.parse(localStorage.getItem('fileshare_settings') || '{}');
        } catch (e) { }
        stored[key] = value;
        localStorage.setItem('fileshare_settings', JSON.stringify(stored));
    },

    getAll() {
        try {
            const stored = JSON.parse(localStorage.getItem('fileshare_settings') || '{}');
            return { ...this.defaults, ...stored };
        } catch (e) {
            return this.defaults;
        }
    }
};

// Create settings modal HTML
function createSettingsModal() {
    const currentSettings = settings.getAll();

    return `
        <div class="modal-overlay" id="settings-modal">
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 style="display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Settings
                    </h3>
                    <button class="modal-close" onclick="closeSettingsModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                
                <div class="settings-section">
                    <div class="settings-section-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                        <div>
                            <h4>Theme</h4>
                            <p class="text-muted">Choose light or dark mode</p>
                        </div>
                    </div>
                    <div class="settings-theme-btns">
                        <button class="settings-theme-btn ${currentSettings.theme === 'light' ? 'active' : ''}" data-theme="light">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                            Light
                        </button>
                        <button class="settings-theme-btn ${currentSettings.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                            Dark
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <button class="btn btn-primary" style="width: 100%;" onclick="saveSettings()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Save settings
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Open settings modal
function openSettingsModal() {
    const existing = document.getElementById('settings-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', createSettingsModal());
    setTimeout(() => {
        document.getElementById('settings-modal').classList.add('active');
    }, 10);

    document.querySelectorAll('.settings-theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.settings-theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

// Save settings
function saveSettings() {
    const selectedTheme = document.querySelector('.settings-theme-btn.active')?.dataset.theme || 'light';

    settings.set('theme', selectedTheme);
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('theme', selectedTheme);

    if (typeof utils !== 'undefined' && utils.showToast) {
        utils.showToast('Settings saved!', 'success');
    }

    closeSettingsModal();
}

// Global functions for compatibility (to avoid errors on pages calling these)
window.t = (key, fallback) => fallback || key;
window.applyTranslations = async () => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
};

// Export
window.settings = settings;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.saveSettings = saveSettings;
