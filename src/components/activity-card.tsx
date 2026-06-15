import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Activity } from "@/lib/activity-store";
import { getMovieById } from "@/lib/movie-database";
import hostImage from "../../picture/user/IMG_20260611_210240.jpg";
import memberOneImage from "../../picture/user/IMG_20260611_210255.jpg";
import memberTwoImage from "../../picture/user/IMG_20260611_210306.jpg";
import memberThreeImage from "../../picture/user/IMG_20260611_210318.jpg";
import memberFourImage from "../../picture/user/IMG_20260611_210333.jpg";

const members = [
  memberOneImage,
  memberTwoImage,
  memberThreeImage,
  memberFourImage,
];

function formatActivityDate(activity: Activity) {
  const [year, month, day] = activity.date.split(".");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

export function ActivityCard({
  activity,
  animatePoster = false,
  archiveExit = false,
  href,
}: {
  activity: Activity;
  animatePoster?: boolean;
  archiveExit?: boolean;
  href?: string;
}) {
  const selectedMovie = activity.selectedMovieId
    ? getMovieById(activity.selectedMovieId)
    : undefined;

  return (
    <a
      href={href ?? `#/activities/${encodeURIComponent(activity.id)}`}
      className={`group block rounded-[20px] outline-none focus-visible:ring-4 focus-visible:ring-[#8b1e3f]/30 ${
        archiveExit ? "activity-card-archive-exit pointer-events-none" : ""
      }`}
      aria-label={`查看活动：${activity.title}`}
    >
      <Card className="activity-card-wine relative h-[268px] overflow-hidden rounded-[20px] border-0 px-[22px] py-[22px] shadow-[0_22px_55px_rgba(44,5,20,0.3),0_7px_20px_rgba(0,0,0,0.2)] transition duration-300 group-active:scale-[0.99]">
        {selectedMovie && (
          <div
            className={`pointer-events-none absolute inset-0 ${
              animatePoster
                ? "activity-card-poster-reveal"
                : "activity-card-poster-visible"
            }`}
          >
            <img
              src={selectedMovie.src}
              alt=""
              className="size-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(0,0,0,0.28)_100%),linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.62)_100%),linear-gradient(90deg,rgba(0,0,0,0.3),transparent_68%)]" />
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-start">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold tracking-[0.12em] text-[#f8f4ed]/80">
                <span
                  className={`size-[7px] rounded-full ${
                    activity.status === "selected"
                      ? "bg-[#4fa86a]"
                      : "bg-[#d97706]"
                  }`}
                />
                {activity.status === "selected"
                  ? "影片已选定"
                  : activity.status === "picking"
                    ? "影片挑选中"
                    : "影片收集中"}
              </div>
              <h1 className="max-w-[230px] text-[28px] font-medium leading-[1.08] tracking-[-0.045em] text-[#f8f4ed] [text-shadow:0_2px_12px_rgb(0_0_0/0.35)]">
                {activity.title}
              </h1>
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px] font-normal text-[#f8f4ed]/70 [text-shadow:0_1px_8px_rgb(0_0_0/0.4)]">
                <span>{activity.location}</span>
                <span aria-hidden="true">·</span>
                <CalendarDays className="size-3" strokeWidth={2.2} />
                <span>{formatActivityDate(activity)}</span>
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-end justify-between gap-5">
            <div className="flex flex-col items-start">
              <img
                src={hostImage}
                alt="活动主持人"
                className="size-9 rounded-full object-cover shadow-sm"
              />
            </div>

            <div className="flex flex-col items-end">
              <div className="flex -space-x-2.5">
                {members.map((member, index) => (
                  <img
                    key={member}
                    src={member}
                    alt={`参与成员 ${index + 1}`}
                    className="size-8 rounded-full object-cover shadow-sm"
                  />
                ))}
                <div className="grid size-8 place-items-center rounded-full bg-[#25272c] text-[9px] font-medium text-[#f8f4ed] shadow-sm">
                  +3
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </a>
  );
}
