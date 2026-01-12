// Inject Google Site Verification Meta Tag and Theme Handling
// This ensures all pages are verified by Google Console and Theme is applied immediately
(function () {
    // 1. Apply Theme Immediately (Prevent Flash of White Content)
    try {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme) {
            document.documentElement.setAttribute('data-theme', storedTheme);

            // Also update manifest link immediately if possible
            const manifestLink = document.querySelector('link[rel="manifest"]');
            if (manifestLink) {
                manifestLink.href = storedTheme === 'dark' ? 'manifest-dark.json' : 'manifest-light.json';
            }
        }
    } catch (e) {
        // Fallback or ignore
    }

    // 2. Google Site Verification
    const meta = document.createElement('meta');
    meta.name = 'google-site-verification';
    // Verification code from original index.html
    meta.content = 'fOHpAmW0kLw1_TB_EolkOBFUjGJoa1lHXpwLu9sms6Q';
    document.head.appendChild(meta);
})();