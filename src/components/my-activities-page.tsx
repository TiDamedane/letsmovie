import { useEffect, useMemo, useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { UserProfileDialog } from "@/components/user-profile-dialog";
import {
  getActivities,
  saveActivity,
  type Activity,
  type ActivityMemory,
} from "@/lib/activity-store";
import {
  getCurrentParticipantMemory,
  isActivityMemoryComplete,
  isCurrentParticipantWaitingForFriends,
  mergeActivityParticipants,
  type MemoryParticipant,
} from "@/lib/memory-progress";
import { saveMovies } from "@/lib/movie-database";
import { getParticipant, type Participant } from "@/lib/participant-store";
import {
  fetchRemoteActivityBundle,
  updateRemoteActivity,
  upsertRemoteParticipant,
  type RemoteActivityBundle,
} from "@/lib/supabase-activity";
import { fetchActivityMemories } from "@/lib/supabase-memory";

function mergeRemoteActivity(
  localActivity: Activity,
  bundle: RemoteActivityBundle | null,
  remoteMemories: ActivityMemory[],
) {
  const participants = bundle
    ? mergeActivityParticipants(localActivity.participants, bundle.participants)
    : localActivity.participants;
  const localParticipant = getParticipant(localActivity.id);
  const localParticipantSnapshot = localParticipant
    ? participants?.find(
        (participant) =>
          participant.participantId === localParticipant.participantId,
      )
    : undefined;
  const nextParticipants =
    localParticipant && localParticipantSnapshot
      ? mergeActivityParticipants(participants, [
          {
            ...localParticipant,
            role: localParticipantSnapshot.role,
            createdAt: localParticipantSnapshot.createdAt,
          },
        ])
      : participants;
  const currentMemory = getCurrentParticipantMemory(
    remoteMemories.length > 0 ? remoteMemories : localActivity.memories,
    localParticipant,
  );
  const shouldKeepLocalMemoryFields =
    remoteMemories.length === 0 && Boolean(currentMemory);

  return {
    ...(bundle?.activity ?? localActivity),
    memoryEmoji:
      currentMemory?.emoji ??
      (shouldKeepLocalMemoryFields ? localActivity.memoryEmoji : undefined),
    memoryNote:
      (currentMemory?.note || currentMemory?.content) ??
      (shouldKeepLocalMemoryFields ? localActivity.memoryNote : undefined),
    memoryCreatedAt:
      currentMemory?.createdAt ??
      (shouldKeepLocalMemoryFields ? localActivity.memoryCreatedAt : undefined),
    memoryTicketNumber: currentMemory
      ? localActivity.memoryTicketNumber
      : undefined,
    memories:
      remoteMemories.length > 0 ? remoteMemories : localActivity.memories,
    participants: nextParticipants,
    archivedAt: localActivity.archivedAt ?? bundle?.activity.archivedAt,
  };
}

function getMemoryParticipantScope(
  activity: Activity,
  bundle: RemoteActivityBundle | null,
) {
  const participantMap = new Map<string, MemoryParticipant>();

  activity.participants?.forEach((participant) => {
    participantMap.set(participant.participantId, {
      participantId: participant.participantId,
    });
  });

  bundle?.participants.forEach((participant) => {
    participantMap.set(participant.participantId, {
      participantId: participant.participantId,
    });
  });

  const localParticipant = getParticipant(activity.id);
  if (localParticipant) {
    participantMap.set(localParticipant.participantId, {
      participantId: localParticipant.participantId,
    });
  }

  return Array.from(participantMap.values());
}

async function refreshActivityMemoryProgress(activity: Activity) {
  const [bundle, remoteMemories] = await Promise.all([
    fetchRemoteActivityBundle(activity.id).catch(() => null),
    fetchActivityMemories(activity.id).catch(() => []),
  ]);

  if (bundle) saveMovies(bundle.movies);

  const nextActivity = mergeRemoteActivity(activity, bundle, remoteMemories);
  const participantScope = getMemoryParticipantScope(nextActivity, bundle);
  const shouldArchive =
    !nextActivity.archivedAt &&
    isActivityMemoryComplete(nextActivity.memories, participantScope);
  const archiveTime = shouldArchive ? new Date().toISOString() : undefined;
  const updatedActivity = shouldArchive
    ? {
        ...nextActivity,
        archivedAt: archiveTime,
      }
    : nextActivity;

  if (shouldArchive) {
    updateRemoteActivity(activity.id, { archivedAt: archiveTime }).catch(
      () => {},
    );
  }

  saveActivity(updatedActivity);

  return {
    activityId: activity.id,
    archived: shouldArchive,
  };
}

export function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentParticipant, setCurrentParticipant] =
    useState<Participant | null>(() => getParticipant());
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(
    () => !getParticipant(),
  );
  const [posterRevealActivityIds, setPosterRevealActivityIds] = useState<
    Set<string>
  >(new Set());
  const [archiveExitActivityIds, setArchiveExitActivityIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    let isActive = true;

    async function loadActivities() {
      const storedActivities = getActivities();
      const refreshedResults = await Promise.all(
        storedActivities
          .filter((activity) => !activity.archivedAt)
          .map(refreshActivityMemoryProgress),
      );

      if (!isActive) return;

      const nextActivities = getActivities();
      const pendingArchiveIds = new Set(
        nextActivities
          .filter(
            (activity) =>
              activity.archivedAt &&
              window.sessionStorage.getItem(
                `letsmovie.activity-archive-exit.${activity.id}`,
              ) === "pending",
          )
          .map((activity) => activity.id),
      );

      refreshedResults
        .filter((result) => result.archived)
        .forEach((result) => pendingArchiveIds.add(result.activityId));

      const pendingRevealIds = new Set(
        nextActivities
          .filter(
            (activity) =>
              activity.selectedMovieId &&
              window.sessionStorage.getItem(
                `letsmovie.activity-poster-reveal.${activity.id}`,
              ) === "pending",
          )
          .map((activity) => activity.id),
      );

      pendingRevealIds.forEach((activityId) => {
        window.sessionStorage.removeItem(
          `letsmovie.activity-poster-reveal.${activityId}`,
        );
      });

      pendingArchiveIds.forEach((activityId) => {
        window.sessionStorage.removeItem(
          `letsmovie.activity-archive-exit.${activityId}`,
        );
      });

      setArchiveExitActivityIds(pendingArchiveIds);
      setPosterRevealActivityIds(pendingRevealIds);
      setActivities(
        nextActivities.filter(
          (activity) =>
            !activity.archivedAt || pendingArchiveIds.has(activity.id),
        ),
      );

      if (pendingArchiveIds.size > 0) {
        window.setTimeout(() => {
          if (!isActive) return;
          setActivities((currentActivities) =>
            currentActivities.filter(
              (activity) => !pendingArchiveIds.has(activity.id),
            ),
          );
          setArchiveExitActivityIds(new Set());
        }, 320);
      }
    }

    loadActivities();
    const timer = window.setInterval(loadActivities, 8000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const participant = (event as CustomEvent<Participant>).detail;
      setCurrentParticipant(participant);
    };

    window.addEventListener(
      "frameclub:user-profile-updated",
      handleProfileUpdate,
    );
    return () => {
      window.removeEventListener(
        "frameclub:user-profile-updated",
        handleProfileUpdate,
      );
    };
  }, []);

  const waitingActivityIds = useMemo(
    () =>
      new Set(
        activities
          .filter((activity) =>
            isCurrentParticipantWaitingForFriends(
              activity,
              getParticipant(activity.id),
            ),
          )
          .map((activity) => activity.id),
      ),
    [activities],
  );

  const saveProfileAcrossActivities = async (participant: Participant) => {
    setCurrentParticipant(participant);
    setIsProfileDialogOpen(false);

    const updatedActivities = getActivities().map((activity) => {
      const storedParticipant = activity.participants?.find(
        (activityParticipant) =>
          activityParticipant.participantId === participant.participantId,
      );
      if (!storedParticipant) return activity;

      const nextActivity = {
        ...activity,
        participants: mergeActivityParticipants(activity.participants, [
          {
            ...participant,
            role: storedParticipant.role,
            createdAt: storedParticipant.createdAt,
          },
        ]),
      };
      saveActivity(nextActivity);
      upsertRemoteParticipant({
        activityId: activity.id,
        participant,
        role: storedParticipant.role,
      }).catch(() => {
        // Local profile updates should not depend on cloud sync availability.
      });
      return nextActivity;
    });

    setActivities(
      updatedActivities.filter(
        (activity) =>
          !activity.archivedAt || archiveExitActivityIds.has(activity.id),
      ),
    );
  };

  return (
    <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
      <div className="phone-canvas bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)]">
        <div className="home-page-scroll px-7 pb-40 pt-[72px]">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[28px] font-medium leading-none tracking-[-0.04em] text-[#f8f4ed]">
              我的活动
            </h1>
            {currentParticipant?.avatarUrl && (
              <button
                type="button"
                aria-label="编辑个人资料"
                onClick={() => setIsProfileDialogOpen(true)}
                className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-[#f8f4ed]/14 bg-[#1c1f24] shadow-[0_10px_24px_rgba(0,0,0,0.28)] transition active:scale-95"
              >
                <img
                  src={currentParticipant.avatarUrl}
                  alt=""
                  className="size-full object-cover"
                />
              </button>
            )}
          </header>
          {activities.length > 0 && (
            <div className="mt-6 space-y-5">
              {activities.map((activity) => {
                const isWaitingForFriends = waitingActivityIds.has(activity.id);

                return (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    animatePoster={posterRevealActivityIds.has(activity.id)}
                    archiveExit={archiveExitActivityIds.has(activity.id)}
                    statusLabel={
                      isWaitingForFriends ? "等待朋友回忆" : undefined
                    }
                    statusTone={
                      isWaitingForFriends ? "waiting" : "default"
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        <BottomNavigation active="activities" />
        {isProfileDialogOpen && (
          <UserProfileDialog
            initialParticipant={currentParticipant}
            required={!currentParticipant}
            onClose={() => setIsProfileDialogOpen(false)}
            onSave={saveProfileAcrossActivities}
          />
        )}
      </div>
    </main>
  );
}
