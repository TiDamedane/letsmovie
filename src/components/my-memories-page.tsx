import { useEffect, useMemo, useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { UserProfileDialog } from "@/components/user-profile-dialog";
import {
  getActivities,
  saveActivity,
  type Activity,
} from "@/lib/activity-store";
import { mergeActivityParticipants } from "@/lib/memory-progress";
import { getParticipant, type Participant } from "@/lib/participant-store";
import { upsertRemoteParticipant } from "@/lib/supabase-activity";

function activityStartTimestamp(activity: Activity) {
  const normalizedDate = activity.date.replaceAll(".", "-");
  const timestamp = Date.parse(`${normalizedDate}T00:00:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function MyMemoriesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentParticipant, setCurrentParticipant] =
    useState<Participant | null>(() => getParticipant());
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(
    () => !getParticipant(),
  );

  useEffect(() => {
    setActivities(getActivities().filter((activity) => activity.archivedAt));
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

  const sortedMemories = useMemo(
    () =>
      [...activities].sort((left, right) => {
        const dateDifference =
          activityStartTimestamp(right) - activityStartTimestamp(left);
        if (dateDifference !== 0) return dateDifference;

        return (right.archivedAt ?? "").localeCompare(left.archivedAt ?? "");
      }),
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
        // Local profile edits should stay usable even when cloud sync is down.
      });
      return nextActivity;
    });

    setActivities(updatedActivities.filter((activity) => activity.archivedAt));
  };

  return (
    <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
      <div className="phone-canvas bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)]">
        <div className="home-page-scroll px-7 pb-40 pt-[72px]">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[28px] font-medium leading-none tracking-[-0.04em]">
              我的回忆
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

          {sortedMemories.length > 0 ? (
            <div className="mt-6 space-y-5">
              {sortedMemories.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  href={`#/memories/${encodeURIComponent(activity.id)}`}
                  showStatus={false}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[460px] items-center justify-center text-center">
              <p className="text-[14px] text-[#f8f4ed]/40">
                还没有留下回忆
              </p>
            </div>
          )}
        </div>

        <BottomNavigation active="memories" />
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
