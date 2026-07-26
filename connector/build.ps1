# Builds and validates the Windows x64 release.
# Developer build: .\build.ps1
# Signed release:  .\build.ps1 -Release -CertificateThumbprint <thumbprint>

[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$Release,
    [string]$CertificateThumbprint = $env:ARQ_SIGN_CERT_THUMBPRINT,
    [string]$TimestampUrl = "http://timestamp.digicert.com"
)

$ErrorActionPreference = "Stop"
$connectorRoot = $PSScriptRoot
$python = Join-Path $connectorRoot ".venv\Scripts\python.exe"
$dist = Join-Path $connectorRoot "dist"
$canonicalExe = Join-Path $dist "arq-connector.exe"

function Find-SignTool {
    $onPath = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($null -ne $onPath) {
        return $onPath.Source
    }

    $sdkRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    $candidates = @(
        Get-ChildItem -Path "$sdkRoot\*\x64\signtool.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending
    )
    if ($candidates.Count -gt 0) {
        return $candidates[0].FullName
    }
    return $null
}

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "This build must run on 64-bit Windows."
}
if (-not (Test-Path -LiteralPath $python)) {
    throw "Connector virtual environment is missing. Create connector\.venv and install the dev dependencies."
}

$pythonArchitectureOutput = & $python -c "import platform, struct; print(platform.machine() + ':' + str(struct.calcsize('P') * 8))"
if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect the build Python architecture."
}
$pythonArchitecture = ([string]$pythonArchitectureOutput).Trim()
if ($pythonArchitecture -ne "AMD64:64") {
    throw "The connector must be built with 64-bit AMD64 Python (found '$pythonArchitecture')."
}

$versionOutput = & $python -c "import sys; sys.path.insert(0, 'src'); from arq_connector import __version__; print(__version__)"
if ($LASTEXITCODE -ne 0) {
    throw "Could not read the connector version."
}
$version = ([string]$versionOutput).Trim()
if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Could not read the connector version."
}

$signTool = $null
if ($Release) {
    if ([string]::IsNullOrWhiteSpace($CertificateThumbprint)) {
        throw "A signed release requires -CertificateThumbprint or ARQ_SIGN_CERT_THUMBPRINT."
    }
    $certificate = Get-Item -LiteralPath "Cert:\CurrentUser\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
    if ($null -eq $certificate -or -not $certificate.HasPrivateKey) {
        throw "The requested code-signing certificate/private key is not in Cert:\CurrentUser\My."
    }
    if ($certificate.NotAfter -le (Get-Date)) {
        throw "The requested code-signing certificate has expired."
    }
    $signTool = Find-SignTool
    if ($null -eq $signTool) {
        throw "signtool.exe is required for a signed release. Install the Windows SDK signing tools."
    }
}

Push-Location $connectorRoot
try {
    & (Join-Path $connectorRoot "make_icon.ps1")

    if (-not $SkipTests) {
        & $python -m pytest tests -q
        if ($LASTEXITCODE -ne 0) {
            throw "Connector tests failed."
        }
    }

    & $python -m PyInstaller --noconfirm --clean --onefile --windowed --noupx `
        --name arq-connector `
        --paths src `
        --icon src\arq_connector\assets\arq.ico `
        --version-file windows_version_info.txt `
        --add-data "src\arq_connector\assets\arq.ico;assets" `
        --add-data "src\arq_connector\assets\arq_logo.png;assets" `
        --hidden-import keyring.backends.Windows `
        src\arq_connector\__main__.py
    if ($LASTEXITCODE -ne 0) {
        throw "PyInstaller failed."
    }

    if ($Release) {
        & $signTool sign /sha1 $CertificateThumbprint /fd SHA256 /tr $TimestampUrl /td SHA256 `
            /d "ARQ Astra Tally Connector" $canonicalExe
        if ($LASTEXITCODE -ne 0) {
            throw "Authenticode signing failed."
        }
    }

    & (Join-Path $connectorRoot "verify_release.ps1") `
        -ExePath $canonicalExe `
        -ExpectedVersion $version `
        -RequireSignature:$Release

    $releaseBaseName = "ARQ-Astra-Connector-v$version-windows-x64"
    $versionedExe = Join-Path $dist "$releaseBaseName.exe"
    $checksumFile = Join-Path $dist "SHA256SUMS.txt"
    $zipFile = Join-Path $dist "$releaseBaseName.zip"

    Copy-Item -LiteralPath $canonicalExe -Destination $versionedExe -Force
    $hash = (Get-FileHash -LiteralPath $versionedExe -Algorithm SHA256).Hash
    Set-Content -LiteralPath $checksumFile -Encoding ascii -Value "$hash  $releaseBaseName.exe"

    Compress-Archive -LiteralPath @(
        $versionedExe,
        $checksumFile,
        (Join-Path $connectorRoot "DISTRIBUTION_README.txt")
    ) -DestinationPath $zipFile -CompressionLevel Optimal -Force

    Write-Host ""
    Write-Host "Validated build: $canonicalExe"
    if ($Release) {
        Write-Host "Distribute only: $zipFile"
    }
    else {
        Write-Host "Internal test package: $zipFile"
        Write-Warning "This developer build is unsigned. Do not distribute it to clients."
    }
}
finally {
    Pop-Location
}
