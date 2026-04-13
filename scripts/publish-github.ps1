param(
  [string]$Owner = "dexisworking",
  [string]$Repo = "QuicKards",
  [string]$Branch = "master"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location -Path (Join-Path $PSScriptRoot "..")

gh auth status | Out-Null

$repoFull = "$Owner/$Repo"

try {
  gh repo view $repoFull --json nameWithOwner | Out-Null
  Write-Host "Repository $repoFull already exists."
} catch {
  gh repo create $repoFull --public --source . --remote origin --push
  Write-Host "Repository created and pushed."
  exit 0
}

$remotes = git remote
if ($remotes -notcontains "origin") {
  git remote add origin "https://github.com/$repoFull.git"
}

git push -u origin $Branch
Write-Host "Push complete."
