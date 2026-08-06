import { useEffect, useRef, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useHardware } from "../HardwareContext";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function EspressoMode() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    tare,
    overload,
  } = useHardware();
  const { settings } = useSettings();
  const { t } = useT();

  const sessionYield = Number.parseFloat(searchParams.get("water") ?? "");
  const targetYield = Math.max(
    0.1,
    Number.isFinite(sessionYield) ? sessionYield : settings.espressoYield,
  );
  const maxWeightRef = useRef(0);
  const completedRef = useRef(false);
  const hasTaredRef = useRef(false);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  useEffect(() => {
    if (!overload && timer.weight > maxWeightRef.current) {
      maxWeightRef.current = timer.weight;
    }
  }, [overload, timer.weight]);

  const currentYield = overload
    ? 2000
    : Math.max(maxWeightRef.current, timer.weight);
  const progressRatio = Math.max(0, currentYield / targetYield);
  const isComplete =
    completedRef.current ||
    (!overload && timer.weight >= targetYield && !timer.isRunning && timer.time > 0);
  const isWaiting = !timer.isRunning && !isComplete;

  // 自动计时开启时，去皮后检测到液重即开始计时。
  useEffect(() => {
    if (
      overload ||
      !settings.autoTimer ||
      !hasTaredRef.current ||
      timer.isRunning ||
      isComplete
    ) {
      return;
    }
    if (timer.weight > 0.3) startTimer();
  }, [
    overload,
    settings.autoTimer,
    timer.isRunning,
    timer.weight,
    isComplete,
    startTimer,
  ]);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;

      if (detail?.type === "navigate-back") {
        completedRef.current = false;
        hasTaredRef.current = false;
        maxWeightRef.current = 0;
        resetTimer();
        navigate("/mode-selection");
        return;
      }

      if (detail?.type !== "knob-single-click") return;

      const current = timerRef.current;
      const completed =
        completedRef.current ||
        (current.weight >= targetYield && !current.isRunning && current.time > 0);

      if (completed && !current.isRunning) {
        completedRef.current = false;
        hasTaredRef.current = false;
        maxWeightRef.current = 0;
        resetTimer();
        navigate("/mode-selection");
        return;
      }
      if (completed) return;

      if (!hasTaredRef.current) {
        tare();
        hasTaredRef.current = true;
        maxWeightRef.current = 0;
        return;
      }

      if (current.isRunning) pauseTimer();
      else startTimer();
    };

    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [navigate, pauseTimer, resetTimer, startTimer, tare, targetYield]);

  const flowProgress = Math.min(Math.abs(timer.flowRate) / 8, 1);
  const flowBarWidth = 12 + flowProgress * 88;
  const orbScale = 0.82 + Math.min(progressRatio, 1) * 0.18;
  const displayedYield = currentYield;
  const clampedProgress = hasTaredRef.current ? Math.min(progressRatio, 1) : 0;
  const progressPercent = Math.round(clampedProgress * 100);
  const progressRadius = 106;
  const progressCircumference = 2 * Math.PI * progressRadius;

  const visualStyle = {
    "--espresso-primary": "67,199,255",
    "--espresso-secondary": "47,107,255",
  } as CSSProperties;

  return (
    <div
      className="espresso-focus relative h-full w-full overflow-hidden bg-[#02060B] text-[#F5F7FA]"
      style={visualStyle}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 50% 56%, rgba(var(--espresso-secondary), .07), transparent 46%)",
        }}
      />

      {/* 顶部流速光条 */}
      <div className="absolute left-1/2 top-[7%] z-30 h-[3px] w-[38%] -translate-x-1/2 rounded-full bg-white/[0.04]">
        <div
          className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_11px_rgba(255,255,255,.88)] transition-[width] duration-300 ease-out"
          style={{ width: `${flowBarWidth}%` }}
        />
      </div>

      {/* 左上：流速 */}
      <div className="absolute left-[3.2%] top-[8.5%] z-30 flex h-[102px] w-[132px] items-center justify-center">
        <div aria-hidden="true" className="espresso-side-orb absolute inset-0 rounded-full" />
        <div
          className="relative whitespace-nowrap text-[30px] font-semibold italic tabular-nums tracking-[-0.045em]"
          style={{ textShadow: "0 2px 5px rgba(0,0,0,.95), 0 0 12px rgba(255,255,255,.28)" }}
        >
          {timer.flowRate.toFixed(1)}
          <span className="ml-1 text-[14px] tracking-normal">g/s</span>
        </div>
      </div>

      {/* 右上：萃取时间 */}
      <div className="absolute right-[3.2%] top-[8.5%] z-30 flex h-[102px] w-[132px] items-center justify-center">
        <div aria-hidden="true" className="espresso-side-orb absolute inset-0 rounded-full" />
        <div
          className="relative whitespace-nowrap text-[30px] font-semibold tabular-nums tracking-[-0.05em]"
          style={{ textShadow: "0 2px 5px rgba(0,0,0,.95), 0 0 12px rgba(255,255,255,.28)" }}
        >
          {formatTime(timer.time)}
        </div>
      </div>

      {/* 中间：随进度扩散并在接近目标时变色的液重光球 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[10%] top-[20%] flex items-center justify-center"
      >
        <div
          className="relative transition-[width,height] duration-500 ease-out"
          style={{
            width: `${348 * orbScale}px`,
            height: `${250 * orbScale}px`,
          }}
        >
          <div className="espresso-weight-orb absolute inset-0 rounded-full" />
          <div className="espresso-weight-wave absolute inset-[17%] rounded-full" />
        </div>
      </div>

      {/* 环绕重量的液重进度环：目标值仅用于计算，不直接显示。 */}
      <div className="pointer-events-none absolute left-1/2 top-[53%] z-20 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2">
        <svg className="h-full w-full -rotate-90 overflow-visible" viewBox="0 0 240 240" aria-hidden="true">
          <defs>
            <linearGradient id="espresso-progress-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#43C7FF" />
              <stop offset="100%" stopColor="#2F6BFF" />
            </linearGradient>
          </defs>
          <circle
            cx="120"
            cy="120"
            r={progressRadius}
            fill="none"
            stroke="rgba(67,199,255,.12)"
            strokeWidth="4"
          />
          <circle
            cx="120"
            cy="120"
            r={progressRadius}
            fill="none"
            stroke="url(#espresso-progress-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={progressCircumference}
            strokeDashoffset={progressCircumference * (1 - clampedProgress)}
            className="transition-[stroke-dashoffset] duration-300 ease-out"
            style={{ filter: "drop-shadow(0 0 7px rgba(67,199,255,.72))" }}
          />
        </svg>
      </div>

      <div className="absolute left-1/2 top-[53%] z-30 -translate-x-1/2 -translate-y-1/2 text-center" aria-live="polite">
        <div className="relative px-9 py-5">
          <div
            className="absolute left-1/2 top-1/2 h-[212px] w-[212px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.17] backdrop-blur-[10px] backdrop-saturate-75"
            style={{
              background: [
                "radial-gradient(circle at 32% 20%, rgba(255,255,255,.1) 0%, rgba(255,255,255,.025) 25%, transparent 43%)",
                "linear-gradient(145deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.012) 46%, rgba(0,0,0,.09) 100%)",
              ].join(", "),
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,.22), inset 9px 7px 24px rgba(255,255,255,.025), inset -12px -16px 30px rgba(0,0,0,.08), 0 14px 40px rgba(0,0,0,.12)",
            }}
          />
          <div
            className="relative whitespace-nowrap text-[68px] font-semibold leading-none tabular-nums tracking-[-0.06em]"
            style={{ textShadow: "0 3px 7px rgba(0,0,0,.72), 0 0 16px rgba(2,6,11,.7), 0 0 18px rgba(255,255,255,.16)" }}
          >
            {displayedYield.toFixed(1)}
            <span className="ml-2 text-[18px] tracking-normal">g</span>
          </div>
          <div className="relative mt-3 text-[12px] font-semibold tabular-nums tracking-[0.14em] text-[#8FE8FF]">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* 等待阶段保留原有操作提示；开始萃取后自动隐藏。 */}
      {(isWaiting || isComplete) && (
        <div className="absolute bottom-[1.5%] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap text-center text-[10px] font-medium tracking-[0.02em] text-[#8291A6]">
          {isComplete
            ? t("espresso.clickKnobBack")
            : !hasTaredRef.current
              ? t("espresso.readyTareHint")
              : settings.autoTimer
                ? t("espresso.autoStartHint")
                : t("espresso.clickKnobAgain")}
        </div>
      )}
    </div>
  );
}
