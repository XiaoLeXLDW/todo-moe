param()
$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$toolRoot = Join-Path $repoRoot '.tools/ninja-1.13.2'
$sdkNinja = Join-Path $repoRoot '.tools/android-sdk/cmake/3.22.1/bin/ninja.exe'
if (-not (Test-Path -LiteralPath $sdkNinja)) { throw 'Prepare the project-local Android SDK and CMake 3.22.1 first.' }
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
$archive = Join-Path $toolRoot 'ninja-win.zip'
$expected = '07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65'
if (-not (Test-Path -LiteralPath $archive)) {
    Invoke-WebRequest -Uri 'https://github.com/ninja-build/ninja/releases/download/v1.13.2/ninja-win.zip' -OutFile $archive
}
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw 'Ninja archive checksum mismatch; refusing to install.' }
Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
$candidate = Join-Path $toolRoot 'ninja.exe'
if ((& $candidate --version).Trim() -ne '1.13.2') { throw 'Unexpected Ninja version.' }
$backup = "$sdkNinja.original"
if (-not (Test-Path -LiteralPath $backup)) { Copy-Item -LiteralPath $sdkNinja -Destination $backup }
Copy-Item -LiteralPath $candidate -Destination $sdkNinja -Force
Write-Output 'Project-local CMake now uses Ninja 1.13.2; original binary retained. No system settings changed.'
