import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { Check, Plus, X } from "lucide-react";
import {
  createParticipantId,
  saveParticipant,
  type Participant,
} from "@/lib/participant-store";

const avatarCropMinZoom = 1;
const avatarCropMaxZoom = 5;

type AvatarCrop = { x: number; y: number; zoom: number };
type AvatarImageDimensions = { width: number; height: number };
type AvatarCropPointer = { x: number; y: number };
type AvatarCropGesture = {
  crop: AvatarCrop;
  centerX: number;
  centerY: number;
  distance: number | null;
  surfaceSize: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAvatarCropBaseSize(dimensions: AvatarImageDimensions | null) {
  if (!dimensions?.width || !dimensions.height) {
    return { width: 100, height: 100 };
  }

  const aspectRatio = dimensions.width / dimensions.height;
  return aspectRatio >= 1
    ? { width: aspectRatio * 100, height: 100 }
    : { width: 100, height: (1 / aspectRatio) * 100 };
}

function getAvatarCropMaxPan(
  zoom: number,
  dimensions: AvatarImageDimensions | null,
) {
  const baseSize = getAvatarCropBaseSize(dimensions);

  return {
    x: Math.max(0, (baseSize.width * zoom - 100) / 2),
    y: Math.max(0, (baseSize.height * zoom - 100) / 2),
  };
}

function normalizeAvatarCrop(
  crop: AvatarCrop,
  dimensions: AvatarImageDimensions | null = null,
): AvatarCrop {
  const zoom = clampNumber(crop.zoom, avatarCropMinZoom, avatarCropMaxZoom);
  const maxPan = getAvatarCropMaxPan(zoom, dimensions);

  return {
    x: clampNumber(crop.x, -maxPan.x, maxPan.x),
    y: clampNumber(crop.y, -maxPan.y, maxPan.y),
    zoom,
  };
}

function getAvatarCropImageStyle(
  crop: AvatarCrop,
  dimensions: AvatarImageDimensions | null,
): CSSProperties {
  const baseSize = getAvatarCropBaseSize(dimensions);

  return {
    left: `calc(50% + ${crop.x}%)`,
    top: `calc(50% + ${crop.y}%)`,
    width: `${baseSize.width * crop.zoom}%`,
    height: `${baseSize.height * crop.zoom}%`,
    transform: "translate(-50%, -50%)",
  };
}

function getPointerCenter(pointers: AvatarCropPointer[]) {
  const total = pointers.reduce(
    (position, pointer) => ({
      x: position.x + pointer.x,
      y: position.y + pointer.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / pointers.length,
    y: total.y / pointers.length,
  };
}

function getPointerDistance(
  firstPointer: AvatarCropPointer,
  secondPointer: AvatarCropPointer,
) {
  return Math.hypot(
    firstPointer.x - secondPointer.x,
    firstPointer.y - secondPointer.y,
  );
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
    const sourceCenterX =
      image.naturalWidth / 2 - (crop.x / 100) * (baseCropSize / crop.zoom);
    const sourceCenterY =
      image.naturalHeight / 2 - (crop.y / 100) * (baseCropSize / crop.zoom);
    const sourceX = clampNumber(
      sourceCenterX - cropSize / 2,
      0,
      image.naturalWidth - cropSize,
    );
    const sourceY = clampNumber(
      sourceCenterY - cropSize / 2,
      0,
      image.naturalHeight - cropSize,
    );

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

export function UserProfileDialog({
  initialParticipant,
  required = false,
  onClose,
  onSave,
}: {
  initialParticipant?: Participant | null;
  required?: boolean;
  onClose?: () => void;
  onSave?: (participant: Participant) => void | Promise<void>;
}) {
  const [nickname, setNickname] = useState(initialParticipant?.nickname ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarDimensions, setAvatarDimensions] =
    useState<AvatarImageDimensions | null>(null);
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0, zoom: 1 });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);
  const [isAvatarEditorClosing, setIsAvatarEditorClosing] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarCropRef = useRef<AvatarCrop>(avatarCrop);
  const avatarCropPointersRef = useRef<Map<number, AvatarCropPointer>>(
    new Map(),
  );
  const avatarCropGestureRef = useRef<AvatarCropGesture | null>(null);
  const currentAvatarUrl = avatarPreview || initialParticipant?.avatarUrl || "";

  useEffect(() => {
    setNickname(initialParticipant?.nickname ?? "");
  }, [initialParticipant?.nickname]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const updateAvatarCrop = useCallback(
    (updater: AvatarCrop | ((crop: AvatarCrop) => AvatarCrop)) => {
      setAvatarCrop((currentCrop) => {
        const nextCrop = normalizeAvatarCrop(
          typeof updater === "function" ? updater(currentCrop) : updater,
          avatarDimensions,
        );
        avatarCropRef.current = nextCrop;
        return nextCrop;
      });
    },
    [avatarDimensions],
  );

  const resetAvatarCropGesture = useCallback((surfaceSize: number) => {
    const pointers = Array.from(avatarCropPointersRef.current.values());
    if (pointers.length === 0) {
      avatarCropGestureRef.current = null;
      return;
    }

    const center = getPointerCenter(pointers);
    avatarCropGestureRef.current = {
      crop: avatarCropRef.current,
      centerX: center.x,
      centerY: center.y,
      distance:
        pointers.length > 1 ? getPointerDistance(pointers[0], pointers[1]) : null,
      surfaceSize,
    };
  }, []);

  const handleAvatarCropPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      avatarCropPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      resetAvatarCropGesture(event.currentTarget.getBoundingClientRect().width);
    },
    [resetAvatarCropGesture],
  );

  const handleAvatarCropPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!avatarCropPointersRef.current.has(event.pointerId)) return;

      event.preventDefault();
      avatarCropPointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const gesture = avatarCropGestureRef.current;
      const pointers = Array.from(avatarCropPointersRef.current.values());
      if (!gesture || pointers.length === 0) return;

      const center = getPointerCenter(pointers);
      const panScale = 100 / gesture.surfaceSize;
      const nextZoom =
        pointers.length > 1 && gesture.distance
          ? gesture.crop.zoom *
            (getPointerDistance(pointers[0], pointers[1]) / gesture.distance)
          : gesture.crop.zoom;

      updateAvatarCrop({
        zoom: nextZoom,
        x: gesture.crop.x + (center.x - gesture.centerX) * panScale,
        y: gesture.crop.y + (center.y - gesture.centerY) * panScale,
      });
    },
    [updateAvatarCrop],
  );

  const handleAvatarCropPointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      avatarCropPointersRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      resetAvatarCropGesture(event.currentTarget.getBoundingClientRect().width);
    },
    [resetAvatarCropGesture],
  );

  const handleAvatarCropWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      updateAvatarCrop((crop) => ({
        ...crop,
        zoom: crop.zoom - event.deltaY * 0.004,
      }));
    },
    [updateAvatarCrop],
  );

  const handleAvatarImageLoad = useCallback(
    (dimensions: AvatarImageDimensions) => {
      setAvatarDimensions(dimensions);
      setAvatarCrop((crop) => {
        const nextCrop = normalizeAvatarCrop(crop, dimensions);
        avatarCropRef.current = nextCrop;
        return nextCrop;
      });
    },
    [],
  );

  const closeAvatarEditor = () => {
    setIsAvatarEditorClosing(true);
    avatarCropPointersRef.current.clear();
    avatarCropGestureRef.current = null;
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      setIsAvatarEditorOpen(false);
      setIsAvatarEditorClosing(false);
      setAvatarFile(null);
      setAvatarPreview("");
      setAvatarDimensions(null);
      return;
    }

    const isSupported = ["image/jpeg", "image/png", "image/webp"].includes(
      file.type,
    );
    if (!isSupported) {
      setError("头像只支持 jpg、png、webp");
      event.target.value = "";
      return;
    }

    if (avatarPreview.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarDimensions(null);
    setAvatarPreview(URL.createObjectURL(file));
    avatarCropPointersRef.current.clear();
    avatarCropGestureRef.current = null;
    updateAvatarCrop({ x: 0, y: 0, zoom: 1 });
    setIsAvatarEditorClosing(false);
    setIsAvatarEditorOpen(true);
  };

  const saveProfile = async () => {
    const nextNickname = nickname.trim();
    if (!nextNickname) {
      setError("先告诉大家怎么称呼你");
      return;
    }

    if (!avatarFile && !initialParticipant?.avatarUrl) {
      setError("请上传头像");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      let avatarUrl = initialParticipant?.avatarUrl ?? "";
      if (avatarFile) {
        const croppedAvatarFile = await cropAvatarFile(avatarFile, avatarCrop);
        avatarUrl = await fileToDataUrl(croppedAvatarFile);
      }

      const nextParticipant = {
        participantId: initialParticipant?.participantId ?? createParticipantId(),
        nickname: nextNickname,
        avatarUrl,
      };
      saveParticipant(nextParticipant);
      await onSave?.(nextParticipant);
    } catch {
      setError("资料保存失败了，请稍后再试一次");
    } finally {
      setIsSaving(false);
    }
  };

  const renderAvatarEditor = () => {
    if (!isAvatarEditorOpen || !avatarPreview) return null;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="编辑头像"
        onAnimationEnd={(event) => {
          if (!isAvatarEditorClosing || event.target !== event.currentTarget) {
            return;
          }

          setIsAvatarEditorOpen(false);
          setIsAvatarEditorClosing(false);
        }}
        className={`phone-fixed z-[190] flex flex-col bg-[#090a0c] text-[#f8f4ed] ${
          isAvatarEditorClosing ? "avatar-editor-exit" : "avatar-editor-enter"
        }`}
      >
        <header className="grid h-16 shrink-0 grid-cols-[40px_1fr_40px] items-center border-b border-[#f8f4ed]/8 bg-[#131416]/96 px-5 shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md">
          <button
            type="button"
            aria-label="取消头像裁切"
            onClick={closeAvatarEditor}
            className="grid size-10 place-items-center text-[#f8f4ed]/72 transition hover:text-[#f8f4ed] active:scale-95"
          >
            <X className="size-5" strokeWidth={1.8} />
          </button>
          <h2 className="text-center text-[17px] font-medium leading-none text-[#f8f4ed]">
            编辑头像
          </h2>
          <button
            type="button"
            aria-label="确认头像裁切"
            onClick={closeAvatarEditor}
            className="grid size-10 place-items-center text-[#a52e4e] transition active:scale-95"
          >
            <Check className="size-5" strokeWidth={1.9} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-[#090a0c] px-5">
          <div
            role="img"
            aria-label="头像裁切框"
            onPointerDown={handleAvatarCropPointerDown}
            onPointerMove={handleAvatarCropPointerMove}
            onPointerUp={handleAvatarCropPointerEnd}
            onPointerCancel={handleAvatarCropPointerEnd}
            onWheel={handleAvatarCropWheel}
            className="relative aspect-square w-full max-w-[340px] touch-none select-none overflow-hidden rounded-[24px] border border-[#f8f4ed]/10 bg-[#131416] shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
          >
            <img
              src={avatarPreview}
              alt=""
              draggable={false}
              onLoad={(event) =>
                handleAvatarImageLoad({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              className="pointer-events-none absolute max-w-none object-cover"
              style={getAvatarCropImageStyle(avatarCrop, avatarDimensions)}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full border border-[#f8f4ed]/85 shadow-[0_0_0_999px_rgba(9,10,12,0.48)]">
              <div className="absolute left-1/3 top-0 h-full w-px bg-[#f8f4ed]/22" />
              <div className="absolute left-2/3 top-0 h-full w-px bg-[#f8f4ed]/22" />
              <div className="absolute left-0 top-1/3 h-px w-full bg-[#f8f4ed]/22" />
              <div className="absolute left-0 top-2/3 h-px w-full bg-[#f8f4ed]/22" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="phone-fixed z-[120] grid place-items-center bg-black/68 px-6 text-[#f8f4ed] backdrop-blur-[4px]">
      {renderAvatarEditor()}
      <section
        role="dialog"
        aria-modal="true"
        aria-label={initialParticipant ? "编辑个人资料" : "创建个人资料"}
        className="start-confirmation-dialog relative w-full rounded-[24px] bg-[#23262d] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
      >
        {!required && (
          <button
            type="button"
            aria-label="关闭个人资料编辑"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full text-[#f8f4ed]/52 transition hover:bg-white/[0.05] hover:text-[#f8f4ed] active:scale-95"
          >
            <X className="size-4.5" strokeWidth={1.8} />
          </button>
        )}

        <h2 className="text-center text-[22px] font-medium tracking-[-0.03em] text-[#f8f4ed]">
          {initialParticipant ? "编辑个人资料" : "先创建个人资料"}
        </h2>

        <div className="mt-7 flex flex-col items-center">
          {currentAvatarUrl ? (
            <div className="relative">
              <button
                type="button"
                aria-label={avatarPreview ? "重新编辑头像" : "更换头像"}
                onClick={() => {
                  if (avatarPreview) {
                    setIsAvatarEditorClosing(false);
                    setIsAvatarEditorOpen(true);
                    return;
                  }

                  avatarInputRef.current?.click();
                }}
                className="relative grid aspect-square size-28 cursor-pointer select-none place-items-center overflow-hidden rounded-full border border-[#f8f4ed]/14 bg-[#1c1f24] shadow-[0_16px_40px_rgba(0,0,0,0.32)] transition active:scale-95"
              >
                <img
                  src={currentAvatarUrl}
                  alt=""
                  draggable={false}
                  onLoad={(event) => {
                    if (!avatarPreview) return;
                    handleAvatarImageLoad({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                  }}
                  className={
                    avatarPreview
                      ? "pointer-events-none absolute max-w-none object-cover"
                      : "size-full object-cover"
                  }
                  style={
                    avatarPreview
                      ? getAvatarCropImageStyle(avatarCrop, avatarDimensions)
                      : undefined
                  }
                />
                <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
              </button>
              <button
                type="button"
                aria-label="重新选择头像"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full border border-[#f8f4ed]/18 bg-[#a52e4e] text-[#f8f4ed] shadow-[0_8px_18px_rgba(0,0,0,0.36)] transition active:scale-95"
              >
                <Plus className="size-4" strokeWidth={1.9} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="grid aspect-square size-20 shrink-0 place-items-center rounded-full border border-[#f8f4ed]/12 bg-[#1c1f24] text-[12px] text-[#f8f4ed]/55 transition active:scale-95"
            >
              上传头像
            </button>
          )}
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={handleAvatarChange}
            className="sr-only"
          />
          <p className="mt-2 text-[12px] text-[#f8f4ed]/35">
            jpg / png / webp
          </p>
        </div>

        <input
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            setError("");
          }}
          placeholder="输入昵称"
          className="mt-7 h-12 w-full rounded-[16px] border border-[#f8f4ed]/12 bg-[#1c1f24] px-4 text-[15px] text-[#f8f4ed] outline-none placeholder:text-[#f8f4ed]/35 focus:border-[#a52e4e]"
        />

        {error && (
          <p className="mt-3 text-center text-[12px] text-[#a52e4e]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={saveProfile}
          disabled={isSaving}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-[16px] bg-[#a52e4e] text-[15px] font-medium text-[#f8f4ed] transition active:scale-[0.985] disabled:opacity-60"
        >
          {isSaving ? "保存中" : initialParticipant ? "保存资料" : "进入 Frameclub"}
        </button>
      </section>
    </div>
  );
}
