# Launch kit — 4 services en ligne

Quatre comptes pros réels (4 amis), chacun avec **un service en ligne** prêt à publier : photo de couverture,
titre, description, prix, délai, livrables, et un profil (titre + bio). Tout est calé sur les champs et limites du
formulaire `/offer` (titre ≤ 120, description ≤ 4000, délai ≤ 80, livrables ≤ 1000) et de `/profile`.

| # | Service | Catégorie | Couverture |
|---|---------|-----------|------------|
| 1 | Site web vitrine / landing page | Tech | [covers/01-site-web.jpg](covers/01-site-web.jpg) |
| 2 | UI/UX design d'application (Figma) | Design | [covers/02-ui-ux-app.jpg](covers/02-ui-ux-app.jpg) |
| 3 | Logo & identité visuelle | Design | [covers/03-identite-visuelle.jpg](covers/03-identite-visuelle.jpg) |
| 4 | Gestion réseaux sociaux & contenu | Business | [covers/04-reseaux-sociaux.jpg](covers/04-reseaux-sociaux.jpg) |

Régénérer les images : `python3 docs/launch-kit/make_covers.py <dossier des polices pjs-500/600/700/800.ttf>`.

## Règles (AGENTS.md) — à respecter pour que ça reste crédible

- **Chaque compte = la vraie personne.** Son vrai nom, sa vraie photo de profil (visage, lumière naturelle,
  fond simple). C'est ce qui donne le sentiment "pro" — pas un avatar.
- **La couverture est une illustration du service, pas un projet client.** Elle va dans la photo du service.
  Le **portfolio** ne contient que du vrai travail de la personne (projets perso, école, stage, amis — en le disant).
- **Aucun faux avis, aucune fausse note, aucun "100 clients satisfaits".** Les avis viendront des vraies demandes.
- **Les prix sont des suggestions** — chacun met son propre prix. Jamais 0.
- Mode : **À distance** (icône Wifi) + la vraie ville de la personne.

## Publier (pour chaque ami, ~10 min)

1. Créer son compte (`/signup`) avec **son** e-mail — il garde l'accès, pas toi.
2. `/profile` : photo, nom affiché, **titre**, **bio**, ville (textes ci-dessous).
3. `/offer` : catégorie → titre → description → prix → délai → livrables → **À distance** → photo = la couverture.
4. Ajouter 2–3 éléments de portfolio réels.
5. Vérifier la fiche dans `/explore` (filtre "À distance") puis sur son profil public.

---

## 1 · Site web vitrine / landing page

**Profil**
- Titre : `Développeur web · Sites vitrines & landing pages`
- Bio (FR) :
  > Je crée des sites rapides, clairs et adaptés au mobile pour les commerces, indépendants et jeunes marques en
  > Tunisie. Je pars de votre objectif (être trouvé, recevoir des messages, vendre) et je construis la page qui y
  > mène — sans jargon. Tout se fait en ligne : on échange par message, vous suivez l'avancement sur un lien de
  > prévisualisation.
- Bio (تونسي) :
  > نعمل سيتات سريعة، واضحة وتمشي مزيان عالتليفون للمحلات، الفريلانسرز والماركات الجديدة في تونس. نبدا من
  > الهدف متاعك (الناس تلقاك، تبعثلك، ولا تشري) ونبني الصفحة اللي توصلك ليه. كل شي أونلاين وتتبع الخدمة على لينك.

**Service**
- Catégorie : Tech · Mode : À distance
- Titre : `Site vitrine ou landing page moderne, rapide et adapté au mobile`
- Prix : **À partir de 690 DT** · Délai : `7 à 10 jours`
- Description :
  > Vous avez une activité mais pas (encore) de site, ou un site qui ne ramène rien ? Je conçois et développe une
  > page claire qui présente votre offre et pousse le visiteur à vous contacter.
  >
  > Comment ça se passe :
  > 1. Appel ou messages de 20 min : votre activité, vos clients, votre objectif.
  > 2. Structure + maquette de la page d'accueil à valider.
  > 3. Développement, puis lien de prévisualisation pour vos retours (2 tours de modifications inclus).
  > 4. Mise en ligne sur votre nom de domaine + petite vidéo pour modifier vos textes vous-même.
  >
  > Idéal pour : restaurant, salon, coach, artisan, boutique, événement, lancement de produit.
  > Pour une boutique en ligne complète ou un site sur mesure plus large : demandez un devis.
- Livrables :
  > Site de 1 à 5 pages, responsive (mobile, tablette, ordinateur) · Formulaire de contact / bouton WhatsApp ·
  > Bases SEO (titres, description, partage sur les réseaux) · Mise en ligne · 2 tours de modifications ·
  > Courte vidéo de prise en main

**Description (تونسي)** — si la personne préfère publier en derja :
> عندك نشاط وما عندكش سيت، ولا عندك واحد ما يجيبلك شي؟ نصممّلك ونبرمجلك صفحة واضحة تعرّف بخدمتك وتخلّي اللي
> يدخل يكونتاكتيك. نحكيو 20 دقيقة على الهدف متاعك، نوريك ماكات، نبني، تشوف على لينك وتقولّي شنوة تبدّل (مرتين
> مدخولين)، ومبعد نطلّعو على الدومين متاعك ونعطيك فيديو باش تبدّل النصوص وحدك.

---

## 2 · UI/UX design d'application (Figma)

**Profil**
- Titre : `UI/UX designer · Applications mobiles & web`
- Bio (FR) :
  > Je dessine des applications simples à utiliser : parcours, écrans et design system dans Figma, prêts à être
  > développés. Avant de dessiner, je pose les bonnes questions — qui utilise l'app, pour faire quoi, où ça bloque.
  > Vous recevez des écrans propres, un prototype cliquable et des fichiers que votre développeur comprend.
- Bio (تونسي) :
  > نصمم أبليكاسيونات ساهلة في الاستعمال: البارکور، الإكرانات والديزاين سيستام على Figma، حاضرين للديفلوبور.
  > قبل ما نرسم نسأل: شكون باش يستعملها، علاش، ووين يتبلوكا.

**Service**
- Catégorie : Design · Mode : À distance
- Titre : `Design UI/UX de votre application mobile ou web sur Figma`
- Prix : **À partir de 590 DT** · Délai : `10 à 14 jours`
- Description :
  > Une bonne idée d'app perd ses utilisateurs si les écrans sont confus. Je transforme votre idée (ou votre app
  > existante) en parcours clair et en écrans modernes, prêts pour le développement.
  >
  > Étapes :
  > 1. Atelier en ligne : objectifs, utilisateurs, fonctionnalités clés.
  > 2. Parcours utilisateur + wireframes des écrans principaux.
  > 3. Design final (couleurs, typographie, composants réutilisables).
  > 4. Prototype cliquable pour tester et présenter (investisseurs, client, équipe).
  > 5. Passage au développeur : fichiers organisés, espacements et couleurs documentés.
  >
  > Le prix de départ couvre jusqu'à 8 écrans. Au-delà, ou pour une refonte complète, demandez un devis.
- Livrables :
  > Jusqu'à 8 écrans mobile ou web · Wireframes + design final · Mini design system (couleurs, typo, boutons,
  > champs) · Prototype cliquable Figma · Fichier Figma source organisé · 2 tours de modifications

**Description (تونسي)** :
> عندك فكرة أبليكاسيون ولا أبليكاسيون موجودة والناس تتلف فيها؟ نحوّلها لپارکور واضح وإكرانات مودرن حاضرة
> للبرمجة: ووركشوب أونلاين، وايرفريمز، ديزاين فينال، پروتوتيپ تنجم تكليكي فيه، وفيشي Figma مرتّب للديفلوبور.
> السوم يشمل لين 8 إكرانات.

---

## 3 · Logo & identité visuelle

**Profil**
- Titre : `Designer graphique · Logos & identités de marque`
- Bio (FR) :
  > Je crée des identités qui se reconnaissent au premier coup d'œil : logo, couleurs, typographies et règles
  > d'usage. Pour les nouveaux projets comme pour les marques qui veulent se refaire une image. Je vous explique
  > chaque choix, pour que votre marque ait du sens — pas seulement un joli dessin.
- Bio (تونسي) :
  > نعمل هويّات بصرية تتعرف من أول نظرة: لوغو، ألوان، خطوط وقواعد الاستعمال. للمشاريع الجديدة وللماركات اللي
  > تحب تبدّل صورتها. نفسرلك كل اختيار علاش.

**Service**
- Catégorie : Design · Mode : À distance
- Titre : `Logo professionnel + identité visuelle complète pour votre marque`
- Prix : **Prix fixe 290 DT** · Délai : `5 à 7 jours`
- Description :
  > Votre logo est la première chose que vos clients retiennent. Je crée une identité cohérente que vous pourrez
  > utiliser partout : réseaux sociaux, enseigne, carte de visite, emballage, site.
  >
  > Déroulé :
  > 1. Questionnaire court sur votre marque, votre clientèle et vos goûts (et ce que vous n'aimez pas).
  > 2. 3 pistes de logo différentes, présentées en situation.
  > 3. On affine la piste choisie (2 tours de modifications).
  > 4. Livraison de tous les fichiers + une mini charte pour bien utiliser votre marque.
  >
  > Vous êtes propriétaire de votre logo à la livraison.
- Livrables :
  > 3 propositions de logo · Logo final + variantes (horizontal, icône, noir/blanc) · Palette de couleurs ·
  > Typographies · Fichiers PNG, SVG et PDF · Mini charte graphique PDF · Visuel photo de profil réseaux sociaux ·
  > 2 tours de modifications

**Description (تونسي)** :
> اللوغو هو أول حاجة يتفكرها الكليان. نعملك هوية متناسقة تستعملها في كل بلاصة: سوشيال ميديا، الانسين، كارت
> فيزيت، الباكاجينغ. 3 پروپوزيسيونات، نصلحو اللي تختارو (مرتين)، وتاخو كل الفيشيات + شارت صغيرة. اللوغو ملكك.

---

## 4 · Gestion réseaux sociaux & création de contenu

**Profil**
- Titre : `Community manager · Contenu Instagram, Facebook & TikTok`
- Bio (FR) :
  > J'aide les commerces et marques tunisiennes à être présents régulièrement sur les réseaux, avec un contenu
  > qui leur ressemble. Calendrier planifié, visuels soignés, textes en français et en derja, réponses aux
  > messages : vous vous occupez de votre métier, je m'occupe de votre page.
- Bio (تونسي) :
  > نعاون المحلات والماركات التونسية باش يكونو حاضرين ديما عالسوشيال ميديا بكونتنو يشبهلهم. كاليندري، فيزوال
  > نظاف، نصوص بالفرنسي والدارجة، ونجاوب عالميساجات: انتي ركّز على خدمتك وأنا نتلهى بالپاج.

**Service**
- Catégorie : Business · Mode : À distance
- Titre : `Gestion de vos réseaux sociaux : posts, reels et calendrier chaque mois`
- Prix : **À partir de 450 DT** · Délai : `1 mois (renouvelable)`
- Description :
  > Une page qui ne publie pas, c'est une vitrine fermée. Je prends en charge vos réseaux chaque mois pour que
  > votre activité reste visible et que les messages arrivent.
  >
  > Chaque mois :
  > 1. Point de départ : vos offres du mois, vos promos, vos événements.
  > 2. Calendrier éditorial à valider avant publication.
  > 3. Création des visuels et des textes (français et/ou derja), avec vos photos ou celles qu'on prépare ensemble.
  > 4. Publication aux bons horaires + réponses aux commentaires et messages simples.
  > 5. Petit bilan en fin de mois : ce qui a marché, ce qu'on ajuste.
  >
  > Sans engagement longue durée : on avance mois par mois. Shooting photo/vidéo sur place ou publicité payante :
  > sur devis.
- Livrables :
  > 12 publications par mois (posts + carrousels) · 4 reels courts montés · Calendrier éditorial mensuel ·
  > Textes + hashtags · Publication planifiée sur Instagram et Facebook (TikTok en option) · Réponses aux
  > commentaires · Bilan mensuel

**Description (تونسي)** :
> پاج ما تنشرش كيف الفيترينة المسكّرة. كل شهر نتلهى بالسوشيال ميديا متاعك: كاليندري توافق عليه، فيزوال ونصوص
> بالفرنسي ولا بالدارجة، نشر في الوقت المناسب، نجاوب عالكومنتارات، وفي آخر الشهر نقولولك شنوة خدم وشنوة نبدلو.
> 12 پوست + 4 ريلز في الشهر. بلا التزام طويل.

---

## Réalisations (portfolio) — site web & UI/UX

Fichiers dans [realisations/out/](realisations/out/) : une image 4:3 (photo du projet) et une vidéo de 12 s
(MP4, < 8 Mo — limite du portfolio : 15 s, 8 Mo ; la vidéo demande SkillLoop Pro).
Chaque vidéo existe en **MP4** et en **WebM**. Si le site dit "Votre navigateur ne peut pas lire cette vidéo",
le navigateur n'a pas le décodeur H.264 (certaines versions de Chromium) : prendre le fichier **.webm**,
ou envoyer le MP4 depuis Chrome, Edge, Firefox ou Safari. Le code des projets est dans
[realisations/src/](realisations/src/) : ce sont de vraies pages, l'ami peut les ouvrir, les modifier et les mettre en ligne.

**Honnêteté :** ce sont des **projets concept** (marques fictives, pas de client). Le titre le dit ("Concept"), et la
description aussi. Idéalement chaque ami les reprend, les adapte à son style et les remplace par ses vrais projets
dès qu'il en a. Ne jamais les présenter comme une commande client.

### Profil "Site web" (service 1)

**Concept — Dar Yasmine, site d'un restaurant** · `site-dar-yasmine.jpg` + `site-dar-yasmine.mp4`
> Projet concept (marque fictive). Site vitrine pour un restaurant de Sidi Bou Saïd : carte, horaires, plan d'accès et
> réservation par WhatsApp. Pensé mobile d'abord, palette bleu et blanc inspirée du village.

**Concept — Koach, landing page coach sportif** · `site-koach.jpg` + `site-koach.mp4`
> Projet concept (marque fictive). Landing page pour un coach sportif : promesse claire, 3 formules d'abonnement,
> semaine type et réservation d'une séance d'essai. Style sombre et énergique, responsive.

### Profil "UI/UX design" (service 2)

**Concept — Louage Live, app mobile** · `app-louage-live.jpg` + `app-louage-live.mp4`
> Projet concept. App pour voir les départs de louage en temps réel, choisir sa place dans le véhicule et garder son
> billet (QR) sur le téléphone. 3 écrans clés : recherche, choix de place, billet.

**Concept — Souk Fresh, app de livraison du marché** · `app-souk-fresh.jpg` + `app-souk-fresh.mp4`
> Projet concept. App de livraison de fruits et légumes de producteurs tunisiens : accueil, fiche produit avec le
> producteur, panier avec créneau de livraison et paiement à la livraison.

Régénérer : voir l'en-tête de [realisations/render.mjs](realisations/render.mjs).
