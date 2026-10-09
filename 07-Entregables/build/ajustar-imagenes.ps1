# Hace que ninguna imagen de un documento armado con pandoc quede más alta que la hoja.
# Lo llama build-general.sh sobre los .md intermedios, antes de pandoc (pedido de Nahuel, 08/10/26:
# los diagramas de actividad medían hasta 38" de alto y salían cortados).
#
# Para cada línea «![pie](archivo.png){ width=N% }» calcula el alto que tendría en la hoja:
#   - si entra, no la toca;
#   - si se pasa hasta un 60 %, la achica (cambia el ancho para que el alto sea el máximo);
#   - si se pasa más, la parte en tramos de una hoja a ancho completo, cortando en la fila con
#     menos tinta cerca del límite (así no corta cajas ni textos), y numera los pies «parte i de n».
# -Markdown: los .md a procesar, separados por «|» (se reescriben). -Rutas: carpetas donde buscar las
# imágenes, separadas por «|». -Salida: carpeta para los tramos (sumarla al --resource-path de pandoc).
param(
  [Parameter(Mandatory = $true)][string]$Markdown,
  [Parameter(Mandatory = $true)][string]$Rutas,
  [Parameter(Mandatory = $true)][string]$Salida,
  [double]$AnchoMax = 6.3,   # pulgadas: A4 con márgenes de 2,5 cm
  [double]$AltoMax = 8.6     # pulgadas: la hoja útil (9,7") menos el pie de figura
)
$ErrorActionPreference = 'Stop'
$archivos = $Markdown.Split('|'); $carpetas = $Rutas.Split('|')
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Salida | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Buscar([string]$nombre) {
  foreach ($r in $carpetas) { $p = Join-Path $r $nombre; if (Test-Path -LiteralPath $p) { return $p } }
  return $null
}

# Cantidad de píxeles no blancos por fila (LockBits: rápido aun con imágenes de 8000 px de alto).
function TintaPorFila([System.Drawing.Bitmap]$bmp) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $bmp.Height)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $bmp.UnlockBits($data)
  $tinta = New-Object int[] $bmp.Height
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    $o = $y * $data.Stride; $n = 0
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $i = $o + 4 * $x
      if ($bytes[$i + 3] -gt 30 -and ($bytes[$i] -lt 235 -or $bytes[$i + 1] -lt 235 -or $bytes[$i + 2] -lt 235)) { $n++ }
    }
    $tinta[$y] = $n
  }
  return ,$tinta
}

$patron = '^!\[(?<pie>[^\]]*)\]\((?<img>[^)]+\.png)\)\{\s*(?<attr>[^}]*)\}\s*$'
foreach ($md in $archivos) {
  $lineas = [System.IO.File]::ReadAllLines($md, $utf8)
  $nuevas = New-Object System.Collections.Generic.List[string]
  $cambios = 0
  foreach ($l in $lineas) {
    $m = [regex]::Match($l, $patron)
    if (-not $m.Success) { $nuevas.Add($l); continue }
    $ruta = Buscar $m.Groups['img'].Value
    if (-not $ruta) { $nuevas.Add($l); continue }
    $attr = $m.Groups['attr'].Value
    $ancho = $AnchoMax
    if ($attr -match 'width=(\d+)%') { $ancho = $AnchoMax * [double]$Matches[1] / 100 }
    elseif ($attr -match 'height=') { $nuevas.Add($l); continue }   # ya tiene alto fijo
    $bmp = New-Object System.Drawing.Bitmap $ruta
    try {
      $alto = $ancho * $bmp.Height / $bmp.Width
      if ($alto -le $AltoMax) { $nuevas.Add($l); continue }
      $cambios++
      if ($alto -le $AltoMax * 1.6) {
        $pct = [math]::Floor(100 * ($AltoMax * $bmp.Width / $bmp.Height) / $AnchoMax)
        $nuevas.Add(('![{0}]({1}){{ width={2}% }}' -f $m.Groups['pie'].Value, $m.Groups['img'].Value, $pct))
        continue
      }
      # Tramos a ancho completo: alto máximo de cada tramo en píxeles.
      $maxPx = [int][math]::Floor($bmp.Width * $AltoMax / $AnchoMax)
      $tinta = TintaPorFila $bmp
      $cortes = New-Object System.Collections.Generic.List[int]; $cortes.Add(0)
      $ini = 0
      while ($bmp.Height - $ini -gt $maxPx) {
        $mejor = $ini + $maxPx; $min = [int]::MaxValue
        for ($y = $ini + $maxPx; $y -ge $ini + [int]($maxPx * 0.6); $y--) {
          if ($tinta[$y] -lt $min) { $min = $tinta[$y]; $mejor = $y; if ($min -eq 0) { break } }
        }
        $cortes.Add($mejor); $ini = $mejor
      }
      $cortes.Add($bmp.Height)
      $n = $cortes.Count - 1
      $base = [System.IO.Path]::GetFileNameWithoutExtension($ruta)
      $pie = $m.Groups['pie'].Value -replace '\.\s*$', ''
      for ($k = 0; $k -lt $n; $k++) {
        $r = New-Object System.Drawing.Rectangle 0, $cortes[$k], $bmp.Width, ($cortes[$k + 1] - $cortes[$k])
        $tramo = $bmp.Clone($r, $bmp.PixelFormat)
        $archivo = '{0}-parte{1}.png' -f $base, ($k + 1)
        $tramo.Save((Join-Path $Salida $archivo), [System.Drawing.Imaging.ImageFormat]::Png); $tramo.Dispose()
        $nuevas.Add(('![{0} (parte {1} de {2}).]({3}){{ width=100% }}' -f $pie, ($k + 1), $n, $archivo))
        $nuevas.Add('')
      }
    } finally { $bmp.Dispose() }
  }
  if ($cambios -gt 0) {
    [System.IO.File]::WriteAllLines($md, $nuevas, $utf8)
    Write-Output ("{0}: {1} imagen(es) ajustada(s)" -f [System.IO.Path]::GetFileName($md), $cambios)
  }
}
