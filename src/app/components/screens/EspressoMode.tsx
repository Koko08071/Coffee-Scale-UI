import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useHardware } from "../HardwareContext";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

export function EspressoMode() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { timer, startTimer, pauseTimer, resetTimer, updateWeight, tare, tareOffset, overload } = useHardware();
  const { settings } = useSettings();
  const { t } = useT();
  const sessionYield = Number.parseFloat(searchParams.get("water") ?? "");
  const targetYield = Number.isFinite(sessionYield) ? sessionYield : settings.espressoYield;
  const maxWeightRef = useRef(0);
  const completedRef = useRef(false);
  const hasTaredRef = useRef(false);

  useEffect(() => {
    if (!overload && timer.weight > maxWeightRef.current) {
      maxWeightRef.current = timer.weight;
    }
  }, [overload, timer.weight]);

  const currentYield = overload ? 2000 : maxWeightRef.current;
  const remaining = Math.max(0, targetYield - currentYield);
  const progress = Math.min(100, (currentYield / targetYield) * 100);

  const timerRef = useRef(timer);
  timerRef.current = timer;

  // 检测是否已完成
  const isComplete =
    completedRef.current ||
    (!overload && timer.weight >= targetYield && !timer.isRunning && timer.time > 0);

  // 等待开始状态：计时未运行且未完成
  const isWaiting = !timer.isRunning && !isComplete;

  // 自动计时：开启自动计时并已去皮后，重量增加即开始计时
  useEffect(() => {
    if (overload || !settings.autoTimer || !hasTaredRef.current || timer.isRunning || isComplete) return;
    if (timer.weight > 0.3) {
      startTimer();
    }
  }, [overload, settings.autoTimer, timer.isRunning, timer.weight, isComplete, startTimer]);

  // 冲煮进行中的重量模拟（根据 simulationSpeed 调整速度）
  useEffect(() => {
    if (overload || !timer.isRunning || completedRef.current) return;
    const speed = Math.max(0.1, settings.simulationSpeed);
    const ESPRESSO_FLOW_RATE = 2.5; // g/s，稳定萃取流速
    const intervalMs = 50 / speed;
    const interval = window.setInterval(() => {
      const t = timerRef.current;
      const increment = (ESPRESSO_FLOW_RATE * intervalMs) / 1000;
      const next = Math.min(targetYield + 2, t.weight + increment);
      if (t.weight >= targetYield - 0.1) {
        updateWeight(tareOffset + Math.max(t.weight, targetYield));
        completedRef.current = true;
        return;
      }
      updateWeight(tareOffset + next);
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [overload, timer.isRunning, targetYield, updateWeight, pauseTimer, settings.simulationSpeed, tareOffset]);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "navigate-back") {
        completedRef.current = false;
        hasTaredRef.current = false;
        resetTimer();
        navigate("/mode-selection");
        return;
      }
      if (detail?.type === "knob-single-click") {
        const completed = completedRef.current || (
          timerRef.current.weight >= targetYield &&
          !timerRef.current.isRunning &&
          timerRef.current.time > 0
        );
        // 萃取完成后，需先通过计时键停止计时；停止后单击旋钮返回模式选择页。
        if (completed && !timerRef.current.isRunning) {
          completedRef.current = false;
          hasTaredRef.current = false;
          resetTimer();
          navigate("/mode-selection");
          return;
        }
        if (completed) return;
        // 尚未去皮 → 执行去皮
        if (!hasTaredRef.current) {
          tare();
          hasTaredRef.current = true;
          maxWeightRef.current = 0;
          return;
        }
        // 已去皮 → 切换计时器（自动计时模式下也可手动控制）
        if (timer.isRunning) pauseTimer();
        else startTimer();
      }
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [timer.isRunning, startTimer, pauseTimer, resetTimer, targetYield, navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="screen-surface flex h-full flex-col justify-between p-5 text-white">
      <div>
        <div className="mt-4">
          <div className="text-5xl font-light tabular-nums text-white">
            {isWaiting ? timer.weight.toFixed(1) : currentYield.toFixed(1)}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            {isWaiting ? t("espresso.currentWeight") : t("espresso.currentWeightMax")}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <div className="text-xl font-light tabular-nums text-white">{formatTime(timer.time)}</div>
            <div className="text-xs text-slate-500">{t("espresso.time")}</div>
          </div>
          <div>
            <div className="text-xl font-light tabular-nums text-white">{timer.flowRate.toFixed(1)}</div>
            <div className="text-xs text-slate-500">{t("espresso.flowRate")}</div>
          </div>
        </div>

        {/* 等待开始状态提示 */}
        {isWaiting && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="text-center text-sm text-slate-400">
              {!hasTaredRef.current ? (
                t("espresso.readyTareHint")
              ) : settings.autoTimer ? (
                t("espresso.autoStartHint")
              ) : (
                t("espresso.clickKnobAgain")
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? "bg-emerald-400" : "bg-blue-400"}`}
              style={{ width: `${isWaiting ? 0 : isComplete ? 100 : progress}%` }}
            />
          </div>
          <div className="w-10 text-right text-xs tabular-nums text-white">{isWaiting ? 0 : Math.round(progress)}%</div>
        </div>
      </div>

    </div>
  );
}
