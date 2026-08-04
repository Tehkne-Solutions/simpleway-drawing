# SimpleWay Drawing — Closed Alpha RC1

Status: **Release Candidate freeze**

Assinatura institucional: **Tehkné Solutions**

## Escopo congelado

O RC1 cobre o Foundation Alpha completo e seus fluxos operacionais: onboarding, Drawing Zero, C0–C4, Gym, Observation/Construction/Form Labs, Evidence/Mastery/Coach, Create, Journey, Resume, Alpha Gate, Graduation, convites, consentimento, feedback, cohorts, Control Center, privacidade, diagnostics e Launch Readiness.

## Contratos obrigatórios

- Node.js 22.x.
- pnpm 10.15.0.
- PostgreSQL 16 compatível com migrations versionadas.
- Object storage S3-compatible privado e acessível por credenciais de produção.
- `AUTH_SECRET` e `ALPHA_OPS_TOKEN` com pelo menos 32 caracteres.
- HTTPS em produção.
- Cookies de sessão seguros em produção.
- Toda arte educacional nasce privada.
- Mastery deriva de Evidence; conclusão de conteúdo não concede mastery automaticamente.

## Gate CI

Antes de promover um commit candidato: typecheck, content validation, unit tests, freeze contract, migration drift, migrations idempotentes, PostgreSQL real, S3/MinIO lifecycle, deployment contract, production build e todos os smokes E2E devem passar.

## Production Launch Gate

Após o deploy, executar manualmente o workflow **Production Launch Gate** informando a URL HTTPS publicada.

O gate executa `apps/web/scripts/production-launch-gate.mjs` e valida, contra o ambiente real:

1. health e política `no-store`;
2. readiness com conexão real ao PostgreSQL e `HeadBucket` não destrutivo no storage privado;
3. headers de segurança e request ID;
4. identidade SimpleWay Drawing e assinatura Tehkné Solutions;
5. aviso de privacidade público;
6. bloqueio anônimo das rotas Ops;
7. cookie `__Host-` Secure/HttpOnly/SameSite/Path;
8. criação de sessão e resolução inicial do Learning Runtime;
9. diagnostics;
10. export de dados do participante;
11. bloqueio CSRF/cross-origin.

Resultado obrigatório: `PRODUCTION_LAUNCH_GATE=GO`.

Qualquer falha produz `PRODUCTION_LAUNCH_GATE=NO_GO` e impede o envio de convites até correção e nova execução.

## Critério GO para primeira cohort

A primeira turma só recebe GO quando:

- CI do commit RC1 estiver verde;
- deploy estiver `Ready`;
- migrations estiverem aplicadas no banco real;
- `/api/ready` reportar `database=ok` e `storage=ok`;
- storage S3-compatible real estiver configurado;
- Production Launch Gate retornar **GO**;
- teste manual responsivo em desktop e mobile não apresentar bloqueadores P0/P1;
- convite one-time real puder ser criado e resgatado;
- Drawing Zero puder ser enviado e reencontrado no Journey;
- Control Center estiver acessível à operação;
- Launch Readiness da cohort estiver visível e sem motivo de `HOLD` não explicado.

## Decisão operacional

**GO** autoriza criação/distribuição do primeiro lote de convites.

**NO-GO** congela a distribuição de convites. Corrige-se apenas o contrato que falhou, executa-se CI novamente quando houver mudança de código e repete-se o Production Launch Gate.

## Política de freeze

Depois do GO do RC1, somente correções P0/P1 entram antes da primeira cohort. Mudanças de currículo, novas features e expansão C5+ ficam para a próxima linha de desenvolvimento.

**Tehkné Solutions**
