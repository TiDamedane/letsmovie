import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNavigation({
  active,
}: {
  active: "activities" | "memories";
}) {
  return (
    <nav
      aria-label="底部导航"
      className="fixed bottom-7 left-1/2 z-40 grid h-14 w-[320px] max-w-[calc(100vw_-_48px)] -translate-x-1/2 grid-cols-[1fr_56px_1fr] items-center rounded-[20px] bg-[#1c1f24] px-3 shadow-[0_18px_45px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <a
        href="#/"
        className={`text-center text-[14px] font-normal text-[#f8f4ed] transition-opacity ${
          active === "activities" ? "opacity-100" : "opacity-60"
        }`}
      >
        我的活动
      </a>

      <Button
        asChild
        size="fab"
        className="size-11 justify-self-center border-0 bg-[#a52e4e] p-0 font-sans font-medium leading-none shadow-[0_8px_20px_rgba(80,9,31,0.38)] hover:bg-[#a52e4e]"
      >
        <a href="#/activities/new" aria-label="创建观影活动">
          <Plus
            aria-hidden="true"
            className="size-5 text-[#f8f4ed]"
            strokeWidth={2.3}
          />
        </a>
      </Button>

      <a
        href="#/memories"
        className={`text-center text-[14px] font-normal text-[#f8f4ed] transition-opacity ${
          active === "memories" ? "opacity-100" : "opacity-60"
        }`}
      >
        我的回忆
      </a>
    </nav>
  );
}
