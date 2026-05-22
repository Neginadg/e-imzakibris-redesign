param(
  [string]$WorkbookPath = 'C:\Users\gorkem\Downloads\E-imza KIBRIS Başvuru Formları (13.05.2026).xlsx',
  [string]$TableName = 'eimza_kibris_applications_2026',
  [int]$BatchSize = 500
)

$ErrorActionPreference = 'Stop'

function Get-RequiredEnvValue {
  param([string]$Name)

  $value = [System.Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing environment variable: $Name"
  }

  return $value
}

function Normalize-CellText {
  param($Value)

  if ($null -eq $Value) {
    return ''
  }

  return ([string]$Value).Trim()
}

function Send-BatchToSupabase {
  param(
    [array]$Rows,
    [string]$SupabaseUrl,
    [string]$SupabaseServiceRoleKey,
    [string]$TargetTable
  )

  if (-not $Rows -or $Rows.Count -eq 0) {
    return
  }

  $endpoint = $SupabaseUrl.TrimEnd('/') + '/rest/v1/' + $TargetTable + '?on_conflict=source_file_name,source_row_number'
  $headers = @{
    apikey = $SupabaseServiceRoleKey
    Authorization = 'Bearer ' + $SupabaseServiceRoleKey
    Prefer = 'resolution=merge-duplicates,return=minimal'
  }

  $json = $Rows | ConvertTo-Json -Depth 8

  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $jsonBytes | Out-Null
}

$supabaseUrl = Get-RequiredEnvValue -Name 'SUPABASE_URL'
$supabaseServiceRoleKey = Get-RequiredEnvValue -Name 'SUPABASE_SERVICE_ROLE_KEY'

$columnNames = @(
  'kayit_numarasi',
  'kayit_tarihi',
  'adi_soyadi',
  'uyrugu',
  'kimlik_pasaport_numarasi',
  'dogum_tarihi',
  'dogum_yeri',
  'calistigi_sirket',
  'gorevi',
  'e_posta_adresi',
  'e_posta_adresini_sertifikada_goster',
  'adres',
  'bolge',
  'telefon_numarasi',
  'cep_telefon_numarasi',
  'faks_numarasi',
  'fatura_adresi_ayniidir',
  'calistigi_kurum',
  'calistigi_kurum_adresi',
  'calistigi_kurum_bolgesi',
  'vergi_numarasi',
  'vergi_dairesi',
  'fatura_turu',
  'sertifika_paketi',
  'akilli_cubuk',
  'uzak_baglantili_kurulum',
  'sertifika_public_directory_consent',
  'odeme_sekli',
  'sertifika_ucreti_tl',
  'akilli_cubuk_ucreti_tl',
  'uzaktan_kurulum_ucreti_tl',
  'kdv_dahil_toplam_tutar_tl',
  'pin',
  'puk',
  'durum'
)

$excel = $null
$workbook = $null

try {
  if (-not (Test-Path -LiteralPath $WorkbookPath)) {
    throw "Workbook not found: $WorkbookPath"
  }

  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($WorkbookPath, $null, $true)
  $worksheet = $workbook.Worksheets.Item(1)
  $usedRange = $worksheet.UsedRange

  if ($usedRange.Columns.Count -ne $columnNames.Count) {
    throw "Expected $($columnNames.Count) columns but found $($usedRange.Columns.Count)."
  }

  $sourceFileName = [System.IO.Path]::GetFileName($WorkbookPath)
  $batch = New-Object System.Collections.Generic.List[object]
  $importedCount = 0

  for ($rowIndex = 2; $rowIndex -le $usedRange.Rows.Count; $rowIndex += 1) {
    $record = [ordered]@{
      source_file_name = $sourceFileName
      source_row_number = $rowIndex
      payload = [ordered]@{}
    }

    $hasValue = $false

    for ($columnIndex = 1; $columnIndex -le $columnNames.Count; $columnIndex += 1) {
      $columnName = $columnNames[$columnIndex - 1]
      $cellText = Normalize-CellText -Value $usedRange.Cells.Item($rowIndex, $columnIndex).Text

      if (-not [string]::IsNullOrWhiteSpace($cellText)) {
        $hasValue = $true
      }

      $record[$columnName] = $cellText
      $record.payload[$columnName] = $cellText
    }

    if (-not $hasValue) {
      continue
    }

    $record.payload.source_file_name = $sourceFileName
    $record.payload.source_row_number = $rowIndex

    [void]$batch.Add([pscustomobject]$record)

    if ($batch.Count -ge $BatchSize) {
      Send-BatchToSupabase -Rows $batch.ToArray() -SupabaseUrl $supabaseUrl -SupabaseServiceRoleKey $supabaseServiceRoleKey -TargetTable $TableName
      $importedCount += $batch.Count
      Write-Host ("Imported {0} rows..." -f $importedCount)
      $batch.Clear()
    }
  }

  if ($batch.Count -gt 0) {
    Send-BatchToSupabase -Rows $batch.ToArray() -SupabaseUrl $supabaseUrl -SupabaseServiceRoleKey $supabaseServiceRoleKey -TargetTable $TableName
    $importedCount += $batch.Count
  }

  Write-Host ("Done. Imported {0} rows into {1}." -f $importedCount, $TableName)
}
finally {
  if ($workbook) {
    $workbook.Close($false) | Out-Null
  }

  if ($excel) {
    $excel.Quit() | Out-Null
  }

  if ($workbook) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }

  if ($excel) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}