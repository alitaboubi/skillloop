/**
 * Self-service account deletion (free tier, no service-role key).
 *
 * Order matters:
 *   1. remove every file in the user's own Storage folder `<userId>/…` (Storage API, the user's own session — SQL
 *      must never delete Storage files);
 *   2. call public.delete_my_account() (migration 20261025120000_account_deletion.sql): deletes the sign-in account
 *      and personal content, anonymises the profile, keeps requests/messages for the other person.
 * If step 1 fails nothing else happens; if step 2 fails the files are gone but the account and data remain, and the
 * user can simply retry. What is deleted / anonymised / retained: docs/account-deletion.md.
 *
 * Off until the migration is applied: VITE_ACCOUNT_DELETION=on (public build flag). Off ⇒ the settings page
 * explains how to ask for deletion instead (privacy page contact).
 */
export const ACCOUNT_DELETION_ENABLED = import.meta.env["VITE_ACCOUNT_DELETION"] === "on";

export const PHOTO_BUCKET = "service-images";

type ListEntry = { name: string; id: string | null };
type ListResult = { data: ListEntry[] | null; error: unknown };
export type DeletionClient = {
  list: (prefix: string) => Promise<ListResult>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
  rpc: () => Promise<{ error: unknown }>;
};

/** Every file path under `<userId>/` (folders have id null in Storage listings and are walked). */
export async function collectOwnFiles(list: DeletionClient["list"], userId: string): Promise<string[] | null> {
  const files: string[] = [];
  const walk = async (prefix: string, depth: number): Promise<boolean> => {
    if (depth > 4) return true; // the app writes at most <user>/<kind>/<file>; never loop on odd data
    const { data, error } = await list(prefix);
    if (error || !data) return false;
    for (const e of data) {
      const path = `${prefix}/${e.name}`;
      if (e.id === null) { if (!(await walk(path, depth + 1))) return false; }
      else files.push(path);
    }
    return true;
  };
  return (await walk(userId, 0)) ? files : null;
}

export type DeletionResult = { ok: true } | { ok: false; step: "files" | "account" };

export async function deleteMyAccount(client: DeletionClient, userId: string): Promise<DeletionResult> {
  const files = await collectOwnFiles(client.list, userId);
  if (!files) return { ok: false, step: "files" };
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await client.remove(files.slice(i, i + 100));
    if (error) return { ok: false, step: "files" };
  }
  const { error } = await client.rpc();
  return error ? { ok: false, step: "account" } : { ok: true };
}
