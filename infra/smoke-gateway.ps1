[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://127.0.0.1:8787',
  [string]$Query = '海阔天空',
  [string]$TrackId,
  [string]$PlaylistId,
  [switch]$IncludeQr,
  [switch]$SkipNegativeChecks,
  [int]$TimeoutSec = 15
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$checks = [System.Collections.Generic.List[string]]::new()

function Add-Check([string]$Name) {
  $checks.Add($Name) | Out-Null
}

function Encode([string]$Value) {
  return [Uri]::EscapeDataString($Value)
}

function Invoke-JsonResponse {
  param(
    [Parameter(Mandatory)]
    [string]$Path,
    [ValidateSet('Get', 'Post')]
    [string]$Method = 'Get',
    [string]$Body
  )

  $request = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    Headers = @{ Accept = 'application/json' }
    TimeoutSec = $TimeoutSec
    SkipHttpErrorCheck = $true
  }
  if ($PSBoundParameters.ContainsKey('Body')) {
    $request.Body = $Body
    $request.ContentType = 'application/json'
  }

  try {
    $response = Invoke-WebRequest @request
  } catch {
    throw "Request $Method $Path failed: $($_.Exception.Message)"
  }

  $payload = $null
  if (-not [string]::IsNullOrWhiteSpace($response.Content)) {
    try {
      $payload = $response.Content | ConvertFrom-Json -Depth 30
    } catch {
      throw "Request $Method $Path returned invalid JSON (HTTP $($response.StatusCode))."
    }
  }

  return [pscustomobject]@{
    StatusCode = [int]$response.StatusCode
    Body = $payload
  }
}

function Assert-RequestId($Response, [string]$Name) {
  if ($null -eq $Response.Body -or [string]::IsNullOrWhiteSpace([string]$Response.Body.requestId)) {
    throw "$Name response is missing requestId."
  }
}

function Assert-Success($Response, [string]$Name) {
  if ($Response.StatusCode -lt 200 -or $Response.StatusCode -ge 300) {
    throw "$Name expected HTTP 2xx but received HTTP $($Response.StatusCode)."
  }
  Assert-RequestId $Response $Name
  if ($null -eq $Response.Body.data) {
    throw "$Name response is missing data."
  }
  return $Response.Body.data
}

function Assert-Error($Response, [string]$Name, [int]$ExpectedStatus, [string]$ExpectedCode) {
  if ($Response.StatusCode -ne $ExpectedStatus) {
    throw "$Name expected HTTP $ExpectedStatus but received HTTP $($Response.StatusCode)."
  }
  Assert-RequestId $Response $Name
  if ($null -eq $Response.Body.error) {
    throw "$Name response is missing error."
  }
  if ([string]$Response.Body.error.code -ne $ExpectedCode) {
    throw "$Name expected error code $ExpectedCode but received $($Response.Body.error.code)."
  }
}

function Assert-HttpUrl([string]$Value, [string]$Name) {
  $uri = $null
  if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -notin @('http', 'https')) {
    throw "$Name is not an absolute HTTP(S) URL."
  }
}

try {
  $health = Assert-Success (Invoke-JsonResponse -Path '/v1/health') 'health'
  if ([string]$health.status -ne 'ok') { throw 'Health status is not ok.' }
  Add-Check 'health'

  $ready = Assert-Success (Invoke-JsonResponse -Path '/v1/ready') 'ready'
  if ([string]$ready.status -ne 'ready' -or [string]$ready.upstream -ne 'available') {
    throw "Gateway is not ready with an available upstream (status=$($ready.status), upstream=$($ready.upstream))."
  }
  Add-Check 'ready/upstream'

  if ($IncludeQr) {
    $qr = Assert-Success (Invoke-JsonResponse -Path '/v1/auth/qr/start' -Method Post -Body '{}') 'qr start'
    if ([string]::IsNullOrWhiteSpace([string]$qr.challengeId) -or [string]$qr.qrImageDataUrl -notlike 'data:image/*') {
      throw 'QR auth contract check failed.'
    }
    Add-Check 'qr start'
  } else {
    Write-Host 'SKIP qr start (pass -IncludeQr to require the unauthenticated QR contract).'
  }

  $encodedQuery = Encode $Query
  $search = Assert-Success (Invoke-JsonResponse -Path "/v1/search?q=$encodedQuery&type=track&page=1&pageSize=5") 'track search'
  if ($null -eq $search.items -or $null -eq $search.page -or $null -eq $search.hasMore) {
    throw 'Track search contract is missing items, page, or hasMore.'
  }
  Add-Check "track search ($($search.items.Count) items)"

  if ([string]::IsNullOrWhiteSpace($TrackId)) {
    $selected = @($search.items | Where-Object {
      $_.playable -eq $true -and -not [string]::IsNullOrWhiteSpace([string]$_.id)
    } | Select-Object -First 1)
    if ($selected.Count -eq 0) { throw 'Search returned no playable track id.' }
    $TrackId = [string]$selected[0].id
  }
  if ([string]::IsNullOrWhiteSpace($TrackId)) { throw 'TrackId is empty.' }
  $encodedTrackId = Encode $TrackId

  $track = Assert-Success (Invoke-JsonResponse -Path "/v1/tracks/$encodedTrackId") 'track detail'
  if ([string]$track.id -ne $TrackId -or [string]::IsNullOrWhiteSpace([string]$track.name)) {
    throw 'Track detail contract check failed.'
  }
  Add-Check 'track detail'

  $stream = Assert-Success (Invoke-JsonResponse -Path "/v1/tracks/$encodedTrackId/stream?quality=auto") 'stream'
  if ([string]$stream.trackId -ne $TrackId -or [string]::IsNullOrWhiteSpace([string]$stream.url)) {
    throw 'Stream contract check failed.'
  }
  Assert-HttpUrl ([string]$stream.url) 'stream.data.url'
  Add-Check 'stream'

  $lyrics = Assert-Success (Invoke-JsonResponse -Path "/v1/tracks/$encodedTrackId/lyrics") 'lyrics'
  if ($null -eq $lyrics.lines -or [string]::IsNullOrWhiteSpace([string]$lyrics.type)) {
    throw 'Lyrics contract check failed.'
  }
  Add-Check 'lyrics'

  if ([string]::IsNullOrWhiteSpace($PlaylistId)) {
    Write-Host 'SKIP playlist detail (pass -PlaylistId to verify a real playlist).'
  } else {
    $encodedPlaylistId = Encode $PlaylistId
    $playlist = Assert-Success (Invoke-JsonResponse -Path "/v1/playlists/$encodedPlaylistId") 'playlist detail'
    if ([string]$playlist.id -ne $PlaylistId -or [string]::IsNullOrWhiteSpace([string]$playlist.name) -or $null -eq $playlist.tracks) {
      throw 'Playlist detail contract check failed.'
    }
    Add-Check 'playlist detail'
  }

  if ($SkipNegativeChecks) {
    Write-Host 'SKIP negative Gateway contract checks.'
  } else {
    $emptySearch = Invoke-JsonResponse -Path '/v1/search?q=&type=track&page=1&pageSize=5'
    Assert-Error $emptySearch 'empty search' 400 'VALIDATION_ERROR'
    Add-Check 'empty search -> 400'

    $invalidQuality = Invoke-JsonResponse -Path "/v1/tracks/$encodedTrackId/stream?quality=not-a-quality"
    Assert-Error $invalidQuality 'invalid quality' 400 'VALIDATION_ERROR'
    Add-Check 'invalid quality -> 400'
  }

  Write-Host "Gateway smoke passed: $($checks -join ', ')"
  Write-Host "TrackId: $TrackId"
} catch {
  Write-Error $_
  if ($checks.Count -gt 0) {
    Write-Host "Completed before failure: $($checks -join ', ')" -ForegroundColor Yellow
  }
  exit 1
}
