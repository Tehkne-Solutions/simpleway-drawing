# SimpleWay Drawing — Closed Alpha RC1

Status: **Release Candidate freeze**

Assinatura institucional: **Tehkné Solutions**

## Escopo congelado

O RC1 cobre o Foundation Alpha completo e seus fluxos operacionais: onboarding, Drawing Zero, C0–C4, Gym, Observation/Construction/Form Labs, Evidence/Mastery/Coach, Create, Journey, Resume, Alpha Gate, Graduation, convites, consentimento, feedback, cohorts, Control Center, privacidade e diagnostics.

## Contratos obrigatórios

- Node.js 22.x.
- pnpm 10.15.0.
- PostgreSQL 16 compatível com migrations versionadas.
- Object storage S3-compatible.
- `AUTH_SECRET` e `ALPHA_OPS_TOKEN` com pelo menos 32 caracteres.
- HTTPS em produção.
- Cookies de sessão seguros em produção.
- Toda arte educacional nasce privada.
- Mastery deriva de Evidence; conclusão de conteúdo não concede mastery automaticamente.

## Gate local/CI

Antes de promover um commit candidato:

1. typecheck PASS;
2. content validation PASS;
3. unit tests PASS;
4. migration baseline sem drift;
5. migration versionada aplicada e idempotente;
6. PostgreSQL verification PASS;
7. S3/MinIO lifecycle PASS;
8. deployment environment contract PASS;
9. production build PASS sem warnings de compatibilidade CSS do produto;
10. todos os smokes E2E PASS, incluindo cohort completion.

## Gate remoto após deploy

Executar o workflow **Release Candidate Verification** contra a URL HTTPS publicada. O resultado obrigatório é `REMOTE_RELEASE_GATE=PASS`.

O gate remoto valida health, readiness/database, headers, identidade do produto, privacidade, proteção Ops, cookie de produção, Resume, Diagnostics, export do participante e CSRF.

## Critério GO para Closed Alpha

O Closed Alpha só recebe GO quando:

- CI do commit RC1 estiver verde;
- deploy estiver `Ready`;
- migration estiver aplicada no banco real;
- storage real estiver configurado;
- Release Candidate Verification estiver verde;
- teste manual responsivo em desktop e mobile não apresentar bloqueadores P0/P1;
- convite one-time real puder ser criado e resgatado;
- Drawing Zero puder ser enviado e reencontrado no Journey.

## Política de freeze

Depois do GO do RC1, somente correções P0/P1 entram antes da primeira cohort. Mudanças de currículo, novas features e expansão C5+ ficam para a próxima linha de desenvolvimento.
