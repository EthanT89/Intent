# Generates the PWA icon set into public/icons/.
# Re-run after changing the icon design: powershell -File scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\icons"
New-Item -ItemType Directory -Force $outDir | Out-Null

function New-IntentIcon {
    param([int]$Size, [string]$Path, [bool]$Maskable = $false)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bg     = [System.Drawing.ColorTranslator]::FromHtml("#E8E0D4")
    $amber  = [System.Drawing.ColorTranslator]::FromHtml("#C4956A")
    $bgBrush    = New-Object System.Drawing.SolidBrush($bg)
    $amberBrush = New-Object System.Drawing.SolidBrush($amber)
    $lineBrush  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 255, 255, 255))

    # Background fills the full square (maskable-safe)
    $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)

    # Centered glyph — the pillar "spine" from the app's design language.
    # Maskable icons keep content inside the 80% safe zone.
    $scale = if ($Maskable) { 0.42 } else { 0.52 }
    $w = [int]($Size * $scale * 0.62)
    $h = [int]($Size * $scale * 1.18)
    $x = [int](($Size - $w) / 2)
    $y = [int](($Size - $h) / 2)
    $r = [int]($Size * 0.04)

    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc($x, $y, 2*$r, 2*$r, 180, 90)
    $gp.AddArc($x + $w - 2*$r, $y, 2*$r, 2*$r, 270, 90)
    $gp.AddArc($x + $w - 2*$r, $y + $h - 2*$r, 2*$r, 2*$r, 0, 90)
    $gp.AddArc($x, $y + $h - 2*$r, 2*$r, 2*$r, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($amberBrush, $gp)

    # Highlight line at 30% height
    $lineY = $y + [int]($h * 0.3)
    $g.FillRectangle($lineBrush, $x, $lineY, $w, [Math]::Max(1, [int]($Size * 0.006)))

    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "wrote $Path"
}

New-IntentIcon -Size 192 -Path (Join-Path $outDir "icon-192.png")
New-IntentIcon -Size 512 -Path (Join-Path $outDir "icon-512.png")
New-IntentIcon -Size 512 -Path (Join-Path $outDir "icon-512-maskable.png") -Maskable $true
New-IntentIcon -Size 180 -Path (Join-Path $outDir "apple-touch-icon.png")
