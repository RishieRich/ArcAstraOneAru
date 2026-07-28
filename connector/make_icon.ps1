# Generates the connector's brand assets from the ARQ logo artwork.
#
# Two different jobs, two different treatments:
#
#   arq_logo.png  - the REAL logo artwork, auto-cropped to its content and
#                   scaled for the app header. There is room there for the full
#                   wordmark, so the client sees the actual brand.
#   arq.ico       - the logo's design language (black field, orange orbit,
#                   silver ARQ) redrawn procedurally at each icon size. The
#                   photographic artwork turns to mush below 32px, and Windows
#                   shows this icon at 16px in the taskbar and title bar more
#                   often than anywhere else.
#
# make_icon.ps1 runs from build.ps1, so both assets are always rebuilt from
# ARQ_Logo.jpeg rather than being stale checked-in binaries.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot "src\arq_connector\assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$sourceLogo = Join-Path $assets "ARQ_Logo.jpeg"

# ── palette, sampled from the logo artwork ─────────────────────────────────
$LOGO_BLACK = [System.Drawing.Color]::FromArgb(255, 11, 12, 15)
$ORANGE     = [System.Drawing.Color]::FromArgb(255, 238, 139, 24)
$SILVER     = [System.Drawing.Color]::FromArgb(255, 226, 229, 234)

function New-RoundedRectanglePath(
    [float]$x,
    [float]$y,
    [float]$width,
    [float]$height,
    [float]$radius
) {
    $diameter = $radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-Graphics([System.Drawing.Bitmap]$bitmap) {
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return $g
}

# ── 1. the header mark: real artwork, cropped to its content ───────────────

function Get-ContentBounds([System.Drawing.Bitmap]$bitmap, [int]$threshold) {
    # The artwork sits on a wide black field, and stacks two blocks of ink: the
    # ARQ wordmark with its orbit, and a much smaller "ONE AI LABS" tagline.
    # Cropping to both forces the wordmark down to a few pixels in the app
    # header, so find the horizontal bands of ink and keep only the dominant
    # one. Scanning for it beats hardcoded offsets — the crop still works if the
    # artwork is ever re-exported at another size or position.
    $step = 2
    $rowCount = @{}
    $rowMinX = @{}
    $rowMaxX = @{}
    for ($y = 0; $y -lt $bitmap.Height; $y += $step) {
        $count = 0; $minX = $bitmap.Width; $maxX = -1
        for ($x = 0; $x -lt $bitmap.Width; $x += $step) {
            $pixel = $bitmap.GetPixel($x, $y)
            $luma = (0.299 * $pixel.R) + (0.587 * $pixel.G) + (0.114 * $pixel.B)
            if ($luma -gt $threshold) {
                $count++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
            }
        }
        $rowCount[$y] = $count; $rowMinX[$y] = $minX; $rowMaxX[$y] = $maxX
    }

    # Group ink rows into bands, tolerating the small dark gaps inside letters.
    $gapTolerance = [Math]::Max(4, [int]($bitmap.Height * 0.02))
    $bands = [System.Collections.ArrayList]::new()
    $current = $null
    $lastInkY = -9999
    foreach ($y in ($rowCount.Keys | Sort-Object)) {
        if ($rowCount[$y] -lt 2) { continue }
        if ($null -eq $current -or ($y - $lastInkY) -gt $gapTolerance) {
            $current = @{ Top = $y; Bottom = $y; Mass = 0 }
            [void]$bands.Add($current)
        }
        $current.Bottom = $y
        $current.Mass += $rowCount[$y]
        $lastInkY = $y
    }
    if ($bands.Count -eq 0) { throw "Could not find any logo content in $sourceLogo." }

    # "Dominant" = most ink, which is the wordmark rather than the thin tagline.
    $band = $bands | Sort-Object -Property @{ Expression = { $_.Mass } } -Descending | Select-Object -First 1

    $minX = $bitmap.Width; $maxX = -1
    foreach ($y in ($rowCount.Keys | Sort-Object)) {
        if ($y -lt $band.Top -or $y -gt $band.Bottom) { continue }
        if ($rowMaxX[$y] -lt 0) { continue }
        if ($rowMinX[$y] -lt $minX) { $minX = $rowMinX[$y] }
        if ($rowMaxX[$y] -gt $maxX) { $maxX = $rowMaxX[$y] }
    }

    return @{
        X = $minX
        Y = $band.Top
        Width = ($maxX - $minX + 1)
        Height = ($band.Bottom - $band.Top + 1)
    }
}

if (-not (Test-Path -LiteralPath $sourceLogo)) {
    throw "Missing brand artwork: $sourceLogo"
}

$source = [System.Drawing.Bitmap]::new($sourceLogo)
try {
    $bounds = Get-ContentBounds $source 45
    $pad = [int]($source.Width * 0.012)
    $cropX = [Math]::Max(0, $bounds.X - $pad)
    $cropY = [Math]::Max(0, $bounds.Y - $pad)
    $cropW = [Math]::Min($source.Width - $cropX, $bounds.Width + (2 * $pad))
    $cropH = [Math]::Min($source.Height - $cropY, $bounds.Height + (2 * $pad))

    # Header height drives the scale; width follows the artwork's aspect ratio.
    $targetHeight = 58
    $targetWidth = [int][Math]::Round($cropW * ($targetHeight / $cropH))

    $header = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = New-Graphics $header
    try {
        # Paint the logo's own black underneath: the JPEG has no alpha, and the
        # app header uses this exact colour so the mark reads as part of the bar.
        $bg = [System.Drawing.SolidBrush]::new($LOGO_BLACK)
        $g.FillRectangle($bg, 0, 0, $targetWidth, $targetHeight)
        $bg.Dispose()
        $g.DrawImage($source,
            [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight),
            $cropX, $cropY, $cropW, $cropH,
            [System.Drawing.GraphicsUnit]::Pixel)
    }
    finally { $g.Dispose() }

    $header.Save((Join-Path $assets "arq_logo.png"),
        [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Header logo: ${targetWidth}x${targetHeight} (cropped from $($cropW)x$($cropH))"
    $header.Dispose()
}
finally {
    $source.Dispose()
}

# ── 2. the app icon: the logo's design, redrawn per size ───────────────────

function New-AppPng([int]$size) {
    $bitmap = [System.Drawing.Bitmap]::new(
        $size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = New-Graphics $bitmap

    $margin = if ($size -le 20) { 0 } else { [Math]::Max(1, [int]($size * 0.03)) }
    $tileSize = $size - (2 * $margin)
    $radius = [Math]::Max(2, [float]($tileSize * 0.22))
    $tile = New-RoundedRectanglePath $margin $margin $tileSize $tileSize $radius

    # The logo's black field.
    $tileBrush = [System.Drawing.SolidBrush]::new($LOGO_BLACK)
    $graphics.FillPath($tileBrush, $tile)

    # The orange orbit. It is the logo's signature element and the only thing
    # that still reads as ARQ at 16px, so it is drawn at every size.
    $state = $graphics.Save()
    $graphics.TranslateTransform($size / 2.0, $size / 2.0)
    $graphics.RotateTransform(-18)
    $orbitW = $size * 0.92
    $orbitH = $size * 0.46
    $penWidth = [Math]::Max(1.0, $size * 0.055)
    $orbitPen = [System.Drawing.Pen]::new($ORANGE, $penWidth)
    $graphics.DrawEllipse($orbitPen, -($orbitW / 2), -($orbitH / 2), $orbitW, $orbitH)
    $orbitPen.Dispose()
    $graphics.Restore($state)

    # Silver wordmark over the orbit, matching the artwork's stacking.
    $label = if ($size -le 24) { "A" } else { "ARQ" }
    $fontSize = if ($label -eq "A") { $size * 0.62 } else { $size * 0.36 }
    $font = [System.Drawing.Font]::new(
        "Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold,
        [System.Drawing.GraphicsUnit]::Pixel)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $textBounds = [System.Drawing.RectangleF]::new(0, -($size * 0.02), $size, $size)

    # A dark shadow keeps the silver legible where it crosses the orange orbit.
    $shadow = [System.Drawing.SolidBrush]::new(
        [System.Drawing.Color]::FromArgb(190, 8, 9, 11))
    $shadowBounds = [System.Drawing.RectangleF]::new(
        $size * 0.02, -($size * 0.02) + ($size * 0.02), $size, $size)
    $graphics.DrawString($label, $font, $shadow, $shadowBounds, $format)
    $textBrush = [System.Drawing.SolidBrush]::new($SILVER)
    $graphics.DrawString($label, $font, $textBrush, $textBounds, $format)

    # Hairline edge so the dark tile still has a shape on a dark taskbar.
    if ($size -ge 24) {
        $edge = [System.Drawing.Pen]::new(
            [System.Drawing.Color]::FromArgb(70, 238, 139, 24), 1.0)
        $graphics.DrawPath($edge, $tile)
        $edge.Dispose()
    }

    $memory = [System.IO.MemoryStream]::new()
    try {
        $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
        return ,$memory.ToArray()
    }
    finally {
        $memory.Dispose()
        $format.Dispose()
        $textBrush.Dispose()
        $shadow.Dispose()
        $font.Dispose()
        $tileBrush.Dispose()
        $tile.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

# Include the sizes Windows commonly requests at 100%-250% display scaling.
$sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)
$pngs = @{}
foreach ($size in $sizes) {
    $pngs[$size] = [byte[]](New-AppPng $size)
}

$icoPath = Join-Path $assets "arq.ico"
$stream = [System.IO.File]::Create($icoPath)
$writer = [System.IO.BinaryWriter]::new($stream)
try {
    $writer.Write([UInt16]0)
    $writer.Write([UInt16]1)
    $writer.Write([UInt16]$sizes.Count)

    $offset = 6 + (16 * $sizes.Count)
    foreach ($size in $sizes) {
        $data = $pngs[$size]
        $dimension = if ($size -ge 256) { 0 } else { $size }
        $writer.Write([Byte]$dimension)
        $writer.Write([Byte]$dimension)
        $writer.Write([Byte]0)
        $writer.Write([Byte]0)
        $writer.Write([UInt16]1)
        $writer.Write([UInt16]32)
        $writer.Write([UInt32]$data.Length)
        $writer.Write([UInt32]$offset)
        $offset += $data.Length
    }

    foreach ($size in $sizes) {
        $writer.Write([byte[]]$pngs[$size])
    }
}
finally {
    $writer.Dispose()
    $stream.Dispose()
}

# A 64px copy of the icon art, for the GUI's window/about corner.
[System.IO.File]::WriteAllBytes((Join-Path $assets "arq_mark.png"),
    [byte[]](New-AppPng 64))

Write-Host "Generated icon: $icoPath"
Write-Host "Embedded sizes: $($sizes -join ', ')"
