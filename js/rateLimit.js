// ============================================
// RATE LIMIT MODULE - Upload Usage Management
// ============================================

const rateLimit = {
    // ==================
    // CONFIGURATION
    // ==================

    TIER_CONFIG: {
        0: { max: CONFIG.RATE_LIMIT.TIER_0_MAX, name: 'Free' },
        1: { max: CONFIG.RATE_LIMIT.TIER_1_MAX, name: 'Supporter', durationDays: CONFIG.RATE_LIMIT.TIER_1_DURATION_DAYS },
        2: { max: CONFIG.RATE_LIMIT.TIER_2_MAX, name: 'Premium (∞)', durationDays: CONFIG.RATE_LIMIT.TIER_2_DURATION_DAYS }
    },

    TIER_REQUIREMENTS: {
        1: CONFIG.RATE_LIMIT.TIER_1_REQUIREMENT,
        2: CONFIG.RATE_LIMIT.TIER_2_REQUIREMENT
    },

    // ==================
    // FINGERPRINT
    // ==================

    // Generate simple browser fingerprint (no heavy library)
    getClientFingerprint() {
        const cached = sessionStorage.getItem('client_fingerprint');
        if (cached) return cached;

        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown',
            navigator.platform
        ];

        // Simple hash function
        const str = components.join('|');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        const fingerprint = Math.abs(hash).toString(16).padStart(16, '0');
        sessionStorage.setItem('client_fingerprint', fingerprint);
        return fingerprint;
    },

    // ==================
    // IP ADDRESS
    // ==================

    // Cache IP address
    _cachedIP: null,

    // Get IP address from external service
    async getClientIP() {
        if (this._cachedIP) return this._cachedIP;

        try {
            // Try multiple services for reliability
            const services = [
                'https://api.ipify.org?format=json',
                'https://api.my-ip.io/ip.json',
                'https://ipapi.co/json/'
            ];

            for (const url of services) {
                try {
                    const response = await fetch(url, { timeout: 3000 });
                    const data = await response.json();
                    const ip = data.ip || data.origin;
                    if (ip) {
                        this._cachedIP = ip;
                        return ip;
                    }
                } catch (e) {
                    continue;
                }
            }

            // Fallback: use fingerprint as identifier
            return 'fp_' + this.getClientFingerprint();
        } catch (error) {
            console.error('Error getting IP:', error);
            return 'fp_' + this.getClientFingerprint();
        }
    },

    // ==================
    // MONTH KEY
    // ==================

    // Get current month key (e.g., '2026-01')
    getCurrentMonthKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    },

    // ==================
    // USER TIER
    // ==================

    // Get current user tier
    async getUserTier() {
        try {
            const fingerprint = this.getClientFingerprint();

            const { data, error } = await db
                .from('user_tiers')
                .select('*')
                .eq('fingerprint', fingerprint)
                .single();

            if (error || !data) {
                return { tier: 0, lootlabsCount: 0, expiresAt: null };
            }

            // Check if tier has expired
            if (data.tier > 0 && data.tier_expires_at) {
                const expiresAt = new Date(data.tier_expires_at);
                if (expiresAt < new Date()) {
                    // Tier expired, reset to 0
                    await this._resetExpiredTier(fingerprint);
                    return { tier: 0, lootlabsCount: data.lootlabs_count, expiresAt: null };
                }
            }

            return {
                tier: data.tier,
                lootlabsCount: data.lootlabs_count,
                expiresAt: data.tier_expires_at
            };
        } catch (error) {
            console.error('Error getting user tier:', error);
            return { tier: 0, lootlabsCount: 0, expiresAt: null };
        }
    },

    // Check if should show support UI
    async shouldShowSupportUI() {
        const { tier, expiresAt } = await this.getUserTier();
        if (tier > 0) {
            // Check if expired (should be handled by getUserTier, but double check)
            if (expiresAt && new Date(expiresAt) < new Date()) {
                return true; // Expired, so show UI
            }
            return false; // Valid tier, hide UI
        }
        return true; // Free tier, show UI
    },

    // Reset tier when expired
    async _resetExpiredTier(fingerprint) {
        try {
            await db
                .from('user_tiers')
                .update({
                    tier: 0,
                    tier_expires_at: null,
                    updated_at: new Date().toISOString()
                })
                .eq('fingerprint', fingerprint);
        } catch (error) {
            console.error('Error resetting tier:', error);
        }
    },

    // Get max uploads by tier
    getMaxUploads(tier) {
        return this.TIER_CONFIG[tier]?.max || 30;
    },

    // ==================
    // UPLOAD LIMIT CHECK
    // ==================

    // Check if upload limit remains
    async checkUploadLimit() {
        try {
            const ip = await this.getClientIP();
            const fingerprint = this.getClientFingerprint();
            const monthKey = this.getCurrentMonthKey();
            const { tier, lootlabsCount } = await this.getUserTier();
            const maxUploads = this.getMaxUploads(tier);

            // Query current usage
            const { data, error } = await db
                .from('ip_upload_limits')
                .select('upload_count, max_uploads')
                .eq('ip_address', ip)
                .eq('month_year', monthKey)
                .single();

            if (error || !data) {
                // No record -> 100% allowed
                return {
                    allowed: true,
                    remaining: maxUploads,
                    used: 0,
                    max: maxUploads,
                    tier: tier,
                    lootlabsCount: lootlabsCount
                };
            }

            // Update max_uploads if tier changed
            const effectiveMax = Math.max(data.max_uploads, maxUploads);
            const remaining = effectiveMax - data.upload_count;

            return {
                allowed: remaining > 0,
                remaining: Math.max(0, remaining),
                used: data.upload_count,
                max: effectiveMax,
                tier: tier,
                lootlabsCount: lootlabsCount
            };
        } catch (error) {
            console.error('Error checking upload limit:', error);
            // Fallback: allow upload to avoid blocking user
            return { allowed: true, remaining: 30, used: 0, max: 30, tier: 0, lootlabsCount: 0 };
        }
    },

    // ==================
    // INCREMENT COUNT
    // ==================

    // Increment usage count
    async incrementUploadCount() {
        try {
            const ip = await this.getClientIP();
            const fingerprint = this.getClientFingerprint();
            const monthKey = this.getCurrentMonthKey();
            const { tier } = await this.getUserTier();
            const maxUploads = this.getMaxUploads(tier);

            // Upsert: insert or update
            const { data: existing } = await db
                .from('ip_upload_limits')
                .select('id, upload_count')
                .eq('ip_address', ip)
                .eq('month_year', monthKey)
                .single();

            if (existing) {
                // Update
                await db
                    .from('ip_upload_limits')
                    .update({
                        upload_count: existing.upload_count + 1,
                        fingerprint: fingerprint,
                        max_uploads: Math.max(maxUploads, existing.upload_count + 1),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert
                await db
                    .from('ip_upload_limits')
                    .insert({
                        ip_address: ip,
                        fingerprint: fingerprint,
                        month_year: monthKey,
                        upload_count: 1,
                        max_uploads: maxUploads
                    });
            }

            return { success: true };
        } catch (error) {
            console.error('Error incrementing upload count:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================
    // GET REMAINING
    // ==================

    // Get remaining uploads (shortcut function)
    async getRemainingUploads() {
        const status = await this.checkUploadLimit();
        return status.remaining;
    },

    // ==================
    // UI HELPERS
    // ==================

    // Render status HTML
    async renderUploadStatus() {
        const status = await this.checkUploadLimit();
        const tierInfo = this.TIER_CONFIG[status.tier];

        const percentage = Math.round((status.used / status.max) * 100);
        const isLow = status.remaining <= 5;
        const isEmpty = status.remaining === 0;

        return {
            html: `
                <div class="upload-status ${isEmpty ? 'status-empty' : isLow ? 'status-low' : 'status-ok'}">
                    <div class="status-header">
                        <span class="status-label">${t('rateLimit.uploadsRemaining') || 'Uploads remaining'}</span>
                        <span class="status-tier badge badge-${status.tier === 0 ? 'default' : 'success'}">${tierInfo.name}</span>
                    </div>
                    <div class="status-bar">
                        <div class="status-progress" style="width: ${100 - percentage}%"></div>
                    </div>
                    <div class="status-count">
                        <strong>${status.tier === 2 ? '∞' : status.remaining}</strong> / ${status.tier === 2 ? '∞' : status.max} ${t('rateLimit.thisMonth') || 'this month'}
                    </div>
                    <div class="status-count" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                        ${t('rateLimit.totalCompletions') || 'LootLabs completions'}: <strong>${status.lootlabsCount}</strong>
                    </div>
                    ${isEmpty ? `
                        <div class="status-upgrade">
                            <p>${t('rateLimit.limitReached') || 'You have reached your upload limit.'}</p>
                            <button class="btn btn-primary btn-sm" onclick="lootlabs.showDonateModal()">
                                ${t('rateLimit.unlockMore') || 'Unlock more uploads'}
                            </button>
                        </div>
                    ` : isLow ? `
                        <div class="status-upgrade">
                            <a href="#" onclick="lootlabs.showDonateModal(); return false;" class="text-primary">
                                ${t('rateLimit.runningLow') || 'Running low? Unlock more uploads →'}
                            </a>
                        </div>
                    ` : ''}
                </div>
            `,
            status: status
        };
    }
};

// Export
window.rateLimit = rateLimit;
