# Generates the app's icon assets FROM THE REAL ARQ LOGO
# (canonical source: src\arq_connector\assets\ARQ_Logo.jpeg).
# Outputs:
#   src\arq_connector\assets\arq.ico       — multi-size exe/window icon
#   src\arq_connector\assets\arq_logo.png  — 40px header logo for the GUI
# Build-time only (System.Drawing); outputs are committed, so normal builds
# never need to run this. Re-run only if the logo changes.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot "src\arq_connector\assets"
New-Item -ItemType Directory -Force $assets | Out-Null

$logoPath = Join-Path $assets "ARQ_Logo.jpeg"
$logo = [System.Drawing.Image]::FromFile($logoPath)

function New-LogoPng([int]$size, [bool]$rounded) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = "AntiAlias"
    $g.InterpolationMode = "HighQualityBicubic"

    if ($rounded) {
        $r = [Math]::Max(2, [int]($size * 0.18))
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $r*2, $r*2, 180, 90)
        $path.AddArc($size - $r*2, 0, $r*2, $r*2, 270, 90)
        $path.AddArc($size - $r*2, $size - $r*2, $r*2, $r*2, 0, 90)
        $path.AddArc(0, $size - $r*2, $r*2, $r*2, 90, 90)
        $path.CloseFigure()
        $g.SetClip($path)
    }

    # draw the full square logo scaled to the tile
    $g.DrawImage($logo, 0, 0, $size, $size)

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
    Write-Output -NoEnumerate $ms.ToArray()
}

# ── multi-size ICO (PNG-compressed entries are valid in ICO format) ──
$sizes = 16, 24, 32, 48, 64, 256
$pngs = @{}
foreach ($s in $sizes) { $pngs[$s] = [byte[]](New-LogoPng $s $true) }

$icoPath = Join-Path $assets "arq.ico"
$stream = [System.IO.File]::Create($icoPath)
$writer = New-Object System.IO.BinaryWriter($stream)

$writer.Write([UInt16]0)               # reserved
$writer.Write([UInt16]1)               # type: icon
$writer.Write([UInt16]$sizes.Count)    # image count

$offset = 6 + (16 * $sizes.Count)
foreach ($s in $sizes) {
    $data = $pngs[$s]
    $dim = if ($s -ge 256) { 0 } else { $s }   # 0 means 256 in ICO directories
    $writer.Write([Byte]$dim); $writer.Write([Byte]$dim)
    $writer.Write([Byte]0);    $writer.Write([Byte]0)
    $writer.Write([UInt16]1);  $writer.Write([UInt16]32)
    $writer.Write([UInt32]$data.Length)
    $writer.Write([UInt32]$offset)
    $offset += $data.Length
}
foreach ($s in $sizes) { $writer.Write([byte[]]$pngs[$s]) }
$writer.Dispose(); $stream.Dispose()
Write-Host "Icon written: $icoPath"

# ── 40px PNG for the GUI header ──
$hdr = [byte[]](New-LogoPng 40 $true)
[System.IO.File]::WriteAllBytes((Join-Path $assets "arq_logo.png"), $hdr)
Write-Host "Header logo written: $assets\arq_logo.png"

$logo.Dispose()
