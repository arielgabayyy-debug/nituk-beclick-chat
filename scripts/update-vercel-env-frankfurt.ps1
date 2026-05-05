# ============================================================
# Update Vercel env vars to point to Frankfurt Supabase server
# Run this from the project root after pasting your keys
# ============================================================
#
# HOW TO GET YOUR KEYS:
#   1. Go to: https://supabase.com/dashboard/project/pinpbhwjkdnfrrpuqdkb/settings/api-keys/legacy
#   2. Click "Copy" next to the anon key  → paste into $ANON_KEY below
#   3. Click "Reveal" then "Copy" next to service_role → paste into $SERVICE_KEY below
#
param(
    [Parameter(Mandatory=$true)]
    [string]$ANON_KEY,

    [Parameter(Mandatory=$true)]
    [string]$SERVICE_KEY
)

$URL = "https://pinpbhwjkdnfrrpuqdkb.supabase.co"

Write-Host "Updating Vercel environment variables for Frankfurt server..." -ForegroundColor Cyan

# Remove old values first
Write-Host "Removing old Supabase env vars..." -ForegroundColor Yellow
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_URL production 2>$null
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_URL preview 2>$null
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_URL development 2>$null
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production 2>$null
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview 2>$null
echo "y" | vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY development 2>$null
echo "y" | vercel env rm SUPABASE_SERVICE_ROLE_KEY production 2>$null
echo "y" | vercel env rm SUPABASE_SERVICE_ROLE_KEY preview 2>$null
echo "y" | vercel env rm SUPABASE_SERVICE_ROLE_KEY development 2>$null

# Add new Frankfurt values
Write-Host "Adding Frankfurt Supabase env vars..." -ForegroundColor Green
$URL | vercel env add NEXT_PUBLIC_SUPABASE_URL production
$URL | vercel env add NEXT_PUBLIC_SUPABASE_URL preview
$URL | vercel env add NEXT_PUBLIC_SUPABASE_URL development

$ANON_KEY | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
$ANON_KEY | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
$ANON_KEY | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

$SERVICE_KEY | vercel env add SUPABASE_SERVICE_ROLE_KEY production
$SERVICE_KEY | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
$SERVICE_KEY | vercel env add SUPABASE_SERVICE_ROLE_KEY development

Write-Host ""
Write-Host "Done! Now also update .env.local:" -ForegroundColor Green
Write-Host "  NEXT_PUBLIC_SUPABASE_URL=$URL"
Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key>"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY=<the service role key>"
Write-Host ""
Write-Host "Then deploy: vercel --prod" -ForegroundColor Cyan
