import { useEffect, useMemo, useState } from "react";
import { ActivityCard } from "@/components/activity-card";
import { BottomNavigation } from "@/components/bottom-navigation";
import { getActivities, type Activity } from "@/lib/activity-store";

function activityStartTimestamp(activity: Activity) {
  const normalizedDate = activity.date.replaceAll(".", "-");
  const timestamp = Date.parse(`${normalizedDate}T00:00:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function MyMemoriesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setActivities(getActivities().filter((activity) => activity.archivedAt));
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

  return (
    <main className="flex min-h-dvh justify-center bg-[#090a0c] text-[#f8f4ed]">
      <div className="relative min-h-dvh w-full max-w-[393px] bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)]">
        <div className="px-7 pb-36 pt-[72px]">
          <h1 className="text-[28px] font-medium leading-none tracking-[-0.04em]">
            我的回忆
          </h1>

          {sortedMemories.length > 0 ? (
            <div className="mt-6 space-y-5">
              {sortedMemories.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  href={`#/memories/${encodeURIComponent(activity.id)}`}
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
      </div>
    </main>
  );
}
