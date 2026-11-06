# SkillLoop — SEO playbook (novembre 2026)

Goal #1: skillloop.tn shows up in first place for "skill loop tunisia" / "skillloop" / "skill loop tunisie".
Goal #2: get traffic from searches for services ("plombier tunis", "cours particuliers sousse", "مصلح مكيفات تونس").

## 0. State on 5 November 2026

- Site live and technically clean: SSR, canonical, `robots.txt`, `sitemap.xml`, JSON-LD (WebSite, Organization, Service, ProfilePage).
- Problem: **the site is not showing up in search results yet**. A search for "skillloop.tn" returns nothing.
- No `google-site-verification` tag on skillloop.tn (the comment in `__root.tsx` talks about the workers.dev URL). If the domain isn't verified by DNS, Search Console isn't watching skillloop.tn.
- "skill loop" on its own also matches an open-source Claude Code tool (takumiyoshikawa/skill-loop). The word "tunisia/tunisie" is what makes the difference, so it has to sit next to the brand everywhere.

## 1. The 10 actions that bring the result (in order)

1. **Google Search Console → "Domain" property for `skillloop.tn`** (DNS TXT record at the registrar). Then *Sitemaps* → submit `https://skillloop.tn/sitemap.xml`. Then *URL inspection* → `https://skillloop.tn/` → **Request indexing**.
2. **Bing Webmaster Tools** → "Import from Google Search Console". Bing feeds ChatGPT Search, Copilot and DuckDuckGo.
3. Deploy this branch (brand-first title + `alternateName` "Skill Loop", "SkillLoop Tunisia"…).
4. **Instagram + Facebook**: put `https://skillloop.tn` in the bio/link, with the same name "SkillLoop Tunisia" everywhere.
5. Create **LinkedIn Company Page**, **TikTok**, **YouTube** with the name "SkillLoop Tunisia" and a link to the site, then add them to `SOCIAL_LINKS` (`src/lib/social.ts`). They feed `sameAs`.
6. **Google Business Profile** as a "service-area business", only if you have a real address to verify (not required).
7. Ask the 4 pros who agreed to share **their profile link** `skillloop.tn/pros/…` on their own social accounts.
8. 5–10 Tunisian **backlinks**: tech/startup media (Tekiano, Webdo, Startups Magazine, Wamda), Startup Act / incubators, university clubs, local directories. One real article about SkillLoop is worth more than 100 directories.
9. Each Instagram reel: in the caption, "SkillLoop Tunisia — skillloop.tn".
10. After 7–14 days: Search Console → *Performance* → filter on the query "skill loop" and check position and impressions.

> Honest note: no one can guarantee first place. But for a brand query, once the site is indexed and the brand is consistent, a new site usually gets there within a few weeks.

## 2. Best GitHub skills for SEO (stars checked on 5 November 2026)

They aren't ML models. They're **Claude Code skills/agents** (instructions + scripts) that do the audit, the keyword research and the writing. Read each one's `SKILL.md` before installing it: a skill runs with access to your machine.

| Repo | ★ | Use it for |
|---|---|---|
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 58.7k | SEO audit, programmatic SEO, schema, copywriting, CRO. The most popular. |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | 26.9k | Full technical audit: 26 sub-skills + 19 sub-agents (E-E-A-T, schema, CWV…). |
| [zubair-trabzada/geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude) | 11.5k | GEO: showing up in ChatGPT / Perplexity / Google AI answers. |
| [Ryze-AI-Adgent/open-seo-mcp-skills](https://github.com/Ryze-AI-Adgent/open-seo-mcp-skills) | 8.9k | Free MCP: keyword research, rank tracking. |
| [AgriciDaniel/claude-blog](https://github.com/AgriciDaniel/claude-blog) | 2.7k | Blog articles with sources, "answer-first". |
| [seranking/seo-skills](https://github.com/seranking/seo-skills) | 199 | Very strong, but needs a paid SE Ranking account. |

Recommendation: **claude-seo** (audit) + **marketingskills** (strategy/content) + **geo-seo-claude** (AI). That's enough.

## 3. Prompts (copy-paste into Claude Code, from the repo)

### P1 — Technical audit with priorities
```
Fais un audit SEO technique complet de https://skillloop.tn en utilisant le skill claude-seo.
Contexte : marketplace tunisienne de services locaux (TanStack Start SSR, Cloudflare). Langue fr, public tunisien.
Pour chaque problème : URL concernée, preuve (ce que tu as vu dans le HTML ou les headers), impact (élevé/moyen/faible),
et le fichier du repo à modifier. Classe par impact/effort. N'invente aucune donnée que tu n'as pas mesurée.
Termine par les 5 corrections à faire cette semaine, et implémente celles qui touchent le code avec des tests.
```

### P2 — Brand entity "SkillLoop Tunisia"
```
Objectif : que https://skillloop.tn sorte n°1 sur "skill loop tunisia", "skillloop", "skill loop tunisie".
1) Recherche sur le web ce qui sort aujourd'hui sur ces requêtes et qui sont les concurrents de nom.
2) Vérifie la cohérence de l'entité : title, JSON-LD (WebSite.alternateName, Organization.sameAs), profils sociaux, nom affiché.
3) Liste les signaux manquants (profils, citations, backlinks) avec l'action exacte et l'endroit.
Réponds avec un plan de 14 jours, une action par jour, vérifiable.
```

### P3 — Keyword research in the Tunisian market (FR / AR / Derja)
```
Fais une recherche de mots-clés pour SkillLoop (services en Tunisie) avec le skill de keyword research disponible.
Catégories : réparations, cours, digital, auto, événements. Villes : Tunis, Ariana, Ben Arous, Sousse, Sfax, Nabeul, Monastir, Bizerte.
Couvre 3 langues : français, arabe standard, derja en lettres latines et arabes (ex. "plombier tunis", "سباك تونس", "mosle7 clim").
Pour chaque mot-clé : intention, volume estimé (dis clairement si c'est une estimation), difficulté, page cible sur skillloop.tn.
Groupe en clusters et dis quelles pages existent déjà et lesquelles manquent.
```

### P4 — Programmatic SEO pages (city × service), without thin pages
```
Propose et implémente des pages /[categorie]/[ville] pour SkillLoop (ex. /reparations/sousse), avec le skill programmatic-seo.
Règles strictes : une page n'est indexable (et dans le sitemap) que si elle a au moins N services publiés réels ;
sinon noindex. Contenu unique par page à partir des vraies annonces (pas de texte généré bourré de mots-clés).
Title, H1, meta description, BreadcrumbList, liens internes depuis /explore et les fiches service.
Écris les tests (sitemap, noindex, canonical) et montre-moi 3 pages rendues avant de finir.
```

### P5 — GEO: showing up in ChatGPT / Perplexity / Google AI
```
Avec le skill geo-seo-claude, audite la visibilité de SkillLoop dans les réponses IA pour des questions comme
"comment trouver un plombier à Tunis", "plateforme freelance services Tunisie", "c'est quoi SkillLoop".
Vérifie robots.txt pour les crawlers IA, ajoute un /llms.txt factuel, et propose une page FAQ (FAQPage) avec
des réponses courtes, vraies et citables. Aucune affirmation qu'on ne peut pas prouver (pas de faux chiffres, pas de faux avis).
```

### P6 — Blog article that really ranks
```
Avec claude-blog, écris un article pour skillloop.tn sur "[sujet, ex. Prix d'un plombier à Tunis en 2026]".
Recherche d'abord les sources tunisiennes actuelles et cite-les. Réponse directe dans les 2 premières phrases,
puis détails, tableau de prix seulement si sourcé, FAQ en fin. Ton simple, français tunisien naturel.
Lien interne vers /explore et la catégorie concernée. Donne aussi title (<60 car.) et meta description (<155 car.).
```

### P7 — Backlinks in Tunisia
```
Trouve 20 sites tunisiens où SkillLoop peut obtenir un lien réel : médias tech/startup, incubateurs, Startup Act,
associations, universités, annuaires sérieux. Pour chacun : URL, pourquoi c'est pertinent, contact public,
et un message d'approche court (français) personnalisé. Exclus les fermes de liens et les liens payants.
```

### P8 — Weekly review (every Monday)
```
Voici l'export Search Console des 7 derniers jours (requêtes + pages) : [coller CSV].
Dis-moi : requêtes en position 5–20 à pousser, pages avec impressions mais CTR bas (propose un nouveau title/description),
pages non indexées et pourquoi. Max 5 actions, triées par impact. Implémente celles qui touchent le code.
```

## 4. What NOT to do

- Fake reviews, fake ratings in JSON-LD, AI-generated pages without real listings → Google penalty.
- Buying backlinks or "1000 directories" packs.
- Changing the brand name across platforms (SkillLoop / Skill-Loop / SkilLoop): keep **SkillLoop Tunisia**.
