export type ActivityStatus = "collecting" | "picking" | "selected";

export type ActivityMemory = {
  id?: string;
  activityId?: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  memberId?: string;
  memberName?: string;
  emoji: string;
  note: string;
  content?: string;
  createdAt: string;
};

export type Activity = {
  id: string;
  title: string;
  note: string;
  location: string;
  date: string;
  hour?: string;
  minute?: string;
  status: ActivityStatus;
  candidateMovieIds: string[];
  selectedMovieId?: string;
  memoryEmoji?: string;
  memoryNote?: string;
  memoryCreatedAt?: string;
  memoryTicketNumber?: number;
  memories?: ActivityMemory[];
  archivedAt?: string;
  createdAt: string;
};

export type CreateActivityInput = Pick<
  Activity,
  "title" | "note" | "location" | "date"
> &
  Partial<Pick<Activity, "status" | "candidateMovieIds" | "selectedMovieId">>;

const storageKey = "letsmovie.activities.v1";

function readActivities(): Activity[] {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) return [];

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writeActivities(activities: Activity[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(activities));
}

export function getActivities() {
  return readActivities().sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getActivity(id: string) {
  return readActivities().find((activity) => activity.id === id);
}

export function getNextMemoryTicketNumber(excludeActivityId?: string) {
  const completedMemories = readActivities().filter(
    (activity) =>
      activity.id !== excludeActivityId &&
      Boolean(
        activity.memoryTicketNumber ||
          activity.memoryCreatedAt ||
          activity.archivedAt ||
          activity.memoryEmoji,
      ),
  );
  const highestAssignedNumber = completedMemories.reduce(
    (highest, activity) =>
      Math.max(highest, activity.memoryTicketNumber ?? 0),
    0,
  );

  return Math.max(highestAssignedNumber, completedMemories.length) + 1;
}

export function deleteActivity(id: string) {
  const activities = readActivities().filter((activity) => activity.id !== id);
  writeActivities(activities);
}

export function createActivity(input: CreateActivityInput) {
  const activity: Activity = {
    id: `activity-${Date.now()}`,
    title: input.title,
    note: input.note,
    location: input.location,
    date: input.date,
    status: input.status ?? "collecting",
    candidateMovieIds: input.candidateMovieIds ?? [],
    selectedMovieId: input.selectedMovieId,
    createdAt: new Date().toISOString(),
  };

  writeActivities([activity, ...readActivities()]);
  return activity;
}

export function updateActivity(
  id: string,
  updates: Partial<Omit<Activity, "id" | "createdAt">>,
) {
  let updatedActivity: Activity | undefined;
  const activities = readActivities().map((activity) => {
    if (activity.id !== id) return activity;

    updatedActivity = { ...activity, ...updates };
    return updatedActivity;
  });

  writeActivities(activities);
  return updatedActivity;
}
