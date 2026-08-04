# SimpleWay Drawing — First Cohort Runbook

Assinatura institucional: **Tehkné Solutions**

## Objetivo

Operar a primeira cohort do Closed Alpha com identidade individual, suporte rápido e dados comparáveis sem expor arte privada ou exigir acesso manual ao banco.

## Preparação

1. Confirmar RC1 com CI verde e Release Candidate Verification remoto em PASS.
2. Abrir `/ops` e criar um lote com um link único por tester.
3. Usar um rótulo claro para a turma, por exemplo `Alpha 01 · Agosto`.
4. Definir validade curta o suficiente para limitar links abandonados; padrão recomendado: 7 dias.
5. Copiar os links uma única vez e distribuir um link diferente para cada participante.

## Regras do lote

- máximo de 50 links por geração;
- cada link de lote tem exatamente um uso;
- cada código é armazenado somente como hash;
- um link consumido não pode ser reutilizado;
- convites ainda ativos podem ser revogados individualmente;
- consentimento continua obrigatório antes da criação da identidade do tester.

## Roteiro do tester

O participante deve:

1. abrir apenas o seu link individual;
2. aceitar o notice do Closed Alpha;
3. preencher onboarding;
4. realizar Drawing Zero sem buscar uma nota;
5. seguir a recomendação de Resume/Home;
6. usar Feedback quando algo estiver confuso, quebrado ou especialmente útil;
7. não compartilhar seu link de entrada.

## Operação durante a sessão

No Control Center, observar:

- entrada e onboarding;
- estágio atual;
- atividade recente;
- intervention queue;
- feedback recebido;
- Evidence e conclusão da cohort.

Intervenção humana deve ser baseada somente nos sinais explícitos exibidos pelo produto. Não usar arte privada nem metadata bruta como mecanismo de vigilância.

## Severidade

- **P0** — perda/corrupção de dados, quebra de privacidade/ownership, impossibilidade geral de entrar ou continuar.
- **P1** — fluxo principal bloqueado para um grupo relevante de testers.
- **P2** — problema contornável de UX, conteúdo ou apresentação.
- **P3** — melhoria desejável sem impacto no teste atual.

Durante o freeze do RC1, somente P0/P1 justificam alteração imediata antes da primeira cohort.

## Encerramento

Depois da cohort, registrar:

- quantidade convidada;
- entradas;
- onboarding;
- Evidence gerada;
- conclusão;
- média e categorias de feedback;
- P0/P1 encontrados;
- decisão sobre manter RC1 ou gerar RC1.1.

**Tehkné Solutions**
