import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { createActivity } from "@/lib/activity-store";
import {
  saveMovies,
  searchMovies,
  type Movie,
} from "@/lib/movie-database";

const titleLimit = 30;
const noteLimit = 100;
const rowHeight = 44;
const currentUserName = "小杨";

type CreateStep = "details" | "mode" | "movies";
type SelectionMode = "confirmed" | "random";

const modeOptions: Array<{
  id: SelectionMode;
  title: string;
  description: string;
}> = [
  {
    id: "confirmed",
    title: "确定模式",
    description: "我们已经想好要看什么了",
  },
  {
    id: "random",
    title: "随机模式",
    description: "从想看的电影里随机决定今晚看什么",
  },
];

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

function formatDateLabel(date: string) {
  return date.replace(
    /^(\d{4})\.(\d{2})\.(\d{2})$/,
    (_, year, month, day) => `${year}年${Number(month)}月${Number(day)}日`,
  );
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
  const [step, setStep] = useState<CreateStep>("details");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("2026.07.20");
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(
    null,
  );
  const [selectedMovies, setSelectedMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isTimePickerClosing, setIsTimePickerClosing] = useState(false);
  const [initialYear, initialMonth, initialDay] = date.split(".");
  const [draftYear, setDraftYear] = useState(initialYear);
  const [draftMonth, setDraftMonth] = useState(initialMonth);
  const [draftDay, setDraftDay] = useState(initialDay);
  const [isClosing, setIsClosing] = useState(false);
  const dayOptions = getDayOptions(draftYear, draftMonth);
  const isDetailsComplete = Boolean(title.trim() && location.trim());
  const canCreateActivity = selectedMovies.length > 0;

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
    if (step === "movies") {
      setStep("mode");
      return;
    }
    if (step === "mode") {
      setStep("details");
      return;
    }
    setIsClosing(true);
  };

  const goToModeStep = () => {
    if (!isDetailsComplete) return;
    setStep("mode");
  };

  const goToMovieStep = () => {
    if (!selectionMode) return;
    setSelectedMovies([]);
    setSearchQuery("");
    setSubmittedQuery("");
    setStep("movies");
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  useEffect(() => {
    let isActive = true;

    async function runSearch() {
      if (!submittedQuery.trim() || submittedQuery !== searchQuery.trim()) {
        setSearchResults([]);
        setSearchError("");
        setIsSearchingMovies(false);
        return;
      }

      setIsSearchingMovies(true);
      setSearchError("");

      try {
        const movies = await searchMovies(submittedQuery);
        if (isActive) setSearchResults(movies);
      } catch {
        if (isActive) {
          setSearchResults([]);
          setSearchError("搜索暂时失败了，稍后再试");
        }
      } finally {
        if (isActive) setIsSearchingMovies(false);
      }
    }

    runSearch();

    return () => {
      isActive = false;
    };
  }, [searchQuery, submittedQuery]);

  const toggleMovie = (movie: Movie) => {
    setSelectedMovies((movies) => {
      const isSelected = movies.some(
        (selectedMovie) => selectedMovie.id === movie.id,
      );

      if (isSelected) {
        return movies.filter((selectedMovie) => selectedMovie.id !== movie.id);
      }

      const movieWithCurrentUser = { ...movie, recommender: currentUserName };
      if (selectionMode === "confirmed") return [movieWithCurrentUser];
      return [...movies, movieWithCurrentUser];
    });
  };

  const submitActivity = () => {
    if (!isDetailsComplete || !selectionMode || selectedMovies.length === 0) {
      return;
    }

    const selectedMovieIds = selectedMovies.map((movie) => movie.id);
    saveMovies(selectedMovies);
    const activity = createActivity({
      title: title.trim(),
      note: note.trim(),
      location: location.trim(),
      date,
      candidateMovieIds: selectedMovieIds,
      status: selectionMode === "confirmed" ? "selected" : "collecting",
      selectedMovieId:
        selectionMode === "confirmed" ? selectedMovies[0].id : undefined,
    });

    if (selectionMode === "confirmed") {
      window.sessionStorage.setItem(
        `letsmovie.activity-poster-reveal.${activity.id}`,
        "pending",
      );
    }

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
            aria-label="返回"
            className="grid size-10 place-items-center rounded-full text-[#f8f4ed]/82 transition hover:bg-white/[0.04] active:scale-95"
          >
            <ArrowLeft className="size-6" strokeWidth={1.6} />
          </button>
        </header>

        <div
          className={`relative z-10 flex min-h-[calc(100dvh-88px)] flex-col px-7 pb-[max(22px,env(safe-area-inset-bottom))] ${
            step === "movies" ? "pt-0" : "pt-10"
          }`}
        >
          {step === "details" && (
            <div key="details" className="create-step-panel flex flex-1 flex-col">
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
                      {formatDateLabel(date)}
                    </span>
                  </span>
                </button>
              </div>

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={goToModeStep}
                  disabled={!isDetailsComplete}
                  className="create-activity-button h-14 w-full rounded-[16px] text-[17px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {step === "mode" && (
            <div key="mode" className="create-step-panel flex flex-1 flex-col pt-2">
              <h1 className="mt-7 text-[17px] font-medium text-[#f8f4ed]">
                要怎么选出今晚的影片呢
              </h1>

              <div className="mt-12 space-y-4">
                {modeOptions.map((option) => {
                  const isSelected = selectionMode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectionMode(option.id)}
                      className={`w-full rounded-[16px] border px-6 py-5 text-left transition duration-200 active:scale-[0.99] ${
                        isSelected
                          ? "border-[#a52e4e] bg-[#23262d] shadow-[0_0_0_1px_rgba(165,46,78,0.36)]"
                          : "border-transparent bg-[#23262d]/82 hover:bg-[#23262d]"
                      }`}
                    >
                      <span className="block text-[16px] font-medium text-[#f8f4ed]">
                        {option.title}
                      </span>
                      <span className="mt-2 block text-[13px] leading-5 text-[#f8f4ed]/46">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={goToMovieStep}
                  disabled={!selectionMode}
                  className="create-activity-button h-14 w-full rounded-[16px] text-[17px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {step === "movies" && selectionMode && (
            <div key="movies" className="create-step-panel flex flex-1 flex-col pt-2">
              <form onSubmit={submitSearch} className="relative mt-2">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#f8f4ed]/48"
                  strokeWidth={1.8}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    if (event.target.value !== submittedQuery) {
                      setSubmittedQuery("");
                    }
                  }}
                  placeholder="搜索影片"
                  autoFocus
                  className="h-11 w-full rounded-full border border-[#f8f4ed]/22 bg-transparent pl-11 pr-11 text-[13px] text-[#f8f4ed]/90 outline-none placeholder:text-[#f8f4ed]/36 focus:border-[#a52e4e]/70"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSubmittedQuery("");
                    }}
                    aria-label="清除搜索内容"
                    className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#a52e4e] transition active:scale-90"
                  >
                    <X className="size-4" strokeWidth={2.2} />
                  </button>
                )}
              </form>

              <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {searchResults.map((movie) => {
                      const isSelected = selectedMovies.some(
                        (selectedMovie) => selectedMovie.id === movie.id,
                      );

                      return (
                        <article
                          key={movie.id}
                          className={`search-result-enter relative min-w-0 rounded-[16px] transition-colors duration-200 ${
                            isSelected ? "bg-[#8b1e3f]/24" : "bg-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleMovie(movie)}
                            aria-label={
                              isSelected
                                ? `取消选择${movie.title}`
                                : `选择${movie.title}`
                            }
                            className="block w-full rounded-[16px] text-left transition duration-200 active:scale-[0.98]"
                          >
                            <img
                              src={movie.src}
                              alt={movie.title}
                              className="aspect-[2/3] w-full rounded-[16px] object-cover"
                            />
                            <span className="block px-1 pb-1 pt-2">
                              <span className="block text-[12px] leading-[17px] text-[#f8f4ed]">
                                {movie.title}
                              </span>
                              <span className="mt-0.5 block pr-8 text-[10px] leading-4 text-[#f8f4ed]/58">
                                {movie.director || "导演信息待补全"}
                              </span>
                            </span>
                          </button>
                          <span
                            aria-hidden="true"
                            className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-[#8b1e3f] text-[#f8f4ed] shadow-[0_8px_20px_rgba(80,9,31,0.42)] transition duration-200"
                          >
                            {isSelected ? (
                              <Check className="size-4" strokeWidth={2.2} />
                            ) : (
                              <Plus className="size-4" strokeWidth={2.2} />
                            )}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : isSearchingMovies ? (
                  <p className="pt-16 text-center text-[13px] text-[#f8f4ed]/45">
                    正在搜索影片
                  </p>
                ) : searchError ? (
                  <p className="pt-16 text-center text-[13px] text-[#f8f4ed]/45">
                    {searchError}
                  </p>
                ) : submittedQuery ? (
                  <p className="pt-16 text-center text-[13px] text-[#f8f4ed]/45">
                    没有找到相关影片
                  </p>
                ) : (
                  <p className="pt-16 text-center text-[13px] text-[#f8f4ed]/45">
                    输入片名或导演并按回车搜索
                  </p>
                )}
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={submitActivity}
                  disabled={!canCreateActivity}
                  className="create-activity-button h-14 w-full rounded-[16px] text-[17px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
                >
                  创建观影局
                </button>
              </div>
            </div>
          )}
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
                <h2 className="text-[18px] font-medium text-[#f8f4ed]">
                  选择日期
                </h2>
                <p className="mt-1 text-[12px] text-[#f8f4ed]/40">
                  选一个大家方便见面的日子
                </p>
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
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[#a52e4e] text-[16px] font-medium text-[#f8f4ed] shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition active:scale-[0.985]"
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
