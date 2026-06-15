$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = "C:\Program Files\nodejs\node.exe"
$vitePath = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$logDirectory = Join-Path $env:LOCALAPPDATA "LETSMOVIE"
$stdoutLog = Join-Path $logDirectory "vite.out.log"
$stderrLog = Join-Path $logDirectory "vite.err.log"
$mutex = New-Object System.Threading.Mutex($false, "Local\LETSMOVIE-Vite-5173")
$ownsMutex = $false

try {
  $ownsMutex = $mutex.WaitOne(0)
  if (-not $ownsMutex) {
    exit 0
  }

  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null

  while ($true) {
    $listener = Get-NetTCPConnection `
      -LocalPort 5173 `
      -State Listen `
      -ErrorAction SilentlyContinue

    if ($listener) {
      Start-Sleep -Seconds 5
      continue
    }

    if (-not (Test-Path -LiteralPath $nodePath)) {
      Add-Content -LiteralPath $stderrLog -Value "$(Get-Date -Format o) Node.js not found."
      Start-Sleep -Seconds 15
      continue
    }

    if (-not (Test-Path -LiteralPath $vitePath)) {
      Add-Content -LiteralPath $stderrLog -Value "$(Get-Date -Format o) Vite is not installed."
      Start-Sleep -Seconds 15
      continue
    }

    $process = Start-Process `
      -FilePath $nodePath `
      -ArgumentList @(
        $vitePath,
        "--host",
        "127.0.0.1",
        "--port",
        "5173",
        "--strictPort"
      ) `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $stdoutLog `
      -RedirectStandardError $stderrLog `
      -PassThru

    $process.WaitForExit()
    Add-Content `
      -LiteralPath $stderrLog `
      -Value "$(Get-Date -Format o) Vite exited with code $($process.ExitCode); restarting."
    Start-Sleep -Seconds 2
  }
}
finally {
  if ($ownsMutex) {
    $mutex.ReleaseMutex()
  }
  $mutex.Dispose()
}
