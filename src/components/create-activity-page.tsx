import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MapPin,
} from "lucide-react";
import { createActivity } from "@/lib/activity-store";

const titleLimit = 30;
const noteLimit = 100;
const rowHeight = 44;

const yearOptions = Array.from({ length: 6 }, (_, index) => {
  const value = String(2026 + index);
  return { value, label: `${value}年` };
});
const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, "0");
  return { value, label: `${index + 1}月` };
});

function getDayOptions(year: string, month: string) {
  const dayCount = new Date(Number(year), Number(month), 0).getDate();
  return Array.from({ length: dayCount }, (_, index) => {
    const value = String(index + 1).padStart(2, "0");
    return { value, label: `${index + 1}日` };
  });
}

type WheelOption = {
  value: string;
  label: string;
};

function WheelColumn({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: WheelOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    if (selectedIndex >= 0 && wheelRef.current) {
      wheelRef.current.scrollTo({
        top: selectedIndex * rowHeight,
        behavior: "smooth",
      });
    }
  }, [options, value]);

  return (
    <div
      ref={wheelRef}
      role="listbox"
      aria-label={ariaLabel}
      className="time-wheel relative h-[132px] snap-y snap-mandatory overflow-y-auto overscroll-contain"
      onScroll={(event) => {
        if (scrollTimerRef.current) {
          window.clearTimeout(scrollTimerRef.current);
        }

        const scrollTop = event.currentTarget.scrollTop;
        scrollTimerRef.current = window.setTimeout(() => {
          const index = Math.max(
            0,
            Math.min(options.length - 1, Math.round(scrollTop / rowHeight)),
          );
          onChange(options[index].value);
        }, 90);
      }}
    >
      <div aria-hidden="true" className="h-11" />
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onChange(option.value)}
            className={`flex h-11 w-full snap-center items-center justify-center whitespace-nowrap px-1 text-center transition duration-200 ${
              isSelected
                ? "text-[17px] font-medium text-[#f8f4ed]"
                : "text-[14px] text-[#f8f4ed]/35"
            }`}
          >
            {option.label}
          </button>
        );
      })}
      <div aria-hidden="true" className="h-11" />
    </div>
  );
}

export function CreateActivityPage() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("2026.07.20");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isTimePickerClosing, setIsTimePickerClosing] = useState(false);
  const [initialYear, initialMonth, initialDay] = date.split(".");
  const [draftYear, setDraftYear] = useState(initialYear);
  const [draftMonth, setDraftMonth] = useState(initialMonth);
  const [draftDay, setDraftDay] = useState(initialDay);
  const [isClosing, setIsClosing] = useState(false);
  const dayOptions = getDayOptions(draftYear, draftMonth);

  const openTimePicker = () => {
    const [year, month, day] = date.split(".");
    setDraftYear(year);
    setDraftMonth(month);
    setDraftDay(day);
    setIsTimePickerClosing(false);
    setIsTimePickerOpen(true);
  };

  const closeTimePicker = () => {
    if (isTimePickerClosing) return;
    setIsTimePickerClosing(true);
  };

  const closeCreateActivity = () => {
    if (isClosing) return;
    setIsClosing(true);
  };

  const submitActivity = () => {
    if (!title.trim() || !location.trim()) return;

    createActivity({
      title: title.trim(),
      note: note.trim(),
      location: location.trim(),
      date,
    });
    window.location.hash = "#/";
  };

  return (
    <main className="flex min-h-dvh justify-center overflow-hidden bg-[#090a0c] text-[#f8f4ed]">
      <section
        onAnimationEnd={(event) => {
          if (!isClosing || event.target !== event.currentTarget) return;
          window.location.hash = "#/";
        }}
        className={`relative min-h-dvh w-full max-w-[393px] overflow-hidden bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.36)] ${
          isClosing ? "create-activity-sheet-out" : "create-activity-sheet"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.035),transparent_32%),radial-gradient(circle_at_12%_55%,rgba(165,46,78,0.035),transparent_36%)]"
        />

        <header className="relative z-10 flex h-[88px] items-end px-6 pb-3">
          <button
            type="button"
            onClick={closeCreateActivity}
            aria-label="返回我的活动"
            className="grid size-10 place-items-center rounded-full text-[#f8f4ed]/82 transition hover:bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="size-6" strokeWidth={1.6} />
          </button>
        </header>

        <div className="relative z-10 flex min-h-[calc(100dvh-88px)] flex-col px-7 pb-[max(22px,env(safe-area-inset-bottom))] pt-10">
          <div>
            <label
              htmlFor="activity-title"
              className="block text-[14px] font-normal tracking-[0.08em] text-[#d5a778]"
            >
              这次叫什么？
            </label>
            <input
              id="activity-title"
              value={title}
              maxLength={titleLimit}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-3 h-14 w-full border-0 border-b border-[#a52e4e] bg-transparent px-0 text-[28px] font-semibold leading-[40px] tracking-[-0.035em] text-[#f8f4ed] outline-none placeholder:text-[#f8f4ed]/25"
              placeholder="给这次观影起个名字"
            />
            <p className="mt-2 text-right text-[12px] text-[#f8f4ed]/40">
              {title.length} / {titleLimit}
            </p>
          </div>

          <div className="mt-9">
            <label
              htmlFor="activity-note"
              className="block text-[14px] font-normal text-[#f8f4ed]/40"
            >
              想留下些什么？
            </label>
            <textarea
              id="activity-note"
              value={note}
              maxLength={noteLimit}
              rows={1}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1.5 h-10 w-full resize-none overflow-hidden border-0 border-b border-[#f8f4ed]/15 bg-transparent px-0 pb-2 pt-1 text-[17px] font-normal leading-7 text-[#f8f4ed]/65 outline-none placeholder:text-[#f8f4ed]/28"
              placeholder="写下一句想和朋友说的话"
            />
            <p className="mt-2 text-right text-[12px] text-[#f8f4ed]/40">
              {note.length} / {noteLimit}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex h-[88px] w-full items-center text-left">
              <span className="grid size-5 shrink-0 place-items-center text-[#a52e4e]">
                <MapPin className="size-5" strokeWidth={1.7} />
              </span>
              <label className="ml-4 min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[#d5a778]">
                  地点
                </span>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="mt-1 block w-full border-0 border-b border-[#f8f4ed]/15 bg-transparent px-0 pb-1 text-[17px] text-[#f8f4ed] outline-none placeholder:text-[#f8f4ed]/30"
                  placeholder="输入地点"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={openTimePicker}
              className="flex h-[88px] w-full items-center text-left transition active:scale-[0.99]"
            >
              <span className="grid size-5 shrink-0 place-items-center text-[#a52e4e]">
                <CalendarDays className="size-5" strokeWidth={1.7} />
              </span>
              <span className="ml-4 min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-[#d5a778]">
                  日期
                </span>
                <span className="mt-1 block text-[17px] text-[#f8f4ed]">
                  {date.replace(
                    /^(\d{4})\.(\d{2})\.(\d{2})$/,
                    (_, year, month, day) =>
                      `${year}年${Number(month)}月${Number(day)}日`,
                  )}
                </span>
              </span>
            </button>
          </div>

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={submitActivity}
              disabled={!title.trim() || !location.trim()}
              className="create-activity-button h-14 w-full rounded-[16px] text-[17px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
            >
              创建观影局
            </button>
          </div>
        </div>

        {isTimePickerOpen && (
          <div className="fixed inset-y-0 left-1/2 z-50 w-full max-w-[393px] -translate-x-1/2">
            <button
              type="button"
              aria-label="关闭日期选择器"
              onClick={closeTimePicker}
              className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] ${
                isTimePickerClosing
                  ? "time-picker-overlay-out"
                  : "time-picker-overlay-in"
              }`}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="选择活动日期"
              onAnimationEnd={(event) => {
                if (
                  !isTimePickerClosing ||
                  event.target !== event.currentTarget
                ) {
                  return;
                }

                setIsTimePickerOpen(false);
                setIsTimePickerClosing(false);
              }}
              className={`absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[#23262d] px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${
                isTimePickerClosing
                  ? "time-picker-sheet-out"
                  : "time-picker-sheet"
              }`}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-[#f8f4ed]/28" />
              <div className="mt-5">
                <div>
                  <h2 className="text-[18px] font-medium text-[#f8f4ed]">
                    选择日期
                  </h2>
                  <p className="mt-1 text-[12px] text-[#f8f4ed]/40">
                    选一个大家方便见面的日子
                  </p>
                </div>
              </div>

              <div className="relative mt-6 grid grid-cols-3 gap-2 overflow-hidden rounded-[16px] bg-[#1c1f24] px-3">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-11 h-11 rounded-[12px] border border-[#8b1e3f]/30 bg-[#8b1e3f]/12"
                />
                <WheelColumn
                  options={yearOptions}
                  value={draftYear}
                  onChange={setDraftYear}
                  ariaLabel="年份"
                />
                <WheelColumn
                  options={monthOptions}
                  value={draftMonth}
                  onChange={setDraftMonth}
                  ariaLabel="月份"
                />
                <WheelColumn
                  options={dayOptions}
                  value={draftDay}
                  onChange={setDraftDay}
                  ariaLabel="日期"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const validDay = String(
                    Math.min(
                      Number(draftDay),
                      new Date(
                        Number(draftYear),
                        Number(draftMonth),
                        0,
                      ).getDate(),
                    ),
                  ).padStart(2, "0");
                  setDate(`${draftYear}.${draftMonth}.${validDay}`);
                  closeTimePicker();
                }}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(90deg,#8a1f3f_0%,#a52e4e_50%,#b53a59_100%)] text-[16px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
              >
                <Check className="size-4.5" strokeWidth={1.8} />
                确认日期
              </button>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
