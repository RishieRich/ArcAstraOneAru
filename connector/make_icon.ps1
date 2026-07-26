# Generates a high-contrast Windows icon that remains recognizable at 16px.
# The full ARQ artwork is excellent at banner size, but its black background and
# fine lettering disappear when Windows scales it down for File Explorer.
#
# Outputs:
#   src\arq_connector\assets\arq.ico       - multi-resolution exe/window icon
#   src\arq_connector\assets\arq_logo.png  - 40px GUI header mark

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assets = Join-Path $PSScriptRoot "src\arq_connector\assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null

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

function New-AppPng([int]$size) {
    $bitmap = [System.Drawing.Bitmap]::new(
        $size,
        $size,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $margin = if ($size -le 20) { 0 } else { [Math]::Max(1, [int]($size * 0.035)) }
    $tileSize = $size - (2 * $margin)
    $radius = [Math]::Max(2, [float]($tileSize * 0.20))
    $tile = New-RoundedRectanglePath $margin $margin $tileSize $tileSize $radius
    $orange = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 238, 139, 24))
    $graphics.FillPath($orange, $tile)

    # A compact mark is intentional: the full logo is unreadable in Explorer's
    # 16px and 20px views. "ARQ" is retained wherever the pixel budget permits.
    $label = if ($size -le 20) { "A" } else { "ARQ" }
    $fontSize = if ($label -eq "A") { $size * 0.68 } else { $size * 0.34 }
    $font = [System.Drawing.Font]::new(
        "Segoe UI",
        $fontSize,
        [System.Drawing.FontStyle]::Bold,
        [System.Drawing.GraphicsUnit]::Pixel
    )
    $textBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 24, 28, 35))
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $textBounds = [System.Drawing.RectangleF]::new(0, -($size * 0.04), $size, $size)
    $graphics.DrawString($label, $font, $textBrush, $textBounds, $format)

    $memory = [System.IO.MemoryStream]::new()
    try {
        $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
        return ,$memory.ToArray()
    }
    finally {
        $memory.Dispose()
        $format.Dispose()
        $textBrush.Dispose()
        $font.Dispose()
        $orange.Dispose()
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

$headerLogo = [byte[]](New-AppPng 40)
[System.IO.File]::WriteAllBytes((Join-Path $assets "arq_logo.png"), $headerLogo)

Write-Host "Generated icon: $icoPath"
Write-Host "Embedded sizes: $($sizes -join ', ')"
