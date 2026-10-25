#!/usr/bin/env node
// Runs supabase/tests/database/*.test.sql against YOUR Supabase project, inside one transaction that is rolled back.
// The connection string is typed here (hidden) — never stored in .env, the repo, or any file.
// Usage: node scripts/db-test.mjs   (paste the "Session pooler" connection string when asked)
// Dry run of a migration that is NOT applied yet:
//   node scripts/db-test.mjs --pending supabase/migrations/<file>.sql
// executes that migration inside each test transaction first (its own begin/commit removed), so the tests see the new
// rules and existing rows are validated against them — then everything is rolled back. Nothing is committed.
// It briefly locks the affected tables while it runs (seconds).
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve4 } from "node:dns/promises";
import postgres from "postgres";
import { describeDbError, isConnectionError, testSegments } from "./db-error.mjs";

const LOVABLE_REF = "mowuufibfngoqzmslykh";
const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const ref = env.VITE_SUPABASE_PROJECT_ID;
if (!ref || ref === LOVABLE_REF) { console.error("Refusing: .env does not point at your own project."); process.exit(1); }

function askHidden(q) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.startsWith(q)) rl.output.write(q); };
    rl.question(q, (a) => { rl.close(); process.stdout.write("\n"); resolve(a.trim()); });
  });
}

const pendingArg = process.argv.indexOf("--pending");
const pendingFile = pendingArg > -1 ? process.argv[pendingArg + 1] : null;
if (pendingArg > -1 && !pendingFile) { console.error("--pending needs a migration file path."); process.exit(1); }
// Only the statements: the outer transaction belongs to the test file.
const pendingSql = pendingFile ? readFileSync(pendingFile, "utf8").replace(/^[ \t]*(begin|commit);[ \t]*$/gim, "") : "";

const url = process.env.SKILLLOOP_DB_URL || (await askHidden(`Connection string for project ${ref} (hidden): `));
if (!url.includes(ref)) { console.error(`Refusing: the connection string is not for project ${ref}.`); process.exit(1); }
if (url.includes(LOVABLE_REF)) { console.error("Refusing: that is the Lovable project."); process.exit(1); }

// IPv4 only: this WSL has no IPv6 route. Resolve the host's IPv4 address and connect to it directly,
// keeping the real hostname for TLS (SNI). New projects' direct host (db.<ref>.supabase.co) is IPv6-only.
let u;
try { u = new URL(url.replace(/^postgres(ql)?:/, "http:")); } catch { console.error("That doesn't look like a postgres:// connection string."); process.exit(1); }
const host = u.hostname;
const ipv4 = (await resolve4(host).catch(() => []))[0];
if (!ipv4) {
  console.error(`No IPv4 address for ${host.replace(ref, "<ref>")}.`);
  console.error("Use the Session pooler string instead: Supabase → Connect → Session pooler");
  console.error(`  host aws-…-eu-west-3.pooler.supabase.com, port 5432, user postgres.${ref}`);
  process.exit(2);
}
const sql = postgres({
  host: ipv4,
  port: Number(u.port || 5432),
  database: decodeURIComponent(u.pathname.slice(1)) || "postgres",
  username: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  // Encrypted like before ("require": TLS without CA verification); servername keeps SNI on the real host.
  ssl: { servername: host, rejectUnauthorized: false },
  max: 1, onnotice: () => {}, connect_timeout: 15,
});
const NETWORK_CODES = ["ENETUNREACH", "ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH"];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs fn; on a connection-level failure waits 3 s and tries once more (the pooler can refuse a first login transiently). */
async function withOneRetry(fn, onRetry) {
  try { return await fn(); } catch (e) {
    if (!isConnectionError(e)) throw e;
    onRetry(e);
    await pause(3000);
    return fn();
  }
}

const lines = [];
let failed = 0, passed = 0;
try {
  // Connect once before any test file, so a refused login is reported as such and never as a failing test.
  await withOneRetry(() => sql`select 1`, (e) => lines.push(`# connection attempt failed (${e.code}), retrying once in 3 s…`));
  for (const f of readdirSync("supabase/tests/database").filter((x) => x.endsWith(".test.sql")).sort()) {
    const raw = readFileSync(`supabase/tests/database/${f}`, "utf8");
    // A test for a migration that isn't applied yet declares `-- requires: <table>`; without --pending it is skipped.
    const needs = raw.match(/^-- requires: (\S+)/m)?.[1];
    if (needs && !pendingSql) {
      const [{ found }] = await sql`select (case when ${needs} like '%(%' then to_regprocedure(${needs})::text else to_regclass(${needs})::text end) is not null as found`;
      if (!found) { lines.push(`# ${f}`, `# SKIP (needs ${needs}: migration not applied — use --pending to dry-run it)`); continue; }
    }
    // pgTAP (and the pending migration, if any) run inside the test transaction, so they are rolled back with everything else.
    // Segments map an error position back to "<file> line N".
    const segments = testSegments(f, raw, pendingFile, pendingSql);
    if (!segments) { lines.push(`# ${f}`, "# ERROR: test file has no `begin;` line"); failed++; continue; }
    const text = segments.map((x) => x.text).join("");
    lines.push(`# ${f}`);
    let results;
    try {
      results = await withOneRetry(() => sql.unsafe(text).simple(), (e) => lines.push(`# connection lost (${e.code}) before this file ran; retrying once in 3 s…`));
    } catch (e) {
      if (isConnectionError(e)) {
        lines.push(`# NOT RUN (connection error ${e.code}): this file's tests did not execute`);
        failed++;
        continue;
      }
      // The file's transaction is aborted: roll it back, report where it stopped, and go on with the next file.
      await sql.unsafe("rollback").catch(() => {});
      lines.push(...describeDbError(e, text, segments, u.password));
      failed++;
      continue;
    }
    for (const rows of results) for (const row of rows ?? []) for (const v of Object.values(row)) {
      if (typeof v !== "string") continue;
      for (const l of v.split("\n")) if (/^(ok|not ok|#|1\.\.)/.test(l)) {
        lines.push(l);
        if (l.startsWith("not ok")) failed++; else if (l.startsWith("ok")) passed++;
      }
    }
  }
} catch (e) {
  // Never echo the connection string; postgres errors don't contain the password.
  lines.push(`# ERROR (nothing committed): ${e.code ?? ""} ${String(e.message).split(u.password).join("***")}`);
  if (NETWORK_CODES.includes(e.code))
    lines.push(`# Network: ${ipv4}:${u.port || 5432} (IPv4) unreachable. Check that outbound TCP 5432 isn't blocked (VPN/firewall/antivirus).`);
  if (/tenant.*not found/i.test(e.message)) lines.push(`# Pooler user must be postgres.${ref} and the host must be the eu-west-3 pooler shown in Connect.`);
  if (e.code === "28P01") lines.push("# Login refused twice: check the database password (Settings → Database → reset it if needed).");
  failed++;
} finally {
  await sql.end({ timeout: 5 });
}
if (pendingFile) lines.push(`# dry run of ${pendingFile}: executed in each test transaction and rolled back (not applied)`);
lines.push(`# passed ${passed}, failed ${failed}`);
mkdirSync("supabase/.temp", { recursive: true });
writeFileSync("supabase/.temp/db-test.log", lines.join("\n") + "\n");
console.log(lines.join("\n"));
process.exit(failed ? 1 : 0);
