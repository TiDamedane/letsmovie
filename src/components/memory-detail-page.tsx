import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MoreHorizontal,
} from "lucide-react";
import {
  deleteActivity,
  getActivity,
  updateActivity,
  type ActivityMemory,
} from "@/lib/activity-store";
import { getMovieById } from "@/lib/movie-database";
import { fetchActivityMemories } from "@/lib/supabase-memory";

function formatMemoryDate(date: string) {
  const [year, month, day] = date.split(".");
  return `${year}.${Number(month)}.${Number(day)}`;
}

export function MemoryDetailPage({ activityId }: { activityId: string }) {
  const [activity, setActivity] = useState(() => getActivity(activityId));
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isActionsClosing, setIsActionsClosing] = useState(false);
  const [shouldRemoveMemory, setShouldRemoveMemory] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const memories = useMemo<ActivityMemory[]>(() => {
    if (!activity) return [];
    if (activity.memories?.length) return activity.memories;
    if (!activity.memoryEmoji) return [];

    return [
      {
        memberId: "xiaoyang",
        participantId: "xiaoyang",
        participantName: "小杨",
        participantAvatar: "",
        memberName: "小杨",
        emoji: activity.memoryEmoji,
        note: activity.memoryNote ?? "",
        createdAt:
          activity.memoryCreatedAt ??
          activity.archivedAt ??
          activity.createdAt,
      },
    ];
  }, [activity]);

  useEffect(() => {
    let isActive = true;

    fetchActivityMemories(activityId)
      .then((remoteMemories) => {
        if (!isActive || remoteMemories.length === 0) return;
        const nextActivity = updateActivity(activityId, {
          memories: remoteMemories,
        });
        setActivity((currentActivity) => nextActivity ?? currentActivity);
      })
      .catch(() => {
        // Local memories are still available for offline/dev mode.
      });

    return () => {
      isActive = false;
    };
  }, [activityId]);

  useEffect(() => {
    if (selectedMemberId || memories.length === 0) return;
    setSelectedMemberId(memories[0].participantId ?? memories[0].memberId ?? "");
  }, [memories, selectedMemberId]);

  const memoryParticipants = memories.map((memory) => ({
    id: memory.participantId ?? memory.memberId ?? "",
    name: memory.participantName ?? memory.memberName ?? "",
    src: memory.participantAvatar,
  }));

  const selectedMemory = memories.find(
    (memory) => (memory.participantId ?? memory.memberId) === selectedMemberId,
  );
  const selectedMovie = activity?.selectedMovieId
    ? getMovieById(activity.selectedMovieId)
    : undefined;

  const leaveMemory = (remove = false) => {
    if (isClosing) return;
    setIsActionsOpen(false);
    setIsClosing(true);

    window.setTimeout(() => {
      if (remove) deleteActivity(activityId);
      window.location.hash = "#/memories";
    }, 420);
  };

  const closeMemoryActions = (removeAfterClosing = false) => {
    if (isActionsClosing) return;
    setShouldRemoveMemory(removeAfterClosing);
    setIsActionsClosing(true);
  };

  if (!activity || !selectedMovie || !activity.archivedAt) {
    window.location.hash = "#/memories";
    return null;
  }

  return (
    <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
      <div className="phone-canvas bg-[#090a0c]">
        <article
          className={`memory-ticket flex h-full w-full flex-col overflow-hidden bg-[#23262d] ${
            isClosing ? "detail-page-exit" : ""
          }`}
        >
          <div className="relative h-[528px] overflow-hidden">
            <img
              src={selectedMovie.src}
              alt={selectedMovie.title}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/18" />

            <button
              type="button"
              aria-label="返回我的回忆"
              onClick={() => leaveMemory()}
              className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-black/25 text-[#f8f4ed] backdrop-blur-md transition active:scale-95"
            >
              <ArrowLeft className="size-5" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="更多回忆操作"
              onClick={() => setIsActionsOpen(true)}
              className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-black/25 text-[#f8f4ed] backdrop-blur-md transition active:scale-95"
            >
              <MoreHorizontal className="size-5" strokeWidth={1.8} />
            </button>

            <span className="memory-ticket-title absolute right-7 top-[76px] text-[11px] leading-none tracking-[0.04em] text-[#f8f4ed]/80 [font-variant-numeric:lining-nums]">
              NO.{activity.memoryTicketNumber ?? 1}
            </span>
            <h1 className="memory-ticket-title absolute inset-x-6 bottom-7 text-[34px] leading-[1.12] tracking-[-0.04em] text-[#f8f4ed] [text-shadow:0_3px_18px_rgba(0,0,0,0.48)]">
              {activity.title}
            </h1>
          </div>

          <div className="relative flex flex-1 flex-col px-6 pb-10 pt-8">
            <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[#090a0c]" />
            <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[#090a0c]" />

            <h2 className="memory-ticket-title text-[25px] leading-9 tracking-[-0.035em]">
              {selectedMovie.title}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-10 text-[12px] text-[#f8f4ed]/52">
              <span>{activity.location}</span>
              <span>{formatMemoryDate(activity.date)}</span>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
              {memoryParticipants.map((participant) => {
                const isSelected = selectedMemberId === participant.id;
                return (
                  <button
                    key={participant.id}
                    type="button"
                    aria-label={`查看${participant.name}的回忆`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedMemberId(participant.id)}
                    className={`rounded-full border-2 p-0.5 transition duration-200 active:scale-95 ${
                      isSelected
                        ? "border-[#a52e4e]"
                        : "border-transparent"
                    }`}
                  >
                    {participant.src ? (
                      <img
                        src={participant.src}
                        alt=""
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="block size-10 rounded-full bg-[#2b2f36]" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedMemory && (
              <div className="memory-details-enter relative mt-6 rounded-[16px] bg-[#1c1f24] px-4 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                <span className="absolute -top-2 left-5 size-4 rotate-45 bg-[#1c1f24]" />
                <div className="relative flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#23262d] text-[21px]">
                    {selectedMemory.emoji}
                  </span>
                  <div className="flex min-h-9 flex-col justify-center">
                    <span className="text-[12px] font-medium text-[#f8f4ed]/85">
                      {selectedMemory.participantName ??
                        selectedMemory.memberName}
                    </span>
                    <p className="mt-0.5 text-[13px] leading-5 text-[#f8f4ed]/68">
                      {selectedMemory.note ||
                        selectedMemory.content ||
                        "没有留下文字"}
                    </p>
                  </div>
                  <p className="hidden">
                    {selectedMemory.note || "没有留下文字"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </article>

        {isActionsOpen && (
          <div className="phone-fixed z-50">
            <button
              type="button"
              aria-label="关闭回忆操作"
              onClick={() => closeMemoryActions()}
              className={`absolute inset-0 bg-black/62 ${
                isActionsClosing
                  ? "time-picker-overlay-out"
                  : "time-picker-overlay-in"
              }`}
            />
            <section
              role="dialog"
              aria-label="回忆操作"
              onAnimationEnd={(event) => {
                if (
                  !isActionsClosing ||
                  event.target !== event.currentTarget
                ) {
                  return;
                }

                if (shouldRemoveMemory) {
                  leaveMemory(true);
                  return;
                }

                setIsActionsOpen(false);
                setIsActionsClosing(false);
                setShouldRemoveMemory(false);
              }}
              className={`absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[#23262d] px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-[0_-24px_60px_rgba(0,0,0,0.45)] ${
                isActionsClosing
                  ? "time-picker-sheet-out"
                  : "time-picker-sheet"
              }`}
            >
              <button
                type="button"
                onClick={() => closeMemoryActions(true)}
                className="flex h-14 w-full items-center justify-center rounded-[16px] bg-[#1c1f24] text-[15px] font-medium text-[#a52e4e]"
              >
                移除回忆
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
