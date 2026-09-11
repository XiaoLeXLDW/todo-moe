param(
    [Parameter(Mandatory=$true)][string]$Serial,
    [ValidateSet('off','soft','liquid')][string]$GlassMode = 'off',
    [string]$Package = 'io.github.xiaolexldw.todomoe.dev',
    [string]$Adb
)
$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (-not $Adb) { $Adb = Join-Path $repoRoot '.tools/android-sdk/platform-tools/adb.exe' }
if ($Package -notmatch '^io\.github\.xiaolexldw\.todomoe(\.dev)?$') { throw 'Specify a Todo Moe application identity.' }
if (-not (Test-Path -LiteralPath $Adb -PathType Leaf)) { throw "ADB not found: $Adb" }
function Read-Adb([string[]]$Arguments) {
    $output = & $Adb -s $Serial @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) { throw "ADB query failed: $($Arguments -join ' ')" }
    return ($output -join "`n")
}
$state = Read-Adb @('get-state')
if ($state.Trim() -ne 'device') { throw 'The selected device is not connected and authorized.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$destination = Join-Path $repoRoot "evidence/development/device-$stamp-$GlassMode"
New-Item -ItemType Directory -Path $destination | Out-Null
$metadata = [ordered]@{
    capturedAt = (Get-Date).ToString('o')
    package = $Package
    requestedGlassMode = $GlassMode
    # The flag labels the user's scenario; it does not change or prove app state.
    modeVerified = $false
    model = (Read-Adb @('shell','getprop','ro.product.model')).Trim()
    android = (Read-Adb @('shell','getprop','ro.build.version.release')).Trim()
    sdk = (Read-Adb @('shell','getprop','ro.build.version.sdk')).Trim()
    source = (& git -C $repoRoot rev-parse HEAD).Trim()
    queriesOnly = $true
}
$metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $destination 'scenario.json') -Encoding utf8
Read-Adb @('shell','dumpsys','package',$Package) | Set-Content -LiteralPath (Join-Path $destination 'package.txt') -Encoding utf8
Read-Adb @('shell','dumpsys','gfxinfo',$Package,'framestats') | Set-Content -LiteralPath (Join-Path $destination 'frames.txt') -Encoding utf8
Read-Adb @('shell','dumpsys','meminfo',$Package) | Set-Content -LiteralPath (Join-Path $destination 'memory.txt') -Encoding utf8
@'
Read-only evidence capture. It does not install, reset frame counters, clear data,
change settings, navigate the app or prove that the labelled mode was active.
Record APK SHA-256, the actual displayed mode, identical gestures and duration,
recording path, temperature, refresh rate, navigation mode and verdict separately.
Compare off/soft/liquid sessions on the same build and device.
'@ | Set-Content -LiteralPath (Join-Path $destination 'README.txt') -Encoding utf8
Write-Output $destination
