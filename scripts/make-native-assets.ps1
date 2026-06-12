# Generates the source images @capacitor/assets needs (into ./assets), then you
# run `npm run native:icons` to fan them out into the iOS/Android projects.
# Re-run after changing the icon design: powershell -File scripts/make-native-assets.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\assets"
New-Item -ItemType Directory -Force $outDir | Out-Null

$bg    = [System.Drawing.ColorTranslator]::FromHtml("#E8E0D4")
$amber = [System.Drawing.ColorTranslator]::FromHtml("#C4956A")

# Draws the Intent "pillar spine" glyph centered on a canvas.
# glyphScale = fraction of the canvas the glyph height occupies.
function Draw-Glyph {
    param(
        [System.Drawing.Graphics]$g, [int]$Size,
        [double]$GlyphScale, [bool]$Transparent
    )
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    if (-not $Transparent) {
        $bgBrush = New-Object System.Drawing.SolidBrush($bg)
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
    }

    $amberBrush = New-Object System.Drawing.SolidBrush($amber)
    $lineBrush  = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 255, 255, 255))

    $h = [int]($Size * $GlyphScale)
    $w = [int]($h * 0.55)
    $x = [int](($Size - $w) / 2)
    $y = [int](($Size - $h) / 2)
    $r = [int]($Size * 0.035)

    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddArc($x, $y, 2*$r, 2*$r, 180, 90)
    $gp.AddArc($x + $w - 2*$r, $y, 2*$r, 2*$r, 270, 90)
    $gp.AddArc($x + $w - 2*$r, $y + $h - 2*$r, 2*$r, 2*$r, 0, 90)
    $gp.AddArc($x, $y + $h - 2*$r, 2*$r, 2*$r, 90, 90)
    $gp.CloseFigure()
    $g.FillPath($amberBrush, $gp)

    $lineY = $y + [int]($h * 0.3)
    $g.FillRectangle($lineBrush, $x, $lineY, $w, [Math]::Max(1, [int]($Size * 0.005)))
}

function New-Asset {
    param([int]$Size, [string]$Name, [double]$GlyphScale, [bool]$Transparent = $false)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Draw-Glyph -g $g -Size $Size -GlyphScale $GlyphScale -Transparent $Transparent
    $g.Dispose()
    $path = Join-Path $outDir $Name
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "wrote $path"
}

function New-Background {
    param([int]$Size, [string]$Name)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.FillRectangle((New-Object System.Drawing.SolidBrush($bg)), 0, 0, $Size, $Size)
    $g.Dispose()
    $path = Join-Path $outDir $Name
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "wrote $path"
}

# App icon (full bleed) — glyph at 0.52 of the canvas.
New-Asset -Size 1024 -Name "icon-only.png" -GlyphScale 0.52
# Adaptive icon: foreground glyph (transparent) kept inside the safe zone + solid background.
New-Asset -Size 1024 -Name "icon-foreground.png" -GlyphScale 0.40 -Transparent $true
New-Background -Size 1024 -Name "icon-background.png"
# Splash — small centered glyph on the app background, light + dark (same; app is light).
New-Asset -Size 2732 -Name "splash.png" -GlyphScale 0.16
New-Asset -Size 2732 -Name "splash-dark.png" -GlyphScale 0.16

Write-Host "Done. Now run: npm run native:icons"
