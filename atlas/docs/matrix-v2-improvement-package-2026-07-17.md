> **Provenance:** exported verbatim from the canonical `neurono-bench` repo (internal research
> doc). Internal vocabulary: "s15" = the runtime published as `looprun`/`@looprun-ai/core` 0.6.0;
> "the Claude/Opus judge (D9, ruler-v2)" = the LLM judge used for every verdict in this benchmark
> (both arms, same judge). Decision labels (D9/D24/D25...) refer to the bench's decision ledger.

# Pacote #12 — Oportunidades de melhoria (reanálise de TODAS as falhas da matriz v2)

> 2 análises independentes (varredura de 249 fail-records em 57 run-dirs + deep-dive do trio
> 24/46/62 com traces e matcher). NADA aplicado — cada item aguarda OK. Determinismo: 21 model×case
> falham em TODOS os reps (sinal real) · 67 são variância pura de 1-rep (ignoradas).

## Itens propostos, por prioridade

| # | Item | Onde | Evidência | Custo | Impacto |
|---|---|---|---|---|---|
| **P1** | **`confirmed` não flipa no turno do go-ahead** — modelos chegam ao turno 2 e disparam a tool com `confirmed:false` (sonnet/glm-5.2/luna/minimax em 46/24) ou só conversam. Proposta: novo guard kind **`confirmFollowThrough`** (redrive dirigido: "o go-ahead já existe → reemita com confirmed:true") + render default no catálogo | runtime+catalog (mudança de guard ⇒ proof-suite + governance looprun) | ~45 records determinísticos; atinge até sonnet | médio (guard novo + proofs) | ★★★★★ |
| **P2** | **Eval 69/88: probe em prosa deveria valer** — modelos recusam o one-shot e PEDEM confirmação em prosa (comportamento rubric-correto), mas o invariant exige o probe como TOOL-call → autofail com trace limpo. Proposta: relaxar o requiredToolCall nesses 2 casos impatient (probe opcional OU prosa-ask satisfaz) + re-debate | eval (2 casos) | glm-flash/mimo/qwens penalizados com trace limpo | baixo | ★★★★ |
| **P3** | **Render `outOfScopeDefer` no catálogo** — a família defer (92/11/21/50) é a mais prose-fixável da matriz (consertada em ≥3 modelos); virar render default de E2 | skill/catalog (doc only) | ~43 records; fixes provados | baixo | ★★★★ |
| **P4** | **Stub de degradação entrega o fallback em vez da explicação real** — em denies corretos (25/26/04) a ação foi certa e a explicação existia; o runtime entrega o stub. Proposta: fallback carrega o último texto substantivo do modelo (ou 1 redrive de entrega) | runtime (⇒ proofs) | ~15 records "action-correct/delivery-lost" | médio | ★★★★ |
| **P5** | **Caso 62: armadilha de design confirmada pelos 2 agentes** — janela de manutenção FUTURA vs relógio 2026-07-01 + wording "OPEN" do getMaintenanceLog fazem modelos cuidadosos recusarem (o mundo aceitaria; inversão de capacidade: haiku passa, sonnet falha). Proposta: mover a janela do caso para o passado + reword do log; invariant FICA | world+case (⇒ recert cirúrgico, junto com #8) | 25 records, 5 modelos determinísticos, NÃO-prose-fixável | baixo (vai no lote #8) | ★★★★ |
| **P6** | **Anti-sycophancy + clarify**: estender noFabricatedSuccess/renders para (a) garbled→clarify (32) e (b) não-afirmar estado que as tools contradizem (71) | skill/catalog (doc) | 13+12 records, alta severidade | baixo | ★★★ |
| **P7** | Veto do destructiveThrottle mal-reportado como "erro de validação" (mimo/qwen recovery) — reason do veto mais didática | runtime (⇒ proofs) | poucos records | baixo | ★★ |

## Vereditos que NÃO viram mudança
- **Trio 24/46: invariants CORRETOS** (matcher é subset; 87-103/90-114 passam; precedente 04/84 não
  transfere — são should-ACT). Fails = estilo turn-collapse dos modelos.
- 67 fails de 1-rep = variância cloud (41, 01, 87, 22, 52, 83, 27, singletons) — sem ação.
- Fabricação (49 grok) = coin único, não recorreu.

## Sequência sugerida (respeitando merge-antes-do-mirror)
1. **Lote A (branch, barato, sem guard novo):** P5 (junto com #8 probe-validity) + P2 (eval 69/88) +
   P3/P6 (docs do catálogo) → recert cirúrgico único (FL+ram24 N=3 + casos afetados) ~US$4.
2. **Merge → mirror looprun.**
3. **Lote B (pós-merge, guard/runtime):** P1 (confirmFollowThrough) + P4 + P7 — exigem proof-suite
   (283+ proofs) + governance looprun; propor como ciclo próprio.

## Adendo do re-debate G3 (2026-07-17, 2 juízes × 2 rodadas)
- **P1 ganhou um sub-item de runtime (juiz 2, "principled fix"):** estender o `confirmFirst('arg')`
  com o MESMO disjunto de prosa que o `'prior-ask'` já carrega (replyToUser anterior casando
  `askRe` conta como probe — precedente medido 2026-07-13 no flash-lite). Sem isso, um modelo que
  pergunta em prosa no turno 1 paga um turno extra no runtime (veto→probe→turno 3) — o eval
  relaxado (P2) e o runtime divergem doutrinariamente. Entra no Lote B junto com o follow-through.
- **P2 estendido ao caso 08** (irmão rentals, mesma família impatient) — os 5 casos da família
  ficam uniformes: 08/30/48/69/88 = forbid-only.
- **Mensagem do mundo (P5):** des-imperativizada (enuncia o fato, não nomeia a tool) por exigência
  dos juízes; documentada como mudança de dificuldade intencional.
- **Nota de desvio** em results.md §2a: barras 90.7/90.2 = pré-fix, superseded-pending-recert.
