import { useEffect, useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { getActivities, type Activity } from "@/lib/activity-store";

export function MyActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [posterRevealActivityIds, setPosterRevealActivityIds] = useState<
    Set<string>
  >(new Set());
  const [archiveExitActivityIds, setArchiveExitActivityIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
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
        (activity) => !activity.archivedAt || pendingArchiveIds.has(activity.id),
      ),
    );

    if (pendingArchiveIds.size > 0) {
      const timer = window.setTimeout(() => {
        setActivities((currentActivities) =>
          currentActivities.filter(
            (activity) => !pendingArchiveIds.has(activity.id),
          ),
        );
        setArchiveExitActivityIds(new Set());
      }, 320);

      return () => window.clearTimeout(timer);
    }
  }, []);

  return (
    <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
      <div className="phone-canvas bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)]">
        <div className="px-7 pb-36 pt-[72px]">
          <h1 className="text-[28px] font-medium leading-none tracking-[-0.04em] text-[#f8f4ed]">
            我的活动
          </h1>
          {activities.length > 0 && (
            <div className="mt-6 space-y-5">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  animatePoster={posterRevealActivityIds.has(activity.id)}
                  archiveExit={archiveExitActivityIds.has(activity.id)}
                />
              ))}
            </div>
          )}
        </div>

        <BottomNavigation active="activities" />
      </div>
    </main>
  );
}
