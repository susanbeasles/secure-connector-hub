import type { SupabaseClient } from "@supabase/supabase-js";
import { mintToken, sha256Hex } from "../crypto.server";

/** Ingest keys: minted once, stored hashed, shown once. Same contract as broker tokens. */

type DB = SupabaseClient<any, any, any>;

export async function listSources(supabase: DB) {
  const { data, error } = await supabase
    .from("ingest_sources")
    .select("id, name, server_id, key_prefix, redact_keys, disabled, last_seen_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSource(
  supabase: DB,
  userId: string,
  input: { name: string; serverId: string | null; redactKeys: string[] },
) {
  const key = mintToken();
  const { data, error } = await supabase
    .from("ingest_sources")
    .insert({
      user_id: userId,
      name: input.name,
      server_id: input.serverId,
      key_hash: await sha256Hex(key),
      key_prefix: key.slice(0, 10),
      redact_keys: input.redactKeys,
    })
    .select("id, name, key_prefix")
    .single();
  if (error) throw new Error(error.message);
  return { ...data, key };
}

export async function setSourceState(supabase: DB, input: { sourceId: string; disabled: boolean }) {
  const { error } = await supabase
    .from("ingest_sources")
    .update({ disabled: input.disabled })
    .eq("id", input.sourceId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
