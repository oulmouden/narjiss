$ErrorActionPreference = "Stop"

$base = "C:\xampp\htdocs\narjiss\mimosas-report\multilang"
$files = @(
  "rapport-investisseur-hotel-mimosas-fr",
  "rapport-investisseur-hotel-mimosas-en",
  "rapport-investisseur-hotel-mimosas-ar",
  "rapport-investisseur-hotel-mimosas-es"
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  foreach ($name in $files) {
    $docx = Join-Path $base "$name.docx"
    $pdf = Join-Path $base "$name.pdf"
    $doc = $word.Documents.Open($docx)
    $doc.ExportAsFixedFormat($pdf, 17)
    $doc.Close($false)
    Write-Output $pdf
  }
}
finally {
  $word.Quit()
}
