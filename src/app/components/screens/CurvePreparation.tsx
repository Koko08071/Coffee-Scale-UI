import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

type EditableField = "dose" | "ratio" | "water";
type FocusTarget = EditableField | "weigh" | "brew";
type DoseSource = "recipe" | "measured" | "manual";

// 参数调整完成后，优先进入主操作“开始冲煮”，称量作为次要操作放在其后。
const focusOrder: FocusTarget[] = ["dose", "ratio", "water", "brew", "weigh"];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

function readNumber(value: string | null, fallback: number) {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function CurvePreparation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const { t } = useT();
  const selected = useMemo(
    () => settings.curves.find((curve) => curve.id === searchParams.get("curve")) ?? settings.curves[0],
    [searchParams, settings.curves],
  );
  const from = searchParams.get("from") ?? "";
  // 曲线复刻统一采用手冲基准参数；曲线本身仍决定阶段与时长，目标重量随参数自动缩放。
  const recipeDose = 15;
  const recipeRatio = 15;
  const recipeWater = recipeDose * recipeRatio;

  const [dose, setDose] = useState(() => readNumber(searchParams.get("dose"), recipeDose));
  const [ratio, setRatio] = useState(() => readNumber(searchParams.get("ratio"), recipeRatio));
  const [totalWater, setTotalWater] = useState(() => readNumber(searchParams.get("water"), recipeWater));
  const [doseSource, setDoseSource] = useState<DoseSource>(() => {
    const source = searchParams.get("doseSource");
    return source === "measured" || source === "manual" ? source : "recipe";
  });
  const [focus, setFocus] = useState<FocusTarget>("brew");
  const [editingField, setEditingField] = useState<EditableField | null>(null);

  const focusRef = useRef(focus);
  const editingFieldRef = useRef(editingField);
  const valuesRef = useRef({ dose, ratio, totalWater, doseSource });
  const editSnapshotRef = useRef(valuesRef.current);
  focusRef.current = focus;
  editingFieldRef.current = editingField;
  valuesRef.current = { dose, ratio, totalWater, doseSource };

  const buildUrl = useCallback((pathname: string, values = valuesRef.current) => {
    const params = new URLSearchParams();
    params.set("curve", selected?.id ?? "recommended-1");
    if (from) params.set("from", from);
    params.set("dose", values.dose.toFixed(1));
    params.set("ratio", values.ratio.toFixed(1));
    params.set("water", Math.round(values.totalWater).toString());
    params.set("doseSource", values.doseSource);
    return `${pathname}?${params.toString()}`;
  }, [from, selected?.id]);

  const beginPreparation = useCallback(() => navigate(buildUrl("/mode-selection/curve/replicate")), [buildUrl, navigate]);
  const beginWeighing = useCallback(() => navigate(buildUrl("/mode-selection/curve/weigh")), [buildUrl, navigate]);

  const leavePage = useCallback(() => {
    const backMap: Record<string, string> = {
      recommended: "/mode-selection/curve/select",
      recent: "/mode-selection/curve/recent",
      mine: "/mode-selection/curve/select/mine",
      bean: "/mode-selection/curve/select/bean",
      master: "/mode-selection/curve/select/master",
    };
    navigate(backMap[from] ?? "/mode-selection/curve/select");
  }, [from, navigate]);

  const enterEditing = useCallback((field: EditableField) => {
    editSnapshotRef.current = { ...valuesRef.current };
    setFocus(field);
    setEditingField(field);
  }, []);
  const finishEditing = useCallback(() => setEditingField(null), []);
  const cancelEditing = useCallback(() => {
    const snapshot = editSnapshotRef.current;
    setDose(snapshot.dose);
    setRatio(snapshot.ratio);
    setTotalWater(snapshot.totalWater);
    setDoseSource(snapshot.doseSource);
    setEditingField(null);
  }, []);

  const adjustField = useCallback((field: EditableField, direction: number) => {
    const step = direction >= 0 ? 1 : -1;
    const current = valuesRef.current;
    if (field === "dose") {
      const nextDose = round1(clamp(current.dose + step * 0.1, 5, 60));
      setDose(nextDose);
      setTotalWater(Math.round(nextDose * current.ratio));
      setDoseSource("manual");
      return;
    }
    if (field === "ratio") {
      const nextRatio = round1(clamp(current.ratio + step * 0.5, 10, 25));
      setRatio(nextRatio);
      setTotalWater(Math.round(current.dose * nextRatio));
      return;
    }
    const nextWater = Math.round(clamp(current.totalWater + step, 50, 1000));
    setTotalWater(nextWater);
    setRatio(round1(nextWater / current.dose));
  }, []);

  const activateTarget = useCallback((target: FocusTarget) => {
    if (target === "brew") beginPreparation();
    else if (target === "weigh") beginWeighing();
    else enterEditing(target);
  }, [beginPreparation, beginWeighing, enterEditing]);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      if (detail.type === "navigate-back") {
        if (editingFieldRef.current) cancelEditing();
        else leavePage();
        return;
      }
      if (detail.type === "rotary-turn") {
        const direction = Number(detail.direction ?? 1) >= 0 ? 1 : -1;
        const activeField = editingFieldRef.current;
        if (activeField) adjustField(activeField, direction);
        else setFocus((current) => {
          const index = focusOrder.indexOf(current);
          return focusOrder[(index + direction + focusOrder.length) % focusOrder.length];
        });
        return;
      }
      if (detail.type !== "knob-single-click") return;
      if (editingFieldRef.current) finishEditing();
      else activateTarget(focusRef.current);
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [activateTarget, adjustField, cancelEditing, finishEditing, leavePage]);

  return (
    <div className="screen-surface flex h-full flex-col px-3 pb-3 pt-2 text-[#F5F7FA]">
      <div className="h-[18px]" aria-hidden="true" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <RecipeMetric label={t("curve.prep.dose")} value={dose.toFixed(1)} unit="g" focused={focus === "dose"} editing={editingField === "dose"} onClick={() => editingField === "dose" ? finishEditing() : enterEditing("dose")} />
        <RecipeMetric label={t("curve.prep.ratio")} value={`1:${ratio.toFixed(1)}`} focused={focus === "ratio"} editing={editingField === "ratio"} onClick={() => editingField === "ratio" ? finishEditing() : enterEditing("ratio")} />
        <RecipeMetric label={t("curve.prep.totalWater")} value={Math.round(totalWater).toString()} unit="g" focused={focus === "water"} editing={editingField === "water"} onClick={() => editingField === "water" ? finishEditing() : enterEditing("water")} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={beginPreparation} className={`flex min-h-12 items-center justify-center gap-2 rounded-[11px] text-[13px] font-semibold transition-all ${focus === "brew" && !editingField ? "linear-primary ring-2 ring-blue-300/80" : "border border-blue-500/25 bg-blue-500/15 text-blue-100"}`}>
          {t("curve.prep.startPreparation")}
        </button>
        <button type="button" onClick={beginWeighing} className={`flex min-h-12 items-center justify-center gap-2 rounded-[11px] text-[13px] transition-all ${focus === "weigh" && !editingField ? "linear-secondary ring-2 ring-blue-300/80" : "border border-white/[0.08] bg-white/[0.04] text-[#AAB6C8]"}`}>
          {t("curve.prep.weighBeans")}
        </button>
      </div>

    </div>
  );
}

function RecipeMetric({ label, value, unit, focused, editing, onClick }: {
  label: string; value: string; unit?: string; focused: boolean; editing: boolean; onClick: () => void;
}) {
  const stateClass = editing
    ? "border-[#43C7FF]/70 bg-[#2F6BFF]/20 shadow-[0_0_18px_rgba(47,107,255,.25)] ring-1 ring-[#43C7FF]/50"
    : focused
      ? "border-[#2F6BFF]/60 bg-[#2F6BFF]/12 ring-1 ring-[#2F6BFF]/40"
      : "border-white/[0.07] bg-[#0D1624]/80";
  return (
    <button type="button" onClick={onClick} className={`relative flex min-h-[70px] flex-col items-center justify-center rounded-[12px] border px-2 transition-all ${stateClass}`}>
      <span className="text-[8px] text-[#8291A6]">{label}</span>
      <span className={`mt-1 whitespace-nowrap text-[20px] font-semibold tabular-nums tracking-[-0.04em] ${editing ? "text-[#43C7FF]" : "text-[#F5F7FA]"}`}>
        {value}{unit && <small className="ml-0.5 text-[8px] font-normal tracking-normal text-[#8291A6]">{unit}</small>}
      </span>
      {editing && <span className="mt-0.5 text-[6px] uppercase tracking-[0.18em] text-[#43C7FF]">Adjusting</span>}
    </button>
  );
}
