import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useHardware } from "../HardwareContext";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

const round1 = (value: number) => Math.round(value * 10) / 10;

function readNumber(value: string | null, fallback: number) {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type WeighMode = "curve" | "espresso" | "free";

export function CurveBeanWeighing() {
  return <CoffeeBeanWeighing mode="curve" />;
}

export function EspressoBeanWeighing() {
  return <CoffeeBeanWeighing mode="espresso" />;
}

export function FreeBeanWeighing() {
  return <CoffeeBeanWeighing mode="free" />;
}

function CoffeeBeanWeighing({ mode }: { mode: WeighMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { timer, tare } = useHardware();
  const { settings } = useSettings();
  const { t } = useT();
  const curve = useMemo(
    () => settings.curves.find((item) => item.id === searchParams.get("curve")) ?? settings.curves[0],
    [searchParams, settings.curves],
  );
  const isEspresso = mode === "espresso";
  const isFree = mode === "free";
  const curveId = curve?.id ?? "recommended-1";
  const from = searchParams.get("from") ?? "";
  const fallbackDose = isEspresso ? settings.espressoDose : isFree ? settings.freeDose : curve?.dose ?? 15;
  const fallbackWater = isEspresso ? settings.espressoYield : isFree ? settings.freeYield : Number.parseFloat(curve?.weight ?? "240");
  const fallbackRatio = isEspresso
    ? fallbackDose > 0 ? round1(fallbackWater / fallbackDose) : 2
    : isFree
      ? fallbackDose > 0 ? round1(fallbackWater / fallbackDose) : 15
    : curve?.ratio ?? 16;
  const originalDose = readNumber(searchParams.get("dose"), fallbackDose);
  const ratio = readNumber(searchParams.get("ratio"), fallbackRatio);
  const originalWater = readNumber(searchParams.get("water"), fallbackWater);
  const originalSource = searchParams.get("doseSource") ?? "recipe";

  const [stable, setStable] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measuredWeight = round1(timer.weight);
  const canSave = stable && measuredWeight >= 1 && measuredWeight <= 100 && !saved;

  const buildPrepareUrl = useCallback((nextDose = originalDose, source = originalSource) => {
    const params = new URLSearchParams();
    if (mode === "curve") {
      params.set("curve", curveId);
      if (from) params.set("from", from);
    }
    params.set("dose", nextDose.toFixed(1));
    params.set("ratio", ratio.toFixed(1));
    params.set("water", (source === "measured" ? Math.round(nextDose * ratio) : Math.round(originalWater)).toString());
    params.set("doseSource", source);
    const pathname = isEspresso
      ? "/mode-selection/espresso"
      : isFree
        ? "/mode-selection/free"
        : "/mode-selection/curve/prepare";
    return `${pathname}?${params.toString()}`;
  }, [curveId, from, isEspresso, isFree, mode, originalDose, originalSource, originalWater, ratio]);

  useEffect(() => {
    setStable(false);
    if (measuredWeight < 1 || measuredWeight > 100 || saved) return;
    const timeout = window.setTimeout(() => setStable(true), 700);
    return () => window.clearTimeout(timeout);
  }, [measuredWeight, saved]);

  useEffect(() => () => {
    if (returnTimerRef.current) window.clearTimeout(returnTimerRef.current);
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  const handleTare = useCallback(() => {
    if (saved) return;
    tare();
    setStable(false);
    setSaveBlocked(false);
  }, [saved, tare]);

  const cancel = useCallback(() => {
    navigate(buildPrepareUrl(), { replace: true });
  }, [buildPrepareUrl, navigate]);

  const saveWeight = useCallback(() => {
    if (!canSave) {
      setSaveBlocked(true);
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = window.setTimeout(() => setSaveBlocked(false), 1400);
      return;
    }
    setSaved(true);
    returnTimerRef.current = window.setTimeout(() => {
      navigate(buildPrepareUrl(measuredWeight, "measured"), { replace: true });
    }, 800);
  }, [buildPrepareUrl, canSave, measuredWeight, navigate]);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      if (detail.type === "knob-single-click") handleTare();
      else if (detail.type === "bean-weigh-save") saveWeight();
      else if (detail.type === "navigate-back") cancel();
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [cancel, handleTare, saveWeight]);

  return (
    <div className="screen-surface flex h-full flex-col px-3 pb-3 pt-3 text-[#F5F7FA]">
      <div className="px-1 text-[12px] font-medium">
        {t("curve.weigh.title")}
      </div>

      <div className={`relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[20px] border bg-[#050A12]/80 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_40px_rgba(0,0,0,.2)] ${saved ? "border-emerald-400/25" : saveBlocked || measuredWeight < -0.1 ? "border-amber-400/25" : stable ? "border-blue-400/25" : "border-[#6C8EC5]/15"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_47%,rgba(47,107,255,.13),transparent_39%),linear-gradient(180deg,rgba(10,20,34,.08),rgba(5,10,18,.55))]" aria-hidden="true" />
        <span aria-hidden="true" className="absolute left-3 top-3 h-[62px] w-[92px] rounded-tl-[28px] border-l border-t border-[#7FB6EA]/28" />
        <span aria-hidden="true" className="absolute right-3 top-3 h-[62px] w-[92px] rounded-tr-[28px] border-r border-t border-[#7FB6EA]/28" />
        <span aria-hidden="true" className="absolute bottom-3 left-3 h-[62px] w-[92px] rounded-bl-[28px] border-b border-l border-[#7FB6EA]/20" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 h-[62px] w-[92px] rounded-br-[28px] border-b border-r border-[#7FB6EA]/20" />

        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[50%] h-[210px] w-[270px] -translate-x-1/2 -translate-y-1/2"
        >
          <div className="home-weight-orb absolute inset-0 rounded-full" />
          <div className="home-weight-orb-wave absolute inset-[16%] rounded-full" />
        </div>

        <div className="absolute left-1/2 top-[49%] z-20 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="relative min-w-[190px] px-8 py-6">
            <div aria-hidden="true" className="absolute inset-[-18px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(5,10,18,.96)_0%,rgba(5,10,18,.78)_45%,rgba(5,10,18,.28)_68%,transparent_78%)] backdrop-blur-[5px]" />
            <div className="relative flex items-end justify-center font-light tabular-nums tracking-[-0.06em]">
              <span className={`text-[64px] leading-none ${saved ? "text-[#27C6A3]" : measuredWeight < -0.1 ? "text-[#FFC247]" : "text-[#F5F7FA]"}`} style={{ textShadow: "0 2px 3px rgba(0,0,0,1), 0 0 12px rgba(5,10,18,.95), 0 0 18px rgba(67,199,255,.18)" }}>{measuredWeight.toFixed(1)}</span>
              <span className="mb-1.5 ml-1.5 text-[12px] tracking-normal text-[#A8C5FF]">g</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-center text-[8px] tracking-wide text-[#8291A6]">
          {t("curve.weigh.freeHint")}
        </div>
      </div>
    </div>
  );
}
