import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";
import hostImage from "../../picture/user/IMG_20260611_210240.jpg";
import memberOneImage from "../../picture/user/IMG_20260611_210255.jpg";
import memberTwoImage from "../../picture/user/IMG_20260611_210306.jpg";
import memberThreeImage from "../../picture/user/IMG_20260611_210318.jpg";
import memberFourImage from "../../picture/user/IMG_20260611_210333.jpg";
import {
  deleteActivity,
  getActivity,
  getNextMemoryTicketNumber,
  updateActivity,
  type Activity,
} from "@/lib/activity-store";
import {
  getMovieById,
  searchMovies,
  type Movie,
} from "@/lib/movie-database";

const members = [
  memberOneImage,
  memberTwoImage,
  memberThreeImage,
  memberFourImage,
];
const currentUserName = "小杨";

const selectedCardRotations = [
  -2,
  2,
  -1,
  1.5,
  -1.5,
  2.5,
];
const memoryMoods = ["😭", "😂", "😅", "😡", "😌", "😍", "😴"];

function formatActivityDate(activity: Activity) {
  const [year, month, day] = activity.date.split(".");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatMemoryTicketDate(activity: Activity) {
  const [year, month, day] = activity.date.split(".");
  return `${year}.${Number(month)}.${Number(day)}`;
}

export function CollectingPage({ activityId }: { activityId: string }) {
  const [activity, setActivity] = useState<Activity | undefined>(() =>
    getActivity(activityId),
  );
  const [candidateMovies, setCandidateMovies] = useState<Movie[]>(() =>
    (getActivity(activityId)?.candidateMovieIds ?? [])
      .map(getMovieById)
      .filter((movie): movie is Movie => Boolean(movie))
      .map((movie) => ({ ...movie, recommender: currentUserName })),
  );
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [isRecommendationClosing, setIsRecommendationClosing] =
    useState(false);
  const [isActivityActionsOpen, setIsActivityActionsOpen] = useState(false);
  const [isActivityActionsClosing, setIsActivityActionsClosing] =
    useState(false);
  const [shouldDeleteActivity, setShouldDeleteActivity] = useState(false);
  const [isStartConfirmationOpen, setIsStartConfirmationOpen] =
    useState(false);
  const [isStartConfirmationClosing, setIsStartConfirmationClosing] =
    useState(false);
  const [isStartConfirmed, setIsStartConfirmed] = useState(false);
  const [isPicking, setIsPicking] = useState(
    () => getActivity(activityId)?.status === "picking",
  );
  const [isRevealOpen, setIsRevealOpen] = useState(false);
  const [revealMovie, setRevealMovie] = useState<Movie | null>(null);
  const [previousRevealMovie, setPreviousRevealMovie] =
    useState<Movie | null>(null);
  const [revealRollDuration, setRevealRollDuration] = useState(120);
  const [revealRollStep, setRevealRollStep] = useState(0);
  const [revealedMovie, setRevealedMovie] = useState<Movie | null>(() => {
    const storedActivity = getActivity(activityId);
    return storedActivity?.selectedMovieId
      ? getMovieById(storedActivity.selectedMovieId) ?? null
      : null;
  });
  const [revealStage, setRevealStage] = useState<
    "rolling" | "poster" | "title" | "credit" | "action"
  >("rolling");
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [selectedMemoryMood, setSelectedMemoryMood] = useState("");
  const [memoryNote, setMemoryNote] = useState("");
  const [isMemoryTicketOpen, setIsMemoryTicketOpen] = useState(false);
  const [isPageClosing, setIsPageClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [displayedSearchResults, setDisplayedSearchResults] = useState<Movie[]>(
    [],
  );
  const [newlyAddedMovieId, setNewlyAddedMovieId] = useState<string | null>(
    null,
  );
  const [recommendationPanelHeight, setRecommendationPanelHeight] =
    useState(0);
  const recommendationPanelRef = useRef<HTMLDivElement>(null);
  const rollingMovieRef = useRef<Movie | null>(null);

  const searchResults = useMemo(
    () =>
      submittedQuery.trim() && submittedQuery === searchQuery
        ? searchMovies(submittedQuery)
        : [],
    [searchQuery, submittedQuery],
  );
  const areSearchResultsVisible = searchResults.length > 0;
  const selectedMovieCount = selectedMovieIds.length;
  const isSelectionComplete = selectedMovieCount === 3;
  const isMovieSelected = activity?.status === "selected" && revealedMovie;

  const closeStartConfirmation = () => {
    if (isStartConfirmationClosing) return;
    setIsStartConfirmationClosing(true);
  };

  const toggleMovieSelection = (movieId: string) => {
    if (!isPicking || isMovieSelected) return;

    setSelectedMovieIds((selectedIds) => {
      if (selectedIds.includes(movieId)) {
        return selectedIds.filter((id) => id !== movieId);
      }

      if (selectedIds.length >= 3) return selectedIds;
      return [...selectedIds, movieId];
    });
  };

  useEffect(() => {
    if (areSearchResultsVisible) {
      setDisplayedSearchResults(searchResults);
      return;
    }

    if (displayedSearchResults.length === 0) return;

    const timer = window.setTimeout(() => {
      setDisplayedSearchResults([]);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [areSearchResultsVisible, displayedSearchResults.length, searchResults]);

  useEffect(() => {
    if (!isRecommendationOpen || isRecommendationClosing) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (
        recommendationPanelRef.current &&
        !recommendationPanelRef.current.contains(event.target as Node)
      ) {
        setIsRecommendationClosing(true);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
  }, [isRecommendationClosing, isRecommendationOpen]);

  useEffect(() => {
    const panel = recommendationPanelRef.current;
    if (!isRecommendationOpen || !panel) {
      setRecommendationPanelHeight(0);
      return;
    }

    const updatePanelHeight = () =>
      setRecommendationPanelHeight(Math.ceil(panel.getBoundingClientRect().height));
    updatePanelHeight();

    const resizeObserver = new ResizeObserver(updatePanelHeight);
    resizeObserver.observe(panel);
    return () => resizeObserver.disconnect();
  }, [areSearchResultsVisible, isRecommendationOpen]);

  useEffect(() => {
    if (!isRecommendationClosing) return;

    const timer = window.setTimeout(() => {
      setIsRecommendationOpen(false);
      setIsRecommendationClosing(false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [isRecommendationClosing]);

  useEffect(() => {
    if (!newlyAddedMovieId) return;
    const timer = window.setTimeout(() => setNewlyAddedMovieId(null), 220);
    return () => window.clearTimeout(timer);
  }, [newlyAddedMovieId]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(searchQuery);
  };

  const toggleRecommendedMovie = (movie: Movie) => {
    const isSelected = candidateMovies.some(
      (candidateMovie) => candidateMovie.id === movie.id,
    );
    const recommendedMovie = { ...movie, recommender: currentUserName };
    const nextMovies = isSelected
      ? candidateMovies.filter(
          (candidateMovie) => candidateMovie.id !== movie.id,
        )
      : [...candidateMovies, recommendedMovie];

    setCandidateMovies(nextMovies);
    setActivity(
      updateActivity(activityId, {
        candidateMovieIds: nextMovies.map((candidateMovie) => candidateMovie.id),
      }),
    );

    if (!isSelected) setNewlyAddedMovieId(movie.id);
  };

  const startRandomReveal = () => {
    if (candidateMovies.length === 0) return;

    const pickDifferentMovie = (currentMovie: Movie | null) => {
      if (candidateMovies.length <= 1 || !currentMovie) {
        return candidateMovies[0];
      }

      const availableMovies = candidateMovies.filter(
        (movie) => movie.id !== currentMovie.id,
      );
      return availableMovies[
        Math.floor(Math.random() * availableMovies.length)
      ];
    };

    const scheduleRevealText = () => {
      window.setTimeout(() => setRevealStage("poster"), 380);
      window.setTimeout(() => setRevealStage("title"), 740);
      window.setTimeout(() => setRevealStage("credit"), 1080);
      window.setTimeout(() => setRevealStage("action"), 1440);
    };

    const settleOnWinner = (winnerMovie: Movie) => {
      setPreviousRevealMovie(rollingMovieRef.current);
      setRevealMovie(winnerMovie);
      rollingMovieRef.current = winnerMovie;
      setRevealRollDuration(360);
      setRevealRollStep((step) => step + 1);
      scheduleRevealText();
    };

    const winner =
      candidateMovies[Math.floor(Math.random() * candidateMovies.length)];
    setIsStartConfirmationOpen(false);
    setIsStartConfirmationClosing(false);
    setIsStartConfirmed(false);
    const firstMovie = candidateMovies[0];
    setPreviousRevealMovie(null);
    setRevealMovie(firstMovie);
    rollingMovieRef.current = firstMovie;
    setRevealRollDuration(100);
    setRevealRollStep(0);
    setRevealStage("rolling");
    setIsRevealOpen(true);

    const startedAt = Date.now();
    const roll = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= 3000) {
        if (
          candidateMovies.length > 1 &&
          rollingMovieRef.current?.id === winner.id
        ) {
          const bridgeMovie = pickDifferentMovie(rollingMovieRef.current);
          setPreviousRevealMovie(rollingMovieRef.current);
          setRevealMovie(bridgeMovie);
          rollingMovieRef.current = bridgeMovie;
          setRevealRollDuration(220);
          setRevealRollStep((step) => step + 1);
          window.setTimeout(() => settleOnWinner(winner), 220);
          return;
        }

        settleOnWinner(winner);
        return;
      }

      const nextMovie = pickDifferentMovie(rollingMovieRef.current);
      const progress = elapsed / 3000;
      const delay =
        progress < 0.5
          ? 75 + progress * 70
          : 145 + ((progress - 0.5) / 0.5) ** 2 * 330;
      setPreviousRevealMovie(rollingMovieRef.current);
      setRevealMovie(nextMovie);
      rollingMovieRef.current = nextMovie;
      setRevealRollDuration(Math.max(90, Math.min(delay * 0.82, 360)));
      setRevealRollStep((step) => step + 1);
      window.setTimeout(roll, delay);
    };

    window.setTimeout(roll, 70);
  };

  const confirmRevealedMovie = () => {
    if (!revealMovie) return;
    setRevealedMovie(revealMovie);
    setSelectedMovieIds([revealMovie.id]);
    setIsPicking(false);
    setActivity(
      updateActivity(activityId, {
        status: "selected",
        selectedMovieId: revealMovie.id,
      }),
    );
    window.sessionStorage.setItem(
      `letsmovie.activity-poster-reveal.${activityId}`,
      "pending",
    );
    setIsRevealOpen(false);
  };

  const confirmMemory = () => {
    if (!selectedMemoryMood || !activity) return;

    const memoryTicketNumber =
      activity.memoryTicketNumber ??
      getNextMemoryTicketNumber(activityId);
    const memoryCreatedAt =
      activity.memoryCreatedAt ?? new Date().toISOString();
    const currentUserMemory = {
      memberId: "xiaoyang",
      memberName: "小杨",
      emoji: selectedMemoryMood,
      note: memoryNote.trim(),
      createdAt: memoryCreatedAt,
    };
    setActivity(
      updateActivity(activityId, {
        memoryEmoji: selectedMemoryMood,
        memoryNote: memoryNote.trim(),
        memoryCreatedAt,
        memoryTicketNumber,
        memories: [
          ...(activity.memories ?? []).filter(
            (memory) => memory.memberId !== currentUserMemory.memberId,
          ),
          currentUserMemory,
        ],
      }),
    );
    setIsMemoryOpen(false);
    setIsMemoryTicketOpen(true);
  };

  const closeMemory = () => {
    setIsMemoryOpen(false);
    setSelectedMemoryMood("");
    setMemoryNote("");
  };

  const archiveMemory = () => {
    if (!activity) return;

    updateActivity(activityId, {
      memoryEmoji: selectedMemoryMood,
      memoryNote: memoryNote.trim(),
      archivedAt: new Date().toISOString(),
    });
    window.sessionStorage.setItem(
      `letsmovie.activity-archive-exit.${activityId}`,
      "pending",
    );
    window.location.hash = "#/";
  };

  const closeActivityActions = (deleteAfterClosing = false) => {
    if (isActivityActionsClosing) return;
    setShouldDeleteActivity(deleteAfterClosing);
    setIsActivityActionsClosing(true);
  };

  const returnToActivities = () => {
    if (isPageClosing) return;
    setIsPageClosing(true);
    window.setTimeout(() => {
      window.location.hash = "#/";
    }, 420);
  };

  /*
   * Voting phase behavior is intentionally parked for reuse:
   * const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
   * const isSelected = selectedMovie === movie.id;
   * onClick={() => setSelectedMovie(movie.id)}
   * Selected cards lift, straighten, and receive the burgundy outline.
   */

  if (!activity) {
    return (
      <main className="flex min-h-dvh justify-center bg-[#090a0c] text-[#f8f4ed]">
        <div className="flex min-h-dvh w-full max-w-[393px] flex-col items-center justify-center bg-[#131416] px-8 text-center">
          <p className="text-[17px] text-[#f8f4ed]/75">这个活动不存在</p>
          <a
            href="#/"
            className="mt-5 text-[14px] font-medium text-[#a52e4e]"
          >
            返回我的活动
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh justify-center bg-[#090a0c] text-[#f8f4ed]">
      <div
        className={`relative min-h-dvh w-full max-w-[393px] overflow-x-hidden bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)] ${
          isPageClosing ? "activity-detail-exit" : ""
        }`}
      >
        <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-5 text-[#f8f4ed]">
          <button
            type="button"
            onClick={returnToActivities}
            className="grid size-10 place-items-center rounded-full bg-black/15 backdrop-blur-md transition active:scale-95"
            aria-label="返回我的活动"
          >
            <ArrowLeft className="size-5" strokeWidth={1.8} />
          </button>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#f8f4ed]/80">
            FrameClub
          </span>
          <button
            type="button"
            onClick={() => {
              setShouldDeleteActivity(false);
              setIsActivityActionsClosing(false);
              setIsActivityActionsOpen(true);
            }}
            className="grid size-10 place-items-center rounded-full bg-black/15 backdrop-blur-md transition active:scale-95"
            aria-label="更多活动操作"
          >
            <MoreHorizontal className="size-5" strokeWidth={1.8} />
          </button>
        </header>

        <section
          style={
            revealedMovie
              ? { backgroundImage: `url("${revealedMovie.src}")` }
              : undefined
          }
          className={`relative h-[350px] overflow-hidden px-7 pb-12 pt-[92px] ${
            revealedMovie ? "collection-hero-selected" : "collection-hero"
          }`}
        >
          <div className="relative z-10">
            <h1 className="mt-5 text-[32px] font-medium leading-10 tracking-[-0.045em] [text-shadow:0_3px_18px_rgb(0_0_0/0.3)]">
              {activity.title}
            </h1>
            <div className="mt-5 space-y-2.5 text-[14px] leading-5 text-[#f8f4ed]/75">
              <p className="flex items-center gap-2">
                <MapPin className="size-4" strokeWidth={1.6} />
                {activity.location}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4" strokeWidth={1.6} />
                {formatActivityDate(activity)}
              </p>
            </div>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#f8f4ed]/90">
                <span
                  className={`size-2 rounded-full ${
                    isMovieSelected
                      ? "bg-[#4fa86a] shadow-[0_0_12px_rgba(79,168,106,0.72)]"
                      : "bg-[#d97706] shadow-[0_0_12px_rgba(217,119,6,0.8)]"
                  }`}
                />
                {isMovieSelected
                  ? "影片已选定"
                  : isPicking
                    ? "影片挑选中"
                    : "影片收集中"}
              </div>
              <p className="ml-4 mt-1.5 text-[12px] text-[#f8f4ed]/55">
                {isMovieSelected
                  ? revealedMovie.title
                  : isPicking
                  ? "请选择 3 部影片"
                  : activity.note || "和朋友一起挑选片单"}
              </p>
            </div>
          </div>
        </section>

        <section
          style={
            isRecommendationOpen && recommendationPanelHeight
              ? { paddingBottom: recommendationPanelHeight + 24 }
              : undefined
          }
          className="relative z-20 -mt-7 min-h-[620px] rounded-t-[32px] border-t border-white/[0.08] bg-[#181a1e] px-5 pb-40 pt-7 shadow-[0_-24px_55px_rgba(0,0,0,0.34)] transition-[padding-bottom] duration-200"
        >
          <div className="flex items-start justify-between px-1">
            <div>
              <span className="text-[14px] font-normal text-[#f8f4ed]/75">
                主持人
              </span>
              <div className="mt-3.5 flex items-center">
                <img
                  src={hostImage}
                  alt="活动主持人"
                  className="size-10 rounded-full object-cover"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="text-[14px] font-normal text-[#f8f4ed]/75">
                成员
              </span>
              <div className="mt-3.5 flex -space-x-2">
                {members.map((member, index) => (
                  <img
                    key={member}
                    src={member}
                    alt={`参与成员 ${index + 1}`}
                    className="size-9 rounded-full object-cover ring-2 ring-[#181a1e]"
                  />
                ))}
                <span className="grid size-9 place-items-center rounded-full bg-[#2b2f36] text-[11px] text-[#f8f4ed]/80 ring-2 ring-[#181a1e]">
                  +3
                </span>
              </div>
            </div>
          </div>

          <div className="mb-5 mt-7 flex items-end justify-between px-1">
            <h2 className="text-[18px] font-medium tracking-[-0.025em] text-[#f8f4ed]">
              候选影片
            </h2>
            <span className="text-[12px] text-[#f8f4ed]/45">
              {candidateMovies.length} 部影片
            </span>
          </div>

          {/* Scattered layout can be restored with the previous rotate and margin poses. */}
          <div className="grid grid-cols-3 items-start gap-x-3 gap-y-5 px-0.5">
            {candidateMovies.map((movie, index) => {
              const isSelected =
                selectedMovieIds.includes(movie.id) ||
                revealedMovie?.id === movie.id;

              return (
                <article
                  key={movie.id}
                  className={`min-w-0 text-left transition-[opacity,filter] duration-500 ease-out ${
                    newlyAddedMovieId === movie.id
                      ? "candidate-movie-enter"
                      : ""
                  } ${
                    isMovieSelected && !isSelected
                      ? "opacity-[0.62] saturate-[0.82]"
                      : "opacity-100 saturate-100"
                  }`}
                >
                  <button
                    type="button"
                    disabled={!isPicking || Boolean(isMovieSelected)}
                    aria-pressed={
                      isPicking || isMovieSelected ? isSelected : undefined
                    }
                    aria-label={
                      isPicking
                        ? `${isSelected ? "取消选择" : "选择"}${movie.title}`
                        : undefined
                    }
                    onClick={() => toggleMovieSelection(movie.id)}
                    style={{
                      transform: isSelected
                        ? `translateY(-7px) rotate(${selectedCardRotations[index % selectedCardRotations.length]}deg)`
                        : "translateY(0) rotate(0deg)",
                      transition:
                        "transform 520ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 420ms ease",
                    }}
                    className={`relative block aspect-[2/3] w-full overflow-hidden rounded-[16px] bg-[#202226] text-left shadow-[0_15px_28px_rgba(0,0,0,0.4)] will-change-transform ${
                      isPicking && !isMovieSelected
                        ? "cursor-pointer"
                        : "cursor-default"
                    } ${
                      isSelected
                        ? "shadow-[0_20px_36px_rgba(0,0,0,0.52),0_0_0_1.5px_#8b1e3f]"
                        : ""
                    }`}
                  >
                    <div className="absolute inset-0 overflow-hidden">
                      <img
                        src={movie.src}
                        alt={movie.title}
                        className="size-full object-cover"
                      />
                    </div>
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 bg-[#8b1e3f] transition-opacity delay-75 duration-300 ${
                        isSelected ? "opacity-10" : "opacity-0"
                      }`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-[#8b1e3f] text-[#f8f4ed] shadow-[0_5px_14px_rgba(0,0,0,0.42)] transition-[opacity,transform] delay-100 duration-300 ease-[cubic-bezier(0.22,0.9,0.3,1.15)] ${
                        isSelected
                          ? "scale-100 opacity-100"
                          : "pointer-events-none scale-75 opacity-0"
                      }`}
                    >
                      <Heart className="size-3.5 fill-current" strokeWidth={1.6} />
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2.5 pb-2.5 pt-10">
                      <span className="line-clamp-2 block text-[12px] leading-[17px] text-[#f8f4ed] [text-shadow:0_1px_5px_rgb(0_0_0/0.5)]">
                        {movie.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-[#f8f4ed]/58">
                        by {movie.recommender}
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
          {candidateMovies.length === 0 && (
            <div className="flex min-h-[300px] items-center justify-center px-6 pb-16 text-center">
              <p className="text-[13px] text-[#f8f4ed]/40">
                现在还没有人推荐影片
              </p>
            </div>
          )}
        </section>

        <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[393px] -translate-x-1/2 bg-gradient-to-t from-[#131416] via-[#131416]/96 to-transparent px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-9">
          {isMovieSelected ? (
            <button
              type="button"
              onClick={() => {
                setSelectedMemoryMood("");
                setMemoryNote("");
                setIsMemoryOpen(true);
              }}
              className="flex h-14 w-full items-center justify-center rounded-[16px] bg-[#a52e4e] text-[16px] font-medium text-[#f8f4ed] shadow-[0_10px_30px_rgba(165,46,78,0.28)] transition active:scale-[0.985]"
            >
              留下回忆
            </button>
          ) : isPicking ? (
            <button
              type="button"
              disabled={!isSelectionComplete}
              className={`flex min-h-[72px] w-full items-center justify-between rounded-[16px] px-5 text-left transition duration-200 ${
                isSelectionComplete
                  ? "bg-[#8b1e3f] text-[#f8f4ed] shadow-[0_12px_34px_rgba(139,30,63,0.32)] active:scale-[0.985]"
                  : "cursor-not-allowed border border-[#8b1e3f]/25 bg-[#8b1e3f]/14 text-[#8b1e3f]/65"
              }`}
            >
              <span>
                <span className="block text-[18px] font-medium leading-6">
                  {selectedMovieCount} / 3
                </span>
                <span className="mt-0.5 block text-[12px] opacity-70">
                  {isSelectionComplete
                    ? "已选好 3 部影片"
                    : `还需选择 ${3 - selectedMovieCount} 部`}
                </span>
              </span>
              <span className="text-[14px] font-medium">确认挑选</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsRecommendationClosing(false);
                setIsRecommendationOpen(true);
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[16px] text-[13px] text-[#f8f4ed]/78 transition hover:bg-white/[0.05] active:scale-[0.98]"
            >
              <span className="grid size-7 place-items-center rounded-full bg-white/[0.07]">
                <Plus className="size-3.5" strokeWidth={1.8} />
              </span>
              推荐影片
            </button>
            <button
              type="button"
              onClick={() => {
                setIsStartConfirmed(false);
                setIsStartConfirmationClosing(false);
                setIsStartConfirmationOpen(true);
              }}
              className="flex h-12 flex-[1.12] items-center justify-center gap-2 rounded-[16px] text-[13px] font-medium text-[#8b1e3f] transition hover:bg-white/[0.05] active:scale-[0.98]"
            >
              <Square className="size-3 fill-current" strokeWidth={1.5} />
              开始挑选
            </button>
            </div>
          )}
        </div>

        {isStartConfirmationOpen && (
          <div className="fixed inset-y-0 left-1/2 z-[60] grid w-full max-w-[393px] -translate-x-1/2 place-items-center px-6">
            <button
              type="button"
              aria-label="关闭开始挑选确认框"
              onClick={closeStartConfirmation}
              className={`absolute inset-0 bg-black/58 ${
                isStartConfirmationClosing
                  ? "start-confirmation-overlay-closing"
                  : "start-confirmation-overlay"
              }`}
            />
            <section
              role="alertdialog"
              aria-modal="true"
              aria-describedby="start-picking-description"
              onAnimationEnd={(event) => {
                if (
                  !isStartConfirmationClosing ||
                  event.target !== event.currentTarget
                ) {
                  return;
                }

                setIsStartConfirmationOpen(false);
                setIsStartConfirmationClosing(false);
                setIsStartConfirmed(false);
              }}
              className={`relative flex min-h-[286px] w-[320px] max-w-full -translate-y-4 flex-col rounded-[32px] bg-[#181b1f] px-6 pb-4 pt-8 shadow-[0_24px_70px_rgba(0,0,0,0.58)] ${
                isStartConfirmationClosing
                  ? "start-confirmation-dialog-closing"
                  : "start-confirmation-dialog"
              }`}
            >
              <div className="mx-auto grid size-14 place-items-center text-[#f8f4ed]/88">
                <svg
                  aria-hidden="true"
                  className="size-8 overflow-visible"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <g
                    className={`clapper-top ${
                      isStartConfirmed ? "clapper-top-closed" : ""
                    }`}
                  >
                    <path d="M3 6.5h18v4H3Z" />
                    <path d="m6 6.5 3 4" />
                    <path d="m12 6.5 3 4" />
                  </g>
                  <path d="M3 10.5h18V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
                </svg>
              </div>

              <div
                key={isStartConfirmed ? "confirmed" : "confirming"}
                className={`start-confirmation-content text-center ${
                  isStartConfirmed ? "mt-8" : "mt-7"
                }`}
              >
                <p className="text-[16px] font-normal leading-6 text-[#f8f4ed]">
                  {isStartConfirmed
                    ? "现在可以邀请朋友们开始挑选了"
                    : "大家推荐得差不多了吗？"}
                </p>
                {!isStartConfirmed && (
                  <p
                    id="start-picking-description"
                    className="mx-auto mt-3 max-w-[280px] text-[14px] leading-6 text-[#f8f4ed]/70"
                  >
                    开始后，候选影单将暂时固定下来
                  </p>
                )}
              </div>

              <div
                key={isStartConfirmed ? "confirmed-action" : "confirm-actions"}
                className={`mt-auto grid gap-2 pt-5 ${
                  isStartConfirmed
                    ? "start-confirmation-content grid-cols-1"
                    : "grid-cols-2"
                }`}
              >
                {!isStartConfirmed && (
                  <button
                    type="button"
                    onClick={closeStartConfirmation}
                    className="h-12 rounded-[16px] text-[14px] font-normal text-[#f8f4ed] transition hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    再看看
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    startRandomReveal();
                  }}
                  disabled={candidateMovies.length === 0}
                  className="h-12 rounded-[16px] text-[14px] font-medium text-[#8b1e3f] transition hover:bg-[#8b1e3f]/10 active:scale-[0.98]"
                >
                  确认开始
                </button>
              </div>
            </section>
          </div>
        )}

        {isRevealOpen && revealMovie && (
          <div className="fixed inset-y-0 left-1/2 z-[80] grid w-full max-w-[393px] -translate-x-1/2 place-items-center overflow-hidden bg-black/90 px-6 backdrop-blur-[4px]">
            <div className="pointer-events-none absolute inset-x-[-80px] top-[18%] h-[430px] rounded-full bg-[#8a1f3f]/18 blur-[90px]" />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="揭晓影片"
              className="reveal-stage relative flex min-h-[700px] w-full flex-col items-center justify-center"
            >
              <p
                className={`mb-7 text-[17px] font-medium tracking-[0.08em] text-[#f8f4ed] transition-all duration-500 ease-out ${
                  revealStage === "rolling"
                    ? "translate-y-3 opacity-0"
                    : "translate-y-0 opacity-100"
                }`}
              >
                揭晓影片
              </p>

              <div
                className={`relative h-[322px] w-[236px] overflow-hidden rounded-[28px] bg-[#1c1f24] shadow-[0_28px_70px_rgba(0,0,0,0.72)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  revealStage === "rolling"
                    ? "scale-[0.97]"
                    : "scale-100 shadow-[0_32px_84px_rgba(0,0,0,0.76)]"
                }`}
              >
                {revealStage === "rolling" ? (
                  <div
                    key={revealRollStep}
                    className="absolute inset-0"
                    style={
                      {
                        "--reveal-roll-duration": `${revealRollDuration}ms`,
                      } as CSSProperties
                    }
                  >
                    {previousRevealMovie && (
                      <img
                        src={previousRevealMovie.src}
                        alt=""
                        className="reveal-reel-poster reveal-reel-poster-out"
                      />
                    )}
                    <img
                      src={revealMovie.src}
                      alt={revealMovie.title}
                      className="reveal-reel-poster reveal-reel-poster-in"
                    />
                  </div>
                ) : (
                  <img
                    src={revealMovie.src}
                    alt={revealMovie.title}
                    className="reveal-poster-settled size-full object-cover"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/[0.04]" />
              </div>

              <div className="mt-7 min-h-[86px] text-center">
                <h2
                  className={`text-[26px] font-semibold leading-9 tracking-[-0.035em] text-[#f8f4ed] transition-all duration-500 ease-out ${
                    revealStage === "title" ||
                    revealStage === "credit" ||
                    revealStage === "action"
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  }`}
                >
                  {revealMovie.title}
                </h2>
                <p
                  className={`mt-2 text-[15px] font-normal text-[#f8f4ed]/65 transition-all duration-500 ease-out ${
                    revealStage === "credit" || revealStage === "action"
                      ? "translate-y-0 opacity-100"
                      : "translate-y-3 opacity-0"
                  }`}
                >
                  by {revealMovie.recommender}
                </p>
              </div>

              <button
                type="button"
                onClick={confirmRevealedMovie}
                disabled={revealStage !== "action"}
                className={`mt-6 h-14 w-full max-w-[328px] rounded-[16px] bg-[#a52e4e] text-[16px] font-medium text-[#f8f4ed] shadow-[0_12px_34px_rgba(165,46,78,0.28)] transition-all duration-500 ease-out ${
                  revealStage === "action"
                    ? "translate-y-0 opacity-100"
                    : "pointer-events-none translate-y-3 opacity-0"
                }`}
              >
                确认今晚影片
              </button>
            </section>
          </div>
        )}

        {isRecommendationOpen && (
          <div className="pointer-events-none fixed inset-y-0 left-1/2 z-50 w-full max-w-[393px] -translate-x-1/2 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/20"
            />
            <div
              ref={recommendationPanelRef}
              role="dialog"
              aria-modal="false"
              aria-label="推荐影片"
              className={`pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[66dvh] flex-col overflow-hidden rounded-t-[32px] border border-b-0 border-white/[0.12] bg-[#181b1f] shadow-[0_-20px_54px_rgba(0,0,0,0.44),inset_0_1px_0_rgba(255,255,255,0.025)] ${
                isRecommendationClosing
                  ? "recommendation-sheet-closing"
                  : "recommendation-sheet"
              }`}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[#f8f4ed]/36" />
              <div className="px-5 pb-4 pt-5">
                <h2 className="text-[17px] font-medium leading-6 tracking-[-0.02em] text-[#f8f4ed]">
                  推荐影片
                </h2>
                <form onSubmit={submitSearch} className="relative mt-4">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#f8f4ed]/48"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="搜索电影、导演、演员"
                    autoFocus
                    className="h-11 w-full rounded-[14px] border border-transparent bg-[#25282d] pl-11 pr-11 text-[13px] text-[#f8f4ed]/90 outline-none placeholder:text-[#f8f4ed]/42 focus:bg-[#292c31]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSubmittedQuery("");
                      }}
                      aria-label="清除搜索内容"
                      className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#8b1e3f] transition active:scale-90"
                    >
                      <X className="size-4" strokeWidth={2.2} />
                    </button>
                  )}
                </form>
              </div>

              <div
                className={`min-h-0 overflow-y-auto overscroll-contain px-5 transition-[max-height] duration-200 ease-out ${
                  areSearchResultsVisible
                    ? "max-h-[360px]"
                    : "max-h-[76px]"
                }`}
              >
                {displayedSearchResults.length > 0 ? (
                  <div className="grid grid-cols-3 items-start gap-3 pb-[max(24px,env(safe-area-inset-bottom))]">
                    {displayedSearchResults.map((movie) => {
                      const isSelected = candidateMovies.some(
                        (candidateMovie) => candidateMovie.id === movie.id,
                      );

                      return (
                        <article
                          key={movie.id}
                          className={`search-result-enter relative min-w-0 rounded-[16px] transition-colors duration-200 ${
                            isSelected
                              ? "bg-[#8b1e3f]/24"
                              : "bg-transparent"
                          }`}
                        >
                          <img
                            src={movie.src}
                            alt={movie.title}
                            className="aspect-[2/3] w-full rounded-[16px] object-cover"
                          />
                          <div className="pb-1 pt-2">
                            <h3 className="text-[12px] leading-[17px] text-[#f8f4ed]">
                              {movie.title}
                            </h3>
                            <p className="mt-0.5 pr-8 text-[10px] leading-4 text-[#f8f4ed]/58">
                              {movie.director}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRecommendedMovie(movie)}
                            aria-label={
                              isSelected
                                ? `从候选影片移除${movie.title}`
                                : `将${movie.title}加入候选影片`
                            }
                            className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-[#8b1e3f] text-[#f8f4ed] shadow-[0_8px_20px_rgba(80,9,31,0.42)] transition duration-200 active:scale-95"
                          >
                            {isSelected ? (
                              <Check className="size-4" strokeWidth={2.2} />
                            ) : (
                              <Plus className="size-4" strokeWidth={2.2} />
                            )}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : submittedQuery ? (
                  <p className="pb-[max(24px,env(safe-area-inset-bottom))] pt-5 text-center text-[13px] text-[#f8f4ed]/45">
                    没有找到相关影片
                  </p>
                ) : (
                  <p className="pb-[max(24px,env(safe-area-inset-bottom))] pt-5 text-center text-[13px] text-[#f8f4ed]/45">
                    输入片名或导演并按回车搜索
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {isActivityActionsOpen && (
          <div className="fixed inset-y-0 left-1/2 z-[70] w-full max-w-[393px] -translate-x-1/2 overflow-hidden">
            <button
              type="button"
              aria-label="关闭活动操作"
              onClick={() => closeActivityActions()}
              className={`absolute inset-0 bg-black/48 ${
                isActivityActionsClosing
                  ? "time-picker-overlay-out"
                  : "time-picker-overlay-in"
              }`}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="活动操作"
              onAnimationEnd={(event) => {
                if (
                  !isActivityActionsClosing ||
                  event.target !== event.currentTarget
                ) {
                  return;
                }

                if (shouldDeleteActivity) {
                  deleteActivity(activityId);
                  window.location.hash = "#/";
                  return;
                }

                setIsActivityActionsOpen(false);
                setIsActivityActionsClosing(false);
                setShouldDeleteActivity(false);
              }}
              className={`absolute inset-x-0 bottom-0 rounded-t-[24px] bg-[#23262d] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${
                isActivityActionsClosing
                  ? "time-picker-sheet-out"
                  : "time-picker-sheet"
              }`}
            >
              <button
                type="button"
                onClick={() => closeActivityActions(true)}
                className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[#a52e4e]/12 text-[16px] font-medium text-[#b53a59] transition active:scale-[0.985]"
              >
                解散活动
              </button>
            </section>
          </div>
        )}

        {isMemoryOpen && (
          <div className="fixed inset-y-0 left-1/2 z-[90] w-full max-w-[393px] -translate-x-1/2 overflow-hidden">
            <button
              type="button"
              aria-label="关闭留下回忆"
              onClick={closeMemory}
              className="memory-overlay absolute inset-0 bg-black/62 backdrop-blur-[2px]"
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="留下回忆"
              className="memory-sheet absolute inset-x-0 bottom-0 flex min-h-dvh flex-col rounded-t-[24px] bg-[#23262d] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-[190px] shadow-[0_-24px_60px_rgba(0,0,0,0.45)]"
            >
              <button
                type="button"
                aria-label="退出留下回忆"
                onClick={closeMemory}
                className="absolute left-5 top-5 grid size-10 place-items-center rounded-full text-[#f8f4ed]/72 transition hover:bg-white/[0.05] hover:text-[#f8f4ed] active:scale-95"
              >
                <X className="size-6" strokeWidth={1.6} />
              </button>

              <h2 className="text-center text-[22px] font-medium tracking-[-0.03em] text-[#f8f4ed]">
                今晚怎么样？
              </h2>

              <div className="mt-12 grid grid-cols-7 gap-2">
                {memoryMoods.map((mood) => {
                  const isSelected = selectedMemoryMood === mood;

                  return (
                    <button
                      key={mood}
                      type="button"
                      aria-label={`选择心情 ${mood}`}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedMemoryMood(mood)}
                      className={`grid aspect-square w-full place-items-center rounded-full border text-[22px] transition duration-200 active:scale-95 ${
                        isSelected
                          ? "border-2 border-[#a52e4e] bg-[#1c1f24] shadow-[0_0_0_2px_rgba(165,46,78,0.12)]"
                          : "border-white/[0.08] bg-[#1c1f24]"
                      }`}
                    >
                      {mood}
                    </button>
                  );
                })}
              </div>

              {selectedMemoryMood && (
                <div
                  key={selectedMemoryMood}
                  className="memory-details-enter mt-16 flex min-h-0 flex-1 flex-col"
                >
                  <label
                    htmlFor="memory-note"
                    className="block text-center text-[14px] font-normal text-[#f8f4ed]/82"
                  >
                    发生什么了？
                  </label>
                  <textarea
                    id="memory-note"
                    value={memoryNote}
                    onChange={(event) => setMemoryNote(event.target.value)}
                    rows={1}
                    className="mt-8 block h-9 w-full resize-none overflow-hidden border-0 border-b border-[#f8f4ed]/28 bg-transparent px-0 pb-2 text-[15px] leading-6 text-[#f8f4ed] outline-none placeholder:text-[#f8f4ed]/28 focus:border-[#a52e4e]"
                  />
                  <button
                    type="button"
                    onClick={confirmMemory}
                    className="mt-auto flex h-14 w-full items-center justify-center rounded-[16px] bg-[#a52e4e] text-[16px] font-medium text-[#f8f4ed] shadow-[0_10px_30px_rgba(165,46,78,0.24)] transition active:scale-[0.985]"
                  >
                    记住今晚
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {isMemoryTicketOpen && revealedMovie && activity && (
          <button
            type="button"
            aria-label="收起今晚票根并返回我的活动"
            onClick={archiveMemory}
            className="memory-ticket-overlay fixed inset-y-0 left-1/2 z-[100] block w-full max-w-[393px] -translate-x-1/2 overflow-hidden bg-[#090a0c] text-left"
          >
            <article className="memory-ticket flex min-h-dvh w-full flex-col overflow-hidden bg-[#23262d]">
              <div className="relative h-[62dvh] min-h-[500px] overflow-hidden">
                <img
                  src={revealedMovie.src}
                  alt={revealedMovie.title}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-transparent to-black/14" />
                <span className="memory-ticket-title absolute right-7 top-8 text-[11px] leading-none tracking-[0.04em] text-[#f8f4ed]/80 [font-variant-numeric:lining-nums]">
                  NO.{activity.memoryTicketNumber ?? 1}
                </span>
                <h2 className="memory-ticket-title absolute inset-x-6 bottom-7 text-[34px] leading-[1.12] tracking-[-0.04em] text-[#f8f4ed] [text-shadow:0_3px_18px_rgba(0,0,0,0.48)]">
                  {activity.title}
                </h2>
              </div>

              <div className="relative flex flex-1 flex-col px-6 pb-8 pt-8">
                <span className="absolute -left-3 -top-3 size-6 rounded-full bg-[#090a0c]" />
                <span className="absolute -right-3 -top-3 size-6 rounded-full bg-[#090a0c]" />

                <h3 className="memory-ticket-title text-[25px] leading-9 tracking-[-0.035em] text-[#f8f4ed]">
                  {revealedMovie.title}
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-10 text-[12px] text-[#f8f4ed]/52">
                  <span>{activity.location}</span>
                  <span>{formatMemoryTicketDate(activity)}</span>
                </div>

                <div className="mt-7">
                  <span className="grid size-10 place-items-center rounded-full bg-[#1c1f24] text-[23px]">
                    {selectedMemoryMood}
                  </span>
                </div>

                {memoryNote && (
                  <p className="mt-6 text-[13px] leading-5 text-[#f8f4ed]/68">
                    {memoryNote}
                  </p>
                )}
              </div>
            </article>
          </button>
        )}
      </div>
    </main>
  );
}
