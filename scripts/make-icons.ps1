# Draws the app icon (a happy purple monster on grass) at the sizes iPad and
# browsers need, and saves them as PNGs in public/icons/.
# Run from the project folder:  pwsh scripts/make-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force $outDir | Out-Null

function Draw-Icon([int]$size, [string]$file, [double]$pad) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 100.0  # draw on a 100x100 grid, scaled up

  # Sky and grass fill the whole square (iOS rounds the corners itself).
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#bfe8ff'))
  $g.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#8fd16a'))), 0, [int](70 * $s), $size, $size)

  # Keep the monster inside the "safe zone" for Android-style masked icons.
  $k = (1 - 2 * $pad) * $s
  $o = $pad * $size
  function P([double]$v) { return [single]($o + $v * $k) }
  function L([double]$v) { return [single]($v * $k) }

  $ink = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#222222')), (L 4)
  $ink.LineJoin = 'Round'; $ink.StartCap = 'Round'; $ink.EndCap = 'Round'
  $purple = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#b07de8'))
  $white = [System.Drawing.Brushes]::White
  $black = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#222222'))
  $pink = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(200, 255, 143, 177))

  # legs
  $g.DrawLine($ink, (P 38), (P 80), (P 35), (P 93)); $g.DrawLine($ink, (P 35), (P 93), (P 29), (P 93))
  $g.DrawLine($ink, (P 62), (P 80), (P 65), (P 93)); $g.DrawLine($ink, (P 65), (P 93), (P 71), (P 93))
  # waving arm
  $g.DrawLine($ink, (P 76), (P 52), (P 88), (P 32))
  $g.FillEllipse($purple, (P 83), (P 23), (L 10), (L 10)); $g.DrawEllipse($ink, (P 83), (P 23), (L 10), (L 10))
  # body
  $g.FillEllipse($purple, (P 20), (P 12), (L 60), (L 74)); $g.DrawEllipse($ink, (P 20), (P 12), (L 60), (L 74))
  # eyes
  $g.FillEllipse($white, (P 30), (P 30), (L 18), (L 18)); $g.DrawEllipse($ink, (P 30), (P 30), (L 18), (L 18))
  $g.FillEllipse($white, (P 53), (P 29), (L 15), (L 15)); $g.DrawEllipse($ink, (P 53), (P 29), (L 15), (L 15))
  $g.FillEllipse($black, (P 37), (P 36), (L 8), (L 8))
  $g.FillEllipse($black, (P 59), (P 34), (L 6), (L 6))
  # cheeks
  $g.FillEllipse($pink, (P 25), (P 52), (L 8), (L 6)); $g.FillEllipse($pink, (P 67), (P 50), (L 8), (L 6))
  # smile
  $g.DrawArc($ink, (P 35), (P 46), (L 30), (L 20), 20, 140)

  $bmp.Save((Join-Path $outDir $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

Draw-Icon 180 'apple-touch-icon.png' 0.08
Draw-Icon 192 'icon-192.png' 0.08
Draw-Icon 512 'icon-512.png' 0.08
Draw-Icon 512 'icon-maskable-512.png' 0.18
Draw-Icon 48 'favicon.png' 0.04
Write-Output "Icons written to $outDir"
