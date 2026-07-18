> **Provenance:** exported verbatim from the canonical `neurono-bench` repo (internal research
> doc). Internal vocabulary: "s15" = the runtime published as `looprun`/`@looprun-ai/core` 0.6.0;
> "the Claude/Opus judge (D9, ruler-v2)" = the LLM judge used for every verdict in this benchmark
> (both arms, same judge). Decision labels (D9/D24/D25...) refer to the bench's decision ledger.

# Matriz v2 "optimized-for" — RELATÓRIO FINAL (2026-07-17)

> Branch `matrix-v2-optimized-for` (worktree). Metodologia: lei optimized-for (D25) — cada modelo
> medido no SEU profile (FORM sobre atlas-r2; guards idênticos), ruler **atlas-61 certificada**
> (D24; a mesma do GO/NO-GO vs vanilla-Mastra), T-loop piso-90/melhora-líquida/MAX-3, cert N≥3,
> judge Opus ruler-v2 (D9).

## Glossário de nomes (anti-ambiguidade)
- **atlas** = a ruler certificada (`config/examples/atlas.ts`, 61 casos) — a ÚNICA usada aqui.
- **atlas2** = ruler bônus da sessão paralela — NÃO usada nesta matriz.
- **`2026-07-17-v2-or-*`** = dirs DESTA matriz ("v2" = 2ª metodologia, não atlas2).
- **`2026-07-16-atlasv2-s15-*`** = dirs da sessão paralela (16/07), herdados na base da branch.
- **atlas-r2** = spec-source (bundle); **atlas-p-<modelo>** = profile FORM por modelo.

## Tabela definitiva (N=3 salvo indicação) — CORRIGIDA pelo reteste pós-fix

> **Reteste cirúrgico (2026-07-17, ~US$1.5 OR).** Os números originais foram medidos PRÉ eval-fix
> (Lote A: casos 62/69/88/08). O eval-fix só ELEVA scores nesses casos (mais leniente/de-confounded),
> então a coluna original SUBESTIMAVA 12 modelos. Correção: re-JUDGE de 69/88/08 (prompt idêntico →
> mesmos traces, nova intenção — grátis) + re-RUN do caso 62 (prompt mudou; inclui o de-confound do
> `getMaintenanceLog completed:false`). Coluna **v2✔** = corrigida; **(pré)** = original. Sem
> regressores. Correção de typo: minimax original era 97.3 (não 96.7 — reps 98.4/95.1/98.4).

| # | Modelo (tier) | v2✔ | (pré) | Profile | v1 | fonte da correção |
|---|---|---|---|---|---|---|
| 1 | haiku-4.5 (L) | **98.9 ✅** | 98.4 | default | 88.5 | 69 |
| 2 | ds-v4-pro (F) | **98.4 ✅** | 98.4 | default | 93.4 | — |
| 2 | glm-5.2 (F) | **98.4 ✅** | 97.3 | default | 88.5 | 62 |
| 2 | minimax-m3 (F) | **98.4 ✅** | 97.3 | i1 | 98.4 | 69 + 62 |
| 5 | sonnet-5 (C) | **97.8 ✅** | 96.2 | default | 98.4 | 62 |
| 5 | kimi-k2.6 (F) | **97.8 ✅** | 97.8 | i1 | 85.2† | — |
| 7 | glm-4.7 (C) | **97.3 ✅** | 96.7 | i1 | 88.5 | 88 |
| 7 | mimo-2.5-pro (F) | **97.3 ✅** | 97.3 | default+pin DeepInfra | 73.3‡ | — |
| 9 | grok-4.3* (F) | **96.7 ✅** | 96.7 | default | 95.1 | = (over-caution 62) |
| 10 | gpt-5.6-terra (F) | **96.2 ✅** | 96.2 | default | 93.4 | = (over-caution 62) |
| 11 | ds-v4-flash (L) | **95.6 ✅** | 91.8 | i1 | 82.0 | 69 + 08 + 62 |
| 12 | gpt-5.6-luna (C) | **94.0 ✅** | 94.0 | i1 | 93.4 | = (over-caution 62) |
| 13 | glm-4.7-flash (L) | **88.5** banda | 84.2 | i1 | 66.7† | 69+88+08 |
| 14 | gpt-5.4-nano (L) | **88.0** | 87.4 | default | 85.2 | 62 |
| — | qwen3.7-max/plus | NOT-MEASURABLE | — | — | 66.7† | defeito upstream Alibaba (bool-string) |
| — | *FL-thinkoff (âncora r2.1)* | *100* | 100 | | | recert pós-fix N=3 |
| — | *ram24 local (âncora r2.1)* | *91.8* | 93.4 | | | recert pós-fix N=3 (flip caso 02, D20) |

*\* = reasoning-locked (lane com asterisco). † = número v1 contaminado (colisão/screen-only).
‡ = v1 do mimo sofria o bug de boolean do upstream Xiaomi.*

> **Achado do reteste (caso 62 — over-caution genuíno):** o de-confound do 62 (janela + `getMaintenanceLog`)
> elevou glm-5.2 (2/3→3/3), sonnet (2/3→3/3), nano (0/3→2/3), e confirmou ds-flash/minimax em 3/3. Mas
> **terra/grok/luna seguem 0/3 mesmo pós-fix** — leem o log, veem `completed:false` e recusam completar
> apesar do go-ahead explícito do usuário. Isso é over-caution REAL do modelo, não bait: parei de mexer
> no mundo aqui para não saturar o caso (over-easing, alerta do juiz 2). Sinal de capacidade legítimo
> num benchmark não-saturado. ram24: recert pós-fix = 91.8 N=3 (rep0=rep1=rep2 byte-idênticos, D20;
> o −1.6 vs a âncora 93.4 é o flip near-tie do caso 02-dispatch, causalmente fora do eval-fix).
Pendentes de recarga: gem-3.5-flash* (~US$16) · opus-4.8 (~US$21) · nemotron (upstream morto).

## Tokens e custo POR ITERAÇÃO (dos run records)

| Modelo | Etapa | runs | tok in | tok out | US$ |
|---|---|---|---|---|---|
| ds-v4-flash | n1 | 61 | 1.39M | 20.2k | 0.14 |
| ds-v4-flash | i1 | 61 | 1.49M | 21.8k | 0.15 |
| ds-v4-flash | rep1 | 61 | 1.65M | 23.1k | 0.17 |
| ds-v4-flash | rep2 | 61 | 1.57M | 24.8k | 0.16 |
| **ds-v4-flash** | **subtotal** | | **6.10M** | **89.9k** | **0.62** |
| ds-v4-pro | n1 | 61 | 1.36M | 17.9k | 0.61 |
| ds-v4-pro | rep1 | 61 | 1.33M | 17.7k | 0.60 |
| ds-v4-pro | rep2 | 61 | 1.39M | 17.9k | 0.62 |
| **ds-v4-pro** | **subtotal** | | **4.08M** | **53.5k** | **1.82** |
| glm-4.7 | n1 | 61 | 1.11M | 12.5k | 0.47 |
| glm-4.7 | i1 | 61 | 1.05M | 9.3k | 0.44 |
| glm-4.7 | rep1 | 61 | 1.17M | 12.3k | 0.49 |
| glm-4.7 | rep2 | 61 | 1.16M | 10.5k | 0.48 |
| **glm-4.7** | **subtotal** | | **4.49M** | **44.6k** | **1.87** |
| glm-4.7-flash | n1 | 61 | 1.05M | 12.1k | 0.07 |
| glm-4.7-flash | i1 | 61 | 1.00M | 11.5k | 0.07 |
| glm-4.7-flash | i2 | 61 | 1.03M | 11.0k | 0.07 |
| glm-4.7-flash | rep1 | 61 | 1.06M | 11.7k | 0.07 |
| glm-4.7-flash | rep2 | 61 | 1.08M | 12.4k | 0.07 |
| **glm-4.7-flash** | **subtotal** | | **5.22M** | **58.6k** | **0.34** |
| glm-5.2 | n1 | 61 | 1.00M | 19.2k | 1.04 |
| glm-5.2 | rep1 | 61 | 1.01M | 16.2k | 1.04 |
| glm-5.2 | rep2 | 61 | 0.97M | 15.4k | 0.99 |
| **glm-5.2** | **subtotal** | | **2.97M** | **50.8k** | **3.07** |
| gpt-5.4-nano | n1 | 61 | 0.81M | 11.5k | 0.18 |
| gpt-5.4-nano | i1 | 61 | 0.80M | 10.9k | 0.17 |
| gpt-5.4-nano | i2 | 61 | 0.78M | 11.1k | 0.17 |
| gpt-5.4-nano | rep1 | 61 | 0.80M | 11.3k | 0.17 |
| gpt-5.4-nano | rep2 | 61 | 0.81M | 11.7k | 0.18 |
| **gpt-5.4-nano** | **subtotal** | | **3.99M** | **56.6k** | **0.87** |
| gpt-5.6-luna | n1 | 61 | 0.74M | 9.8k | 0.80 |
| gpt-5.6-luna | i1 | 61 | 0.76M | 9.7k | 0.82 |
| gpt-5.6-luna | rep1 | 61 | 0.76M | 9.8k | 0.81 |
| gpt-5.6-luna | rep2 | 61 | 0.77M | 10.1k | 0.83 |
| **gpt-5.6-luna** | **subtotal** | | **3.03M** | **39.4k** | **3.26** |
| gpt-5.6-terra | n1 | 61 | 0.73M | 8.7k | 1.96 |
| gpt-5.6-terra | rep1 | 61 | 0.73M | 8.8k | 1.97 |
| gpt-5.6-terra | rep2 | 61 | 0.74M | 8.8k | 1.99 |
| **gpt-5.6-terra** | **subtotal** | | **2.21M** | **26.3k** | **5.91** |
| grok-4.3 | n1 | 61 | 0.76M | 45.7k | 1.06 |
| grok-4.3 | rep1 | 61 | 0.83M | 59.9k | 1.19 |
| grok-4.3 | rep2 | 61 | 0.76M | 47.3k | 1.07 |
| **grok-4.3** | **subtotal** | | **2.35M** | **153.0k** | **3.32** |
| haiku-4.5 | n1 | 61 | 1.20M | 18.6k | 1.29 |
| haiku-4.5 | rep1 | 61 | 1.19M | 18.6k | 1.28 |
| haiku-4.5 | rep2 | 61 | 1.19M | 18.8k | 1.28 |
| **haiku-4.5** | **subtotal** | | **3.58M** | **55.9k** | **3.86** |
| kimi-k2.6 | n1 | 61 | 0.83M | 12.0k | 0.59 |
| kimi-k2.6 | i1 | 61 | 0.77M | 11.4k | 0.55 |
| kimi-k2.6 | rep1 | 61 | 0.83M | 12.2k | 0.59 |
| kimi-k2.6 | rep2 | 61 | 0.83M | 12.1k | 0.59 |
| **kimi-k2.6** | **subtotal** | | **3.26M** | **47.6k** | **2.31** |
| mimo-2.5-pro | n1 | 61 | 1.42M | 24.9k | 0.64 |
| mimo-2.5-pro | n1b | 61 | 1.49M | 28.7k | 0.68 |
| mimo-2.5-pro | i1 | 61 | 1.51M | 22.5k | 0.68 |
| mimo-2.5-pro | rep1 | 61 | 1.61M | 38.8k | 0.73 |
| mimo-2.5-pro | rep2 | 61 | 1.70M | 29.4k | 0.76 |
| **mimo-2.5-pro** | **subtotal** | | **7.74M** | **144.3k** | **3.49** |
| minimax-m3 | n1 | 61 | 1.03M | 21.1k | 0.33 |
| minimax-m3 | i1 | 61 | 0.99M | 19.6k | 0.32 |
| minimax-m3 | rep1 | 61 | 1.01M | 19.7k | 0.33 |
| minimax-m3 | rep2 | 61 | 1.04M | 20.9k | 0.34 |
| **minimax-m3** | **subtotal** | | **4.07M** | **81.2k** | **1.32** |
| qwen3.7-max | n1 | 61 | 1.24M | 14.3k | 1.89 |
| **qwen3.7-max** | **subtotal** | | **1.24M** | **14.3k** | **1.89** |
| qwen3.7-plus | n1 | 61 | 1.43M | 15.6k | 0.48 |
| qwen3.7-plus | i1 | 61 | 1.45M | 15.3k | 0.48 |
| **qwen3.7-plus** | **subtotal** | | **2.88M** | **30.9k** | **0.96** |
| sonnet-5 | n1 | 61 | 1.59M | 21.5k | 3.39 |
| sonnet-5 | i1 | 61 | 1.63M | 21.5k | 3.48 |
| sonnet-5 | rep1 | 61 | 1.61M | 21.1k | 3.44 |
| sonnet-5 | rep2 | 61 | 1.62M | 21.3k | 3.45 |
| **sonnet-5** | **subtotal** | | **6.45M** | **85.4k** | **13.75** |
| **TOTAL v2** | | | **63.65M** | **1032.2k** | **48.66** |


**Reconciliação de custo:** records US$48.66 vs faturado OR ~US$40.7 (descontos de cache do OR —
`estCostUsd` usa preço de lista). Total da chave (v1+v2+probes): US$63.34 de US$80 → **saldo US$16.66**.

## Achados principais
1. **Com o profile certo, a nuvem colapsa num platô 94–98%**: 12 de 14 modelos mensuráveis
   certificam ≥90; 10 ficam entre 96–98.4. O discriminador real passou a ser o punhado de casos
   duros (trio 24/46/62, defers, clarify) — não o tier de preço.
2. **O prose per-modelo é real e transferível por classe de fail**: ACT-first (glm-flash→glm-4.7→
   ds-flash→kimi), follow-through (luna→minimax; falhou no sonnet), defer self-referential (misto).
   6 profiles i1 aceitos, 5 iterações revertidas (net-negative é frequente past-floor — D25 pagou).
3. **Infra > modelo nos underperformers**: mimo +24 pt com um pin de provider (boolean-string do
   upstream Xiaomi); qwen3.7-* inteiro NOT-MEASURABLE pelo mesmo defeito (único upstream). A v1
   acusava os modelos; a investigação absolveu-os.
4. **O trio 24/46/62 recorre em TODOS os modelos fortes** — forte suspeita de invariant
   trajectory-strict no eval (não defeito de modelo). Seed da reanálise #12.
5. **Fabricação real é raríssima**: 1 caso (grok rep0, não recorreu). O guard-layer + r2 seguram a
   honestidade em todos os tiers.

## Incidentes e correções da rodada
- Colisão de run-dir com sessão paralela (kimi/terra) → recuperação por prefixo, fix estrutural já
  estava na base (benchlog-authoritative RUN_DIR).
- 2 acidentes de scripts stale no scratchpad (verdicts reescritos; auditados ✓) → judges agora com
  instrução anti-script.
- Bug boolean-string (Xiaomi/Alibaba) → pin DeepInfra + tasks #11 (proveniência de provider) e
  wire-check com boolean destrutivo.
- Delivery-stub residual → causa-raiz probe-validity (mundo valida pós-confirm) → lei M1 + teste
  M2 + grounds M3-M5 na skill (commit 015991c); fix do mundo = task #8 (próximo passo aprovado).

## Pendências (sequência aprovada)
1. **#8**: fix AtlasWorld (validação pré-confirm) + teste probe-parity do atlas + recert cirúrgico
   (FL+ram24 N=3 + re-run dos casos-stub; ~US$3).
2. **#12**: reanálise de TODAS as falhas → relatório de melhorias (skill/guards/world/evals) —
   inclui o veredito do trio 24/46/62. Aguarda OK para aplicar.
3. Mirror looprun (skill M1-M5 + profiles + este relatório) + `no-bench-drift`.
4. gem-3.5*/opus com recarga, se desejado. Merge da branch ao final.

---

## Análise pós-matriz (2026-07-17): inversões vs capacidade, causas, e o 100% do FL

> Fonte: tabela definitiva corrigida (acima) + agregado de falhas por caso×modelo dos verdicts
> curados (`eval-logs/results/2026-07-17-atlas-v2-optimized/` + reteste
> `2026-07-17-lote-a-recert-retest/`). "τ²" = o rank τ²-Bench Telecom de entrada (max reasoning).

### A. Modelos "melhores no papel" performaram pior — as inversões

| Modelo | τ² (entrada) | Matriz v2✔ | Inversão observada |
|---|---|---|---|
| glm-5.2 | 99.1 — #1 do ranking | 98.4 (#2 emp.) | perde para o **haiku-4.5**, um LITE (98.9) |
| grok-4.3 | 97.7 — #2 | 96.7 (#9) | atrás do minimax-m3 (τ² 88.9) — 9 pt de τ² invertidos |
| gpt-5.6-terra | frontier OpenAI ($2.5/15) | 96.2 (#10) | atrás do ds-v4-pro ($0.435/0.87) e do haiku ($1/5) |
| sonnet-5 | common Anthropic | 97.8 | atrás do próprio haiku (inversão intra-lab) |
| gpt-5.6-luna | common ($1/6) | 94.0 (último cert.) | atrás do ds-v4-flash a $0.098/MTok (95.6) |

### B. Quatro mecanismos de causa (com evidência por caso)

1. **Over-caution genuíno em follow-through destrutivo — a causa #1 nas inversões frontier.**
   Caso 62, mesmo após o duplo de-confound (janela + nota factual no `getMaintenanceLog`):
   **terra/grok/luna 0/3** — leem `completed:false` e recusam completar apesar do go-ahead
   explícito. Temperamento de RL de segurança sobrepondo a instrução do usuário, não falta de
   capacidade; modelos "menores" (haiku, minimax, ds-flash) obedecem e passam. ≈ −1.6 pt que
   separa esses três do platô 97–98.
2. **O regime thinking-off (D10) remove a vantagem dos reasoning-heavy.** τ² é medido a max
   reasoning; aqui o grok (reasoning-locked*) emitiu 153k tokens de output (~3× a mediana) e
   ainda caiu para #9. Sem raciocínio longo, o que discrimina é disciplina de instrução.
3. **A governança comprime a curva de capacidade — por design.** 12/14 mensuráveis no platô
   94–98.4. O resíduo discrimina TEMPERAMENTO, com assinatura própria por modelo:

   | Classe residual | Caso(s) | Quem falha sistematicamente |
   |---|---|---|
   | Over-caution destrutivo | 62 | terra, grok, luna (0/3 pós-fix) |
   | Scope-defer | 92, 50, 11 | **ds-v4-pro (única classe dele: 92 ×3)**, nano, glm-4.7-flash |
   | "Uma pergunta só" (input truncado) | 32, 52, 90 | **kimi (32 em 3/3 reps)**, glm-4.7, luna |
   | Claims/deposit (trio duro) | 24, 46 | sonnet (46 ×2), minimax (24 ×2), glm-5.2 |
   | Impaciência ACT-first | 11, 29, 71 | glm-4.7-flash (ceiling 88.5) |
   | Fidelidade numérica + caps | 21, 25 | nano (ceiling 88.0) |

   O glm-5.2 não "errou por burrice": seus 3 fails residuais são exatamente o cluster duro de
   claims (24/41/46). O ds-v4-pro tem UM defeito só: oferecer ajuda fora do escopo em vez de
   deferir.
4. **Ruído near-tie: 1 caso = 0.5 pt.** Entre 96 e 98.4 a distância é 1–4 casos em 183 runs —
   as posições finas dentro do platô são parcialmente ruído (mesma causa-raiz medida no ram24:
   decisão de 1 token com margem < ruído; ver `flip-root-cause-2026-07-16.md`).

Mecanismo que NÃO é do modelo: **infra**. mimo +24 pt só com pin de provider (bool-string
Xiaomi); qwen3.7-* inteiro NOT-MEASURABLE pelo mesmo defeito (único upstream Alibaba). A v1
acusava os modelos; a investigação os absolveu — daí o #11 (`servedProvider`/`stringBoolDefect`
na proveniência de cada run).

### C. Por que o FL deu 100% N=3 e modelos maiores não

| Fator | Explicação |
|---|---|
| **Home-field (o maior)** | O subject atlas foi construído com o FL como subject do T-loop (D10): specs, mundo, presets e rubrics iterados até o FL passar a barra — toda ambiguidade de FORM resolvida do jeito que o *FL* lê. A lei optimized-for (D25) compensa só parcialmente: profile por modelo com ≤3 iterações, contra a sintonia longa do FL no nível do *subject* (compartilhado). |
| **Temperamento, não capacidade** | 100 vs 98.4 = 3 casos em 183. O gap inteiro mora nos casos de temperamento (62 over-caution, 92 defer, 46 claims). Nenhum modelo maior perdeu num caso que exija *mais* capacidade que o FL tem. |
| **Caminho de API limpo** | FL roda direto na chave Google (sem roteamento OR, sem variância de upstream, thinking-off nativo) — o caminho OR já provou introduzir defeitos (bool-string). |

**Caveat:** 100% N=3 = a atlas-61 está **saturada para o FL** (a meta do subject era 85–90
não-saturado). Para os demais modelos o benchmark segue discriminante (platô 94–98.4 +
ceilings 88); re-discriminar o FL exigiria endurecer casos — e mudaria a âncora.

### D. Síntese

- **Preço ⊥ qualidade no loop governado**: ds-v4-flash ($0.098/MTok) 95.6 ≈ terra ($2.5/15)
  96.2 a ~25× o custo. Joelho custo×qualidade = **ds-v4-pro** (98.4 por US$1.82 os 3 reps) e
  haiku. É a tese do looprun em números: governança deixa modelo barato jogar no nível frontier.
- **Fabricação raríssima com o guard-layer**: 1 ocorrência em ~2.700 runs (grok rep0, não
  recorreu) — honestidade não discrimina tier.
- **Ceilings de lite são de modelo, não de spec**: nano 88.0 (defer + numérico) e glm-4.7-flash
  88.5 (ACT-first) não fecham com prose (iterações extras net-negative, D25 confirmado).
- **Resposta curta**: sim, os "melhores no papel" (glm-5.2, grok, terra) performaram
  relativamente pior, e a causa dominante é **temperamento sob governança** (over-caution
  destrutivo + perda da vantagem de reasoning no thinking-off), com um caso de **infra**
  (qwen/mimo) que se disfarçava de defeito de modelo. O FL fez 100% porque é a régua da casa —
  a comparação certa é "platô 94–98.4 vs âncora 100 com home-field", não "FL > frontier".
