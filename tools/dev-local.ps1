$ErrorActionPreference = "Stop"

Write-Host "[SimpleWay Drawing] Local Recovery Bootstrap" -ForegroundColor Yellow

$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/simpleway_drawing"
$env:NEXT_PUBLIC_APP_URL = "http://localhost:3000"
$env:AUTH_SECRET = "simpleway-drawing-local-auth-secret-2026"
$env:STORAGE_ENDPOINT = "http://127.0.0.1:9000"
$env:STORAGE_REGION = "us-east-1"
$env:STORAGE_BUCKET = "simpleway-drawing-local"
$env:STORAGE_ACCESS_KEY = "simpleway"
$env:STORAGE_SECRET_KEY = "simpleway-local-secret"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop / docker CLI não encontrado. Instale ou inicie o Docker Desktop antes de executar o bootstrap local."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm não encontrado. Instale pnpm@10.15.0 antes de continuar."
}

Write-Host "[1/4] Subindo PostgreSQL + MinIO..." -ForegroundColor Cyan
docker compose -f docker-compose.local.yml up -d

Write-Host "[2/4] Aguardando PostgreSQL..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  docker compose -f docker-compose.local.yml exec -T postgres pg_isready -U postgres -d simpleway_drawing *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $ready) { throw "PostgreSQL local não ficou pronto." }

Write-Host "[3/4] Aplicando migrations..." -ForegroundColor Cyan
pnpm db:migrate
if ($LASTEXITCODE -ne 0) { throw "Migration local falhou." }

Write-Host "[4/4] Iniciando app..." -ForegroundColor Cyan
Write-Host "App: http://localhost:3000" -ForegroundColor Green
Write-Host "MinIO Console: http://localhost:9001" -ForegroundColor DarkGray
Write-Host "Ctrl+C encerra o Next.js; use 'docker compose -f docker-compose.local.yml down' para parar a infraestrutura." -ForegroundColor DarkGray

pnpm --filter @swd/web dev
