<#
  make-reference.ps1 — genera un reference.docx "académico" para pandoc.

  Transforma el data-file por defecto de pandoc en una plantilla con:
    - Tipografía serif Cambria (cuerpo 11pt, justificado, interlineado 1.15).
    - Títulos jerarquizados en navy (#1E3A5F, cohesionado con el diagrama),
      con salto de página y filete inferior en Heading 1.
    - Portada (Title/Subtitle/Author/Date) centrada y sobria.
    - Página A4, márgenes 2,5 cm y numeración de páginas centrada en el pie.

  Sin dependencias externas (PowerShell + .NET). Reemplaza al viejo
  make-reference.py (Python no está garantizado en las PC del equipo).

  Uso (desde la raíz del repo, con pandoc en PATH o en %LOCALAPPDATA%\Pandoc):
    powershell -ExecutionPolicy Bypass -File "07-Entregables/build/make-reference.ps1"
  Opcional: -Pandoc <ruta> -OutFile <ruta reference.docx>
#>
[CmdletBinding()]
param(
  [string]$Pandoc,
  [string]$OutFile
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

# --- Localizar pandoc ---
if (-not $Pandoc) {
  $cmd = Get-Command pandoc -ErrorAction SilentlyContinue
  if ($cmd) { $Pandoc = $cmd.Source }
  elseif (Test-Path "$env:LOCALAPPDATA\Pandoc\pandoc.exe") { $Pandoc = "$env:LOCALAPPDATA\Pandoc\pandoc.exe" }
  elseif (Test-Path "$env:ProgramFiles\Pandoc\pandoc.exe") { $Pandoc = "$env:ProgramFiles\Pandoc\pandoc.exe" }
  else { throw "No se encontró pandoc. Instalar: winget install --id JohnMacFarlane.Pandoc" }
}
if (-not $OutFile) {
  $OutFile = Join-Path $PSScriptRoot 'reference.docx'
}

# --- Generar el data-file por defecto ---
# (pandoc escribe el .docx binario por stdout; se redirige con Start-Process para
#  no corromperlo, ya que PowerShell decodifica stdout como texto.)
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("ref_" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$default = Join-Path $tmp 'default.docx'
$p = Start-Process -FilePath $Pandoc -ArgumentList '--print-default-data-file','reference.docx' `
      -RedirectStandardOutput $default -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0 -or -not (Test-Path $default) -or (Get-Item $default).Length -eq 0) {
  throw "pandoc no pudo generar el data-file (exit $($p.ExitCode))."
}

# --- Leer todas las entradas del zip a memoria ---
$enc = New-Object System.Text.UTF8Encoding($false)
$zin = [System.IO.Compression.ZipFile]::OpenRead($default)
$entries = @{}
$order = @()
foreach ($e in $zin.Entries) {
  $ms = New-Object System.IO.MemoryStream
  $s = $e.Open(); $s.CopyTo($ms); $s.Close()
  $entries[$e.FullName] = $ms.ToArray()
  $order += $e.FullName
}
$zin.Dispose()

function Get-Text($name) { return $enc.GetString($entries[$name]) }
function Set-Text($name, $text) { $script:entries[$name] = $enc.GetBytes($text) }

$NAVY  = '1E3A5F'   # títulos / Heading 1
$NAVY2 = '2A4A6B'   # Heading 2
$NAVY3 = '3A5A7B'   # Heading 3
$MUTE  = '5B6B7B'   # subtítulo / fecha

# --- styles.xml: reemplazar bloques completos por versiones bien formadas ---
$st = Get-Text 'word/styles.xml'

$docDefaults = @"
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:sz w:val="22" /><w:szCs w:val="22" /><w:lang w:val="es-AR" w:eastAsia="es-AR" w:bidi="ar-SA" /></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto" /><w:jc w:val="both" /></w:pPr></w:pPrDefault></w:docDefaults>
"@

$sTitle = @"
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:link w:val="TitleChar" /><w:uiPriority w:val="10" /><w:qFormat /><w:pPr><w:spacing w:before="240" w:after="80" w:line="240" w:lineRule="auto" /><w:contextualSpacing /><w:jc w:val="center" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:b /><w:color w:val="$NAVY" /><w:sz w:val="48" /><w:szCs w:val="48" /></w:rPr></w:style>
"@

$sSubtitle = @"
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:link w:val="SubtitleChar" /><w:uiPriority w:val="11" /><w:qFormat /><w:pPr><w:spacing w:after="160" /><w:contextualSpacing /><w:jc w:val="center" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:i /><w:color w:val="$MUTE" /><w:sz w:val="30" /><w:szCs w:val="30" /></w:rPr></w:style>
"@

$sAuthor = @"
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Author"><w:name w:val="Author" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:qFormat /><w:pPr><w:keepNext /><w:spacing w:after="40" /><w:contextualSpacing /><w:jc w:val="center" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:color w:val="333333" /><w:sz w:val="26" /><w:szCs w:val="26" /></w:rPr></w:style>
"@

$sDate = @"
<w:style w:type="paragraph" w:styleId="Date"><w:name w:val="Date" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:qFormat /><w:pPr><w:spacing w:before="120" /><w:jc w:val="center" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:color w:val="$MUTE" /><w:sz w:val="24" /><w:szCs w:val="24" /></w:rPr></w:style>
"@

$sH1 = @"
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:link w:val="Heading1Char" /><w:uiPriority w:val="9" /><w:qFormat /><w:pPr><w:keepNext /><w:keepLines /><w:pageBreakBefore /><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="$NAVY" /></w:pBdr><w:spacing w:before="0" w:after="220" /><w:jc w:val="left" /><w:outlineLvl w:val="0" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:b /><w:color w:val="$NAVY" /><w:sz w:val="34" /><w:szCs w:val="34" /></w:rPr></w:style>
"@

$sH2 = @"
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:link w:val="Heading2Char" /><w:uiPriority w:val="9" /><w:qFormat /><w:pPr><w:keepNext /><w:keepLines /><w:spacing w:before="240" w:after="80" /><w:jc w:val="left" /><w:outlineLvl w:val="1" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:b /><w:color w:val="$NAVY2" /><w:sz w:val="27" /><w:szCs w:val="27" /></w:rPr></w:style>
"@

$sH3 = @"
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3" /><w:basedOn w:val="Normal" /><w:next w:val="BodyText" /><w:link w:val="Heading3Char" /><w:uiPriority w:val="9" /><w:qFormat /><w:pPr><w:keepNext /><w:keepLines /><w:spacing w:before="160" w:after="60" /><w:jc w:val="left" /><w:outlineLvl w:val="2" /></w:pPr><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria" /><w:b /><w:i /><w:color w:val="$NAVY3" /><w:sz w:val="24" /><w:szCs w:val="24" /></w:rPr></w:style>
"@

$sBody = @"
<w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text" /><w:basedOn w:val="Normal" /><w:link w:val="BodyTextChar" /><w:qFormat /><w:pPr><w:spacing w:before="0" w:after="140" w:line="264" w:lineRule="auto" /><w:jc w:val="both" /></w:pPr></w:style>
"@

$rs = @(
  @('(?s)<w:docDefaults>.*?</w:docDefaults>', $docDefaults),
  @('(?s)<w:style w:type="paragraph" w:styleId="Title">.*?</w:style>', $sTitle),
  @('(?s)<w:style w:type="paragraph" w:styleId="Subtitle">.*?</w:style>', $sSubtitle),
  @('(?s)<w:style w:type="paragraph" w:customStyle="1" w:styleId="Author">.*?</w:style>', $sAuthor),
  @('(?s)<w:style w:type="paragraph" w:styleId="Date">.*?</w:style>', $sDate),
  @('(?s)<w:style w:type="paragraph" w:styleId="Heading1">.*?</w:style>', $sH1),
  @('(?s)<w:style w:type="paragraph" w:styleId="Heading2">.*?</w:style>', $sH2),
  @('(?s)<w:style w:type="paragraph" w:styleId="Heading3">.*?</w:style>', $sH3),
  @('(?s)<w:style w:type="paragraph" w:styleId="BodyText">.*?</w:style>', $sBody)
)
foreach ($r in $rs) {
  $rx = [regex]$r[0]
  if (-not $rx.IsMatch($st)) { throw "Patrón no encontrado en styles.xml: $($r[0].Substring(0,60))" }
  $st = $rx.Replace($st, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $r[1] }, 1)
}
Set-Text 'word/styles.xml' $st

# --- document.xml: sectPr con footer, A4 y márgenes ---
$doc = Get-Text 'word/document.xml'
$sectPr = @"
<w:sectPr><w:footerReference w:type="default" r:id="rId40" /><w:footnotePr><w:numRestart w:val="eachSect" /></w:footnotePr><w:pgSz w:w="11906" w:h="16838" /><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="708" w:footer="708" w:gutter="0" /></w:sectPr>
"@
$rxSect = [regex]'(?s)<w:sectPr>.*?</w:sectPr>'
if (-not $rxSect.IsMatch($doc)) { throw "No se encontró <w:sectPr> en document.xml" }
$doc = $rxSect.Replace($doc, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $sectPr }, 1)
Set-Text 'word/document.xml' $doc

# --- footer1.xml: numeración de páginas centrada ---
$footer = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr><w:jc w:val="center" /></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" /><w:color w:val="808080" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t xml:space="preserve">— </w:t></w:r><w:r><w:rPr><w:color w:val="808080" /><w:sz w:val="18" /></w:rPr><w:fldChar w:fldCharType="begin" /></w:r><w:r><w:rPr><w:color w:val="808080" /><w:sz w:val="18" /></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="808080" /><w:sz w:val="18" /></w:rPr><w:fldChar w:fldCharType="end" /></w:r><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" /><w:color w:val="808080" /><w:sz w:val="18" /><w:szCs w:val="18" /></w:rPr><w:t xml:space="preserve"> —</w:t></w:r></w:p></w:ftr>
"@
Set-Text 'word/footer1.xml' $footer

# --- registrar el footer en rels y content-types ---
$rels = Get-Text 'word/_rels/document.xml.rels'
$rels = $rels -replace '</Relationships>', '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Id="rId40" Target="footer1.xml" /></Relationships>'
Set-Text 'word/_rels/document.xml.rels' $rels

$ct = Get-Text '[Content_Types].xml'
$ct = $ct -replace '</Types>', '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml" /></Types>'
Set-Text '[Content_Types].xml' $ct

if (-not ($order -contains 'word/footer1.xml')) { $order += 'word/footer1.xml' }

# --- reescribir el zip ---
if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
$fs = [System.IO.File]::Open($OutFile, [System.IO.FileMode]::CreateNew)
$zout = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
foreach ($name in $order) {
  $entry = $zout.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
  $os = $entry.Open()
  $bytes = $entries[$name]
  $os.Write($bytes, 0, $bytes.Length)
  $os.Close()
}
$zout.Dispose()
$fs.Close()

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "OK -> $OutFile"
