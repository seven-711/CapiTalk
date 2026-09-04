param(
    [Parameter(Mandatory=$false)]
    [string]$OldPassword,

    [Parameter(Mandatory=$false)]
    [string]$NewPassword
)

# 1. Enforce UTF-8 everywhere to preserve all emojis, special characters & Asian text
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$env:PGCLIENTENCODING = "UTF8"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   CapiTalk Supabase Database Migration Tool (UTF-8)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 2. Locate PostgreSQL tools (pg_dump and psql)
$PgBinPaths = @(
    "C:\Program Files\PostgreSQL\18\bin",
    "C:\Program Files\PostgreSQL\17\bin",
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin"
)

$PgDumpExe = $null
$PsqlExe = $null

foreach ($dir in $PgBinPaths) {
    if (Test-Path (Join-Path $dir "pg_dump.exe")) {
        $PgDumpExe = Join-Path $dir "pg_dump.exe"
        $PsqlExe = Join-Path $dir "psql.exe"
        break
    }
}

if (-not $PgDumpExe) {
    $foundDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
    $foundPsql = Get-Command "psql" -ErrorAction SilentlyContinue
    if ($foundDump -and $foundPsql) {
        $PgDumpExe = $foundDump.Source
        $PsqlExe = $foundPsql.Source
    }
}

if (-not $PgDumpExe -or -not (Test-Path $PgDumpExe)) {
    Write-Host "[ERROR] pg_dump.exe was not found. Please verify PostgreSQL is installed." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Using PostgreSQL binary: $PgDumpExe" -ForegroundColor Green

# 3. Connection Parameters
$OldHost = "aws-0-ap-south-1.pooler.supabase.com"
$OldPort = "5432"
$OldUser = "postgres.xkmytopgtrizoxyphnmk"
$OldDb   = "postgres"

$NewHost = "aws-0-ap-northeast-1.pooler.supabase.com"
$NewPort = "5432"
$NewUser = "postgres.emfixxhpptxjstlcievy"
$NewDb   = "postgres"

# Prompt for passwords if not provided
if (-not $OldPassword) {
    $OldPassword = Read-Host "Enter database password for OLD project (postgres.xkmytopgtrizoxyphnmk)"
}
if (-not $NewPassword) {
    $NewPassword = Read-Host "Enter database password for NEW project (postgres.emfixxhpptxjstlcievy)"
}

if (-not $OldPassword -or -not $NewPassword) {
    Write-Host "[ERROR] Both passwords are required to perform the migration." -ForegroundColor Red
    exit 1
}

$BackupDir = Join-Path $PSScriptRoot "..\supabase"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}
$DumpFile = Join-Path $BackupDir "backup_full_utf8.sql"

# 4. STEP 1: Dump Old Database
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host " STEP 1: Exporting old database (UTF-8 encoding)..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Connecting to ${OldHost}:${OldPort} ($OldUser)..."

$env:PGPASSWORD = $OldPassword

$dumpArgs = @(
    "-h", $OldHost,
    "-p", $OldPort,
    "-U", $OldUser,
    "-d", $OldDb,
    "--schema=public",
    "--encoding=UTF8",
    "--clean",
    "--if-exists",
    "--quote-all-identifiers",
    "--no-owner",
    "--no-privileges",
    "-f", $DumpFile
)

& $PgDumpExe @dumpArgs

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $DumpFile) -or (Get-Item $DumpFile).Length -eq 0) {
    Write-Host "[ERROR] Database export failed. Check your password and network connection." -ForegroundColor Red
    exit 1
}

$dumpSizeKb = [Math]::Round((Get-Item $DumpFile).Length / 1024, 2)
Write-Host "[SUCCESS] Export completed! Backup saved at: $DumpFile ($dumpSizeKb KB)" -ForegroundColor Green

# 5. STEP 2: Restore to New Database
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host " STEP 2: Restoring to new fresh database..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host "Connecting to ${NewHost}:${NewPort} ($NewUser)..."

$env:PGPASSWORD = $NewPassword

$restoreArgs = @(
    "-h", $NewHost,
    "-p", $NewPort,
    "-U", $NewUser,
    "-d", $NewDb,
    "-f", $DumpFile
)

& $PsqlExe @restoreArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] psql completed with code $LASTEXITCODE. Checking table restoration..." -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] All tables and data restored to new database!" -ForegroundColor Green
}

# 6. STEP 3: Setup Realtime Publications & Storage Bucket
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host " STEP 3: Configuring Realtime & Storage on New DB..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

$PostRestoreSql = @"
-- 1. Grant schema usage and permissions to Supabase client roles (anon, authenticated, service_role)
GRANT USAGE, CREATE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

DO `$do`$
BEGIN
  -- Enable Realtime for key tables
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.freedom_posts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.freedom_comments;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.loudspeaker_bookings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.banned_users;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END `$do`$;

-- Ensure storage bucket 'freedom_media' exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('freedom_media', 'freedom_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public storage access policies
DO `$do`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access freedom_media') THEN
    CREATE POLICY "Public Access freedom_media" ON storage.objects FOR SELECT USING (bucket_id = 'freedom_media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Upload freedom_media') THEN
    CREATE POLICY "Public Upload freedom_media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'freedom_media');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END `$do`$;
"@

$postRestoreFile = Join-Path $BackupDir "post_restore.sql"
[System.IO.File]::WriteAllText($postRestoreFile, $PostRestoreSql, [System.Text.Encoding]::UTF8)

& $PsqlExe -h $NewHost -p $NewPort -U $NewUser -d $NewDb -f $postRestoreFile

# 7. STEP 4: Verify Table Counts
Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow
Write-Host " STEP 4: Verification - Checking Tables in New Database..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

$VerifySql = @"
SELECT 
    table_name,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as approximate_row_count
FROM (
    SELECT 
        table_name,
        query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name), false, true, '') as xml_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) t
ORDER BY table_name;
"@

$verifyFile = Join-Path $BackupDir "verify_counts.sql"
[System.IO.File]::WriteAllText($verifyFile, $VerifySql, [System.Text.Encoding]::UTF8)

& $PsqlExe -h $NewHost -p $NewPort -U $NewUser -d $NewDb -f $verifyFile

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   MIGRATION COMPLETE! YOUR APP IS READY TO GO LIVE!    " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Check the row counts above to verify your notes and data." -ForegroundColor Cyan
