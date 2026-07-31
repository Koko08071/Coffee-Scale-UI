import { Play, Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

const round1 = (value: number) => Math.round(value * 10) / 10;

function readNumber(value: string | null, fallback: number) {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function FreePreparation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const { t } = useT();
  const fallbackDose = settings.freeDose ?? 15;
  const fallbackWater = settings.freeYield ?? 225;
  const fallbackRatio = fallbackDose > 0 ? round1(fallbackWater / fallbackDose) : 15;
  const dose = readNumber(searchParams.get("dose"), fallbackDose);
  const ratio = readNumber(searchParams.get("ratio"), fallbackRatio);
  const totalWater = readNumber(searchParams.get("water"), Math.round(dose * ratio));
  const doseSource = searchParams.get("doseSource") ?? "recipe";
  const [selectedAction, setSelectedAction] = useState<"brew" | "weigh">("brew");
  const selectedActionRef = useRef(selectedAction);
  selectedActionRef.current = selectedAction;

  const buildParams = () => {
    const params = new URLSearchParams();
    params.set("dose", dose.toFixed(1));
    params.set("ratio", ratio.toFixed(1));
    params.set("water", Math.round(totalWater).toString());
    params.set("doseSource", doseSource);
    return params.toString();
  };

  const beginBrewing = () => navigate(`/mode-selection/free/brewing?${buildParams()}`);
  const beginWeighing = () => navigate(`/mode-selection/free/weigh?${buildParams()}`);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "navigate-back") {
        navigate("/mode-selection");
      } else if (detail?.type === "rotary-turn") {
        setSelectedAction((current) => (current === "brew" ? "weigh" : "brew"));
      } else if (detail?.type === "knob-single-click") {
        if (selectedActionRef.current === "weigh") beginWeighing();
        else beginBrewing();
      }
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [dose, ratio, totalWater, doseSource, navigate]);

  return (
    <div className="screen-surface h-full p-4 text-white">
      <div className="mb-4 h-[18px]" aria-hidden="true" />

      <div className="grid grid-cols-3 gap-2">
        <Metric
          label={t("free.prep.dose")}
          value={`${dose.toFixed(1)}g`}
          badge={doseSource === "measured" ? t("free.prep.measured") : undefined}
        />
        <Metric label={t("free.prep.ratio")} value={`1:${ratio.toFixed(1)}`} />
        <Metric label={t("free.prep.totalWater")} value={`${Math.round(totalWater)}g`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={beginBrewing}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-[10px] text-sm font-semibold transition-all ${selectedAction === "brew" ? "linear-primary ring-2 ring-blue-300" : "border border-slate-700/50 bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"}`}
        >
          <Play className="h-4 w-4 fill-current" />
          {t("free.prep.startBrew")}
        </button>
        <button
          type="button"
          onClick={beginWeighing}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-[10px] text-sm transition-all ${selectedAction === "weigh" ? "linear-secondary ring-2 ring-blue-300" : "border border-slate-700/50 bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"}`}
        >
          <Scale className="h-4 w-4" />
          {t("free.prep.weigh")}
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="linear-card relative p-2 text-center">
      <div className="text-[9px] text-slate-500">{label}</div>
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[7px] text-emerald-300">
          {badge}
        </span>
      )}
      <div className="mt-1 text-sm tabular-nums text-white">{value}</div>
    </div>
  );
}
