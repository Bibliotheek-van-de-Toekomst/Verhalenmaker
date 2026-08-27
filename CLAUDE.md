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

## Vercel

Het project draait onder de Vercel-scope `biebvandetoekomsts-projects` (project `verhalenmaker`, abonnement Hobby). Dat is **niet** het team "Bibliotheek van de toekomst" en ook niet het persoonlijke account van Wanda: in die twee omgevingen is het project niet te vinden.

De inloggegevens staan in `TOEGANG-INTERN.md`. Dat bestand blijft bewust buiten deze repository, want de repo is openbaar.

Kun je niet bij het dashboard, dan is uitrollen nog steeds mogelijk: het project hangt aan deze GitHub-repo, dus een push naar `main` rolt uit. Stel dus nooit een oplossing voor die alleen via het Vercel-dashboard kan zonder eerst te controleren of die toegang er is.
