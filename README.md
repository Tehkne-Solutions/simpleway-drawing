# SimpleWay Drawing

Plataforma HNK/Tehkné para formação artística completa por meio de aprendizagem estruturada, prática deliberada, evidências de domínio, criação e evolução contínua.

## Produto

O SimpleWay Drawing começa levando uma pessoa sem experiência do primeiro traço à construção consciente de formas e volumes. A evolução posterior inclui Mangá, Comic, Realismo, estilo próprio, portfólio, comunidade e caminhos profissionais.

## Foundation Alpha

O primeiro arco pedagógico cobre:

- C0 — I Can Draw
- C1 — Control
- C2 — Learn to See
- C3 — Shape
- C4 — Form
- Alpha Capstone — Observe → Build → Create
- Drawing Zero Before/After e Graduation Summary

A jornada canônica é retomável e validada ponta a ponta: `ONBOARDING → DRAWING_ZERO → FIRST_LESSON → FIRST_PRACTICE → FOUNDATION → ALPHA_GATE → COMPLETE`.

## Closed Alpha

O produto inclui operação de Closed Alpha com:

- convites e cohorts;
- consentimento versionado e export de dados do participante;
- Control Center operacional;
- acompanhamento de ativação e conclusão;
- fila explicável de intervenção;
- feedback agregado por cohort;
- testes E2E sobre PostgreSQL e object storage S3-compatible reais no CI.

## Release Candidate

Antes de promover um deploy a Release Candidate, o CI principal deve estar verde. Depois do deploy, execute o workflow manual **Release Candidate Verification** informando a URL HTTPS publicada.

O gate remoto valida, sem depender de acesso administrativo no browser:

- `/api/health` e headers de segurança;
- `/api/ready` e conectividade real com PostgreSQL;
- identidade do produto e assinatura Tehkné Solutions;
- página de privacidade;
- bloqueio de acesso anônimo à API Ops;
- criação de sessão guest e contrato seguro do cookie `__Host-`;
- estágio inicial e próxima ação via Resume;
- Diagnostics privado e `no-store`;
- export de privacidade do próprio participante;
- bloqueio de mutação cross-origin.

Também é possível executar localmente contra uma URL candidata:

```bash
DEPLOY_BASE_URL=https://sua-url.example pnpm deploy:smoke
```

O resultado esperado é `REMOTE_RELEASE_GATE=PASS`. O gate remoto não conclui onboarding, aulas ou Alpha Gate e não envia feedback válido; ele cria apenas a sessão guest necessária para verificar o caminho de dados e usa uma tentativa cross-origin que deve ser bloqueada.

## Arquitetura

- Next.js + TypeScript
- monorepo pnpm + Turborepo
- PostgreSQL + Drizzle
- object storage compatível com S3
- conteúdo versionado e validado por schema
- modular monolith orientado por domínios

## Princípios

- conclusão de conteúdo não equivale a domínio;
- feedback precisa produzir uma próxima ação;
- domínio deriva de evidências;
- toda produção educacional nasce privada;
- a ferramenta de desenho é independente do método;
- blockchain é uma extensão opcional do Art Passport, nunca a identidade primária da arte.

## Estado

Closed Alpha Release Candidate — Foundation Alpha funcional, operação de cohorts integrada e release gate remoto automatizado.

Produto e assinatura institucional: **Tehkné Solutions**.
