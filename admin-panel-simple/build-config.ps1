# PowerShell script to generate config.js from .env file
# Run this script whenever you update your .env file

Write-Host "🔧 Building config.js from .env file..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Supabase credentials" -ForegroundColor Yellow
    exit 1
}

# Read .env file and extract variables
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

# Check required variables
$requiredVars = @("VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
$missing = @()

foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or [string]::IsNullOrWhiteSpace($envVars[$var])) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing required environment variables:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    exit 1
}

# Generate config.js content
$configContent = @"
// Configuration file for the Cafe Management Admin Panel
// This file is auto-generated from .env - do not edit manually!
// Run build-config.ps1 to regenerate after updating .env

const CONFIG = {
    SUPABASE_URL: "$($envVars['VITE_SUPABASE_URL'])",
    SUPABASE_ANON_KEY: "$($envVars['VITE_SUPABASE_ANON_KEY'])",

    // Auto-refresh intervals (in milliseconds)
    REFRESH_INTERVALS: {
        DASHBOARD: 60000,    // 1 minute
        ACTIVE_USERS: 30000, // 30 seconds
        ALL_USERS: 120000    // 2 minutes
    },

    // Pricing configuration (matches your backend configuration)
    PRICING: {
        PER_MINUTE: 0.10,
        PER_HOUR: 5.00,
        MINIMUM_MINUTES: 15
    }
};

// Validation to ensure configuration is set
function validateConfig() {
    if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || 
        CONFIG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.error('⚠️ Please update config.js with your actual Supabase credentials');
        return false;
    }
    return true;
}
"@

# Write config.js file
try {
    $configContent | Out-File -FilePath "config.js" -Encoding UTF8
    Write-Host "✅ Successfully generated config.js" -ForegroundColor Green
    Write-Host "📁 Supabase URL: $($envVars['VITE_SUPABASE_URL'])" -ForegroundColor Cyan
    Write-Host "🔑 Anon Key: $($envVars['VITE_SUPABASE_ANON_KEY'].Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to write config.js: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Ready to run your admin panel!" -ForegroundColor Green
Write-Host "💡 Remember to run this script again if you update your .env file" -ForegroundColor Yellow 