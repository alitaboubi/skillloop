import { dictionaries } from "./i18n";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Static fallback when server rendering itself fails (src/server.ts). The visitor's saved language isn't known on the
 * server, so it shows French (the site default) with the English and Tunisian Arabic text below. No scripts besides reload.
 */
export function renderErrorPage(): string {
  const block = (lang: "fr" | "en" | "ar", primary: boolean) => {
    const d = dictionaries[lang];
    const attrs = lang === "ar" ? ' lang="ar-TN" dir="rtl"' : ` lang="${lang}"`;
    return primary
      ? `<div${attrs}><h1>${esc(d.ep_title)}</h1><p>${esc(d.ep_desc)}</p>
      <div class="actions"><button class="primary" onclick="location.reload()">${esc(d.retry)}</button><a class="secondary" href="/">${esc(d.nf_home)}</a></div></div>`
      : `<p class="alt"${attrs}><strong>${esc(d.ep_title)}</strong> — ${esc(d.ep_desc)}</p>`;
  };
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>${esc(dictionaries.fr.ep_title)} | SkillLoop</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .alt { font-size: 0.875rem; margin: 1rem 0 0; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      ${block("fr", true)}
      ${block("en", false)}
      ${block("ar", false)}
    </div>
  </body>
</html>`;
}
