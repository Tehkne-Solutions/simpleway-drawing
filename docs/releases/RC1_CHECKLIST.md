# RC1 Launch Checklist

Use este checklist somente depois do CI do commit candidato ficar verde.

- [ ] Deploy Vercel do commit RC1 em estado Ready.
- [ ] `DATABASE_URL` configurada e migration aplicada.
- [ ] Storage S3-compatible configurado e acessível.
- [ ] `AUTH_SECRET` e `ALPHA_OPS_TOKEN` configurados.
- [ ] `NEXT_PUBLIC_APP_URL` aponta para a URL HTTPS real.
- [ ] Workflow `Release Candidate Verification` retorna PASS.
- [ ] Desktop: Home, Onboarding, Drawing Zero, Learn, Gym, Labs, Create, Journey, Feedback e Ops sem P0/P1.
- [ ] Mobile: mesmos fluxos sem overflow, bloqueio de interação ou conteúdo inacessível.
- [ ] Convite one-time criado e resgatado com sucesso.
- [ ] Drawing Zero enviado e reencontrado no Journey.
- [ ] Feedback enviado e refletido no Control Center.
- [ ] Cohort analytics reflete ativação e conclusão corretamente.

Resultado final: **GO** ou **NO-GO** documentado pelo time.

**Tehkné Solutions**
