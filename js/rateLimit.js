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
            // OPTIMIZATION: Check localStorage first for instant load
            const cachedTier = localStorage.getItem('user_tier_cache');
            if (cachedTier) {
                try {
                    const parsed = JSON.parse(cachedTier);
                    // Return cached data immediately if valid (simple expiry check could be added here)
                    // But we will still fetch fresh data in background if needed (for now, simply return cached to be fast)
                    // To ensure freshness, we can fall through to fetch if cache is old? 
                    // For now, let's return cached and let the caller decide, OR
                    // better: return cached, but maybe inconsistent? 
                    // Let's stick to: use cache if available, but maybe we should verify it.
                    // Actually, for "instant load", we trust cache.

                    // However, we should also verify expiration if present in cache
                    if (parsed.tier > 0 && parsed.tier_expires_at) {
                        const expiresAt = new Date(parsed.expiresAt);
                        if (expiresAt < new Date()) {
                            // Expired
                            localStorage.removeItem('user_tier_cache');
                        } else {
                            return parsed;
                        }
                    } else if (parsed.tier === 0 || parsed.tier > 0) {
                        // Return valid cached tier
                        return parsed;
                    }
                } catch (e) {
                    localStorage.removeItem('user_tier_cache');
                }
            }

            const fingerprint = this.getClientFingerprint();

            const { data, error } = await db
                .from('user_tiers')
                .select('*')
                .eq('fingerprint', fingerprint)
                .single();

            if (error || !data) {
                // Cache default 0 state
                const defaultState = { tier: 0, lootlabsCount: 0, expiresAt: null };
                localStorage.setItem('user_tier_cache', JSON.stringify(defaultState));
                return defaultState;
            }

            // Check if tier has expired
            if (data.tier > 0 && data.tier_expires_at) {
                const expiresAt = new Date(data.tier_expires_at);
                if (expiresAt < new Date()) {
                    // Tier expired, reset to 0
                    await this._resetExpiredTier(fingerprint);
                    const expiredState = { tier: 0, lootlabsCount: data.lootlabs_count, expiresAt: null };
                    localStorage.setItem('user_tier_cache', JSON.stringify(expiredState));
                    return expiredState;
                }
            }

            const activeState = {
                tier: data.tier,
                lootlabsCount: data.lootlabs_count,
                expiresAt: data.tier_expires_at
            };

            // Save to cache
            localStorage.setItem('user_tier_cache', JSON.stringify(activeState));

            return activeState;
        } catch (error) {
            console.error('Error getting user tier:', error);
            return { tier: 0, lootlabsCount: 0, expiresAt: null };
        }
    },



    // Check if should show support UI
    async shouldShowSupportUI() {
        const tierInfo = await this.getUserTier();
        // Show support UI only if tier is 0 (Free)
        return tierInfo.tier === 0;
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
            // OPTIMIZATION: Check cache for instant load
            const cachedLimit = localStorage.getItem('upload_limit_cache');
            if (cachedLimit) {
                try {
                    const parsed = JSON.parse(cachedLimit);
                    const now = new Date();
                    const cacheTime = new Date(parsed.timestamp);
                    // Valid for 1 hour to avoid too many requests
                    if ((now - cacheTime) < 3600000) {
                        // Return cached but trigger background update if > 5 mins old
                        if ((now - cacheTime) > 300000) {
                            this._fetchAndCacheUploadLimit().catch(e => console.warn('Background fetch failed', e));
                        }
                        return parsed.data;
                    }
                } catch (e) {
                    localStorage.removeItem('upload_limit_cache');
                }
            }

            return await this._fetchAndCacheUploadLimit();
        } catch (error) {
            console.error('Error checking upload limit:', error);
            // Fallback: allow upload to avoid blocking user
            return { allowed: true, remaining: 30, used: 0, max: 30, tier: 0, lootlabsCount: 0 };
        }
    },

    // Fetch from DB and cache
    async _fetchAndCacheUploadLimit() {
        const ip = await this.getClientIP();
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

        let result;
        if (error || !data) {
            // No record -> 100% allowed
            result = {
                allowed: true,
                remaining: maxUploads,
                used: 0,
                max: maxUploads,
                tier: tier,
                lootlabsCount: lootlabsCount
            };
        } else {
            // Update max_uploads if tier changed
            const effectiveMax = Math.max(data.max_uploads, maxUploads);
            const remaining = effectiveMax - data.upload_count;

            result = {
                allowed: remaining > 0,
                remaining: Math.max(0, remaining),
                used: data.upload_count,
                max: effectiveMax,
                tier: tier,
                lootlabsCount: lootlabsCount
            };
        }

        // Save to cache
        localStorage.setItem('upload_limit_cache', JSON.stringify({
            timestamp: new Date().toISOString(),
            data: result
        }));

        return result;
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

            // Invalidate cache immediately
            localStorage.removeItem('upload_limit_cache');

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
        // This will now use cache if available -> instant load
        const status = await this.checkUploadLimit();
        const tierInfo = this.TIER_CONFIG[status.tier];

        const percentage = Math.min(100, Math.round((status.used / status.max) * 100));
        const isLow = status.remaining <= 5;
        const isEmpty = status.remaining === 0;

        return {
            html: `
                <div class="upload-status ${isEmpty ? 'status-empty' : isLow ? 'status-low' : 'status-ok'}">
                    <div class="status-header">
                        <div class="status-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <span>${t('rateLimit.uploadsRemaining') || 'Monthly Upload Limit'}</span>
                        </div>
                        <span class="badge ${status.tier === 0 ? 'badge-default' : 'badge-success'}">${tierInfo.name}</span>
                    </div>
                    
                    <div class="status-bar-container">
                        <div class="status-progress" style="width: ${percentage}%"></div>
                    </div>
                    
                    <div class="status-meta">
                        <div>
                             <span class="status-count-large">${status.tier === 2 ? '∞' : status.remaining}</span>
                             <span class="status-count-sub">remaining</span>
                        </div>
                        <div class="status-info">
                            <div>Used: <strong>${status.used}</strong> / ${status.tier === 2 ? '∞' : status.max}</div>
                            ${status.lootlabsCount > 0 ? `<div style="font-size: 0.75rem; opacity: 0.8; margin-top: 2px;">Tasks completed: ${status.lootlabsCount}</div>` : ''}
                        </div>
                    </div>

                    ${isEmpty ? `
                        <div class="status-upgrade">
                            <p>${t('rateLimit.limitReached') || 'You have reached your upload limit for this month.'}</p>
                            <button class="btn btn-primary btn-sm w-100" onclick="lootlabs.showDonateModal()">
                                ${t('rateLimit.unlockMore') || 'Unlock 100 More Uploads Free →'}
                            </button>
                        </div>
                    ` : isLow ? `
                        <div class="status-upgrade">
                            <a href="#" onclick="lootlabs.showDonateModal(); return false;" class="text-primary" style="font-size: 0.85rem; font-weight: 500;">
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
