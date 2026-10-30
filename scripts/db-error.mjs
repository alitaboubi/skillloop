// Error reporting for scripts/db-test.mjs (kept separate so it can be checked without a database).

/**
 * The exact SQL text sent for one test file, as segments: test file up to `begin;`, pgTAP setup, the pending migration
 * (if any), rest of the test file. Each segment knows its source file and first line, so an error position maps back
 * to "<file> line N". Returns null when the file has no `begin;` line.
 */
/** `pending`: [{ name, sql }] migrations to run first (dry run), in order. */
export function testSegments(name, raw, pending = []) {
  const m = /^begin;[ \t]*$/m.exec(raw);
  if (!m) return null;
  const cut = m.index + m[0].length;
  return [
    { name, text: raw.slice(0, cut), firstLine: 1 },
    { name: "(runner: pgTAP setup)", text: "\ncreate extension if not exists pgtap with schema extensions;\n", firstLine: 1 },
    ...pending.map((p) => ({ name: p.name, text: p.sql + "\n", firstLine: 1 })),
    { name, text: raw.slice(cut), firstLine: raw.slice(0, cut).split("\n").length },
  ];
}

/**
 * A database error as "<file> line N" + the statement's first line + PostgreSQL's code, message, hint and context.
 * Never printed: the connection string, credentials, or the error DETAIL (it can contain row values, i.e. real data).
 */
export function describeDbError(e, text, segments, secret) {
  const out = [`# ERROR (transaction rolled back): ${e.code ?? ""} ${(secret ? String(e.message).split(secret).join("***") : String(e.message))}`];
  const pos = Number(e.position);
  if (pos > 0) {
    let offset = pos - 1;
    for (const seg of segments) {
      if (offset < seg.text.length) {
        const before = seg.text.slice(0, offset);
        const line = seg.firstLine + before.split("\n").length - 1;
        const src = seg.text.split("\n")[before.split("\n").length - 1]?.trim().slice(0, 200) ?? "";
        out.push(`#   at ${seg.name} line ${line}: ${src}`);
        break;
      }
      offset -= seg.text.length;
    }
  } else if (e.where) {
    out.push("#   (raised inside a function, trigger or constraint — see context)");
  } else {
    out.push("#   (PostgreSQL gave no position for this error)");
  }
  if (e.hint) out.push(`#   hint: ${e.hint}`);
  if (e.where) for (const l of String(e.where).split("\n").slice(0, 6)) out.push(`#   context: ${l}`);
  if (e.constraint_name) out.push(`#   constraint: ${e.constraint_name}`);
  if (e.detail) out.push("#   (detail omitted: it can contain row values)");
  return out;
}


/**
 * Connection-level failures (network, refused login, server shutting down): the test file did not run at all, so
 * this is never reported as a SQL error. SQLSTATE classes 08 (connection) and 28 (authorization), 57P01–57P03, and
 * the client library's own connection codes.
 */
export function isConnectionError(e) {
  const code = String(e?.code ?? "");
  return /^(08|28)/.test(code) || /^57P0[1-3]$/.test(code)
    || ["ENETUNREACH", "ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "ECONNRESET", "CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED", "CONNECT_TIMEOUT"].includes(code);
}
