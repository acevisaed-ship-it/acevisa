# Release 1 runner (accounts reports foundation). Run from PowerShell in E:\GIT\Portal\acevisa:
#   powershell -ExecutionPolicy Bypass -File .\scripts\accounts-reports-setup.ps1
# Resume from a step:  ... -From 3     Stop after a step:  ... -To 3
# Never uses `db push` or `migration repair`. Applies additive SQL only.
param([int]$From = 1, [int]$To = 99)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force -Path logs | Out-Null
$log = "logs\accounts-reports-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
function Say($t) { Write-Host $t; Add-Content -Path $log -Value $t }

function Run([string]$label, [scriptblock]$cmd) {
  Say ""; Say "=== $label ==="
  $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  & $cmd 2>&1 | Tee-Object -Variable captured | Out-Host
  $code = $LASTEXITCODE; $ErrorActionPreference = $prev
  Add-Content -Path $log -Value ($captured | Out-String)
  if ($code -ne 0) { Say "FAILED (exit $code) at: $label"; Say "Copy everything above and send it to Claude. Resume with: -From <step>"; exit 1 }
}
function Sql([string]$file, [switch]$ReadOnly) {
  if (-not (Test-Path $file)) { throw "Missing file $file" }
  if ($ReadOnly) { & npx.cmd --yes supabase db query --linked --read-only --file $file }
  else { & npx.cmd --yes supabase db query --linked --yes --file $file }
}

$branch = (git branch --show-current).Trim()
Say "Log file: $log"; Say "Git branch: $branch"
if ($branch -eq 'main') { Say 'You are on main. Run first:  git checkout -b feat/accounts-reports'; exit 1 }

if ($From -le 2) {
  $ans = Read-Host "Step 2 applies additive SQL to the LIVE Supabase project. Type YES to continue"
  if ($ans -ne 'YES') { Say 'Cancelled.'; exit 0 }
}

$steps = @(
  @{ n = 1; name = 'Check Supabase link'; run = { Set-Content -Path "$env:TEMP\ping.sql" -Value 'select 1 as ok;'; Sql "$env:TEMP\ping.sql" -ReadOnly } },
  @{ n = 2; name = 'Apply migration: institutions, agents, case fields, report views'; run = { Sql 'supabase\migrations\20261109000000_accounts_reports_foundation.sql' } },
  @{ n = 3; name = 'Self-check (read-only; every row should say ok = true)'; run = { Sql 'supabase\pending\accounts_reports_selfcheck.sql' -ReadOnly } },
  @{ n = 4; name = 'TypeScript check'; run = { & npx.cmd tsc --noEmit } },
  @{ n = 5; name = 'Build'; run = { & npm.cmd run build } }
)
foreach ($s in $steps | Where-Object { $_.n -ge $From -and $_.n -le $To }) { Run "$($s.n). $($s.name)" $s.run }

Say ""; Say "Done. Log saved to $log"
