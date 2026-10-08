$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$htmlPath = Join-Path $scriptDir "index.html"
$fileUrl = "file:///" + ($htmlPath -replace '\\', '/')

$edgePaths = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
)

$chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
)

$launcher = $null
foreach ($p in $edgePaths) {
    if (Test-Path $p) { $launcher = $p; break }
}

if (-not $launcher) {
    foreach ($p in $chromePaths) {
        if (Test-Path $p) { $launcher = $p; break }
    }
}

if ($launcher) {
    Write-Host "Launching Eagle Eye Windows App Window..." -ForegroundColor Cyan
    Start-Process -FilePath $launcher -ArgumentList "--app=`"$fileUrl`" --window-size=1600,950"
} else {
    Write-Host "Opening in default browser..." -ForegroundColor Yellow
    Start-Process $htmlPath
}
