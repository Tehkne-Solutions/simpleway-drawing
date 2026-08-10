$ErrorActionPreference = "Stop"

Write-Host "[SimpleWay Drawing] UI Inspection Mode" -ForegroundColor Yellow
Write-Host "Modo visual sem PostgreSQL/MinIO. Persistencia e uploads permanecem indisponiveis." -ForegroundColor DarkYellow

$env:NEXT_PUBLIC_APP_URL = "http://localhost:3000"
$env:AUTH_SECRET = "simpleway-drawing-local-ui-auth-secret-2026"
$env:SWD_LOCAL_UI_ONLY = "1"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm nao encontrado. Instale pnpm@10.15.0 antes de continuar."
}

Write-Host "Iniciando Next.js em http://localhost:3000" -ForegroundColor Green
Write-Host "Use este modo apenas para auditoria visual. Para modulos completos, execute tools/dev-local.ps1 com Docker Desktop ativo." -ForegroundColor DarkGray

pnpm --filter @swd/web dev
