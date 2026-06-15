import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AvatarTone = "green" | "peach" | "blue" | "violet" | "yellow";

const tones: Record<AvatarTone, string> = {
  green: "from-[#fde7bf] to-[#d97706] text-[#3d2102]",
  peach: "from-[#ffe3d5] to-[#ff9b7a] text-[#4a2115]",
  blue: "from-[#d8ecff] to-[#77b7f5] text-[#153653]",
  violet: "from-[#eee2ff] to-[#aa82f6] text-[#2f1b54]",
  yellow: "from-[#fff2bc] to-[#efc94d] text-[#46390d]",
};

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  initials: string;
  tone?: AvatarTone;
}

export function Avatar({
  initials,
  tone = "green",
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-[#f1f3f0] bg-gradient-to-br text-[12px] font-bold tracking-[-0.02em] shadow-sm",
        tones[tone],
        className,
      )}
      aria-hidden="true"
      {...props}
    >
      {initials}
    </div>
  );
}
