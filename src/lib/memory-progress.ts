import type {
  Activity,
  ActivityMemory,
  ActivityParticipantSnapshot,
} from "@/lib/activity-store";
import type { Participant } from "@/lib/participant-store";

export type MemoryParticipant = {
  participantId: string;
};

export function getMemoryParticipantId(memory: ActivityMemory) {
  return memory.participantId || memory.memberId || "";
}

export function getCurrentParticipantMemory(
  memories: ActivityMemory[] | undefined,
  participant: Participant | null,
) {
  if (!participant) return undefined;

  return memories?.find(
    (memory) => getMemoryParticipantId(memory) === participant.participantId,
  );
}

export function mergeParticipantMemory(
  memories: ActivityMemory[] | undefined,
  nextMemory: ActivityMemory,
) {
  return [
    ...(memories ?? []).filter(
      (memory) => getMemoryParticipantId(memory) !== nextMemory.participantId,
    ),
    nextMemory,
  ];
}

export function mergeActivityParticipants(
  currentParticipants: ActivityParticipantSnapshot[] | undefined,
  nextParticipants: ActivityParticipantSnapshot[],
) {
  const participantMap = new Map<string, ActivityParticipantSnapshot>();

  [...(currentParticipants ?? []), ...nextParticipants].forEach(
    (participant) => {
      if (!participant.participantId) return;
      const currentParticipant = participantMap.get(participant.participantId);
      participantMap.set(participant.participantId, {
        ...currentParticipant,
        ...participant,
        createdAt: currentParticipant?.createdAt ?? participant.createdAt,
      });
    },
  );

  return Array.from(participantMap.values()).sort((left, right) =>
    (left.createdAt ?? "").localeCompare(right.createdAt ?? ""),
  );
}

export function isActivityMemoryComplete(
  memories: ActivityMemory[] | undefined,
  participants: MemoryParticipant[],
) {
  const participantIds = new Set(
    participants
      .map((participant) => participant.participantId)
      .filter(Boolean),
  );

  if (participantIds.size < 2) return false;

  const memoryParticipantIds = new Set(
    (memories ?? []).map(getMemoryParticipantId).filter(Boolean),
  );

  return Array.from(participantIds).every((participantId) =>
    memoryParticipantIds.has(participantId),
  );
}

export function isCurrentParticipantWaitingForFriends(
  activity: Activity,
  participant: Participant | null,
) {
  return Boolean(
    !activity.archivedAt &&
      getCurrentParticipantMemory(activity.memories, participant),
  );
}
