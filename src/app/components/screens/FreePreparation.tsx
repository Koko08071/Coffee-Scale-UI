import { Minus, Plus, Play, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSettings } from "../SettingsContext";
import { SaveParametersDialog, type SaveParameterChoice } from "../SaveParametersDialog";
import { useT } from "../../i18n/I18nContext";

export function FreePreparation() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [activeAdjust, setActiveAdjust] = useState<"dose" | "ratio" | "water" | "apply" | "cancel" | null>(null);
  const [valueMode, setValueMode] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"edit" | "brew">("brew");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogChoice, setSaveDialogChoice] = useState<SaveParameterChoice>("save");
  const screenRef = useRef<HTMLDivElement>(null);
  const activeAdjustRef = useRef(activeAdjust);
  activeAdjustRef.current = activeAdjust;
  const selectedActionRef = useRef(selectedAction);
  selectedActionRef.current = selectedAction;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const saveDialogOpenRef = useRef(saveDialogOpen);
  saveDialogOpenRef.current = saveDialogOpen;
  const saveDialogChoiceRef = useRef(saveDialogChoice);
  saveDialogChoiceRef.current = saveDialogChoice;

  const [dose, setDose] = useState(settings.freeDose ?? 15);
  const [ratio, setRatio] = useState(() => {
    const d = settings.freeDose ?? 15;
    const y = settings.freeYield ?? 225;
    return d > 0 ? Math.round((y / d) * 10) / 10 : 16;
  });
  const [totalWater, setTotalWater] = useState(settings.freeYield ?? 225);

  // 进入编辑态前的原始值，用于取消时回滚
  const [originalValues, setOriginalValues] = useState({ dose, ratio, totalWater });

  const safeDose = Number.isFinite(dose) ? dose : 15;
  const safeRatio = Number.isFinite(ratio) ? ratio : 16;
  const safeWater = Number.isFinite(totalWater) ? totalWater : 240;

  const changeDose = (next: number) => {
    const rounded = Math.round(next * 10) / 10;
    setDose(rounded);
    setTotalWater(Math.round(rounded * ratio));
  };
  const changeRatio = (next: number) => {
    const rounded = Math.round(next * 10) / 10;
    setRatio(rounded);
    setTotalWater(Math.round(dose * rounded));
  };
  const changeWater = (next: number) => {
    const rounded = Math.round(next);
    setTotalWater(rounded);
    setRatio(Math.round((rounded / dose) * 10) / 10);
  };

  const beginBrewing = () => {
    navigate("/mode-selection/free/brewing");
  };

  const enterEditing = () => {
    setOriginalValues({ dose, ratio, totalWater });
    setEditing(true);
    setActiveAdjust("dose");
    setValueMode(false);
  };

  const applyChanges = useCallback(() => {
    setEditing(false);
    setActiveAdjust(null);
    setValueMode(false);
    setSelectedAction("brew");
  }, []);

  const cancelChanges = useCallback(() => {
    setDose(originalValues.dose);
    setRatio(originalValues.ratio);
    setTotalWater(originalValues.totalWater);
    setEditing(false);
    setActiveAdjust(null);
    setValueMode(false);
    setSelectedAction("brew");
  }, [originalValues]);

  const requestCancel = useCallback(() => {
    screenRef.current?.scrollTo({ top: 0 });
    setValueMode(false);
    setSaveDialogChoice("save");
    setSaveDialogOpen(true);
  }, []);

  const saveDialogChanges = useCallback(() => {
    setSaveDialogOpen(false);
    applyChanges();
  }, [applyChanges]);

  const discardDialogChanges = useCallback(() => {
    setSaveDialogOpen(false);
    cancelChanges();
  }, [cancelChanges]);

  const cycleField = (direction: number) => {
    const fields: Array<"dose" | "ratio" | "water" | "apply" | "cancel"> = ["dose", "ratio", "water", "apply", "cancel"];
    const currentIndex = fields.indexOf(activeAdjustRef.current ?? "dose");
    const nextIndex = (currentIndex + direction + fields.length) % fields.length;
    const next = fields[nextIndex];
    setActiveAdjust(next);
    if (next === "apply" || next === "cancel") setValueMode(false);
  };

  const cycleAction = () => {
    setSelectedAction((current) => (current === "edit" ? "brew" : "edit"));
  };

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "navigate-back") {
        if (saveDialogOpenRef.current) { setSaveDialogOpen(false); return; }
        navigate("/mode-selection");
        return;
      }
      if (detail?.type === "knob-single-click") {
        if (saveDialogOpenRef.current) {
          if (saveDialogChoiceRef.current === "save") saveDialogChanges();
          else discardDialogChanges();
          return;
        }
        if (editingRef.current) {
          const field = activeAdjustRef.current;
          if (field === "apply") {
            applyChanges();
          } else if (field === "cancel") {
            requestCancel();
          } else {
            setValueMode((current) => !current);
          }
        } else {
          const action = selectedActionRef.current;
          if (action === "edit") {
            enterEditing();
          } else {
            beginBrewing();
          }
        }
      }
      if (detail?.type === "rotary-turn") {
        const direction = detail.direction as number;
        if (saveDialogOpenRef.current) {
          setSaveDialogChoice((current) => (current === "save" ? "discard" : "save"));
          return;
        }
        if (editingRef.current) {
          if (valueMode) {
            const field = activeAdjustRef.current;
            if (field === "dose") changeDose(Math.max(7, Math.min(40, safeDose + direction * 0.1)));
            if (field === "ratio") changeRatio(Math.max(8, Math.min(20, Math.round((safeRatio + direction * 0.5) * 10) / 10)));
            if (field === "water") changeWater(Math.max(50, Math.min(500, safeWater + direction * 5)));
          } else {
            cycleField(direction);
          }
        } else {
          cycleAction();
        }
      }
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [editing, activeAdjust, valueMode, selectedAction, safeDose, safeRatio, safeWater, applyChanges, requestCancel, saveDialogChanges, discardDialogChanges]);

  return (
    <div ref={screenRef} className="screen-surface h-full overflow-y-auto p-4 text-white">
      <div className="mb-4 h-[18px]" aria-hidden="true" />
      {!editing && (
        <div className="grid grid-cols-3 gap-2">
          <Metric label={t("free.prep.dose")} value={`${safeDose.toFixed(1)}g`} />
          <Metric label={t("free.prep.ratio")} value={`1:${safeRatio.toFixed(1)}`} />
          <Metric label={t("free.prep.totalWater")} value={`${safeWater.toFixed(0)}g`} />
        </div>
      )}

      {editing && (
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <Stepper label={t("free.prep.dose")} value={`${safeDose.toFixed(1)}g`} active={activeAdjust === "dose"} selected={activeAdjust === "dose" && valueMode} onActivate={() => { setActiveAdjust("dose"); setValueMode(true); }} onMinus={() => changeDose(Math.max(7, safeDose - 0.1))} onPlus={() => changeDose(Math.min(40, safeDose + 0.1))} />
          <Stepper label={t("free.prep.ratio")} value={`1:${safeRatio.toFixed(1)}`} active={activeAdjust === "ratio"} selected={activeAdjust === "ratio" && valueMode} onActivate={() => { setActiveAdjust("ratio"); setValueMode(true); }} onMinus={() => changeRatio(Math.max(8, Math.round((safeRatio - 0.5) * 10) / 10))} onPlus={() => changeRatio(Math.min(20, Math.round((safeRatio + 0.5) * 10) / 10))} />
          <Stepper label={t("free.prep.totalWater")} value={`${safeWater.toFixed(0)}g`} active={activeAdjust === "water"} selected={activeAdjust === "water" && valueMode} onActivate={() => { setActiveAdjust("water"); setValueMode(true); }} onMinus={() => changeWater(Math.max(50, safeWater - 5))} onPlus={() => changeWater(Math.min(500, safeWater + 5))} />
        </div>
      )}

      {editing ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={applyChanges}
            className={`flex min-h-12 items-center justify-center gap-2 text-sm font-semibold transition-all rounded-[10px] ${activeAdjust === "apply" ? "linear-primary ring-2 ring-blue-300" : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"}`}
          >
            {t("common.apply")}
          </button>
          <button
            type="button"
            onClick={requestCancel}
            className={`flex min-h-12 items-center justify-center gap-2 text-sm transition-all rounded-[10px] ${activeAdjust === "cancel" ? "linear-secondary ring-2 ring-blue-300" : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"}`}
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={beginBrewing}
            className={`flex min-h-12 items-center justify-center gap-2 text-sm font-semibold transition-all rounded-[10px] ${selectedAction === "brew" ? "linear-primary ring-2 ring-blue-300" : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"}`}
          >
            <Play className="h-4 w-4 fill-current" />{t("free.prep.startBrew")}
          </button>
          <button
            type="button"
            onClick={enterEditing}
            className={`flex min-h-12 items-center justify-center gap-2 text-sm transition-all rounded-[10px] ${selectedAction === "edit" ? "linear-secondary ring-2 ring-blue-300" : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/60"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />{t("free.prep.adjustParams")}
          </button>
        </div>
      )}
      <SaveParametersDialog
        open={saveDialogOpen}
        selectedChoice={saveDialogChoice}
        onSelectChoice={setSaveDialogChoice}
        onSave={saveDialogChanges}
        onDiscard={discardDialogChanges}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="linear-card p-2 text-center"><div className="text-[9px] text-slate-500">{label}</div><div className="mt-1 text-sm tabular-nums text-white">{value}</div></div>;
}

function Stepper({ label, value, active, selected, onActivate, onMinus, onPlus }: { label: string; value: string; active?: boolean; selected?: boolean; onActivate?: () => void; onMinus: () => void; onPlus: () => void }) {
  const rowClass = selected
    ? "bg-blue-500/25 ring-2 ring-blue-300"
    : active
      ? "bg-blue-500/10 ring-1 ring-blue-400/50"
      : "hover:bg-white/5";
  return (
    <div
      onClick={onActivate}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 transition-colors ${rowClass}`}
    >
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={(e) => { e.stopPropagation(); onMinus(); }} className="rounded-lg border border-white/10 p-2 hover:border-blue-400"><Minus className="h-4 w-4" /></button>
        <span className={`w-16 text-center text-sm tabular-nums ${selected ? "text-blue-200" : ""}`}>{value}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onPlus(); }} className="rounded-lg border border-white/10 p-2 hover:border-blue-400"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
