// ============================================
// UTILITIES - PROFESSIONAL VERSION
// ============================================

// Validate Google Drive link
function isValidDriveLink(url) {
    const patterns = [
        /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+/,
        /^https:\/\/drive\.google\.com\/open\?id=[\w-]+/,
        /^https:\/\/docs\.google\.com\/document\/d\/[\w-]+/,
        /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+/,
        /^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+/
    ];

    return patterns.some(pattern => pattern.test(url));
}

// Extract file ID from Drive link
function extractDriveId(url) {
    const patterns = [
        /\/file\/d\/([\w-]+)/,
        /\/folders\/([\w-]+)/,
        /\?id=([\w-]+)/,
        /\/d\/([\w-]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Format date to localized string
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return formatDate(dateString);
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Show toast notification
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const iconName = type === 'success' ? 'checkCircle' : 'xCircle';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${getIcon(iconName)}</span>
    <span>${message}</span>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Show loading
function showLoading(container) {
    container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
    </div>
  `;
}

// Show empty state
function showEmptyState(container, title, desc = '', iconName = 'inbox') {
    const displayTitle = title || 'Không tìm thấy dữ liệu';
    container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${getIcon(iconName)}</div>
      <h3 class="empty-title">${displayTitle}</h3>
      <p class="empty-desc">${desc}</p>
    </div>
  `;
}

// Get badge class for file type
function getFileTypeBadge(type) {
    const iconName = getFileTypeIconName(type);
    return `<span class="badge badge-${type}">${getIcon(iconName, 'icon-sm')} ${type.toUpperCase()}</span>`;
}

// Get status badge
function getStatusBadge(status) {
    const labels = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        inactive: 'Inactive'
    };
    const icons = {
        pending: 'clock',
        approved: 'checkCircle',
        rejected: 'xCircle',
        inactive: 'alertCircle'
    };
    return `<span class="badge badge-${status}">${getIcon(icons[status], 'icon-sm')} ${labels[status] || status}</span>`;
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Create file card HTML
function createFileCard(file) {
    const iconName = getFileTypeIconName(file.file_type);
    return `
    <a href="file-detail.html?id=${file.id}" class="card file-card">
      <div class="card-header">
        ${getFileTypeBadge(file.file_type)}
      </div>
      <h3 class="card-title">${escapeHtml(file.title)}</h3>
      <p class="card-description">${escapeHtml(truncateText(file.description, 80))}</p>
      <div class="card-footer">
        <span class="text-muted">${formatRelativeTime(file.created_at)}</span>
        <span class="btn btn-sm btn-secondary">Xem chi tiết ${getIcon('arrowRight', 'icon-sm')}</span>
      </div>
    </a>
  `;
}

// Mobile menu toggle
function initMobileMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }
}

// Theme toggle
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    });
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initTheme();

    // Render tier badge immediately
    if (typeof rateLimit !== 'undefined') {
        renderTierBadge();
    } else {
        window.addEventListener('load', () => {
            if (typeof rateLimit !== 'undefined') {
                renderTierBadge();
            } else {
                const checkRateLimit = setInterval(() => {
                    if (typeof rateLimit !== 'undefined') {
                        clearInterval(checkRateLimit);
                        renderTierBadge();
                    }
                }, 50);
                setTimeout(() => clearInterval(checkRateLimit), 3000);
            }
        });
    }
});

// Render tier badge in header
async function renderTierBadge() {
    try {
        // Check if rateLimit is available
        if (typeof rateLimit === 'undefined') {
            return;
        }

        const tierInfo = await rateLimit.getUserTier();
        const tier = tierInfo.tier || 0;

        // Only show badge for tier 1 (Supporter) or tier 2 (Premium)
        if (tier === 0) {
            return;
        }

        // Use 'Supporter' or 'Premium' text
        const badgeText = tier === 1 ? 'Supporter' : tier === 2 ? 'Premium' : '';

        // Find logo element
        const logo = document.querySelector('.logo');
        if (!logo) return;

        // Check if badge already exists
        let badge = logo.querySelector('.tier-badge-header');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'tier-badge-header';
            logo.appendChild(badge);
        }

        badge.textContent = badgeText;
    } catch (error) {
        console.error('Error rendering tier badge:', error);
    }
}

// Export functions
window.utils = {
    isValidDriveLink,
    extractDriveId,
    formatDate,
    formatRelativeTime,
    truncateText,
    showToast,
    showLoading,
    showEmptyState,
    getFileTypeBadge,
    getStatusBadge,
    escapeHtml,
    createFileCard,
    renderTierBadge
};
