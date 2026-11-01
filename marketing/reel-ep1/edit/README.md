# Reel « غدوة إن شاء الله » — montage Remotion

Montage code (Remotion 4, React) : `src/Reel.tsx` contient la liste des plans (clip source, début, durée, sous-titres, sons).

## Préparer
1. `npm install`
2. `npm run libs` — bibliothèques Chrome manquantes sous WSL (libnspr4, libnss3), sans sudo.
3. Police emoji : `apt-get download fonts-noto-color-emoji`, extraire `NotoColorEmoji.ttf` dans `public/fonts/`.
4. Clips Veo dans `../clips/`, puis upscale 1080×1920 vers `public/clips/` (voir les noms dans `src/Reel.tsx`) :
   `ffmpeg -i ../clips/X.mp4 -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,eq=contrast=1.04:saturation=1.06" -c:v libx264 -crf 16 -c:a aac public/clips/v01_phone.mp4`

## Utiliser
- `npm run studio` — aperçu interactif dans le navigateur.
- `npm run bundle && npm run render` — rendu final dans `out/reel.mp4`.

## Corrections faites sur les clips Veo
- Salma : « خادمتو » → « خدمتو » (voyelle raccourcie de ~140 ms, synchro labiale gardée) : `public/audio/salma_fixed.wav`.
- Hiver : Veo a fait dire « مرحبا؟ » et a oublié la réponse du téléphone → la voix de la promesse est réutilisée avec un filtre téléphone (`public/audio/phone_reply.wav`).
- Mouton : plan parasite au début du clip (coupé).
- Vitrine : le vrai sticker QR de l'app (`src/lib/pro-card.ts`) est incrusté et suivi image par image ; le faux texte arabe du compteur est flouté.
- Plan manquant « ding dong » : remplacé par Karim en route + son de sonnette.
