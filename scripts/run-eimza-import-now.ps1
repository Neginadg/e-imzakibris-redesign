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

function Send-Batch {
  param([object[]]$Rows)

  if (-not $Rows -or $Rows.Count -eq 0) {
    return
  }

  $json = $Rows | ConvertTo-Json -Depth 8
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  Invoke-RestMethod -Method Post -Uri ($supabaseUrl.TrimEnd('/') + '/rest/v1/applications') -Headers @{
    apikey = $supabaseKey
    Authorization = 'Bearer ' + $supabaseKey
    Prefer = 'return=minimal'
  } -ContentType 'application/json; charset=utf-8' -Body $jsonBytes | Out-Null
}

Write-Host 'Starting E-imza workbook import...'

$excel = $null
$wb = $null

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $wb = $excel.Workbooks.Open($workbookPath, $null, $true)
  $ws = $wb.Worksheets.Item(1)
  $range = $ws.UsedRange

  if ($range.Columns.Count -ne $headers.Count) {
    throw "Expected $($headers.Count) columns but found $($range.Columns.Count)"
  }

  $sourceFileName = [System.IO.Path]::GetFileName($workbookPath)
  $batch = New-Object System.Collections.Generic.List[object]
  $total = 0

  for ($r = 2; $r -le $range.Rows.Count; $r++) {
    $payload = [ordered]@{}
    $hasValue = $false

    for ($c = 1; $c -le $headers.Count; $c++) {
      $value = ([string]$range.Cells.Item($r, $c).Text).Trim()
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        $hasValue = $true
      }
      $payload[$headers[$c - 1]] = $value
    }

    if (-not $hasValue) {
      continue
    }

    $record = [ordered]@{
      full_name = $payload.adi_soyadi
      email = $payload.e_posta_adresi
      phone = if (-not [string]::IsNullOrWhiteSpace($payload.cep_telefon_numarasi)) { $payload.cep_telefon_numarasi } else { $payload.telefon_numarasi }
      identity_number = $payload.kimlik_pasaport_numarasi
      pin = $payload.pin
      puk = $payload.puk
      payment_method = $payload.odeme_sekli
      source_page = 'eimza-kibris-import'
      payload = $payload
    }

    $record.payload.source_file_name = $sourceFileName
    $record.payload.source_row_number = $r

    if ([string]::IsNullOrWhiteSpace($record.full_name) -and [string]::IsNullOrWhiteSpace($record.email)) {
      continue
    }

    [void]$batch.Add([pscustomobject]$record)

    if ($batch.Count -ge 250) {
      Send-Batch -Rows $batch.ToArray()
      $total += $batch.Count
      Write-Host ("Imported {0} rows" -f $total)
      $batch.Clear()
    }
  }

  if ($batch.Count -gt 0) {
    Send-Batch -Rows $batch.ToArray()
    $total += $batch.Count
    Write-Host ("Imported {0} rows" -f $total)
  }

  Write-Host ("DONE {0}" -f $total)
}
catch {
  Write-Host ('ERROR: ' + $_.Exception.Message)
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    Write-Host ('HTTP STATUS: ' + [int]$resp.StatusCode)
    Write-Host $reader.ReadToEnd()
  }
}
finally {
  if ($wb) {
    $wb.Close($false) | Out-Null
  }

  if ($excel) {
    $excel.Quit() | Out-Null
  }

  if ($wb) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
  }

  if ($excel) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}