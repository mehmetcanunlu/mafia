param(
    [int]$Port = 5500,
    [string]$Root = ".\public"
)

$ErrorActionPreference = "Stop"
$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

function Get-ContentType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8" }
        ".css"  { "text/css; charset=utf-8" }
        ".js"   { "application/javascript; charset=utf-8" }
        ".json" { "application/json; charset=utf-8" }
        ".png"  { "image/png" }
        ".jpg"  { "image/jpeg" }
        ".jpeg" { "image/jpeg" }
        ".gif"  { "image/gif" }
        ".svg"  { "image/svg+xml" }
        ".ico"  { "image/x-icon" }
        ".woff" { "font/woff" }
        ".woff2" { "font/woff2" }
        ".ttf"  { "font/ttf" }
        default { "application/octet-stream" }
    }
}

function Write-Status([System.Net.HttpListenerResponse]$Response, [int]$Code, [string]$Message) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Message)
    $Response.StatusCode = $Code
    $Response.ContentType = "text/plain; charset=utf-8"
    $Response.ContentLength64 = $bytes.Length
    $Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $Response.OutputStream.Close()
}

$listener.Start()
Write-Host "Serving '$resolvedRoot' at $prefix"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))
        if ([string]::IsNullOrWhiteSpace($requestPath)) {
            $requestPath = "index.html"
        }

        $targetPath = Join-Path $resolvedRoot $requestPath
        if (Test-Path -LiteralPath $targetPath -PathType Container) {
            $targetPath = Join-Path $targetPath "index.html"
        }

        $resolvedTarget = Resolve-Path -LiteralPath $targetPath -ErrorAction SilentlyContinue
        if (-not $resolvedTarget) {
            Write-Status -Response $context.Response -Code 404 -Message "Not Found"
            continue
        }

        $finalPath = $resolvedTarget.Path
        if (-not $finalPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            Write-Status -Response $context.Response -Code 403 -Message "Forbidden"
            continue
        }

        if (-not (Test-Path -LiteralPath $finalPath -PathType Leaf)) {
            Write-Status -Response $context.Response -Code 404 -Message "Not Found"
            continue
        }

        $bytes = [System.IO.File]::ReadAllBytes($finalPath)
        $context.Response.StatusCode = 200
        $context.Response.ContentType = Get-ContentType -Path $finalPath
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $context.Response.OutputStream.Close()
    }
}
finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
