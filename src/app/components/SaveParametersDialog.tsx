import { RotateCcw, Save } from "lucide-react";
import { useT } from "../i18n/I18nContext";

export type SaveParameterChoice = "save" | "discard";

interface SaveParametersDialogProps {
  open: boolean;
  selectedChoice: SaveParameterChoice;
  onSelectChoice: (choice: SaveParameterChoice) => void;
  onSave: () => void;
  onDiscard: () => void;
}

export function SaveParametersDialog({
  open,
  selectedChoice,
  onSelectChoice,
  onSave,
  onDiscard,
}: SaveParametersDialogProps) {
  const { t } = useT();

  if (!open) return null;

  return (
    <div
      className="!absolute inset-0 !z-30 flex items-center justify-center bg-[#020812]/90 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-parameters-title"
    >
      <div className="w-full max-w-[300px] rounded-[18px] border border-slate-700/80 bg-[#0b1525] p-5 shadow-[0_22px_70px_rgba(0,0,0,.6)]">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300">
          <Save className="h-5 w-5" />
        </div>
        <h2 id="save-parameters-title" className="mt-3 text-center text-base font-semibold text-white">
          {t("recipe.savePrompt.title")}
        </h2>
        <p className="mt-2 text-center text-[10px] leading-relaxed text-slate-400">
          {t("recipe.savePrompt.description")}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            onPointerEnter={() => onSelectChoice("discard")}
            className={`flex min-h-12 items-center justify-center gap-1.5 rounded-[10px] border text-xs transition-all ${selectedChoice === "discard" ? "border-blue-300 bg-slate-700/90 text-white ring-2 ring-blue-300" : "border-slate-700/70 bg-slate-800/60 text-slate-400 hover:bg-slate-700/70"}`}
          >
            <RotateCcw className="h-4 w-4" />
            {t("recipe.savePrompt.discard")}
          </button>
          <button
            type="button"
            onClick={onSave}
            onPointerEnter={() => onSelectChoice("save")}
            className={`linear-primary flex min-h-12 items-center justify-center gap-1.5 rounded-[10px] text-xs font-semibold transition-all ${selectedChoice === "save" ? "ring-2 ring-blue-200" : "opacity-70"}`}
          >
            <Save className="h-4 w-4" />
            {t("recipe.savePrompt.save")}
          </button>
        </div>
        <p className="mt-3 text-center text-[9px] text-slate-600">{t("recipe.savePrompt.knobHint")}</p>
      </div>
    </div>
  );
}
