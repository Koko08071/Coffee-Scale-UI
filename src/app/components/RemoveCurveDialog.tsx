import { AlertTriangle, Trash2, X } from "lucide-react";
import { useT } from "../i18n/I18nContext";

export type RemoveCurveChoice = "cancel" | "remove";

interface RemoveCurveDialogProps {
  open: boolean;
  curveName: string;
  selectedChoice: RemoveCurveChoice;
  onSelectChoice: (choice: RemoveCurveChoice) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RemoveCurveDialog({
  open,
  curveName,
  selectedChoice,
  onSelectChoice,
  onCancel,
  onConfirm,
}: RemoveCurveDialogProps) {
  const { t } = useT();

  if (!open) return null;

  const description = t("curve.removeConfirm.description").replace("{name}", curveName);

  return (
    <div
      className="!absolute inset-0 !z-30 flex items-center justify-center bg-[#020812]/92 p-5 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="remove-curve-title"
      aria-describedby="remove-curve-description"
    >
      <div className="w-full max-w-[310px] rounded-[18px] border border-red-400/25 bg-[#0b1422] p-5 shadow-[0_24px_80px_rgba(0,0,0,.65)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 id="remove-curve-title" className="mt-3 text-center text-base font-semibold text-white">
          {t("curve.removeConfirm.title")}
        </h2>
        <p id="remove-curve-description" className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
          {description}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            onPointerEnter={() => onSelectChoice("cancel")}
            className={`linear-secondary flex min-h-12 items-center justify-center gap-1.5 rounded-[10px] text-xs transition-all ${selectedChoice === "cancel" ? "ring-2 ring-blue-300 text-white" : "opacity-70"}`}
          >
            <X className="h-4 w-4" />
            {t("curve.removeConfirm.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            onPointerEnter={() => onSelectChoice("remove")}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-[10px] border border-red-400/30 bg-gradient-to-br from-red-500/85 to-red-700/85 text-xs font-semibold text-white transition-all ${selectedChoice === "remove" ? "ring-2 ring-red-300" : "opacity-70"}`}
          >
            <Trash2 className="h-4 w-4" />
            {t("curve.removeConfirm.confirm")}
          </button>
        </div>
        <p className="mt-3 text-center text-[9px] text-slate-600">{t("curve.removeConfirm.knobHint")}</p>
      </div>
    </div>
  );
}
