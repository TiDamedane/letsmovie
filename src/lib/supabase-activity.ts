import type { Activity, ActivityStatus } from "@/lib/activity-store";
import type { Movie } from "@/lib/movie-database";
import type { Participant } from "@/lib/participant-store";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isActivitySyncConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type ActivityParticipant = Participant & {
  role: "host" | "member";
  createdAt?: string;
};

type ActivityRow = {
  id: string;
  title: string;
  note: string | null;
  location: string;
  date: string;
  hour: string | null;
  minute: string | null;
  status: ActivityStatus;
  selected_movie_id: string | null;
  archived_at?: string | null;
  created_at: string;
};

type ParticipantRow = {
  activity_id: string;
  participant_id: string;
  nickname: string;
  avatar_url: string | null;
  role: "host" | "member";
  created_at: string;
};

type ActivityMovieRow = {
  activity_id: string;
  movie_id: string;
  title: string;
  director: string | null;
  recommender: string;
  src: string;
  tmdb_id: number | null;
  created_at: string;
};

export type RemoteActivityBundle = {
  activity: Activity;
  participants: ActivityParticipant[];
  movies: Movie[];
};

function headers(contentType = "application/json") {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
    "Content-Type": contentType,
  };
}

function toActivity(row: ActivityRow, movies: Movie[]): Activity {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? "",
    location: row.location,
    date: row.date,
    hour: row.hour ?? undefined,
    minute: row.minute ?? undefined,
    status: row.status,
    candidateMovieIds: movies.map((movie) => movie.id),
    selectedMovieId: row.selected_movie_id ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
  };
}

function toActivityRow(activity: Activity): ActivityRow {
  return {
    id: activity.id,
    title: activity.title,
    note: activity.note || null,
    location: activity.location,
    date: activity.date,
    hour: activity.hour ?? null,
    minute: activity.minute ?? null,
    status: activity.status,
    selected_movie_id: activity.selectedMovieId ?? null,
    created_at: activity.createdAt,
  };
}

function toParticipant(row: ParticipantRow): ActivityParticipant {
  return {
    participantId: row.participant_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url ?? "",
    role: row.role,
    createdAt: row.created_at,
  };
}

function toParticipantRow(
  activityId: string,
  participant: Participant,
  role: "host" | "member",
): ParticipantRow {
  return {
    activity_id: activityId,
    participant_id: participant.participantId,
    nickname: participant.nickname,
    avatar_url: participant.avatarUrl || null,
    role,
    created_at: new Date().toISOString(),
  };
}

function toMovie(row: ActivityMovieRow): Movie {
  return {
    id: row.movie_id,
    title: row.title,
    director: row.director ?? "",
    recommender: row.recommender,
    src: row.src,
    tmdbId: row.tmdb_id ?? undefined,
  };
}

function toMovieRow(activityId: string, movie: Movie): ActivityMovieRow {
  return {
    activity_id: activityId,
    movie_id: movie.id,
    title: movie.title,
    director: movie.director || null,
    recommender: movie.recommender,
    src: movie.src,
    tmdb_id: movie.tmdbId ?? null,
    created_at: new Date().toISOString(),
  };
}

async function upsertRows<T>(
  table: string,
  rows: T | T[],
  conflictColumns: string,
) {
  if (!isActivitySyncConfigured || !supabaseUrl) return null;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${conflictColumns}`,
    {
      method: "POST",
      headers: {
        ...headers(),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) throw new Error(`${table} upsert failed`);
  return (await response.json()) as T[];
}

export async function upsertRemoteActivity(activity: Activity) {
  const rows = await upsertRows("activities", toActivityRow(activity), "id");
  return rows?.[0] ? toActivity(rows[0] as ActivityRow, []) : null;
}

export async function updateRemoteActivity(
  activityId: string,
  updates: Partial<Pick<Activity, "status" | "selectedMovieId" | "archivedAt">>,
) {
  if (!isActivitySyncConfigured || !supabaseUrl) return null;

  const body: Partial<ActivityRow> = {};
  if (updates.status) body.status = updates.status;
  if ("selectedMovieId" in updates) {
    body.selected_movie_id = updates.selectedMovieId ?? null;
  }
  if ("archivedAt" in updates) {
    body.archived_at = updates.archivedAt ?? null;
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/activities?id=eq.${encodeURIComponent(activityId)}`,
    {
      method: "PATCH",
      headers: {
        ...headers(),
        Prefer: "return=representation",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error("Activity update failed");
  const [row] = (await response.json()) as ActivityRow[];
  return row ? toActivity(row, []) : null;
}

export async function upsertRemoteParticipant({
  activityId,
  participant,
  role,
}: {
  activityId: string;
  participant: Participant;
  role: "host" | "member";
}) {
  const rows = await upsertRows(
    "activity_participants",
    toParticipantRow(activityId, participant, role),
    "activity_id,participant_id",
  );
  return rows?.[0] ? toParticipant(rows[0] as ParticipantRow) : null;
}

export async function upsertRemoteMovies(activityId: string, movies: Movie[]) {
  if (movies.length === 0) return [];
  const rows = await upsertRows(
    "activity_movies",
    movies.map((movie) => toMovieRow(activityId, movie)),
    "activity_id,movie_id",
  );
  return (rows as ActivityMovieRow[] | null)?.map(toMovie) ?? [];
}

export async function deleteRemoteMovie(activityId: string, movieId: string) {
  if (!isActivitySyncConfigured || !supabaseUrl) return;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/activity_movies?activity_id=eq.${encodeURIComponent(
      activityId,
    )}&movie_id=eq.${encodeURIComponent(movieId)}`,
    {
      method: "DELETE",
      headers: headers(),
    },
  );

  if (!response.ok) throw new Error("Movie delete failed");
}

export async function createRemoteActivityBundle({
  activity,
  host,
  movies,
}: {
  activity: Activity;
  host: Participant;
  movies: Movie[];
}) {
  if (!isActivitySyncConfigured) return null;

  await upsertRemoteActivity(activity);
  await upsertRemoteParticipant({
    activityId: activity.id,
    participant: host,
    role: "host",
  });
  await upsertRemoteMovies(activity.id, movies);

  return fetchRemoteActivityBundle(activity.id);
}

export async function fetchRemoteActivityBundle(
  activityId: string,
): Promise<RemoteActivityBundle | null> {
  if (!isActivitySyncConfigured || !supabaseUrl) return null;

  const encodedActivityId = encodeURIComponent(activityId);
  const [activityResponse, participantResponse, movieResponse] =
    await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/activities?id=eq.${encodedActivityId}&select=*&limit=1`,
        { headers: headers() },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/activity_participants?activity_id=eq.${encodedActivityId}&select=*&order=created_at.asc`,
        { headers: headers() },
      ),
      fetch(
        `${supabaseUrl}/rest/v1/activity_movies?activity_id=eq.${encodedActivityId}&select=*&order=created_at.asc`,
        { headers: headers() },
      ),
    ]);

  if (!activityResponse.ok) throw new Error("Activity fetch failed");
  if (!participantResponse.ok) throw new Error("Participants fetch failed");
  if (!movieResponse.ok) throw new Error("Movies fetch failed");

  const [activityRow] = (await activityResponse.json()) as ActivityRow[];
  if (!activityRow) return null;

  const participantRows = (await participantResponse.json()) as ParticipantRow[];
  const movieRows = (await movieResponse.json()) as ActivityMovieRow[];
  const movies = movieRows.map(toMovie);

  return {
    activity: toActivity(activityRow, movies),
    participants: participantRows.map(toParticipant),
    movies,
  };
}
