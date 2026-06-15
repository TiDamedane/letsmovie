import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-black/[0.055] bg-[#f1f3f0] text-[#111]",
        className,
      )}
      {...props}
    />
  );
}
