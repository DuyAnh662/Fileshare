// ============================================
// API FUNCTIONS - INTERACT WITH SUPABASE
// 2-Table System: check (pending) → files (approved)
// ============================================

const api = {
    // ==================
    // PUBLIC OPERATIONS
    // ==================

    // Get list of approved files (public)
    async getApprovedFiles(fileType = null, page = 1, limit = CONFIG.FILES_PER_PAGE) {
        try {
            let query = db
                .from('files')
                .select('*')
                .eq('hidden', false)
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);

            if (fileType && fileType !== 'all') {
                query = query.eq('file_type', fileType);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching files:', error);
            return { success: false, error: error.message };
        }
    },

    // Get file detail by ID (public)
    async getFileById(id) {
        try {
            const { data, error } = await db
                .from('files')
                .select('*')
                .eq('id', id)
                .eq('hidden', false)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching file:', error);
            return { success: false, error: error.message };
        }
    },

    // Submit new file to CHECK table (pending)
    async submitFile(fileData) {
        try {
            // 0. Check rate limit
            const { allowed, remaining, tier } = await rateLimit.checkUploadLimit();

            if (!allowed) {
                let msg = 'Upload limit reached for this month.';
                if (tier < 2) {
                    msg += ' Donate/Complete tasks to unlock more uploads!';
                }
                throw new Error(msg);
            }

            // 0b. Cooldown check (prevent continuous spam)
            const lastUpload = localStorage.getItem('last_upload_time');
            if (lastUpload) {
                const now = Date.now();
                const diff = (now - parseInt(lastUpload)) / 1000;
                if (diff < CONFIG.UPLOAD_COOLDOWN) {
                    const remainingSeconds = Math.ceil(CONFIG.UPLOAD_COOLDOWN - diff);
                    throw new Error(`Please wait ${remainingSeconds}s before uploading again.`);
                }
            }

            // Validate drive link
            if (!utils.isValidDriveLink(fileData.drive_link)) {
                throw new Error('Invalid Google Drive link format');
            }

            const { error } = await db
                .from('pending_files')
                .insert([{
                    title: fileData.title.trim(),
                    description: fileData.description?.trim() || null,
                    file_type: fileData.file_type,
                    drive_link: fileData.drive_link.trim()
                }]);

            if (error) throw error;

            // Update rate limit & last upload time
            await rateLimit.incrementUploadCount();
            localStorage.setItem('last_upload_time', Date.now());

            return { success: true };
        } catch (error) {
            console.error('Error submitting file:', error);
            return { success: false, error: error.message };
        }
    },

    // Report broken file
    async reportFile(fileId) {
        try {
            // 1. Get IP address (use helper from rateLimit module)
            const ip = await rateLimit.getClientIP();

            // 2. Call RPC function submit_report
            const { data, error } = await db.rpc('submit_report', {
                p_file_id: fileId,
                p_ip_address: ip
            });

            if (error) throw error;

            return data; // { success: true, hidden: boolean, ... }
        } catch (error) {
            console.error('Error reporting file:', error);
            // Fallback: return user-friendly error
            if (error.message.includes('already reported')) {
                return { success: false, error: 'You have already reported this file' };
            }
            return { success: false, error: error.message };
        }
    },

    // Increment download count for a file
    async incrementDownload(fileId) {
        try {
            // Tăng download_count trong database
            const { data, error } = await db.rpc('increment_download_count', {
                file_id_input: fileId
            });

            // Nếu RPC không tồn tại, thử dùng cách khác
            if (error && error.code === 'PGRST202') {
                // RPC không tồn tại, log warning
                console.warn('[API] increment_download_count RPC not found, skipping DB update');
            } else if (error) {
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Error incrementing download:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================
    // ADMIN OPERATIONS
    // ==================

    // Helper: Get admin db client
    _getAdminDb() {
        const serviceKey = localStorage.getItem('admin_service_key');
        if (!serviceKey) throw new Error(t('error.notLoggedIn'));
        return window.supabaseCreateClient(CONFIG.SUPABASE_URL, serviceKey);
    },

    // Get pending files (from CHECK table)
    async getPendingFiles() {
        try {
            const adminDb = this._getAdminDb();
            const { data, error } = await adminDb
                .from('pending_files')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching pending files:', error);
            return { success: false, error: error.message };
        }
    },

    // Get all approved files (from FILES table)
    async getAllApprovedFiles() {
        try {
            const adminDb = this._getAdminDb();
            const { data, error } = await adminDb
                .from('files')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching all files:', error);
            return { success: false, error: error.message };
        }
    },

    // Approve file: copy from CHECK to FILES, delete from CHECK
    async approveFile(id) {
        try {
            const adminDb = this._getAdminDb();

            // 1. Get file info from check table
            const { data: checkFile, error: fetchError } = await adminDb
                .from('pending_files')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // 2. Insert into files table
            const { error: insertError } = await adminDb
                .from('files')
                .insert([{
                    title: checkFile.title,
                    description: checkFile.description,
                    file_type: checkFile.file_type,
                    drive_link: checkFile.drive_link,
                    hidden: false
                }]);

            if (insertError) throw insertError;

            // 3. Delete from pending_files table
            const { error: deleteError } = await adminDb
                .from('pending_files')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return { success: true };
        } catch (error) {
            console.error('Error approving file:', error);
            return { success: false, error: error.message };
        }
    },

    // Reject file: delete from PENDING_FILES
    async rejectFile(id) {
        try {
            const adminDb = this._getAdminDb();
            const { error } = await adminDb
                .from('pending_files')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error rejecting file:', error);
            return { success: false, error: error.message };
        }
    },

    // Hide file (in FILES table)
    async hideFile(id) {
        try {
            const adminDb = this._getAdminDb();
            const { error } = await adminDb
                .from('files')
                .update({ hidden: true })
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error hiding file:', error);
            return { success: false, error: error.message };
        }
    },

    // Show file (in FILES table)
    async showFile(id) {
        try {
            const adminDb = this._getAdminDb();
            const { error } = await adminDb
                .from('files')
                .update({ hidden: false })
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error showing file:', error);
            return { success: false, error: error.message };
        }
    },

    // Permanently delete file (in FILES table)
    async deleteFile(id) {
        try {
            const adminDb = this._getAdminDb();
            const { error } = await adminDb
                .from('files')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, error: error.message };
        }
    },

    // ==================
    // ADMIN AUTH
    // ==================

    // Admin login (simple: check service key only)
    loginAdmin(serviceKey) {
        // Password removed for security


        if (!serviceKey || serviceKey.length < 100) {
            return { success: false, error: t('error.invalidKey') };
        }

        localStorage.setItem('admin_service_key', serviceKey);
        localStorage.setItem('admin_logged_in', 'true');
        return { success: true };
    },

    // Check if logged in
    isAdminLoggedIn() {
        return localStorage.getItem('admin_logged_in') === 'true' &&
            localStorage.getItem('admin_service_key');
    },

    // Admin logout
    logoutAdmin() {
        localStorage.removeItem('admin_service_key');
        localStorage.removeItem('admin_logged_in');
    }
};

// Export
window.api = api;
