$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$assetDirectory = Join-Path $projectRoot 'src/assets/characters/piki/hands'
$parts = @('rock', 'scissors', 'paper')

function Get-AlphaBounds([Drawing.Bitmap]$bitmap) {
    $left = $bitmap.Width; $top = $bitmap.Height; $right = -1; $bottom = -1
    for ($y = 0; $y -lt $bitmap.Height; $y++) {
        for ($x = 0; $x -lt $bitmap.Width; $x++) {
            if ($bitmap.GetPixel($x, $y).A -ge 128) {
                $left = [Math]::Min($left, $x); $top = [Math]::Min($top, $y)
                $right = [Math]::Max($right, $x); $bottom = [Math]::Max($bottom, $y)
            }
        }
    }
    return @{ left = $left; top = $top; right = $right; bottom = $bottom }
}

$manifest = [ordered]@{
    status = 'review-only-not-approved'; canvas = @(1024, 1024)
    pivot = @{ x = 512; y = 820 }; wristBottomY = 880
    wristOuterWidth = 192; orientation = 'palm-front-thumb-viewer-left'
    processing = 'uniform-scale-and-translate-only; no-mask-no-silhouette-crop'
    alphaBoundsThreshold = 128
    parts = [ordered]@{}
}
foreach ($part in $parts) {
    $source = [Drawing.Bitmap]::new((Join-Path $PSScriptRoot "source-generated/$part.png"))
    $bounds = Get-AlphaBounds $source
    # Use a horizontal slice inside the straight wrist to register all poses.
    $row = $bounds.bottom - 40
    $xs = @(for ($x = 0; $x -lt $source.Width; $x++) { if ($source.GetPixel($x, $row).A -ge 128) { $x } })
    $centerX = ($xs[0] + $xs[-1]) / 2.0
    $scale = 192.0 / ($xs[-1] - $xs[0] + 1)
    $offsetX = 512 - $centerX * $scale
    $offsetY = 880 - ($bounds.bottom + 1) * $scale
    $canvas = [Drawing.Bitmap]::new(1024, 1024, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [Drawing.Graphics]::FromImage($canvas)
    $graphics.Clear([Drawing.Color]::Transparent)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $destination = [Drawing.RectangleF]::new($offsetX, $offsetY, $source.Width * $scale, $source.Height * $scale)
    $graphics.DrawImage($source, $destination, [Drawing.RectangleF]::new(0, 0, $source.Width, $source.Height), [Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()
    $filename = "piki-hand-$part.png"
    $canvas.Save((Join-Path $assetDirectory $filename), [Drawing.Imaging.ImageFormat]::Png)
    $finalBounds = Get-AlphaBounds $canvas
    if ($finalBounds.left -lt 96 -or $finalBounds.top -lt 96 -or $finalBounds.right -gt 928 -or $finalBounds.bottom -gt 928) { throw "Insufficient padding: $part" }
    foreach ($point in @(@(0,0), @(1023,0), @(0,1023), @(1023,1023))) {
        if ($canvas.GetPixel($point[0], $point[1]).A -ne 0) { throw "Nontransparent corner: $part" }
    }
    if ($canvas.GetPixel(512,820).A -lt 250) { throw "Wrist pivot not inside hand: $part" }
    $manifest.parts[$part] = @{
        file = $filename; sourceSize = @($source.Width, $source.Height)
        uniformScale = $scale; translation = @($offsetX, $offsetY)
        sourcePivot = @($centerX, ((820 - $offsetY) / $scale))
        alphaBounds = $finalBounds; sha256 = (Get-FileHash (Join-Path $assetDirectory $filename)).Hash
    }
    $canvas.Dispose(); $source.Dispose()
}

# Review-only board: same canvas scale, neutral checkerboard, names and pivot guides.
$board = [Drawing.Bitmap]::new(1536, 620)
$g = [Drawing.Graphics]::FromImage($board)
$g.Clear([Drawing.ColorTranslator]::FromHtml('#fff8ed'))
$font = [Drawing.Font]::new('Malgun Gothic', 19, [Drawing.FontStyle]::Bold)
$smallFont = [Drawing.Font]::new('Malgun Gothic', 11)
$brown = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#70472f'))
$gray = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#e9e6e0'))
$white = [Drawing.SolidBrush]::new([Drawing.Color]::White)
$guide = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#4b9b9b'), 1)
$guide.DashStyle = [Drawing.Drawing2D.DashStyle]::Dash
$labels = @('ROCK / 바위', 'SCISSORS / 가위', 'PAPER / 보')
for ($i = 0; $i -lt 3; $i++) {
    $panelX = $i * 512
    $g.DrawString($labels[$i], $font, $brown, ($panelX + 24), 12)
    for ($y = 60; $y -lt 572; $y += 16) {
        for ($x = 0; $x -lt 512; $x += 16) {
            $brush = if (((($x / 16) + (($y - 60) / 16)) % 2) -eq 0) { $white } else { $gray }
            $g.FillRectangle($brush, ($panelX + $x), $y, 16, 16)
        }
    }
    $partImage = [Drawing.Bitmap]::new((Join-Path $assetDirectory "piki-hand-$($parts[$i]).png"))
    $g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($partImage, [Drawing.Rectangle]::new($panelX,60,512,512))
    $partImage.Dispose()
    $g.DrawLine($guide, $panelX,470,($panelX + 512),470)
    $g.DrawLine($guide, ($panelX + 256),60,($panelX + 256),572)
    $g.DrawEllipse($guide, ($panelX + 250),464,12,12)
    $g.DrawString('1024 x 1024 | pivot (512, 820)', $smallFont, $brown, ($panelX + 24),584)
}
$board.Save((Join-Path $PSScriptRoot 'piki-hands-review.png'), [Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $board.Dispose(); $font.Dispose(); $smallFont.Dispose(); $brown.Dispose(); $gray.Dispose(); $white.Dispose(); $guide.Dispose()
$manifest | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $assetDirectory 'hand-spec.json') -Encoding UTF8
Write-Output ($manifest | ConvertTo-Json -Depth 10)
