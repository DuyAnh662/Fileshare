var CONFIG = {
  // Supabase project URL (get from Project Settings > API)
  SUPABASE_URL: 'YOUR_SUPABASE_URL',

  // Anon key (public) - safe to use on frontend
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Service role key - ONLY FOR ADMIN (saved in localStorage)
  // NEVER COMMIT THIS KEY TO GITHUB

  // Admin password - REMOVED for security
  // Authentication currently uses Service Role Key only


  // Website name
  SITE_NAME: 'FileShare',

  // Files per page to display
  FILES_PER_PAGE: 12,

  // Cooldown time between uploads (seconds)
  UPLOAD_COOLDOWN: 60,

  // Rate Limit Configuration
  RATE_LIMIT: {
    TIER_0_MAX: 30,    // Free tier: 30 uploads/month
    TIER_1_MAX: 50,    // Supporter tier: 50 uploads/month (after 5 LootLabs)
    TIER_2_MAX: 999999,   // Premium tier: Unlimited (999999) uploads/month (after 50 LootLabs)
    TIER_1_DURATION_DAYS: 45,   // 1.5 months
    TIER_2_DURATION_DAYS: 365,  // 1 year
    TIER_1_REQUIREMENT: 5,      // LootLabs completions for Tier 1
    TIER_2_REQUIREMENT: 50      // LootLabs completions for Tier 2
  }
};

// Save reference to createClient function BEFORE creating client
// Because after creating client, window.supabase will be overwritten
var supabaseCreateClient = window.supabase.createClient;

// Initialize Supabase client for public
var supabase = supabaseCreateClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// Export for other files to use
window.CONFIG = CONFIG;
window.db = supabase;
window.supabaseCreateClient = supabaseCreateClient; // Export for admin use
