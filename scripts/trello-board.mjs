#!/usr/bin/env node
/**
 * Creates the "SkillLoop" Trello board (course organisation): project info + live site, Business Model Canvas,
 * plan (to do / in progress / done) and an empty "Présentations" list for later.
 *
 * Secrets: the Trello API key and token are read from the environment (TRELLO_KEY, TRELLO_TOKEN), typed by you in a
 * hidden prompt; they are sent only to api.trello.com in a header and never printed or saved.
 *
 *   node scripts/trello-board.mjs --dry-run                 # print what would be created, no network
 *   node scripts/trello-board.mjs                           # create the board
 *   node scripts/trello-board.mjs --images <folder>         # also attach the screenshots in <folder> to the site card
 *   node scripts/trello-board.mjs --add-images <folder> --board <board link or id>
 *                                                           # existing board: attach the screenshots to "Le site en ligne"
 */
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const SITE = "https://skillloop.taboubiali363.workers.dev";
const REPO = "https://github.com/alitaboubi/skillloop";

const LABELS = [
  { key: "done", name: "Terminé", color: "green" },
  { key: "blocked", name: "Décision requise", color: "orange" },
  { key: "bmc", name: "BMC — brouillon à valider", color: "purple" },
  { key: "tech", name: "Technique", color: "blue" },
  { key: "biz", name: "Business / contenu", color: "yellow" },
];

/** @type {{ name: string; cards: { name: string; desc?: string; labels?: string[]; checklist?: { name: string; items: [string, boolean][] }; links?: [string, string][]; images?: boolean }[] }[]} */
const LISTS = [
  {
    name: "📌 Projet SkillLoop",
    cards: [
      {
        name: "Le site en ligne",
        images: true,
        desc: [
          "**SkillLoop** — marketplace de services locaux et à distance en Tunisie (FR / EN / عربي).",
          "",
          `Site : ${SITE}`,
          `Code (dépôt privé) : ${REPO}`,
          "",
          "Technique : TanStack Start + React, Supabase (base de données, comptes, photos — Paris), Cloudflare Workers (hébergement gratuit), Cloudflare Turnstile (anti-robot), Gmail (emails).",
        ].join("\n"),
        links: [["Site SkillLoop", SITE], ["Dépôt GitHub (privé)", REPO]],
      },
      {
        name: "Fonctionnalités principales",
        labels: ["tech"],
        desc: "Ce que la plateforme fait aujourd'hui.",
        checklist: {
          name: "Fonctionnalités",
          items: [
            ["Explorer les services (catégories, villes, sur place / à distance, recherche)", true],
            ["Fiche service + demande écrite (relue avant envoi)", true],
            ["Profils publics des prestataires + portfolio", true],
            ["Publication d'un service en 4 étapes", true],
            ["Messagerie client ↔ prestataire en temps réel", true],
            ["Tableau de bord (client / prestataire)", true],
            ["3 langues : français, anglais, arabe tunisien (RTL)", true],
            ["Mode clair / sombre", true],
            ["Inscription email + Google, anti-robot, emails de confirmation", true],
          ],
        },
      },
    ],
  },
  {
    name: "🧩 Business Model Canvas",
    cards: [
      { name: "1. Segments de clientèle", labels: ["bmc"], desc: "- Particuliers et petites entreprises en Tunisie qui cherchent un service, près de chez eux ou à distance.\n- Prestataires : artisans, indépendants, freelances, étudiants qui veulent une vitrine en ligne et recevoir des demandes." },
      { name: "2. Proposition de valeur", labels: ["bmc"], desc: "**Clients** : trouver vite un prestataire, prix affichés en TND, demande claire par écrit, sur place ou à distance, en français, anglais ou arabe.\n**Prestataires** : vitrine gratuite (profil, services, portfolio, contacts publics), demandes structurées, messagerie intégrée." },
      { name: "3. Canaux", labels: ["bmc"], desc: "- Site web adapté au mobile\n- Google (référencement naturel)\n- Partage des profils et services (WhatsApp, réseaux sociaux)\n- Bouche-à-oreille" },
      { name: "4. Relations clients", labels: ["bmc"], desc: "- Libre-service (inscription, publication, demandes)\n- Messagerie intégrée entre client et prestataire\n- FAQ et support par email" },
      { name: "5. Sources de revenus", labels: ["bmc", "blocked"], desc: "**Lancement : gratuit** pour tous (MVP).\nPistes à valider plus tard (hypothèses, pas encore décidées) :\n- mise en avant payante d'un service\n- abonnement « pro » pour les prestataires\n- commission sur les prestations (si paiement en ligne un jour)" },
      { name: "6. Ressources clés", labels: ["bmc"], desc: "- La plateforme web (code, design « Mapped loop »)\n- La base de prestataires et de services\n- La marque SkillLoop\n- Le fondateur (développement, produit)" },
      { name: "7. Activités clés", labels: ["bmc"], desc: "- Développement et amélioration du site\n- Recrutement des premiers prestataires\n- Modération des contenus\n- Référencement et communication" },
      { name: "8. Partenaires clés", labels: ["bmc"], desc: "- Supabase (base de données, comptes, stockage)\n- Cloudflare (hébergement, anti-robot)\n- Google (connexion, Search Console, emails)\n- À prospecter : écoles, associations, chambres de métiers" },
      { name: "9. Structure de coûts", labels: ["bmc"], desc: "**Lancement : 0 TND** (offres gratuites de Cloudflare, Supabase, Gmail).\nPlus tard : nom de domaine, plans payants si le trafic augmente, marketing, temps de développement." },
    ],
  },
  {
    name: "🗺️ Plan — À faire",
    cards: [
      { name: "Publier un premier service réel", labels: ["biz"], desc: "Avant Google : le site a besoin de vrais services (aucun service publié pour l'instant)." },
      { name: "Google Search Console", labels: ["tech"], checklist: { name: "Étapes", items: [["Ajouter la propriété (préfixe d'URL)", false], ["Vérifier avec la balise HTML", false], ["Envoyer sitemap.xml", false], ["Demander l'indexation des pages principales", false]] } },
      { name: "Compléter les mentions légales", labels: ["biz", "blocked"], checklist: { name: "Informations à fournir", items: [["Exploitant (nom / société, adresse)", false], ["Emails support et confidentialité", false], ["Durée de conservation", false], ["Âge minimum", false], ["Déclaration INPDP", false]] } },
      { name: "Suppression de compte en libre-service", labels: ["tech", "blocked"], desc: "Migration prête et testée (anonymisation, historique conservé pour l'autre personne). À valider puis activer." },
      { name: "Améliorations optionnelles (phase 3)", labels: ["tech"], checklist: { name: "Idées", items: [["Chiffres réels du site (quand ils sont significatifs)", false], ["Prestataires récemment inscrits", false], ["QR code pour partager un profil", false], ["Avis clients (nécessite une vraie fonctionnalité d'avis)", false]] } },
      { name: "Plus tard : nom de domaine", labels: ["biz"], desc: "Ex. skillloop.tn — payant, pas pour le lancement gratuit." },
    ],
  },
  {
    name: "🔄 En cours",
    cards: [
      { name: "Notifications de messages (badge non lus)", labels: ["tech"], checklist: { name: "Étapes", items: [["Développé et testé (tests automatiques)", true], ["Test avec deux comptes", false], ["Mise en ligne", false]] } },
    ],
  },
  {
    name: "✅ Terminé",
    cards: [
      { name: "Base de données propre (Supabase) et sécurité", labels: ["done", "tech"], desc: "Règles d'accès, limites quotidiennes, quotas d'envoi de photos, anti-robot (Turnstile)." },
      { name: "Référencement (SEO)", labels: ["done", "tech"], desc: "Pages rendues côté serveur, sitemap, robots.txt, données structurées, pages privées non indexées." },
      { name: "Nouveau design « Mapped loop »", labels: ["done", "tech"], desc: "Couleurs par rôle, clair / sombre, arabe RTL, mobile." },
      { name: "Mise en ligne gratuite (Cloudflare Workers)", labels: ["done", "tech"], desc: `En ligne : ${SITE}` },
      { name: "Emails de confirmation et de réinitialisation", labels: ["done", "tech"], desc: "Gmail, modèles en français, limite 20/heure." },
      { name: "Page « À propos » avec le fondateur", labels: ["done", "biz"] },
      { name: "Améliorations marketplace (phases 1 et 2)", labels: ["done", "tech"], desc: "Recherche rapide (Ctrl K), catégories, animations sobres, FAQ, aperçu des services." },
      { name: "Assistant d'écriture IA (prêt, désactivé)", labels: ["done", "tech"], desc: "Côté serveur, avec quotas ; reste désactivé pour l'instant." },
    ],
  },
  { name: "🎤 Présentations", cards: [] },
];

const dry = process.argv.includes("--dry-run");
const imgIdx = process.argv.indexOf("--images");
const imageDir = imgIdx > -1 ? process.argv[imgIdx + 1] : null;

if (dry) {
  for (const l of LISTS) {
    console.log(`\n## ${l.name}${l.cards.length ? "" : "  (vide)"}`);
    for (const c of l.cards) console.log(`  - ${c.name}${c.checklist ? `  [checklist: ${c.checklist.items.length}]` : ""}${c.labels ? `  {${c.labels.join(", ")}}` : ""}`);
  }
  if (imageDir) console.log(`\nImages to attach to "Le site en ligne": ${listImages(imageDir).join(", ") || "(none found)"}`);
  process.exit(0);
}

const KEY = process.env.TRELLO_KEY?.trim();
const TOKEN = process.env.TRELLO_TOKEN?.trim();
if (!KEY || !TOKEN) {
  console.error("Missing TRELLO_KEY / TRELLO_TOKEN in this terminal (see the steps you were given). Nothing was created.");
  process.exit(1);
}
const AUTH = { Authorization: `OAuth oauth_consumer_key="${KEY}", oauth_token="${TOKEN}"` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, params = {}, body) {
  const url = new URL(`https://api.trello.com/1${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  // Network hiccups (common under WSL) are retried; the error shows the cause code, never the key/token.
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method, headers: AUTH, body, signal: AbortSignal.timeout(60_000) });
    } catch (e) {
      const cause = e?.cause?.code || e?.cause?.message || e?.name || "network error";
      if (attempt < 3) { console.log(`  network problem (${cause}) — retrying ${attempt}/2…`); await sleep(2000 * attempt); continue; }
      throw new Error(`${method} ${url.pathname} → no answer from Trello (${cause}). Check your internet connection and run again.`);
    }
    await sleep(120); // stay far below Trello's rate limit
    if (res.status === 429 && attempt < 3) { await sleep(3000); continue; }
    if (!res.ok) throw new Error(`${method} ${url.pathname} → HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  }
}

function listImages(dir) {
  try { return readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort(); } catch { return []; }
}

async function attachImages(cardId, dir) {
  const files = listImages(dir);
  if (!files.length) console.log(`  no PNG/JPG/WebP images found in ${dir}`);
  for (const f of files) {
    const type = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }[extname(f).toLowerCase()];
    const form = new FormData();
    form.append("name", f);
    form.append("file", new Blob([readFileSync(join(dir, f))], { type }), f);
    await api("POST", `/cards/${cardId}/attachments`, {}, form);
    console.log(`  image attached: ${f}`);
  }
}

const addIdx = process.argv.indexOf("--add-images");
if (addIdx > -1) {
  const dir = process.argv[addIdx + 1];
  const boardArg = process.argv[process.argv.indexOf("--board") + 1] ?? "";
  const boardId = boardArg.match(/trello\.com\/b\/([A-Za-z0-9]+)/)?.[1] ?? boardArg;
  try {
    if (!dir || !boardId || process.argv.indexOf("--board") < 0) throw new Error("usage: --add-images <folder> --board <board link or id>");
    console.log(`Looking up board ${boardId}…`);
    const cards = await api("GET", `/boards/${boardId}/cards`, { fields: "name" });
    const card = cards.find((c) => c.name === "Le site en ligne");
    if (!card) throw new Error('card "Le site en ligne" not found on that board');
    console.log(`Found "Le site en ligne" — attaching images from ${dir}…`);
    await attachImages(card.id, dir);
    console.log("\nDone.");
  } catch (e) {
    console.error(`Stopped: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

try {
  const board = await api("POST", "/boards/", { name: "SkillLoop", defaultLists: "false", defaultLabels: "false", desc: `Organisation du projet SkillLoop (cours de commerce électronique). Site : ${SITE}`, prefs_background: "blue" });
  console.log(`Board created: ${board.shortUrl}`);
  const labels = {};
  for (const l of LABELS) labels[l.key] = (await api("POST", "/labels", { name: l.name, color: l.color, idBoard: board.id })).id;
  for (const l of LISTS) {
    const list = await api("POST", "/lists", { name: l.name, idBoard: board.id, pos: "bottom" });
    for (const c of l.cards) {
      const card = await api("POST", "/cards", { idList: list.id, name: c.name, desc: c.desc ?? "", pos: "bottom", ...(c.labels ? { idLabels: c.labels.map((k) => labels[k]).join(",") } : {}) });
      if (c.checklist) {
        const cl = await api("POST", "/checklists", { idCard: card.id, name: c.checklist.name });
        for (const [name, checked] of c.checklist.items) await api("POST", `/checklists/${cl.id}/checkItems`, { name, checked: String(checked) });
      }
      for (const [name, url] of c.links ?? []) await api("POST", `/cards/${card.id}/attachments`, { name, url });
      if (c.images && imageDir) await attachImages(card.id, imageDir);
    }
    console.log(`  list: ${l.name} (${l.cards.length} cards)`);
  }
  console.log(`\nDone. Open: ${board.shortUrl}`);
} catch (e) {
  console.error(`Stopped: ${e.message}`);
  console.error("Whatever was created so far stays on the board; you can delete the board in Trello and run again.");
  process.exit(1);
}
