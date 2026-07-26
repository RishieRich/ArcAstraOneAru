[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ExePath,

    [string]$ExpectedVersion,

    [switch]$RequireSignature
)

$ErrorActionPreference = "Stop"
$resolvedExe = (Resolve-Path -LiteralPath $ExePath).Path

function Assert-Equal($Actual, $Expected, [string]$Message) {
    if ($Actual -ne $Expected) {
        throw "$Message (expected '$Expected', found '$Actual')"
    }
}

# Read the PE header directly so a 32-bit build cannot accidentally be shipped.
$stream = [System.IO.File]::OpenRead($resolvedExe)
$reader = [System.IO.BinaryReader]::new($stream)
try {
    Assert-Equal $reader.ReadUInt16() ([UInt16]0x5A4D) "Missing MZ executable header"
    $stream.Position = 0x3C
    $peOffset = $reader.ReadUInt32()
    $stream.Position = $peOffset
    Assert-Equal $reader.ReadUInt32() ([UInt32]0x00004550) "Missing PE executable header"
    $machine = $reader.ReadUInt16()
    Assert-Equal $machine ([UInt16]0x8664) "Connector is not a Windows x64 executable"
}
finally {
    $reader.Dispose()
    $stream.Dispose()
}

$version = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($resolvedExe)
Assert-Equal $version.ProductName "ARQ Astra Tally Connector" "Product metadata is missing"
Assert-Equal $version.FileDescription "ARQ Astra Tally Connector" "File description is missing"
if ([string]::IsNullOrWhiteSpace($version.FileVersion)) {
    throw "File version metadata is missing"
}
if (-not [string]::IsNullOrWhiteSpace($ExpectedVersion)) {
    Assert-Equal $version.ProductVersion $ExpectedVersion "Product version does not match the package version"
}

# Extract the icon Windows Explorer will use and check for the orange ARQ tile.
# This catches a build that silently falls back to PyInstaller's default icon.
Add-Type -AssemblyName System.Drawing
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($resolvedExe)
if ($null -eq $icon) {
    throw "No Windows icon resource was found"
}
$bitmap = $icon.ToBitmap()
try {
    $orangePixels = 0
    $visiblePixels = 0
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
        for ($y = 0; $y -lt $bitmap.Height; $y++) {
            $pixel = $bitmap.GetPixel($x, $y)
            if ($pixel.A -gt 32) {
                $visiblePixels++
                if ($pixel.R -gt 190 -and $pixel.G -gt 80 -and $pixel.G -lt 190 -and $pixel.B -lt 80) {
                    $orangePixels++
                }
            }
        }
    }
    if ($visiblePixels -eq 0 -or ($orangePixels / $visiblePixels) -lt 0.25) {
        throw "The embedded icon does not match the high-contrast ARQ icon"
    }
}
finally {
    $bitmap.Dispose()
    $icon.Dispose()
}

$signature = Get-AuthenticodeSignature -LiteralPath $resolvedExe
if ($RequireSignature -and $signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    throw "Release signature is not valid (status: $($signature.Status))"
}

$hash = (Get-FileHash -LiteralPath $resolvedExe -Algorithm SHA256).Hash
[PSCustomObject]@{
    Path = $resolvedExe
    Architecture = "Windows x64"
    Product = $version.ProductName
    Version = $version.ProductVersion
    Icon = "ARQ multi-resolution icon embedded"
    Signature = $signature.Status
    SHA256 = $hash
} | Format-List
