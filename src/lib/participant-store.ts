export type Participant = {
  participantId: string;
  nickname: string;
  avatarUrl: string;
};

const userProfileStorageKey = "frameclub_user_profile.v1";

export const participantStorageKey = (activityId: string) =>
  `frameclub_participant_${activityId}`;

function parseParticipant(storedValue: string | null): Participant | null {
  try {
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

export function getParticipant(activityId?: string): Participant | null {
  const userProfile = parseParticipant(
    window.localStorage.getItem(userProfileStorageKey),
  );
  if (userProfile) return userProfile;

  if (!activityId) return null;

  const legacyParticipant = parseParticipant(
    window.localStorage.getItem(participantStorageKey(activityId)),
  );
  if (legacyParticipant) saveParticipant(legacyParticipant);
  return legacyParticipant;
}

export function saveParticipant(participant: Participant): void;
export function saveParticipant(
  activityId: string,
  participant: Participant,
): void;
export function saveParticipant(
  activityIdOrParticipant: string | Participant,
  maybeParticipant?: Participant,
) {
  const participant =
    typeof activityIdOrParticipant === "string"
      ? maybeParticipant
      : activityIdOrParticipant;
  if (!participant) return;

  window.localStorage.setItem(userProfileStorageKey, JSON.stringify(participant));

  if (typeof activityIdOrParticipant === "string") {
    window.localStorage.setItem(
      participantStorageKey(activityIdOrParticipant),
      JSON.stringify(participant),
    );
  }

  window.dispatchEvent(
    new CustomEvent("frameclub:user-profile-updated", { detail: participant }),
  );
}

export function createParticipantId() {
  return crypto.randomUUID?.() ?? `participant-${Date.now()}`;
}
