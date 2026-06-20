import type { ActivityMemory } from "@/lib/activity-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

type MemoryRow = {
  id?: string;
  activity_id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string | null;
  emoji: string;
  content: string | null;
  created_at: string;
};

function toMemory(row: MemoryRow): ActivityMemory {
  return {
    id: row.id,
    activityId: row.activity_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    participantAvatar: row.participant_avatar ?? "",
    emoji: row.emoji,
    note: row.content ?? "",
    content: row.content ?? "",
    createdAt: row.created_at,
  };
}

function toRow(memory: ActivityMemory): MemoryRow {
  return {
    activity_id: memory.activityId ?? "",
    participant_id: memory.participantId,
    participant_name: memory.participantName,
    participant_avatar: memory.participantAvatar || null,
    emoji: memory.emoji,
    content: memory.note || memory.content || null,
    created_at: memory.createdAt,
  };
}

function headers(contentType = "application/json") {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
    "Content-Type": contentType,
  };
}

export async function uploadParticipantAvatar({
  activityId,
  participantId,
  file,
}: {
  activityId: string;
  participantId: string;
  file: File;
}) {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return "";

  const extension = file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
      ? "webp"
      : "jpg";
  const objectPath = `${activityId}/${participantId}.${extension}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Avatar upload failed");
  }

  return `${supabaseUrl}/storage/v1/object/public/avatars/${objectPath}`;
}

export async function fetchActivityMemories(activityId: string) {
  if (!isSupabaseConfigured || !supabaseUrl) return [];

  const url = `${supabaseUrl}/rest/v1/memories?activity_id=eq.${encodeURIComponent(
    activityId,
  )}&select=*&order=created_at.asc`;
  const response = await fetch(url, { headers: headers() });

  if (!response.ok) throw new Error("Memories fetch failed");
  const rows = (await response.json()) as MemoryRow[];
  return rows.map(toMemory);
}

export async function createMemory(memory: ActivityMemory) {
  if (!isSupabaseConfigured || !supabaseUrl) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/memories`, {
    method: "POST",
    headers: {
      ...headers(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(toRow(memory)),
  });

  if (!response.ok) throw new Error("Memory insert failed");
  const [row] = (await response.json()) as MemoryRow[];
  return row ? toMemory(row) : memory;
}
