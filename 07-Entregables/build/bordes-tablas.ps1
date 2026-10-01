# Agrega bordes simples (negros, 1/2 pt) a los cuadros de un .docx generado por pandoc.
# Lo llama build-pc1.sh después de armar el documento principal (revisión de Paloma, 01/10/26).
# -Excluir: texto de la primera fila de los cuadros que quedan sin bordes.
param(
  [Parameter(Mandatory = $true)][string]$Docx,
  [string[]]$Excluir = @()
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$bordes = '<w:tblBorders>' + ((@('top', 'left', 'bottom', 'right', 'insideH', 'insideV') |
  ForEach-Object { "<w:$_ w:val=`"single`" w:sz=`"4`" w:space=`"0`" w:color=`"auto`" />" }) -join '') + '</w:tblBorders>'

$zip = [System.IO.Compression.ZipFile]::Open($Docx, 'Update')
try {
  $entrada = $zip.GetEntry('word/document.xml')
  $lector = New-Object System.IO.StreamReader($entrada.Open(), [System.Text.Encoding]::UTF8)
  $xml = $lector.ReadToEnd(); $lector.Close()

  $n = 0
  $xml = [regex]::Replace($xml, '(?s)<w:tbl>.*?</w:tbl>', {
    param($m)
    $t = $m.Value
    $fila = [regex]::Match($t, '(?s)<w:tr[ >].*?</w:tr>').Value
    $texto = [regex]::Replace($fila, '<[^>]+>', '')
    foreach ($e in $Excluir) { if ($texto.StartsWith($e)) { return $t } }
    if ($t.Contains('<w:tblBorders')) { return $t }
    $script:n++
    # tblBorders va antes de tblLayout / tblCellMar / tblLook (orden del esquema OOXML).
    return ([regex]'(<w:tblLayout|<w:tblCellMar|<w:tblLook|</w:tblPr>)').Replace($t, "$bordes`$1", 1)
  })

  $entrada.Delete()
  $nueva = $zip.CreateEntry('word/document.xml')
  $escritor = New-Object System.IO.StreamWriter($nueva.Open(), (New-Object System.Text.UTF8Encoding($false)))
  $escritor.Write($xml); $escritor.Close()
  Write-Output "Bordes agregados a $n cuadros."
} finally {
  $zip.Dispose()
}
