import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  Popcorn,
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
  saveActivity,
  updateActivity,
  type Activity,
  type ActivityMemory,
} from "@/lib/activity-store";
import {
  getMovieById,
  saveMovie,
  saveMovies,
  searchMovies,
  type Movie,
} from "@/lib/movie-database";
import {
  createParticipantId,
  getParticipant,
  saveParticipant,
  type Participant,
} from "@/lib/participant-store";
import {
  createMemory,
  fetchActivityMemories,
  uploadParticipantAvatar,
} from "@/lib/supabase-memory";
import {
  deleteRemoteMovie,
  fetchRemoteActivityBundle,
  isActivitySyncConfigured,
  updateRemoteActivity,
  upsertRemoteMovies,
  upsertRemoteParticipant,
  type ActivityParticipant,
  type RemoteActivityBundle,
} from "@/lib/supabase-activity";
import { ActionDialog } from "@/components/action-dialog";

const defaultAvatarPool = [
  hostImage,
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

async function cropAvatarFile(
  file: File,
  crop: { x: number; y: number; zoom: number },
) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return file;

    const baseCropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const cropSize = baseCropSize / crop.zoom;
    const maxOffsetX = (image.naturalWidth - cropSize) / 2;
    const maxOffsetY = (image.naturalHeight - cropSize) / 2;
    const sourceX =
      image.naturalWidth / 2 - cropSize / 2 + (crop.x / 100) * maxOffsetX;
    const sourceY =
      image.naturalHeight / 2 - cropSize / 2 + (crop.y / 100) * maxOffsetY;

    context.drawImage(
      image,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      cropSize,
      cropSize,
      0,
      0,
      size,
      size,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CollectingPage({
  activityId,
  isSharedActivity = false,
}: {
  activityId: string;
  isSharedActivity?: boolean;
}) {
  const [activity, setActivity] = useState<Activity | undefined>(() =>
    getActivity(activityId),
  );
  const [participant, setParticipant] = useState<Participant | null>(() =>
    getParticipant(activityId),
  );
  const [remoteParticipants, setRemoteParticipants] = useState<
    ActivityParticipant[]
  >([]);
  const [participantName, setParticipantName] = useState("");
  const [participantAvatarFile, setParticipantAvatarFile] =
    useState<File | null>(null);
  const [participantAvatarPreview, setParticipantAvatarPreview] = useState("");
  const [participantAvatarCrop, setParticipantAvatarCrop] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const [participantError, setParticipantError] = useState("");
  const [isSavingParticipant, setIsSavingParticipant] = useState(false);
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
  const [isInvitePromptOpen, setIsInvitePromptOpen] = useState(false);
  const [isInvitePromptClosing, setIsInvitePromptClosing] = useState(false);
  const [copyToastMessage, setCopyToastMessage] = useState("");
  const [isCopyToastClosing, setIsCopyToastClosing] = useState(false);
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
  const [isMemoryClosing, setIsMemoryClosing] = useState(false);
  const [shouldOpenMemoryTicket, setShouldOpenMemoryTicket] = useState(false);
  const [selectedMemoryMood, setSelectedMemoryMood] = useState("");
  const [memoryNote, setMemoryNote] = useState("");
  const [isMemoryTicketOpen, setIsMemoryTicketOpen] = useState(false);
  const [isPageClosing, setIsPageClosing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [searchError, setSearchError] = useState("");
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
  const inviteUrl = `${window.location.origin}${
    window.location.pathname
  }#/activity/${encodeURIComponent(activityId)}`;

  const applyRemoteBundle = useCallback((bundle: RemoteActivityBundle) => {
    saveActivity(bundle.activity);
    saveMovies(bundle.movies);
    setActivity((currentActivity) => ({
      ...bundle.activity,
      memories: currentActivity?.memories ?? bundle.activity.memories,
    }));
    setCandidateMovies(bundle.movies);
    setRemoteParticipants(bundle.participants);
    setIsPicking(bundle.activity.status === "picking");
    setRevealedMovie(
      bundle.activity.selectedMovieId
        ? bundle.movies.find(
            (movie) => movie.id === bundle.activity.selectedMovieId,
          ) ??
            getMovieById(bundle.activity.selectedMovieId) ??
            null
        : null,
    );
  }, []);

  useEffect(() => {
    if (!activity || participant) return;
    if (isSharedActivity) return;
    const isLocalCreatorActivity = activity.id.startsWith("activity-");
    if (!isLocalCreatorActivity) return;

    const creatorParticipant = {
      participantId: createParticipantId(),
      nickname: "小杨",
      avatarUrl: hostImage,
    };
    saveParticipant(activityId, creatorParticipant);
    setParticipant(creatorParticipant);
  }, [activity, activityId, isSharedActivity, participant]);

  useEffect(() => {
    let isActive = true;

    const refreshRemoteActivity = () => {
      fetchRemoteActivityBundle(activityId)
        .then((bundle) => {
          if (!isActive || !bundle) return;
          applyRemoteBundle(bundle);
        })
        .catch(() => {
          // LocalStorage remains the fallback for offline/dev mode.
        });
    };

    refreshRemoteActivity();
    const timer = window.setInterval(refreshRemoteActivity, 8000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [activityId, applyRemoteBundle]);

  useEffect(() => {
    if (!activity) return;
    const invitePromptKey = `letsmovie.invite-prompt.${activityId}`;
    if (window.sessionStorage.getItem(invitePromptKey) !== "pending") return;

    window.sessionStorage.removeItem(invitePromptKey);
    setIsInvitePromptClosing(false);
    setIsInvitePromptOpen(true);
  }, [activity, activityId]);

  const areSearchResultsVisible = searchResults.length > 0;
  const selectedMovieCount = selectedMovieIds.length;
  const isSelectionComplete = selectedMovieCount === 3;
  const isMovieSelected = activity?.status === "selected" && revealedMovie;
  const currentParticipantName = participant?.nickname ?? currentUserName;
  const visibleParticipants = useMemo(() => {
    const participantMap = new Map<
      string,
      { id: string; name: string; src: string }
    >();

    remoteParticipants
      .filter((remoteParticipant) => remoteParticipant.role === "member")
      .forEach((remoteParticipant) => {
        if (!remoteParticipant.avatarUrl) return;
        participantMap.set(remoteParticipant.participantId, {
          id: remoteParticipant.participantId,
          name: remoteParticipant.nickname,
          src: remoteParticipant.avatarUrl,
        });
      });

    activity?.memories?.forEach((memory) => {
      const id = memory.participantId ?? memory.memberId;
      const name = memory.participantName ?? memory.memberName;
      const src = memory.participantAvatar;
      if (id && name && src) participantMap.set(id, { id, name, src });
    });

    if (participant?.avatarUrl) {
      const participantRole =
        remoteParticipants.find(
          (remoteParticipant) =>
            remoteParticipant.participantId === participant.participantId,
        )?.role ?? (isSharedActivity ? "member" : "host");

      if (participantRole === "member") {
        participantMap.set(participant.participantId, {
          id: participant.participantId,
          name: participant.nickname,
          src: participant.avatarUrl,
        });
      }
    }

    return Array.from(participantMap.values());
  }, [activity?.memories, isSharedActivity, participant, remoteParticipants]);
  const firstMember = visibleParticipants[0];

  const closeStartConfirmation = () => {
    if (isStartConfirmationClosing) return;
    setIsStartConfirmationClosing(true);
  };

  const closeInvitePrompt = () => {
    if (isInvitePromptClosing) return;
    setIsInvitePromptClosing(true);
  };

  const copyInviteLink = async () => {
    if (!isActivitySyncConfigured) {
      setIsCopyToastClosing(false);
      setCopyToastMessage("当前未配置云端，链接只能在本机使用");
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setIsCopyToastClosing(false);
      setCopyToastMessage("邀请链接已复制");
      closeInvitePrompt();
    } catch {
      setIsCopyToastClosing(false);
      setCopyToastMessage("复制失败，请手动复制链接");
    }
  };

  const confirmStartPicking = () => {
    if (candidateMovies.length === 0) return;
    setIsStartConfirmed(true);
  };

  const enterPickingMode = () => {
    setIsPicking(true);
    setSelectedMovieIds([]);
    setActivity(
      updateActivity(activityId, {
        status: "picking",
      }),
    );
    updateRemoteActivity(activityId, { status: "picking" }).catch(() => {
      // LocalStorage remains the fallback for offline/dev mode.
    });
    closeStartConfirmation();
  };

  const confirmPickedMovies = () => {
    if (!isSelectionComplete) return;
    startRandomReveal();
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

  useEffect(() => {
    let isActive = true;

    fetchActivityMemories(activityId)
      .then((memories) => {
        if (!isActive || memories.length === 0) return;
        setActivity((currentActivity) =>
          currentActivity
            ? updateActivity(activityId, { memories }) ?? currentActivity
            : currentActivity,
        );
      })
      .catch(() => {
        // LocalStorage remains the fallback for offline/dev mode.
      });

    return () => {
      isActive = false;
    };
  }, [activityId]);

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
    }, 300);

    return () => window.clearTimeout(timer);
  }, [isRecommendationClosing]);

  useEffect(() => {
    if (!newlyAddedMovieId) return;
    const timer = window.setTimeout(() => setNewlyAddedMovieId(null), 220);
    return () => window.clearTimeout(timer);
  }, [newlyAddedMovieId]);

  useEffect(() => {
    if (!copyToastMessage) return;
    const timer = window.setTimeout(() => setIsCopyToastClosing(true), 1500);
    return () => window.clearTimeout(timer);
  }, [copyToastMessage]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  const handleParticipantAvatarChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    setParticipantError("");

    if (!file) {
      setParticipantAvatarFile(null);
      setParticipantAvatarPreview("");
      return;
    }

    const isSupported = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    );
    if (!isSupported) {
      setParticipantError("头像只支持 jpg、png、webp");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setParticipantError("头像不能超过 2MB");
      event.target.value = "";
      return;
    }

    setParticipantAvatarFile(file);
    setParticipantAvatarPreview(URL.createObjectURL(file));
    setParticipantAvatarCrop({ x: 0, y: 0, zoom: 1 });
  };

  const enterActivity = async () => {
    const nickname = participantName.trim();
    if (!nickname) {
      setParticipantError("先告诉大家怎么称呼你");
      return;
    }

    const participantId = createParticipantId();
    setIsSavingParticipant(true);
    setParticipantError("");

    try {
      let avatarUrl = "";

      if (participantAvatarFile) {
        const croppedAvatarFile = await cropAvatarFile(
          participantAvatarFile,
          participantAvatarCrop,
        );
        avatarUrl = await uploadParticipantAvatar({
          activityId,
          participantId,
          file: croppedAvatarFile,
        });

        if (!avatarUrl) {
          avatarUrl = await fileToDataUrl(croppedAvatarFile);
        }
      }

      if (!avatarUrl) {
        avatarUrl =
          defaultAvatarPool[
            Math.floor(Math.random() * defaultAvatarPool.length)
          ];
      }

      const nextParticipant = { participantId, nickname, avatarUrl };
      saveParticipant(activityId, nextParticipant);
      setParticipant(nextParticipant);
      try {
        const remoteParticipant = await upsertRemoteParticipant({
          activityId,
          participant: nextParticipant,
          role: "member",
        });
        setRemoteParticipants((participants) => [
          ...participants.filter(
            (storedParticipant) =>
              storedParticipant.participantId !== participantId,
          ),
          remoteParticipant ?? { ...nextParticipant, role: "member" },
        ]);
      } catch {
        setRemoteParticipants((participants) => [
          ...participants.filter(
            (storedParticipant) =>
              storedParticipant.participantId !== participantId,
          ),
          { ...nextParticipant, role: "member" },
        ]);
      }
    } catch {
      setParticipantError("头像上传失败了，稍后再试一次");
    } finally {
      setIsSavingParticipant(false);
    }
  };

  const toggleRecommendedMovie = async (movie: Movie) => {
    const isSelected = candidateMovies.some(
      (candidateMovie) => candidateMovie.id === movie.id,
    );
    const recommendedMovie = { ...movie, recommender: currentParticipantName };
    const nextMovies = isSelected
      ? candidateMovies.filter(
          (candidateMovie) => candidateMovie.id !== movie.id,
        )
      : [...candidateMovies, recommendedMovie];

    if (!isSelected) saveMovie(recommendedMovie);
    setCandidateMovies(nextMovies);
    const updatedActivity = updateActivity(activityId, {
      candidateMovieIds: nextMovies.map((candidateMovie) => candidateMovie.id),
    });
    setActivity(updatedActivity);

    if (!isSelected) setNewlyAddedMovieId(movie.id);

    try {
      if (isSelected) {
        await deleteRemoteMovie(activityId, movie.id);
      } else {
        await upsertRemoteMovies(activityId, [recommendedMovie]);
      }
    } catch {
      // LocalStorage remains the fallback for offline/dev mode.
    }
  };

  const startRandomReveal = () => {
    const revealPool = selectedMovieIds.length
      ? candidateMovies.filter((movie) => selectedMovieIds.includes(movie.id))
      : candidateMovies;
    if (revealPool.length === 0) return;

    const pickDifferentMovie = (currentMovie: Movie | null) => {
      if (revealPool.length <= 1 || !currentMovie) {
        return revealPool[0];
      }

      const availableMovies = revealPool.filter(
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

    const winner = revealPool[Math.floor(Math.random() * revealPool.length)];
    setIsStartConfirmationOpen(false);
    setIsStartConfirmationClosing(false);
    setIsStartConfirmed(false);
    const firstMovie = revealPool[0];
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
          revealPool.length > 1 &&
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
    updateRemoteActivity(activityId, {
      status: "selected",
      selectedMovieId: revealMovie.id,
    }).catch(() => {
      // LocalStorage remains the fallback for offline/dev mode.
    });
    window.sessionStorage.setItem(
      `letsmovie.activity-poster-reveal.${activityId}`,
      "pending",
    );
    setIsRevealOpen(false);
  };

  const confirmMemory = async () => {
    if (!selectedMemoryMood || !activity || !participant) return;

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
    const normalizedUserMemory: ActivityMemory = {
      ...currentUserMemory,
      activityId,
      participantId: participant.participantId,
      participantName: participant.nickname,
      participantAvatar: participant.avatarUrl,
      content: memoryNote.trim(),
    };
    const savedMemory =
      (await createMemory(normalizedUserMemory).catch(() => null)) ??
      normalizedUserMemory;
    setActivity(
      updateActivity(activityId, {
        memoryEmoji: selectedMemoryMood,
        memoryNote: memoryNote.trim(),
        memoryCreatedAt,
        memoryTicketNumber,
        memories: [
          ...(activity.memories ?? []).filter(
            (memory) =>
              (memory.participantId ?? memory.memberId) !==
              normalizedUserMemory.participantId,
          ),
          savedMemory,
        ],
      }),
    );
    setShouldOpenMemoryTicket(true);
    setIsMemoryClosing(true);
  };

  const closeMemory = () => {
    if (isMemoryClosing) return;
    setShouldOpenMemoryTicket(false);
    setIsMemoryClosing(true);
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

  const leaveActivity = (remove = false) => {
    if (isPageClosing) return;
    setIsActivityActionsOpen(false);
    setIsPageClosing(true);

    window.setTimeout(() => {
      if (remove) deleteActivity(activityId);
      window.location.hash = "#/";
    }, 420);
  };

  const closeActivityActions = (deleteAfterClosing = false) => {
    if (isActivityActionsClosing) return;
    setShouldDeleteActivity(deleteAfterClosing);
    setIsActivityActionsClosing(true);
  };

  const returnToActivities = () => {
    leaveActivity();
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
      <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
        <div className="phone-canvas flex flex-col items-center justify-center bg-[#131416] px-8 text-center">
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
    <main className="phone-stage bg-[#090a0c] text-[#f8f4ed]">
      <div
        className={`phone-canvas activity-detail-canvas bg-[#131416] shadow-[0_0_50px_rgba(0,0,0,0.32)] ${
          isPageClosing ? "activity-detail-exit" : ""
        }`}
      >
        {!participant && (
          <div className="phone-fixed z-[120] grid place-items-center bg-black/68 px-6 backdrop-blur-[4px]">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="怎么称呼你？"
              className="start-confirmation-dialog w-full rounded-[24px] bg-[#23262d] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
            >
              <h2 className="text-center text-[22px] font-medium tracking-[-0.03em] text-[#f8f4ed]">
                怎么称呼你？
              </h2>

              <div className="mt-7 flex flex-col items-center">
                <label className="grid aspect-square size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border border-[#f8f4ed]/12 bg-[#1c1f24] text-[12px] text-[#f8f4ed]/55 transition active:scale-95">
                  {participantAvatarPreview ? (
                    <img
                      src={participantAvatarPreview}
                      alt=""
                      className="aspect-square size-full rounded-full object-cover"
                      style={{
                        objectPosition: `${50 + participantAvatarCrop.x / 2}% ${
                          50 + participantAvatarCrop.y / 2
                        }%`,
                        transform: `scale(${participantAvatarCrop.zoom})`,
                      }}
                    />
                  ) : (
                    <span>上传头像</span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleParticipantAvatarChange}
                    className="sr-only"
                  />
                </label>
                <p className="mt-2 text-[12px] text-[#f8f4ed]/35">
                  可选，jpg / png / webp，2MB 内
                </p>
                {participantAvatarPreview && (
                  <div className="mt-4 w-full space-y-3 rounded-[16px] bg-[#1c1f24]/72 px-4 py-3">
                    <label className="block text-[11px] text-[#f8f4ed]/45">
                      缩放
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.01"
                        value={participantAvatarCrop.zoom}
                        onChange={(event) =>
                          setParticipantAvatarCrop((crop) => ({
                            ...crop,
                            zoom: Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full accent-[#a52e4e]"
                      />
                    </label>
                    <label className="block text-[11px] text-[#f8f4ed]/45">
                      左右
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={participantAvatarCrop.x}
                        onChange={(event) =>
                          setParticipantAvatarCrop((crop) => ({
                            ...crop,
                            x: Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full accent-[#a52e4e]"
                      />
                    </label>
                    <label className="block text-[11px] text-[#f8f4ed]/45">
                      上下
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={participantAvatarCrop.y}
                        onChange={(event) =>
                          setParticipantAvatarCrop((crop) => ({
                            ...crop,
                            y: Number(event.target.value),
                          }))
                        }
                        className="mt-2 w-full accent-[#a52e4e]"
                      />
                    </label>
                  </div>
                )}
              </div>

              <input
                value={participantName}
                onChange={(event) => {
                  setParticipantName(event.target.value);
                  setParticipantError("");
                }}
                placeholder="输入昵称"
                className="mt-7 h-12 w-full rounded-[16px] border border-[#f8f4ed]/12 bg-[#1c1f24] px-4 text-[15px] text-[#f8f4ed] outline-none placeholder:text-[#f8f4ed]/35 focus:border-[#a52e4e]"
              />

              {participantError && (
                <p className="mt-3 text-center text-[12px] text-[#a52e4e]">
                  {participantError}
                </p>
              )}

              <button
                type="button"
                onClick={enterActivity}
                disabled={isSavingParticipant}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-[16px] bg-[#a52e4e] text-[15px] font-medium text-[#f8f4ed] transition active:scale-[0.985] disabled:opacity-60"
              >
                {isSavingParticipant ? "进入中" : "进入观影局"}
              </button>
            </section>
          </div>
        )}

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
          className={`relative h-[350px] overflow-hidden px-7 pb-12 pt-[88px] ${
            revealedMovie ? "collection-hero-selected" : "collection-hero"
          }`}
        >
          <div className="relative z-10">
            <h1 className="mt-5 text-[32px] font-medium leading-10 tracking-[-0.045em] [text-shadow:0_3px_18px_rgb(0_0_0/0.3)]">
              {activity.title}
            </h1>
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
            </div>
            <div className="mt-4 space-y-2.5 text-[14px] leading-5 text-[#f8f4ed]/75">
              <p className="flex items-center gap-2">
                <MapPin className="size-4" strokeWidth={1.6} />
                {activity.location}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="size-4" strokeWidth={1.6} />
                {formatActivityDate(activity)}
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
          <div className="flex w-full items-start justify-between px-1">
            <div className="flex flex-col items-start">
              <span className="text-[14px] font-normal text-[#f8f4ed]/75">
                主持人
              </span>
              <div className="mt-3.5 flex items-center">
                <img
                  src={hostImage}
                  alt="活动主持人"
                  className="aspect-square size-10 shrink-0 rounded-full object-cover"
                />
              </div>
            </div>

            <div className="flex w-10 flex-col items-center">
              <span className="text-center text-[14px] font-normal text-[#f8f4ed]/75">
                成员
              </span>
              <div className="mt-3.5 flex items-center">
                {firstMember ? (
                  <img
                    src={firstMember.src}
                    alt={firstMember.name}
                    className="aspect-square size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <button
                    type="button"
                    aria-label="邀请成员"
                    onClick={() => {
                      setIsInvitePromptClosing(false);
                      setIsInvitePromptOpen(true);
                    }}
                    className="grid aspect-square size-10 shrink-0 place-items-center rounded-full bg-[#a52e4e] text-[#f8f4ed] shadow-[0_8px_20px_rgba(80,9,31,0.34)] transition active:scale-95"
                  >
                    <Plus className="size-4.5" strokeWidth={1.8} />
                  </button>
                )}
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

        <div className="absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#131416] via-[#131416]/96 to-transparent px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-9">
          {isMovieSelected ? (
            <button
              type="button"
              onClick={() => {
                setSelectedMemoryMood("");
                setMemoryNote("");
                setIsMemoryClosing(false);
                setShouldOpenMemoryTicket(false);
                setIsMemoryOpen(true);
              }}
              className="flex h-14 w-full items-center justify-center rounded-[16px] bg-[#a52e4e] text-[16px] font-medium text-[#f8f4ed] shadow-[0_10px_30px_rgba(165,46,78,0.28)] transition active:scale-[0.985]"
            >
              留下回忆
            </button>
          ) : isPicking ? (
            <button
              type="button"
              onClick={confirmPickedMovies}
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
          <ActionDialog
            ariaLabel="开始挑选"
            ariaDescribedBy={
              isStartConfirmed ? undefined : "start-picking-description"
            }
            overlayAriaLabel="关闭开始挑选确认框"
            isClosing={isStartConfirmationClosing}
            onClose={closeStartConfirmation}
            onClosed={() => {
              setIsStartConfirmationOpen(false);
              setIsStartConfirmationClosing(false);
              setIsStartConfirmed(false);
            }}
            icon={
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
            }
            actions={
              isStartConfirmed
                ? [
                    {
                      label: "知道了",
                      onClick: enterPickingMode,
                      disabled: candidateMovies.length === 0,
                      variant: "primary",
                    },
                  ]
                : [
                    {
                      label: "再看看",
                      onClick: closeStartConfirmation,
                      variant: "secondary",
                    },
                    {
                      label: "确认开始",
                      onClick: confirmStartPicking,
                      disabled: candidateMovies.length === 0,
                      variant: "primary",
                    },
                  ]
            }
            actionKey={
              isStartConfirmed ? "confirmed-action" : "confirm-actions"
            }
          >
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
          </ActionDialog>
        )}

        {isInvitePromptOpen && (
          <ActionDialog
            ariaLabel="邀请好友"
            ariaDescribedBy="invite-friends-description"
            overlayAriaLabel="关闭邀请好友弹框"
            isClosing={isInvitePromptClosing}
            onClose={closeInvitePrompt}
            onClosed={() => {
              setIsInvitePromptOpen(false);
              setIsInvitePromptClosing(false);
            }}
            zIndexClassName="z-[65]"
            icon={
              <Popcorn
                aria-hidden="true"
                className="size-8"
                strokeWidth={1.6}
              />
            }
            actions={[
              {
                label: "稍后再说",
                onClick: closeInvitePrompt,
                variant: "secondary",
              },
              {
                label: "复制邀请链接",
                onClick: copyInviteLink,
                variant: "primary",
              },
            ]}
          >
            <div className="start-confirmation-content mt-7 text-center">
              <h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#f8f4ed]">
                邀请好友
              </h2>
              <p
                id="invite-friends-description"
                className="mx-auto mt-3 max-w-[260px] text-[14px] leading-6 text-[#f8f4ed]/70"
              >
                邀请朋友一起留下今晚的回忆吧
              </p>
            </div>
          </ActionDialog>
        )}

        {isRevealOpen && revealMovie && (
          <div className="phone-fixed z-[80] grid place-items-center bg-black/90 px-6 backdrop-blur-[4px]">
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
          <div className="phone-fixed pointer-events-none z-50">
            <div
              aria-hidden="true"
              className={`absolute inset-0 bg-black/20 ${
                isRecommendationClosing
                  ? "bottom-sheet-overlay-out"
                  : "bottom-sheet-overlay-in"
              }`}
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
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      if (event.target.value !== submittedQuery) {
                        setSubmittedQuery("");
                      }
                    }}
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
                          className={`search-result-enter movie-search-card relative min-w-0 overflow-hidden rounded-[16px] border ${
                            isSelected
                              ? "movie-search-card-selected"
                              : "border-transparent bg-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleRecommendedMovie(movie)}
                            aria-label={
                              isSelected
                                ? `移除${movie.title}`
                                : `加入${movie.title}`
                            }
                            className="block w-full rounded-[16px] text-left transition active:scale-[0.98]"
                          >
                            <span className="relative block overflow-hidden rounded-[16px]">
                              <img
                                src={movie.src}
                                alt={movie.title}
                                className="aspect-[2/3] w-full object-cover"
                              />
                              <span
                                aria-hidden="true"
                                className="movie-search-poster-overlay absolute inset-0 bg-[#8b1e3f]"
                              />
                            </span>
                            <span className="block pb-1 pt-2">
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
                            className="movie-search-selected-indicator absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-[#8b1e3f] text-[#f8f4ed] shadow-[0_8px_20px_rgba(80,9,31,0.42)]"
                          >
                            <Check className="size-4" strokeWidth={2.2} />
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : isSearchingMovies ? (
                  <p className="pb-[max(24px,env(safe-area-inset-bottom))] pt-5 text-center text-[13px] text-[#f8f4ed]/45">
                    正在搜索影片
                  </p>
                ) : searchError ? (
                  <p className="pb-[max(24px,env(safe-area-inset-bottom))] pt-5 text-center text-[13px] text-[#f8f4ed]/45">
                    {searchError}
                  </p>
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
          <div className="phone-fixed z-[70]">
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
                  leaveActivity(true);
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
          <div className="phone-fixed z-[90]">
            <button
              type="button"
              aria-label="关闭留下回忆"
              onClick={closeMemory}
              className={`absolute inset-0 bg-black/62 backdrop-blur-[2px] ${
                isMemoryClosing ? "memory-overlay-out" : "memory-overlay"
              }`}
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-label="留下回忆"
              onAnimationEnd={(event) => {
                if (!isMemoryClosing || event.target !== event.currentTarget) {
                  return;
                }

                setIsMemoryOpen(false);
                setIsMemoryClosing(false);

                if (shouldOpenMemoryTicket) {
                  setShouldOpenMemoryTicket(false);
                  setIsMemoryTicketOpen(true);
                  return;
                }

                setSelectedMemoryMood("");
                setMemoryNote("");
              }}
              className={`absolute inset-x-0 bottom-0 flex h-full flex-col rounded-t-[24px] bg-[#23262d] px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-[190px] shadow-[0_-24px_60px_rgba(0,0,0,0.45)] ${
                isMemoryClosing ? "memory-sheet-out" : "memory-sheet"
              }`}
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
            className="memory-ticket-overlay phone-fixed z-[100] block bg-[#090a0c] text-left"
          >
            <article className="memory-ticket flex h-full w-full flex-col overflow-hidden bg-[#23262d]">
              <div className="relative h-[528px] overflow-hidden">
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
        {copyToastMessage && (
          <div className="phone-fixed pointer-events-none z-[130] flex items-end justify-center px-6 pb-[max(26px,env(safe-area-inset-bottom))]">
            <div
              onAnimationEnd={() => {
                if (!isCopyToastClosing) return;
                setCopyToastMessage("");
                setIsCopyToastClosing(false);
              }}
              className={`rounded-full bg-[#f8f4ed] px-4 py-2 text-[13px] font-medium text-[#181a1e] shadow-[0_12px_34px_rgba(0,0,0,0.3)] ${
                isCopyToastClosing ? "copy-toast-out" : "copy-toast-in"
              }`}
            >
              {copyToastMessage}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
