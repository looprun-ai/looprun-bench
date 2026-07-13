# Finding — the adversarial review (stage N) earns its keep

A process lesson, kept even though the spec it describes was reset. When the telecom domain is regenerated
(roadmap → START HERE), stage N runs again and writes a fresh `REVIEW.md` under `packages/telecom/`.

In an earlier (now-discarded) run, the E-stage draft was recipe-faithful and had pre-empted two known
failure modes — yet the **5-reviewer N stage still found 8 real issues** a single author had missed:

- **N1 magnet (S-1 firewall)**, **N2 bucket-A (prose snapshots)**, **N5 purity/firewall lint** — clean.
- **N3 composition** — 2 confirmed: a `requiresBefore` gate named only one of two legal read tools (denied a
  valid path); an unwired `confirmAskRe` left a `refuel_data` prior-ask disjunct dead (a legit 2-turn refuel
  deadlocked).
- **N4 coverage (recall)** — 6 confirmed: a whole tech-support diagnostic tree had **zero** runtime coverage;
  identify-first unenforced for tech-support flows; no post-`resume` reboot instruction; `disable_roaming`
  ungoverned; payment request didn't state the amount; multi-match name lookup unhandled.

## The takeaways (now load-bearing in this repo)
1. Static drafting + review is **not** enough — those 8 were only caught by an adversarial, recall-biased
   pass. Always run stage N (5 reviewers), and then stage **T (the measured loop)** to certify. See
   `../pipeline.md`.
2. A **single hand-author misses gate-composition and recall gaps** — this is exactly why we reset the
   hand-driven spec and regenerate via the skill natively. See `lessons.md`.
