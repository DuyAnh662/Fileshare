# FileShare Project Structure

The **FileShare All Free** project is a static web application built on pure HTML/CSS/JS, using Supabase as the backend (Database & Auth) and deployed on Cloudflare Pages.

## 1. Main Directory Structure

```
/
├── index.html          # Home Page
├── files.html          # File List Page (with search, pagination)
├── file-detail.html    # File Detail Page (Download)
├── upload.html         # Upload Page (for users)
├── about.html          # About Page (Bilingual/English)
├── terms.html          # Terms of Use
├── privacy.html        # Privacy Policy
├── dmca.html           # DMCA Copyright
├── donate.html         # Donation/Support Page
├── robots.txt          # SEO Bot Configuration - Blocks /admin/
├── sitemap.xml         # Sitemap (SEO)
├── _headers            # HTTP Headers Configuration for Cloudflare Pages
│
├── css/                # Stylesheets
│   └── style.css       # Main CSS file for the entire site
│
├── js/                 # Application Logic (Scripts)
│   ├── config.js       # Environment Config (Supabase URL, Key)
│   ├── api.js          # API Functions interacting with Supabase
│   ├── utils.js        # Utility Functions (Format date, size, UI helpers)
│   ├── icons.js        # Icon Management (SVG)
│   ├── settings.js     # Settings Management (Dark mode, etc.)
│   ├── head.js         # Auto-inject meta verification script (SEO)
│   └── admin.js        # Logic for Admin Page
│
├── admin/              # Admin Panel
│   ├── dashboard.html  # Main Admin Dashboard
│   └── login.html      # Admin Login Page
│
└── database/           # Database related files
```

## 2. Workflow

1.  **User (Frontend)**:
    *   Interacts with HTML files.
    *   Browser loads CSS to render the UI.
    *   Browser executes JS to perform logic.
    *   `js/head.js` automatically runs in `<head>` to inject Google Verification Meta Tag.

2.  **Logic (JS)**:
    *   `api.js` acts as an intermediary, sending Requests to Supabase.
    *   Responses are processed by `utils.js` and displayed on HTML.

3.  **Data (Backend - Supabase)**:
    *   Stores file information (Name, Drive Link, Description, uploader...).
    *   *Note: Actual files are hosted on User's Google Drive, not on this server.*

## 3. Technologies Used

*   **Frontend**: HTML5, CSS3, JavaScript (Vanilla - No heavy frameworks).
*   **Backend/Database**: Supabase (PostgreSQL).
*   **Hosting**: Cloudflare Pages.
*   **Icons**: Inline SVG (Managed in `js/icons.js` or directly in HTML).
*   **Fonts**: Google Fonts (Inter).

## 4. Important Notes

*   **Deployment**: Code is automatically deployed when pushed to GitHub (via Cloudflare Pages CI/CD).
*   **Security**:
    *   Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code (`js/config.js` should only contain `ANON_KEY`).
    *   Admin pages must be protected by Supabase authentication mechanism.
    *   `/admin/` directory is blocked in `robots.txt` to prevent Google indexing.
*   **SEO**:
    *   Always update `sitemap.xml` when adding new pages.
    *   Ensure `<meta>` tags in `head` are optimized.
    *   `js/head.js` helps synchronize Google verification code across all pages.

