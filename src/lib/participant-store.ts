export type Participant = {
  participantId: string;
  nickname: string;
  avatarUrl: string;
};

export const participantStorageKey = (activityId: string) =>
  `frameclub_participant_${activityId}`;

export function getParticipant(activityId: string): Participant | null {
  try {
    const storedValue = window.localStorage.getItem(
      participantStorageKey(activityId),
    );
    if (!storedValue) return null;

    const participant = JSON.parse(storedValue) as Partial<Participant>;
    if (!participant.participantId || !participant.nickname) return null;

    return {
      participantId: participant.participantId,
      nickname: participant.nickname,
      avatarUrl: participant.avatarUrl ?? "",
    };
  } catch {
    return null;
  }
}

export function saveParticipant(
  activityId: string,
  participant: Participant,
) {
  window.localStorage.setItem(
    participantStorageKey(activityId),
    JSON.stringify(participant),
  );
}

export function createParticipantId() {
  return crypto.randomUUID?.() ?? `participant-${Date.now()}`;
}
