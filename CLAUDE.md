# CLAUDE.md — Verhaalmaker

## Git / GitHub

Deze repo (`Bibliotheek-van-de-Toekomst/Verhalenmaker`) is alleen pushable vanaf het GitHub-account `biebvandetoekomst`, niet vanaf `WandaKruijt`. Beide accounts zijn lokaal in `gh auth` geregistreerd.

**Vóór elke `git push`** (of andere remote-write actie):

```bash
gh auth switch -u biebvandetoekomst
```

Daarna pas pushen. Als de actieve gh-account `WandaKruijt` is, faalt de push met `403 Permission denied`.

## Deploy

`git push origin main` triggert automatisch een Vercel-deploy. Push dus alleen als de wijzigingen klaar zijn voor productie.
