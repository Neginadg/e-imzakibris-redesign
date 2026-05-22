Set-ExecutionPolicy -Scope Process Bypass -Force

$supabaseUrl = $env:SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
$workbookPath = 'C:\Users\gorkem\Desktop\e-imzakibris-redesign-main\eimza_import.xlsx'

if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
  throw 'Missing environment variable: SUPABASE_URL'
}

if ([string]::IsNullOrWhiteSpace($supabaseKey)) {
  throw 'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY'
}

$headers = @(
  'kayit_numarasi','kayit_tarihi','adi_soyadi','uyrugu','kimlik_pasaport_numarasi','dogum_tarihi','dogum_yeri','calistigi_sirket','gorevi','e_posta_adresi','e_posta_adresini_sertifikada_goster','adres','bolge','telefon_numarasi','cep_telefon_numarasi','faks_numarasi','fatura_adresi_ayniidir','calistigi_kurum','calistigi_kurum_adresi','calistigi_kurum_bolgesi','vergi_numarasi','vergi_dairesi','fatura_turu','sertifika_paketi','akilli_cubuk','uzak_baglantili_kurulum','sertifika_public_directory_consent','odeme_sekli','sertifika_ucreti_tl','akilli_cubuk_ucreti_tl','uzaktan_kurulum_ucreti_tl','kdv_dahil_toplam_tutar_tl','pin','puk','durum'
)

$excel = $null
$wb = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $wb = $excel.Workbooks.Open($workbookPath, $null, $true)
  $ws = $wb.Worksheets.Item(1)

  $row = 2
  $payload = [ordered]@{}
  for ($c = 1; $c -le $headers.Count; $c++) {
    $payload[$headers[$c - 1]] = ([string]$ws.UsedRange.Cells.Item($row, $c).Text).Trim()
  }

  $record = [ordered]@{
    full_name = $payload.adi_soyadi
    email = $payload.e_posta_adresi
    phone = $payload.cep_telefon_numarasi
    identity_number = $payload.kimlik_pasaport_numarasi
    payment_method = $payload.odeme_sekli
    source_page = 'eimza-kibris-import'
    payload = $payload
  }
  $record.payload.source_file_name = 'eimza_import.xlsx'
  $record.payload.source_row_number = $row

  $json = $record | ConvertTo-Json -Depth 8
  Write-Host 'REQUEST JSON:'
  Write-Host $json

  $response = Invoke-RestMethod -Method Post -Uri ($supabaseUrl + '/rest/v1/applications') -Headers @{
    apikey = $supabaseKey
    Authorization = 'Bearer ' + $supabaseKey
    Prefer = 'return=representation'
  } -ContentType 'application/json' -Body $json

  Write-Host 'SUCCESS:'
  $response | ConvertTo-Json -Depth 8
}
catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host ('STATUS: ' + [int]$resp.StatusCode)
    Write-Host ($reader.ReadToEnd())
  } else {
    Write-Host ('ERROR: ' + $_.Exception.Message)
  }
}
finally {
  if ($wb) { $wb.Close($false) | Out-Null }
  if ($excel) { $excel.Quit() | Out-Null }
  if ($wb) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) }
  if ($excel) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
}