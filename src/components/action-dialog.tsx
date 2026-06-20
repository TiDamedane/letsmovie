import { useEffect, type AnimationEvent, type ReactNode } from "react";

type DialogActionVariant = "primary" | "secondary";

type DialogAction = {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: DialogActionVariant;
};

type ActionDialogProps = {
  ariaLabel: string;
  ariaDescribedBy?: string;
  overlayAriaLabel: string;
  isClosing: boolean;
  onClose: () => void;
  onClosed: () => void;
  icon: ReactNode;
  children: ReactNode;
  actions: DialogAction[];
  actionKey?: string;
  zIndexClassName?: string;
};

const dialogActionClassName: Record<DialogActionVariant, string> = {
  primary:
    "h-12 rounded-[16px] text-[14px] font-medium text-[#8b1e3f] transition hover:bg-[#8b1e3f]/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
  secondary:
    "h-12 rounded-[16px] text-[14px] font-normal text-[#f8f4ed] transition hover:bg-white/[0.05] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
};

export function ActionDialog({
  ariaLabel,
  ariaDescribedBy,
  overlayAriaLabel,
  isClosing,
  onClose,
  onClosed,
  icon,
  children,
  actions,
  actionKey,
  zIndexClassName = "z-[60]",
}: ActionDialogProps) {
  useEffect(() => {
    if (!isClosing) return;

    const timer = window.setTimeout(onClosed, 240);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClosed]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (!isClosing || event.target !== event.currentTarget) {
      return;
    }

    onClosed();
  };

  return (
    <div className={`phone-fixed ${zIndexClassName} grid place-items-center px-6`}>
      <button
        type="button"
        aria-label={overlayAriaLabel}
        onClick={onClose}
        className={`absolute inset-0 bg-black/58 ${
          isClosing
            ? "start-confirmation-overlay-closing"
            : "start-confirmation-overlay"
        }`}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        onAnimationEnd={handleAnimationEnd}
        className={`relative flex min-h-[286px] w-[320px] max-w-full -translate-y-4 flex-col rounded-[32px] bg-[#181b1f] px-6 pb-4 pt-8 shadow-[0_24px_70px_rgba(0,0,0,0.58)] ${
          isClosing
            ? "start-confirmation-dialog-closing"
            : "start-confirmation-dialog"
        }`}
      >
        <div className="mx-auto grid size-14 place-items-center text-[#f8f4ed]/88">
          {icon}
        </div>

        {children}

        <div
          key={actionKey}
          className={`mt-auto grid gap-2 pt-5 ${
            actions.length === 1
              ? "start-confirmation-content grid-cols-1"
              : "grid-cols-2"
          }`}
        >
          {actions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={
                dialogActionClassName[action.variant ?? "secondary"]
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
