// Inject Google Site Verification Meta Tag
// This ensures all pages are verified by Google Console
(function () {
    const meta = document.createElement('meta');
    meta.name = 'google-site-verification';
    // Verification code from original index.html
    meta.content = 'fOHpAmW0kLw1_TB_EolkOBFUjGJoa1lHXpwLu9sms6Q';
    document.head.appendChild(meta);
})();