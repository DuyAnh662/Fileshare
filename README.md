# FileShare All Free

**FileShare All Free** is a static web application built with HTML/CSS/JS, utilizing Supabase for backend services (Database & Auth). It allows users to share files via Google Drive links with a clean, modern interface.

## 🚀 Features

- **File Sharing**: Share files securely using Google Drive links.
- **Search & Filter**: Easily find files with search and category filtering.
- **User Tiers**: Tiered system (Free, Supporter, Premium) based on contributions.
- **Modern UI**: Clean, responsive design with Dark/Light mode support.
- **Admin Panel**: Dedicated dashboard for managing files and approvals.
- **Secure**: Built-in rate limiting and Google Drive link validation.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No heavy frameworks).
- **Backend**: Supabase (PostgreSQL Database & Authentication).
- **Hosting**: Cloudflare Pages (Recommended).
- **Styling**: Custom CSS with variable-based theming.
- **Icons**: Inline SVGs and Font Awesome.

## 📂 Project Structure

```
/
├── index.html          # specific Landing Page
├── files.html          # File browsing & search
├── file-detail.html    # Download & details page
├── upload.html         # User upload interface
├── admin/              # Admin dashboard & management
├── css/                # Stylesheets
├── js/                 # Application logic
│   ├── config.js       # Configuration (API Keys)
│   ├── api.js          # Supabase API integration
│   └── ...
└── database/           # SQL schemas
```

## ⚙️ Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/fileshare.git
    cd fileshare
    ```

2.  **Configure Environment:**
    - Open `js/config.js`.
    - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase project credentials.

3.  **Database Setup:**
    - Create a new project in Supabase.
    - Run the SQL scripts located in `database/` folder in your Supabase SQL Editor to set up tables and security policies.

4.  **Run Locally:**
    - Because this is a static site, you can use any static file server.
    - Example with Python: `python3 -m http.server 8000`
    - Open `http://localhost:8000` in your browser.

## 🚀 Deployment

This project is optimized for **Cloudflare Pages**:
1.  Connect your GitHub repository to Cloudflare Pages.
2.  Set the build output directory to `/` (root) or leave it blank.
3.  Deploy!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
