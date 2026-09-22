param(
  [string]$OutputRoot = (Join-Path $PSScriptRoot "../../content/abilities")
)

Add-Type -AssemblyName System.Drawing
$icons = @(
  @{ unit='forewarn';    id='forewarn_mark';        color='#7A5FBF' },
  @{ unit='frisk';       id='frisk_exposed';        color='#8A7F4A' },
  @{ unit='grassysurge'; id='grassysurge_terrain';  color='#7CCB5A' },
  @{ unit='hospitality'; id='hospitality_well_fed'; color='#E8A86B' },
  @{ unit='intimidate';  id='intimidate_mark';      color='#B03030' },
  @{ unit='intrepidsword'; id='intrepidsword_edge'; color='#4C9BE8' },
  @{ unit='klutz';       id='klutz_unburdened';     color='#C9A227' },
  @{ unit='mistysurge';  id='mistysurge_terrain';   color='#A8D8E8' }
)
foreach ($data in $icons) {
  $dir = Join-Path $OutputRoot "$($data.unit)/resources/assets/world_combat/textures/mob_effect"
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $bmp = [System.Drawing.Bitmap]::new(18,18,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $c = [System.Drawing.ColorTranslator]::FromHtml($data.color)
  $g.FillEllipse([System.Drawing.SolidBrush]::new($c), 2, 2, 13, 13)
  $g.DrawEllipse([System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(200, [Math]::Min(255,$c.R+50), [Math]::Min(255,$c.G+50), [Math]::Min(255,$c.B+50)), 1.4), 2, 2, 13, 13)
  $g.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180,255,255,255)), 5, 4, 4, 3)
  $g.Dispose()
  $bmp.Save((Join-Path $dir ($data.id + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
