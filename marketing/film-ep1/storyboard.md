# « يدين » (Les mains) — film SkillLoop sans texte

9:16 · ~30 s · 9 plans · aucune ligne de dialogue, aucun mot à l'écran · fin = logo SkillLoop seul.
Méthode : skill `story-film`. Rien n'est généré : chaque étape attend l'accord d'Ali sur le prompt et le coût.

## L'histoire en une phrase
Un vieux graveur sur cuivre de la médina fait de belles pièces que personne ne voit. Sa petite-fille les photographie
et un jour quelqu'un franchit la porte pour **la pièce qui prenait la poussière**.

- **Objet de l'histoire** : un plateau en cuivre gravé d'un motif de jasmin. Il apparaît au plan 3 (poussière) et revient au plan 8 (on souffle la poussière).
- **Motif sonore** : le « tink » du ciseau sur le cuivre. Il devient le tempo de la musique, lent au début, joyeux à la fin.
- **SkillLoop** n'apparaît que par les gestes : elle photographie, il reçoit une notification, un client arrive le téléphone à la main. Les écrans restent toujours dos à la caméra.

## STYLE (choisir UN des deux, le coller tel quel partout)
- **LIVE** : Vertical 9:16. Cinematic photorealism, shot on ARRI Alexa 35 with vintage anamorphic lenses, shallow depth of field, warm Mediterranean light, teal-and-amber grade, soft halation, fine 35mm film grain, natural skin texture, authentic Tunisian people and places.
- **3D** : Vertical 9:16. High-end stylized 3D animated feature-film look, soft rounded character design with expressive eyes, subsurface-scattering skin, hand-crafted textures, volumetric light, cinematic depth of field, warm Mediterranean palette with teal shadows, authentic Tunisian architecture and objects.

**CONSTRAINTS (à la fin de chaque prompt)** : No text, no letters, no writing on signs or objects, no subtitles, no logos, no watermarks. Phone screens face away from camera. Natural hands with five fingers. One continuous shot, no cuts.

## Personnages (à coller tels quels)
- **AMM HEDI** : a 68-year-old Tunisian copper engraver, lean, deeply lined sun-tanned face, short white stubble, kind tired eyes, a red felt chechia, a faded blue work jacket over a white collarless shirt, a worn brown leather apron, strong weathered hands with copper-stained fingertips.
- **YASMINE** : his 22-year-old granddaughter, Tunisian, curly dark hair tied in a loose bun, small gold hoop earrings, mustard knitted sweater, light jeans, a canvas tote bag, a phone in a plain black case, bright mischievous smile.
- **THE COUPLE** (plan 8 seulement) : a Tunisian couple in their early 30s, she in a cream coat with a phone in a plain case, he in a grey jacket, curious and polite.

## Lieu (plaque d'établissement)
**THE WORKSHOP** : a tiny copper engraving workshop in an old Tunis medina souk, vaulted whitewashed stone ceiling, walls and shelves covered with hand-engraved copper and brass plates, trays and lanterns, a low wooden workbench with chisels and a small hammer, an arched doorway open onto a narrow souk alley, warm sunlight entering low through the door, dust motes floating in the light.

---

## Étape 1 — Images de référence (peu chères, à valider avant la vidéo)
- **R1 Amm Hedi, fiche personnage** : [STYLE] Character reference sheet of AMM HEDI: [bloc]. Three views side by side (front, three-quarter, profile), full upper body, neutral warm grey background, even soft light. [CONSTRAINTS]
- **R2 Yasmine, fiche personnage** : idem avec YASMINE.
- **R3 L'atelier** : [STYLE] Film still, wide establishing shot of THE WORKSHOP: [bloc], empty, late afternoon. [CONSTRAINTS]
- **R4 Le plateau** : [STYLE] Film still, top-down close-up of a round hand-engraved copper tray with a jasmine flower pattern, covered with a thin layer of dust, on a wooden shelf. [CONSTRAINTS]

Ensuite, une image clé par plan : le prompt du plan sans le mouvement de caméra, plus « film still, frame from a feature film », avec R1, R2, R3 et R4 en références.

## Étape 2 — Les 9 plans (image → vidéo, 5 s, son coupé à la génération)

**P1 — Hook (0–2 s)**
[STYLE] AMM HEDI: [bloc]. Extreme macro, 100mm macro lens, locked-off. A steel chisel tip strikes a copper surface, a tiny curl of copper lifts, a bright glint of light flashes on the fresh groove of a jasmine petal. Warm side light. [CONSTRAINTS]

**P2 — Personne ne voit (2–5 s)**
[STYLE] AMM HEDI: [bloc]. THE WORKSHOP: [bloc]. Wide shot from inside the workshop toward the arched doorway, locked-off. Amm Hedi works bent over the bench in the foreground, while blurred silhouettes of passers-by cross the bright alley outside without stopping. Dust motes in the sunbeam. Performance: focused, quiet, alone. [CONSTRAINTS]

**P3 — L'objet (5–8 s)**
[STYLE] AMM HEDI: [bloc]. Close-up, 50mm, slow push-in. His weathered hands set the finished jasmine copper tray on a high shelf, next to other trays covered in dust. He lets go and his hands stay a second on the edge of the shelf. Performance: a small silent exhale. [CONSTRAINTS]

**P4 — Yasmine arrive (8–11 s)**
[STYLE] AMM HEDI: [bloc]. YASMINE: [bloc]. THE WORKSHOP: [bloc]. Medium shot, 35mm, subtle handheld. Yasmine enters through the sunlit doorway holding two small glasses of mint tea, gives one to her grandfather, then looks up at the dusty shelf. Her smile turns thoughtful. [CONSTRAINTS]

**P5 — Elle photographie (11–14 s)**
[STYLE] AMM HEDI: [bloc]. YASMINE: [bloc]. Over-the-shoulder from behind Yasmine, 35mm, slow lateral dolly. She holds her phone up with the screen facing away from camera, photographing his hands as he engraves. He notices, waves her away with a shy laugh, then straightens his chechia and poses stiffly, proud. Comedic warmth. [CONSTRAINTS]

**P6 — La nuit (14–17 s)**
[STYLE] YASMINE: [bloc]. Medium close-up, 50mm, locked-off. Night, her small bedroom, she sits cross-legged on her bed, face lit by the cool glow of a laptop whose screen faces away from camera, a warm lamp behind her. She selects photos with focus, then smiles to herself. [CONSTRAINTS]

**P7 — La vibration (17–21 s)**
[STYLE] AMM HEDI: [bloc]. THE WORKSHOP: [bloc]. Close-up, 50mm, rack focus from a phone lying face down on the workbench, vibrating, to Amm Hedi's face behind it. He picks it up, holds it at arm's length and squints, screen facing away from camera. Performance: puzzled, eyebrows rising. [CONSTRAINTS]

**P8 — Le retour du plateau (21–26 s)** ⟵ le plan qui fait l'émotion
[STYLE] AMM HEDI: [bloc]. THE COUPLE: [bloc]. THE WORKSHOP: [bloc]. Medium shot, 35mm, slow push-in. The couple stands in the sunlit doorway; the woman holds up her phone, screen facing away from camera, and points up at the jasmine tray on the dusty shelf. Amm Hedi takes the tray down and gently blows the dust off; the dust swirls gold in the sunbeam. His eyes glisten and a small proud smile appears. [CONSTRAINTS]
*(Prendre aussi une variante en gros plan visage : « Tight close-up, 85mm », même action.)*

**P9 — Le tempo repart (26–29 s)**
[STYLE] AMM HEDI: [bloc]. YASMINE: [bloc]. THE WORKSHOP: [bloc]. Slow pull-back, 24mm, from the chisel striking copper to a wide view of the workshop now full of warm light: Amm Hedi engraving with energy, the couple looking at trays, Yasmine leaning on the doorway with arms crossed, proud. [CONSTRAINTS]

**Carte de fin (29–30.5 s)** : logo SkillLoop (infini orange) sur fond navy, sans slogan. Fait dans Remotion, pas par l'IA.

## Montage (Remotion, template `media-studio`)
- P1 → P2 : coupe sur le « tink ». P3 → P8 : raccord sur le plateau (même cadrage de l'étagère).
- Étalonnage commun (courbes + grain) sur tous les plans. Upscale 1080×1920, 30 fps.
- Plans de 1,5 à 3 s. Garder P8 au moins 4 s. Tenir le logo 1,5 s.

## Son
| Temps | Son |
|---|---|
| 0–8 s | « tink » du ciseau lent et espacé, ambiance du souk lointaine, poussière (souffle doux) |
| 8–14 s | verres de thé, rire étouffé, déclic photo |
| 14–17 s | ventilation de l'ordinateur, une note de oud seule |
| 17–21 s | vibration du téléphone sur le bois, la musique démarre (darbouka douce + oud), tempo calé sur les « tink » |
| 21 s | **0,5 s de silence** juste avant que la cliente montre le plateau |
| 21–29 s | souffle sur la poussière, la musique monte, les « tink » deviennent rapides et joyeux |
| 29–30.5 s | un seul « tink » clair sur le logo |
Musique originale (`scripts/music.py`) ou piste sous licence. Master à −14 LUFS.

## Coût et prochaine étape
- Higgsfield : compte gratuit, **10 crédits**. Ça ne suffit pas pour 9 plans en 1080p. Revid : à vérifier après restart de la session.
- Ordre conseillé :
  1. R1 à R4 (images, peu chères).
  2. Les 9 images clés, à valider sur une planche.
  3. Les 9 vidéos en brouillon 480p (Seedance 2.5 `draft` ou 2.0 Mini).
  4. Version finale 1080p seulement pour les prises retenues.
- Avant chaque génération : je donne le modèle, les réglages et le coût exact, et j'attends ton accord.
