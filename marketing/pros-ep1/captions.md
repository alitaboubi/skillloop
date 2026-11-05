# « Nouveau pro » — 4 carrousels + 1 vidéo Revid

Slides : `edit/out/post/<id>-1.png … <id>-5.png` (1080×1350), `id` = cm, web, logo, ui.
Re-render : `cd edit && npx remotion bundle src/index.ts --out-dir=out/bundle && npx remotion still out/bundle cm-1 out/post/cm-1.png`
(avec `LD_LIBRARY_PATH` du README ; `--timeout=90000` si les polices sont lentes).

## Ordre de publication
1 carrousel par jour, 19 h–21 h. **Taguer le pro** sur la slide 1 et en collaboration (Collab) s'il a un compte.
Premier commentaire posté par @skillloop_tunisia = la question de fin de légende.

| Jour | Pro | Fichiers |
|---|---|---|
| J1 | aziz kouki (UI/UX) | ui-1 … ui-5 |
| J2 | Feres Hasni (site web) | web-1 … web-5 |
| J3 | Br9 Team (logo) | logo-1 … logo-5 |
| J4 | Ahmed (community manager) | cm-1 … cm-5 |
| J5 | Vidéo Revid « 4 pros » (après ton accord sur le prompt et le coût) | — |

## Légendes

**ui — aziz kouki**
> مرحبا بـ aziz kouki في SkillLoop 👋 UI/UX designer، يصمّم شاشات واضحة للمشاريع والماركات.
> Bienvenue à aziz kouki ! Interfaces web & mobile, maquettes, prototypes, présentations visuelles.
> À partir de 200 DT · 5 à 6 jours · Sousse / à distance.
> 👉 Sa page et sa demande : lien en bio.
> إنت زادة تخدم؟ صفحة محترف بلاش — ابعثلنا « PRO » 📩
> 💬 شنوّة أكثر حاجة تقلقك في أبليكاسيون؟ / Quelle appli vous énerve le plus ?
> #SkillLoop #Tunisie #UIUX #DesignTunisie #Freelance

**web — Feres Hasni**
> مرحبا بـ Feres Hasni في SkillLoop 👋 يعملك سيت فيترينة ولا landing page تجيبلك الحرفاء.
> Bienvenue à Feres ! Site de 1 à 5 pages, bouton WhatsApp, bases SEO, mise en ligne + vidéo de prise en main.
> À partir de 500 DT · 7 à 10 jours · Tunis / à distance.
> 👉 Sa page : lien en bio.
> إنت زادة تخدم؟ صفحة محترف بلاش — ابعثلنا « PRO » 📩
> 💬 عندك سيت ولا صفحة فيسبوك برك؟ / Site ou juste une page Facebook ?
> #SkillLoop #Tunisie #SiteWeb #LandingPage #Freelance

**logo — Br9 Team**
> مرحبا بـ Br9 Team في SkillLoop 👋 لوغو واحتيتي فيزويل كاملة لماركتك.
> Bienvenue à Br9 Team ! 3 propositions, logo + variantes, palette, typos, fichiers PNG/SVG/PDF, mini charte. Le logo est à vous.
> 150 DT prix fixe · 5 à 7 jours · Tunis / à distance.
> 👉 Leur page : lien en bio.
> إنت زادة تخدم؟ صفحة محترف بلاش — ابعثلنا « PRO » 📩
> 💬 شنوّة أحسن لوغو تونسي في رايك؟ / Le meilleur logo tunisien selon vous ?
> #SkillLoop #Tunisie #Logo #IdentitéVisuelle #Branding

**cm — Ahmed**
> مرحبا بـ Ahmed في SkillLoop 👋 يتكفّل بصفحاتك على إنستغرام، فيسبوك وتيكتوك كل شهر.
> Bienvenue à Ahmed ! 12 publications + 4 reels par mois, calendrier, textes FR/derja, réponses, bilan mensuel.
> À partir de 450 DT / mois · sans engagement longue durée · à distance.
> 👉 Sa page : lien en bio.
> إنت زادة تخدم؟ صفحة محترف بلاش — ابعثلنا « PRO » 📩
> 💬 قدّاش من مرة تنشر في الجمعة؟ / Vous publiez combien de fois par semaine ?
> #SkillLoop #Tunisie #CommunityManager #ReseauxSociaux #Freelance

## Vidéo motion Revid — brouillon (pas encore rendu)
Format : 9:16, ~25 s, sans voix off, musique énergique, sous-titres en derja (arabe) + français.
> Vertical 9:16 motion-graphics video, 25 seconds, dark navy background (#111b31), lime-green accent (#c4ee57) and
> orange accent (#d8763f), clean flat illustration style, Plus Jakarta Sans for French and Noto Sans Arabic for Arabic.
> Scene 1 (0–3 s): big Tunisian Arabic title « شكون خدّم على SkillLoop هالجمعة؟ » with French subtitle
> « Les nouveaux pros de la semaine ». Scenes 2–5 (4 s each): one card per pro sliding in, each with an illustrated
> avatar, name, job and one line: « aziz kouki — UI/UX designer · dès 200 DT », « Feres Hasni — Sites web vitrines · dès 500 DT »,
> « Br9 Team — Logo & identité visuelle · 150 DT », « Ahmed — Community manager · dès 450 DT/mois ».
> Scene 6 (last 5 s): « إنت زادة تخدم؟ صفحة محترف بلاش » / « Vous aussi ? Votre page pro, gratuite » + « DM PRO »,
> then the SkillLoop infinity logo end card. No stars, no ratings, no client numbers, no invented text.
Je te montre le coût en crédits avant `render_video`. Les avatars et images des services sont dans `edit/public/stills/`
et je les envoie à Revid comme médias pour qu'il n'en invente pas d'autres. Pas de `publish_now`.
