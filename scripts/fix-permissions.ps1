param(
    [Parameter(Mandatory=$false)]
    [string]$NewPassword
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PGCLIENTENCODING = "UTF8"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Granting Schema Public Permissions on New Supabase   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Locate psql.exe
$PgBinPaths = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

$PsqlExe = $null
foreach ($dir in $PgBinPaths) {
    if (Test-Path (Join-Path $dir "psql.exe")) {
        $PsqlExe = Join-Path $dir "psql.exe"
        break
    }
}

if (-not $PsqlExe) {
    $foundPsql = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($foundPsql) { $PsqlExe = $foundPsql.Source }
}

if (-not $PsqlExe -or -not (Test-Path $PsqlExe)) {
    Write-Host "[ERROR] psql.exe was not found." -ForegroundColor Red
    exit 1
}

$NewHost = "aws-0-ap-northeast-1.pooler.supabase.com"
$NewPort = "5432"
$NewUser = "postgres.emfixxhpptxjstlcievy"
$NewDb   = "postgres"

if (-not $NewPassword) {
    $NewPassword = Read-Host "Enter database password for NEW project (postgres.emfixxhpptxjstlcievy)"
}

$env:PGPASSWORD = $NewPassword

$FixSql = @"
-- 1. Grant usage and create on schema public to Supabase client roles
GRANT USAGE, CREATE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant permissions on all existing tables, sequences, and functions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Ensure future tables created also have permissions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 4. Enable RLS and verify policies
ALTER TABLE IF EXISTS public.freedom_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.freedom_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loudspeaker_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.midterm_reactions ENABLE ROW LEVEL SECURITY;
"@

$sqlFile = Join-Path $PSScriptRoot "fix_permissions.sql"
[System.IO.File]::WriteAllText($sqlFile, $FixSql, [System.Text.Encoding]::UTF8)

Write-Host "Applying permissions to ${NewHost}:${NewPort}..." -ForegroundColor Yellow
& $PsqlExe -h $NewHost -p $NewPort -U $NewUser -d $NewDb -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Public schema permissions granted successfully!" -ForegroundColor Green
    Write-Host "You can now insert notes, comments, and reactions without permission errors." -ForegroundColor Cyan
} else {
    Write-Host "[ERROR] Failed to apply permissions. Check your password." -ForegroundColor Red
}
