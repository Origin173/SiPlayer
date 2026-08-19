[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://127.0.0.1:8787',
  [string]$Query = '海阔天空',
  [string]$TrackId
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Get-Json([string]$Path) {
  return Invoke-RestMethod -Uri "$BaseUrl$Path" -Method Get -Headers @{ Accept = 'application/json' }
}

$health = Get-Json '/v1/health'
if ($health.data.status -ne 'ok') { throw 'Gateway health check failed.' }

$ready = Get-Json '/v1/ready'
if ($ready.data.status -ne 'ready') { throw 'Gateway readiness check failed.' }

$qr = Invoke-RestMethod -Uri "$BaseUrl/v1/auth/qr/start" -Method Post -Headers @{ Accept = 'application/json' }
if ([string]::IsNullOrWhiteSpace($qr.data.challengeId) -or $qr.data.qrImageDataUrl -notlike 'data:image/*') {
  throw 'QR auth contract check failed.'
}

if ([string]::IsNullOrWhiteSpace($TrackId)) {
  $encodedQuery = [Uri]::EscapeDataString($Query)
  $search = Get-Json "/v1/search?q=$encodedQuery&page=1&pageSize=5"
  $TrackId = [string]$search.data.items[0].id
}
if ([string]::IsNullOrWhiteSpace($TrackId)) { throw 'Search returned no playable track id.' }

$stream = Get-Json "/v1/tracks/$TrackId/stream?quality=auto"
if ([string]::IsNullOrWhiteSpace($stream.data.url) -or $stream.data.trackId -ne $TrackId) {
  throw 'Stream contract check failed.'
}

$lyrics = Get-Json "/v1/tracks/$TrackId/lyrics"
if ($null -eq $lyrics.data.lines -or $null -eq $lyrics.data.type) {
  throw 'Lyrics contract check failed.'
}

Write-Host "Gateway smoke passed: health, ready, QR, search, stream, lyrics ($TrackId)."
