#!/bin/bash

# Script build cho Cloudflare Pages
# Tu dong thay the cac placeholder thanh Environment Variables thuc te

echo "Starting build process..."

# Kiem tra cac bien moi truong
if [ -z "$SUPABASE_URL" ]; then 
    echo "WARNING: SUPABASE_URL environment variable is not set!"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then 
    echo "WARNING: SUPABASE_ANON_KEY environment variable is not set!"
fi

if [ -z "$LOOTLABS_API_TOKEN" ]; then 
    echo "WARNING: LOOTLABS_API_TOKEN environment variable is not set!"
fi

echo "Injecting secrets..."

# Thay the SUPABASE_URL
# Dung dau | lam delimiter de tranh loi voi ky tu / trong URL
sed -i "s|YOUR_SUPABASE_URL|$SUPABASE_URL|g" js/config.js

# Thay the SUPABASE_ANON_KEY
sed -i "s|YOUR_SUPABASE_ANON_KEY|$SUPABASE_ANON_KEY|g" js/config.js

# Thay the LOOTLABS_API_TOKEN
sed -i "s|YOUR_LOOTLABS_API_TOKEN|$LOOTLABS_API_TOKEN|g" js/lootlabs.js

echo "Build complete! Secrets have been injected."
