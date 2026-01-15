// ============================================
// LOOTLABS MODULE - LootLabs Donate Integration
// ============================================

const lootlabs = {
    // ==================
    // CONFIGURATION
    // ==================

    // IMPORTANT: Change these values
    CONFIG: {
        // Base LootLabs link (replace with your link)
        BASE_URL: 'https://loot-link.com/s?F8llxW4V',

        // API Token (SHOULD NOT be client-side in production)
        // Only use for development/testing
        API_TOKEN: 'YOUR_LOOTLABS_API_TOKEN',

        // Minimum completion time (seconds) - anti-bypass
        MIN_COMPLETION_TIME: 30,

        // Tier thresholds
        TIER_1_REQUIREMENT: CONFIG.RATE_LIMIT.TIER_1_REQUIREMENT,
        TIER_2_REQUIREMENT: CONFIG.RATE_LIMIT.TIER_2_REQUIREMENT,

        // Extra uploads amount per completion
        EXTRA_UPLOADS_AMOUNT: 5
    },

    // ==================
    // SESSION TOKEN
    // ==================

    // Create unique session token for each attempt
    generateSessionToken() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        const fingerprint = rateLimit.getClientFingerprint().substring(0, 8);
        const token = `${timestamp}_${random}_${fingerprint}`;

        // Save session token and start time
        localStorage.setItem('lootlabs_session_token', token);
        localStorage.setItem('lootlabs_session_start', Date.now().toString());

        return token;
    },

    // Verify valid session token
    verifySessionToken(token) {
        const savedToken = localStorage.getItem('lootlabs_session_token');
        const sessionStart = parseInt(localStorage.getItem('lootlabs_session_start') || '0');

        if (!savedToken || savedToken !== token) {
            return { valid: false, reason: 'Token mismatch' };
        }

        // Check completion time
        const elapsed = (Date.now() - sessionStart) / 1000;
        if (elapsed < this.CONFIG.MIN_COMPLETION_TIME) {
            return { valid: false, reason: 'Too fast - suspected bypass' };
        }

        return { valid: true, elapsed: elapsed };
    },

    // ==================
    // URL BUILDER
    // ==================

    // Build LootLabs URL with callback and anti-bypass
    // mode: 'tier1' (5 tasks), 'tier2' (50 tasks), or 'extra' (add 5 uploads)
    buildLootLabsUrl(mode) {
        const token = this.generateSessionToken();

        let targetUrl = '';

        if (mode === 'tier2') {
            // Premium: 50 tasks
            // User provided link: https://loot-link.com/s?qbozZeHL
            // We append token for verification on return
            targetUrl = 'https://loot-link.com/s?qbozZeHL';
            localStorage.setItem('lootlabs_target_goal', '50');
        } else if (mode === 'extra') {
            // Extra uploads: +5 uploads per completion
            // User provided link that redirects to lootlabs-extra-callback.html
            targetUrl = 'https://loot-link.com/s?9jF7nDI1';
            localStorage.setItem('lootlabs_target_goal', 'extra');
        } else {
            // Supporter: 5 tasks
            // User provided link: https://lootdest.org/s?ord2fkjR
            targetUrl = 'https://lootdest.org/s?ord2fkjR';
            localStorage.setItem('lootlabs_target_goal', '5');
        }

        // Append token to the URL so it can be passed back upon redirection
        // We assume LootLabs forwards query parameters or the user has configured it to do so
        return `${targetUrl}&token=${encodeURIComponent(token)}`;
    },

    // Start a LootLabs task flow for a specific goal
    startTask(mode) {
        const url = this.buildLootLabsUrl(mode);
        window.open(url, '_blank');
    },

    // Start extra uploads task (convenience function)
    startExtraUploadsTask() {
        this.startTask('extra');
    },

    // ==================
    // COMPLETION TRACKING
    // ==================

    // Record extra uploads completion (adds 5 uploads to current limit)
    async recordExtraUploadCompletion(token) {
        try {
            // Verify token
            const verification = this.verifySessionToken(token);
            if (!verification.valid) {
                console.error('Invalid session:', verification.reason);
                return { success: false, error: verification.reason };
            }

            const fingerprint = rateLimit.getClientFingerprint();
            const ip = await rateLimit.getClientIP();

            // Check if token already used (anti-replay)
            const { data: existing } = await db
                .from('lootlabs_completions')
                .select('id')
                .eq('session_token', token)
                .single();

            if (existing) {
                return { success: false, error: 'Token already used' };
            }

            // Record completion with type 'extra'
            const { error: insertError } = await db
                .from('lootlabs_completions')
                .insert({
                    fingerprint: fingerprint,
                    ip_address: ip,
                    session_token: token,
                    user_agent: navigator.userAgent,
                    completion_type: 'extra'
                });

            if (insertError) throw insertError;

            // Add extra uploads to user's limit
            const extraResult = await rateLimit.addExtraUploads(this.CONFIG.EXTRA_UPLOADS_AMOUNT);
            if (!extraResult.success) {
                throw new Error(extraResult.error || 'Failed to add extra uploads');
            }

            // Remove session token
            localStorage.removeItem('lootlabs_session_token');
            localStorage.removeItem('lootlabs_session_start');
            localStorage.removeItem('lootlabs_target_goal');

            // Get updated limit info
            const status = await rateLimit.checkUploadLimit();

            return {
                success: true,
                extraAdded: this.CONFIG.EXTRA_UPLOADS_AMOUNT,
                newRemaining: status.remaining,
                newMax: status.max
            };
        } catch (error) {
            console.error('Error recording extra upload completion:', error);
            return { success: false, error: error.message };
        }
    },



    // Record LootLabs completion
    async recordCompletion(token) {
        try {
            // Verify token
            const verification = this.verifySessionToken(token);
            if (!verification.valid) {
                console.error('Invalid session:', verification.reason);
                return { success: false, error: verification.reason };
            }

            const fingerprint = rateLimit.getClientFingerprint();
            const ip = await rateLimit.getClientIP();

            // Check if token already used (anti-replay)
            const { data: existing } = await db
                .from('lootlabs_completions')
                .select('id')
                .eq('session_token', token)
                .single();

            if (existing) {
                return { success: false, error: 'Token already used' };
            }

            // Record completion
            const { error: insertError } = await db
                .from('lootlabs_completions')
                .insert({
                    fingerprint: fingerprint,
                    ip_address: ip,
                    session_token: token,
                    user_agent: navigator.userAgent
                });

            if (insertError) throw insertError;

            // Update user tier count
            await this._updateUserTierCount(fingerprint, ip);

            // Remove session token
            localStorage.removeItem('lootlabs_session_token');
            localStorage.removeItem('lootlabs_session_start');

            // Get new tier info
            const tierInfo = await rateLimit.getUserTier();

            return {
                success: true,
                newCount: tierInfo.lootlabsCount,
                newTier: tierInfo.tier
            };
        } catch (error) {
            console.error('Error recording completion:', error);
            return { success: false, error: error.message };
        }
    },

    // Update completion count and check upgrade
    async _updateUserTierCount(fingerprint, ip) {
        try {
            // Count total user completions
            const { count, error: countError } = await db
                .from('lootlabs_completions')
                .select('id', { count: 'exact', head: true })
                .eq('fingerprint', fingerprint);

            if (countError) throw countError;

            const totalCount = count || 0;

            // Determine new tier
            let newTier = 0;
            let expiresAt = null;

            if (totalCount >= this.CONFIG.TIER_2_REQUIREMENT) {
                newTier = 2;
                const date = new Date();
                date.setDate(date.getDate() + CONFIG.RATE_LIMIT.TIER_2_DURATION_DAYS); // Premium duration
                expiresAt = date.toISOString();
            } else if (totalCount >= this.CONFIG.TIER_1_REQUIREMENT) {
                newTier = 1;
                const date = new Date();
                date.setDate(date.getDate() + CONFIG.RATE_LIMIT.TIER_1_DURATION_DAYS); // Supporter duration
                expiresAt = date.toISOString();
            }

            // Upsert user tier
            const { data: existingTier } = await db
                .from('user_tiers')
                .select('id, tier, tier_expires_at')
                .eq('fingerprint', fingerprint)
                .single();

            if (existingTier) {
                // Upgrade only, no downgrade
                if (newTier > existingTier.tier) {
                    await db
                        .from('user_tiers')
                        .update({
                            tier: newTier,
                            lootlabs_count: totalCount,
                            tier_expires_at: expiresAt,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingTier.id);
                } else {
                    // Update count only
                    await db
                        .from('user_tiers')
                        .update({
                            lootlabs_count: totalCount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existingTier.id);
                }
            } else {
                // Insert new
                await db
                    .from('user_tiers')
                    .insert({
                        fingerprint: fingerprint,
                        ip_address: ip,
                        tier: newTier,
                        lootlabs_count: totalCount,
                        tier_expires_at: expiresAt
                    });
            }
        } catch (error) {
            console.error('Error updating user tier:', error);
        }
    },

    // ==================
    // UI - DONATE MODAL
    // ==================

    // Show donate modal
    async showDonateModal() {
        const tierInfo = await rateLimit.getUserTier();
        const currentCount = tierInfo.lootlabsCount || 0;
        const currentTier = tierInfo.tier || 0;

        // Calculate progress to next tier
        let nextTier, required, progress;
        if (currentTier < 1) {
            nextTier = 1;
            required = this.CONFIG.TIER_1_REQUIREMENT;
            progress = Math.min(100, Math.round((currentCount / required) * 100));
        } else if (currentTier < 2) {
            nextTier = 2;
            required = this.CONFIG.TIER_2_REQUIREMENT;
            progress = Math.min(100, Math.round((currentCount / required) * 100));
        } else {
            nextTier = null;
            required = 0;
            progress = 100;
        }

        const modalHTML = `
            <div class="modal-overlay" id="donate-modal">
                <div class="modal donate-modal">
                    <div class="modal-header">
                        <h2>${t('donate.title') || '🎁 Unlock More Uploads'}</h2>
                        <button class="modal-close" onclick="lootlabs.closeDonateModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="tier-info">
                            <div class="current-tier">
                                <span class="tier-label">${t('donate.currentTier') || 'Current Tier'}:</span>
                                <span class="tier-badge tier-${currentTier}">
                                    ${rateLimit.TIER_CONFIG[currentTier].name}
                                </span>
                            </div>
                            
                            <div class="tier-progress">
                                <span class="progress-label">
                                    ${t('donate.progress') || 'Progress'}: ${currentCount}/${required || '--'} 
                                    ${t('donate.completions') || 'completions'}
                                </span>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="tier-cards">
                            <div class="tier-card ${currentTier >= 1 ? 'tier-unlocked' : ''}">
                                <div class="tier-name">🌟 Supporter</div>
                                <div class="tier-benefit">50 ${t('donate.uploadsPerMonth') || 'uploads/month'}</div>
                                <div class="tier-requirement">${this.CONFIG.TIER_1_REQUIREMENT} ${t('donate.completions') || 'completions'}</div>
                                <div class="tier-duration">${t('donate.validFor') || 'Valid for'} 1.5 ${t('donate.months') || 'months'}</div>
                                ${currentTier >= 1 ? '<div class="tier-status">✓ Unlocked</div>' : ''}
                            </div>
                            
                            <div class="tier-card tier-premium ${currentTier >= 2 ? 'tier-unlocked' : ''}">
                                <div class="tier-name">👑 Premium</div>
                                <div class="tier-benefit">∞ ${t('donate.uploadsPerMonth') || 'uploads/month'}</div>
                                <div class="tier-requirement">${this.CONFIG.TIER_2_REQUIREMENT} ${t('donate.completions') || 'completions'}</div>
                                <div class="tier-duration">${t('donate.validFor') || 'Valid for'} 1 ${t('donate.year') || 'year'}</div>
                                ${currentTier >= 2 ? '<div class="tier-status">✓ Unlocked</div>' : ''}
                            </div>
                        </div>
                        
                        <div class="donate-action">
                            <p class="donate-desc">
                                ${t('donate.description') || 'Complete ad tasks to unlock more uploads. Each completion takes about 30 seconds.'}
                            </p>
                            <a href="${this.buildLootLabsUrl()}" target="_blank" class="btn btn-primary btn-lg donate-btn" onclick="lootlabs.closeDonateModal()">
                                ${t('donate.startNow') || '🚀 Start Now - Earn 1 Completion'}
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        this.closeDonateModal();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Close on overlay click
        document.getElementById('donate-modal').addEventListener('click', (e) => {
            if (e.target.id === 'donate-modal') {
                this.closeDonateModal();
            }
        });

        // Close on ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeDonateModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    // Close donate modal
    closeDonateModal() {
        const modal = document.getElementById('donate-modal');
        if (modal) modal.remove();
    },

    // ==================
    // CALLBACK HANDLER
    // ==================

    // Handle LootLabs callback (called from callback page)
    async handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');

        // Fallback: if LootLabs does not return token in URL,
        // use the last session token stored in localStorage
        if (!token) {
            token = localStorage.getItem('lootlabs_session_token');
        }

        if (!token) {
            return { success: false, error: 'No token provided' };
        }

        const result = await this.recordCompletion(token);
        return result;
    },

    // Handle LootLabs callback for extra uploads specifically
    async handleExtraCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        let token = urlParams.get('token');

        // Fallback: if LootLabs does not return token in URL,
        // use the last session token stored in localStorage
        if (!token) {
            token = localStorage.getItem('lootlabs_session_token');
        }

        if (!token) {
            return { success: false, error: 'No token provided' };
        }

        // Verify this was an extra uploads task
        const targetGoal = localStorage.getItem('lootlabs_target_goal');
        if (targetGoal !== 'extra') {
            return { success: false, error: 'Invalid callback type' };
        }

        const result = await this.recordExtraUploadCompletion(token);
        return result;
    }
};

// Export
window.lootlabs = lootlabs;
