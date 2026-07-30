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
    updateWeight,
    tare,
    tareOffset,
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

  // 模拟器中的稳定意式流速；真实硬件接入后由称重传感器数据替代。
  useEffect(() => {
    if (overload || !timer.isRunning || completedRef.current) return;

    const speed = Math.max(0.1, settings.simulationSpeed);
    const espressoFlowRate = 2.5;
    const intervalMs = 50 / speed;
    const interval = window.setInterval(() => {
      const current = timerRef.current;
      const increment = (espressoFlowRate * intervalMs) / 1000;
      const next = Math.min(targetYield + 2, current.weight + increment);

      if (current.weight >= targetYield - 0.1) {
        updateWeight(tareOffset + Math.max(current.weight, targetYield));
        completedRef.current = true;
        return;
      }
      updateWeight(tareOffset + next);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [
    overload,
    timer.isRunning,
    targetYield,
    updateWeight,
    settings.simulationSpeed,
    tareOffset,
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

  const hasBrewStarted = timer.isRunning || timer.time > 0 || completedRef.current;
  const visualState = !hasBrewStarted
    ? "normal"
    : overload || progressRatio > 1.01
      ? "over"
      : progressRatio >= 0.85
        ? "near"
        : "normal";
  const flowProgress = Math.min(Math.abs(timer.flowRate) / 8, 1);
  const flowBarWidth = 12 + flowProgress * 88;
  const orbScale = 0.82 + Math.min(progressRatio, 1) * 0.18;
  const displayedYield = currentYield;

  const palette = visualState === "over"
    ? { primary: "255,77,94", secondary: "255,122,92" }
    : visualState === "near"
      ? { primary: "255,194,71", secondary: "255,92,55" }
      : { primary: "67,199,255", secondary: "47,107,255" };

  const visualStyle = {
    "--espresso-primary": palette.primary,
    "--espresso-secondary": palette.secondary,
  } as CSSProperties;

  return (
    <div
      className={`espresso-focus is-${visualState} relative h-full w-full overflow-hidden bg-[#02060B] text-[#F5F7FA]`}
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

      {/* 左上：实时流速 */}
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

      {/* 右上：目标液重 */}
      <div className="absolute right-[3.2%] top-[8.5%] z-30 flex h-[102px] w-[132px] items-center justify-center">
        <div aria-hidden="true" className="espresso-side-orb absolute inset-0 rounded-full" />
        <div
          className="relative whitespace-nowrap text-[30px] font-semibold tabular-nums tracking-[-0.045em]"
          style={{ textShadow: "0 2px 5px rgba(0,0,0,.95), 0 0 12px rgba(255,255,255,.28)" }}
        >
          {targetYield.toFixed(1)}
          <span className="ml-1 text-[14px] tracking-normal">g</span>
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

      <div className="absolute left-1/2 top-[53%] z-30 -translate-x-1/2 -translate-y-1/2 text-center" aria-live="polite">
        <div className="relative px-9 py-7">
          <div className="absolute inset-[-20px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(2,6,11,.98)_0%,rgba(2,6,11,.86)_38%,rgba(2,6,11,.34)_64%,transparent_77%)] backdrop-blur-[4px]" />
          <div
            className="relative whitespace-nowrap text-[68px] font-semibold leading-none tabular-nums tracking-[-0.06em]"
            style={{ textShadow: "0 3px 6px #000, 0 0 14px #02060B, 0 0 18px rgba(255,255,255,.14)" }}
          >
            {displayedYield.toFixed(1)}
            <span className="ml-2 text-[18px] tracking-normal">g</span>
          </div>
        </div>
      </div>

      {/* 下方：萃取时间 */}
      <div className="absolute bottom-[8%] left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#0B1119]/85 px-5 py-2 shadow-[0_0_18px_rgba(0,0,0,.7)] backdrop-blur-md">
          <span className="relative h-4 w-4 rounded-full border-[1.5px] border-white/80 before:absolute before:left-1/2 before:top-[2px] before:h-[5px] before:w-px before:-translate-x-1/2 before:bg-white/80 after:absolute after:left-1/2 after:top-1/2 after:h-px after:w-[4px] after:bg-white/80" />
          <span className="text-[23px] font-semibold tabular-nums tracking-[-0.03em]">{formatTime(timer.time)}</span>
        </div>
      </div>

      {/* 等待阶段保留原有操作提示；开始萃取后自动隐藏。 */}
      {isWaiting && (
        <div className="absolute bottom-[1.5%] left-1/2 z-40 -translate-x-1/2 whitespace-nowrap text-center text-[10px] font-medium tracking-[0.02em] text-[#8291A6]">
          {!hasTaredRef.current
            ? t("espresso.readyTareHint")
            : settings.autoTimer
              ? t("espresso.autoStartHint")
              : t("espresso.clickKnobAgain")}
        </div>
      )}
    </div>
  );
}
