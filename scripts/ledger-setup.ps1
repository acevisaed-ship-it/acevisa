# Ledger setup runner. Run from PowerShell in E:\GIT\Portal\acevisa:
#   powershell -ExecutionPolicy Bypass -File .\scripts\ledger-setup.ps1
# Resume after a failure from step N:   ... -File .\scripts\ledger-setup.ps1 -From 5
# It never uses `db push` or `migration repair`, and `git add` only lists the files for this feature.
param([int]$From = 1, [int]$To = 99, [switch]$SkipGit)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
New-Item -ItemType Directory -Force -Path logs | Out-Null
$log = "logs\ledger-setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
function Say($t) { Write-Host $t; Add-Content -Path $log -Value $t }

function Run([string]$label, [scriptblock]$cmd, [switch]$AllowFail) {
  Say ""
  Say "=== $label ==="
  # PowerShell 5 turns any native stderr line into a terminating error under 'Stop'; relax it while the command runs.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $cmd 2>&1 | Tee-Object -Variable captured | Out-Host   # stream live
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  $out = ($captured | Out-String)
  Add-Content -Path $log -Value $out
  if ($code -ne 0 -and -not $AllowFail) {
    Say "FAILED (exit $code) at: $label"
    Say "Copy everything above and send it to Claude. After fixing, resume with:  -From <this step number>"
    exit 1
  }
  return $out
}

function Sql([string]$file, [switch]$ReadOnly) {
  if (-not (Test-Path $file)) { throw "Missing file $file" }
  # The CLI will not write to production without --yes when output is not a terminal.
  if ($ReadOnly) { & npx.cmd --yes supabase db query --linked --read-only --file $file }
  else { & npx.cmd --yes supabase db query --linked --yes --file $file }
}

$steps = @(
  @{ n = 1;  name = 'Check Supabase link (select 1)';
     run = { Set-Content -Path "$env:TEMP\ping.sql" -Value 'select 1 as ok;'; Sql "$env:TEMP\ping.sql" -ReadOnly } },
  @{ n = 2;  name = 'SQL 1/6 ledger gaps (holds, receipts, plans, ledger view)';
     run = { Sql 'supabase\migrations\20261108000000_ledger_gaps_holds_ledger_plans.sql' } },
  @{ n = 3;  name = 'SQL 2/6 stage engine, visit visa, checklists, services';
     run = { Sql 'supabase\migrations\20261108010000_stage_engine_visa_cases.sql' } },
  @{ n = 4;  name = 'SQL 3/6 language tests, instructors, payroll tables';
     run = { Sql 'supabase\migrations\20261108020000_language_instructors_payroll.sql' } },
  @{ n = 5;  name = 'SQL 4/6 reference data (countries, stages, exam orgs)';
     run = { Sql 'supabase\migrations\20261108030000_reference_seed.sql' } },
  @{ n = 6;  name = 'SQL 5/6 milestone shares 25/25/25/25';
     run = { Sql 'supabase\pending\seed_milestone_shares_equal.sql' } },
  @{ n = 7;  name = 'SQL 6/6 ledger engine (functions, triggers, payroll, views)';
     run = { Sql 'supabase\migrations\20261108040000_ledger_engine.sql' } },
  @{ n = 8;  name = 'Mock data v2 (stages, vouchers, refunds, language tests, salaries)';
     run = { Sql 'supabase\pending\mock_test_data_v2.sql' } },
  @{ n = 9;  name = 'Scenario self-test (an intentional error at the end = the report; everything is rolled back)';
     allowFail = $true;
     run = { Sql 'supabase\pending\ledger_scenarios_test.sql' } },
  @{ n = 10; name = 'TypeScript check'; run = { & npx.cmd tsc --noEmit } },
  @{ n = 11; name = 'Lint'; allowFail = $true; run = { & npm.cmd run lint } },
  @{ n = 12; name = 'Build'; run = { & npm.cmd run build } }
)

Say "Log file: $log"
$branch = (git branch --show-current).Trim()
Say "Git branch: $branch"
if ($branch -eq 'main') { Say 'You are on main. Switch to a feature branch first (git checkout -b feat/ledger-engine).'; exit 1 }

if ($From -le 2) {
  $ans = Read-Host "This applies SQL to the LIVE Supabase project. Type YES to continue"
  if ($ans -ne 'YES') { Say 'Cancelled.'; exit 0 }
}

foreach ($s in $steps | Where-Object { $_.n -ge $From -and $_.n -le $To }) {
  if ($s.allowFail) { Run "$($s.n). $($s.name)" $s.run -AllowFail | Out-Null } else { Run "$($s.n). $($s.name)" $s.run | Out-Null }
}

if (-not $SkipGit -and $To -ge 13) {
  Say ""
  Say "=== 13. Commit and push only this feature's files ==="
  $paths = @(
    'supabase/migrations/20261107000000_ledger_phase1_audit_assignments.sql',
    'supabase/migrations/20261107010000_ledger_phase1_payments_milestones_incentives.sql',
    'supabase/migrations/20261107020000_ledger_phase2_refunds_vouchers_advances.sql',
    'supabase/migrations/20261108000000_ledger_gaps_holds_ledger_plans.sql',
    'supabase/migrations/20261108010000_stage_engine_visa_cases.sql',
    'supabase/migrations/20261108020000_language_instructors_payroll.sql',
    'supabase/migrations/20261108030000_reference_seed.sql',
    'supabase/migrations/20261108040000_ledger_engine.sql',
    'supabase/pending',
    'src/lib/ledger',
    'src/app/api/admin/query',
    'src/app/api/admin/ledger',
    'src/app/api/admin/commissions',
    'src/app/api/admin/clearance',
    'src/app/api/admin/finance/summary',
    'src/app/api/admin/hr/analytics',
    'src/components/admin/LedgerWorkbench.tsx',
    'src/components/admin/CommissionsPanel.tsx',
    'src/components/admin/AccountsSection.tsx',
    'src/components/admin/HRMView.tsx',
    'src/components/admin/HrAnalyticsPanel.tsx',
    'scripts/ledger-setup.ps1',
    'docs/BUILD_PLAN_ledger_complete.md',
    'docs/CURSOR_RUN_ONLY.md'
  )
  foreach ($p in $paths) { if (Test-Path $p) { git add -- $p } }
  git status --short | Select-String -Pattern '^(A|M|\?\?) ' | Select-Object -First 60 | ForEach-Object { Say $_.Line }
  $go = Read-Host "Commit and push the staged files to branch '$branch'? Type YES"
  if ($go -eq 'YES') {
    git commit -m "Ledger engine: milestone incentives, registers, payroll from ledger"
    git push -u origin $branch
    Say "Pushed. Open the Vercel preview for this branch and check Accounts: Commissions and Registers & Reports."
  } else { Say 'Skipped commit and push.' }
}

Say ""
Say "Done. Log saved to $log"
