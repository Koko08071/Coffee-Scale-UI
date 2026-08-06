import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Clock, Menu, RotateCcw, Smartphone, CheckCircle2, Zap } from "lucide-react";
import { Knob } from "./HardwareControls";
import { useSettings } from "./SettingsContext";
import { HardwareToast } from "./HardwareToast";
import { useHardware } from "./HardwareContext";
import { showHardwareToast } from "./HardwareToast";
import { useT } from "../i18n/I18nContext";
import { translations, type TranslationKey } from "../i18n/translations";
import { ChargingDisplay } from "./ChargingDisplay";

type BrewFeedbackState = "normal" | "near" | "over" | "severe";

function Bean15gIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="beanBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A0522D" />
          <stop offset="50%" stopColor="#6F3616" />
          <stop offset="100%" stopColor="#3E1C03" />
        </linearGradient>
        <radialGradient id="beanShine" cx="30%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#C17A4B" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#C17A4B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M18.5 5.5C21 8 21 16 18.5 18.5C16 21 8 21 5.5 18.5C3 16 3 8 5.5 5.5C8 3 16 3 18.5 5.5Z" fill="url(#beanBody)" />
      <path d="M7.5 16.5c2.5-2 7-2 9.5-4.5" stroke="#2A1203" strokeWidth="1" fill="none" opacity="0.6" />
      <ellipse cx="9" cy="9" rx="2.5" ry="1.8" fill="url(#beanShine)" />
    </svg>
  );
}

function FilterCup100gIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="cupBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id="cupInner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FED7AA" />
        </linearGradient>
      </defs>
      <path d="M6 4h12l-3 15H9L6 4z" fill="url(#cupBody)" />
      <path d="M8 5h8l-2 11H10L8 5z" fill="url(#cupInner)" />
      <path d="M9 8c2 1.5 4 1.5 6 0" stroke="#F97316" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M9.5 11c2 1.2 3 1.2 5 0" stroke="#F97316" strokeWidth="0.8" fill="none" opacity="0.5" />
      <path d="M10 14c1.5 0.8 2.5 0.8 4 0" stroke="#F97316" strokeWidth="0.8" fill="none" opacity="0.5" />
    </svg>
  );
}

function Weight100gIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="steel100" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="40%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="12" height="10" rx="2" fill="url(#steel100)" stroke="#475569" strokeWidth="0.5" />
      <path d="M9 8V6h6v2" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="5" width="4" height="2" rx="0.5" fill="#CBD5E1" />
      <text x="12" y="15.5" fontSize="4" fill="#334155" textAnchor="middle" fontWeight="bold">100g</text>
    </svg>
  );
}

function Weight2001gIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="red2001" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="50%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
      </defs>
      <rect x="5" y="6" width="14" height="12" rx="2" fill="url(#red2001)" stroke="#7F1D1D" strokeWidth="0.5" />
      <path d="M8 6V4h8v2" fill="none" stroke="#7F1D1D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="3" width="4" height="2" rx="0.5" fill="#EF4444" />
      <text x="12" y="14.5" fontSize="3.8" fill="#FEF2F2" textAnchor="middle" fontWeight="bold">2001g</text>
    </svg>
  );
}

function Weight1901gIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="dark1901" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#52525B" />
          <stop offset="50%" stopColor="#27272A" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>
      </defs>
      <rect x="5.5" y="6.5" width="13" height="11" rx="2" fill="url(#dark1901)" stroke="#3F3F46" strokeWidth="0.5" />
      <path d="M8.5 6.5V4.5h7v2" fill="none" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10.5" y="3.5" width="3" height="2" rx="0.5" fill="#71717A" />
      <text x="12" y="14" fontSize="3.8" fill="#E4E4E7" textAnchor="middle" fontWeight="bold">1901g</text>
    </svg>
  );
}

function PourIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="kettleBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="waterStream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BFDBFE" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="14" r="5.5" fill="url(#kettleBody)" />
      <path d="M16.5 11c3-1 5 0 6 2" stroke="#93C5FD" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M22.5 13.5l1 2" stroke="#93C5FD" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M19.5 15.5c0 2-1 3-2.5 3s-2.5-1-2.5-3" fill="url(#waterStream)" opacity="0.8" />
      <ellipse cx="12" cy="9.5" rx="4" ry="1.2" fill="#1E40AF" opacity="0.6" />
    </svg>
  );
}

function ChargeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id="batteryBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      <rect x="7" y="5" width="10" height="14" rx="2" fill="url(#batteryBody)" stroke="#CA8A04" strokeWidth="0.5" />
      <rect x="10" y="3" width="4" height="2" rx="0.5" fill="#FEF08A" />
      <path d="M12 8l-2 4h3l-1 5 4-5h-3l2-4H12z" fill="#713F12" />
    </svg>
  );
}

const ESC = "sim:escape";
const CUSTOM_EVENT = "simulator-action";

function dispatchSimulatorAction(type: string, detail: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT, { detail: { type, ...detail } }));
}

function pressTimer(
  target: HTMLElement,
  callback: () => void,
  delay: number,
  { onDown, onCancel }: { onDown?: () => void; onCancel?: () => void } = {},
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let triggered = false;
  let moved = false;

  const cleanup = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
  };

  const onDownInner = (e: PointerEvent) => {
    e.preventDefault();
    moved = false;
    triggered = false;
    onDown?.();
    timer = setTimeout(() => { triggered = true; callback(); cleanup(); }, delay);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  };

  const onMove = (e: PointerEvent) => {
    if (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3) moved = true;
  };

  const onUp = () => {
    if (!triggered && !moved) onCancel?.();
    cleanup();
  };

  target.addEventListener("pointerdown", onDownInner);
  return () => { target.removeEventListener("pointerdown", onDownInner); cleanup(); };
}

export function CoffeeScaleSimulator({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const {
    timer,
    isPowered,
    overload,
    overloadBuzzing,
    updateWeight,
    tare,
    resetTimer,
    resetTimeOnly,
    startTimer,
    pauseTimer,
    togglePower,
    shutdownCountdown,
    cancelShutdown,
    handleXKeyPress,
    batteryLevel,
    isCharging,
    isChargeComplete,
    chargingDisplayVisible,
    wakeChargingDisplay,
    startCharging,
    stopCharging,
    setTareWeight,
    setBatteryLevel,
    isUpdating,
    updateProgress,
    updateComplete,
    startUpdate,
  } = useHardware();

  const { settings, updateSetting } = useSettings();
  const { t, lang } = useT();
  const chromeT = useCallback(
    (key: TranslationKey) => translations.zh[key] ?? key,
    [],
  );

  // 根据浏览器视口自动缩放设备模拟器，防止在较矮的预览窗口中被截断
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [deviceScale, setDeviceScale] = useState(1);
  useEffect(() => {
    let frame = 0;
    const updateScale = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const simulator = simulatorRef.current;
        if (!simulator) return;

        const gutter = window.innerWidth < 700 ? 10 : 20;
        const availableW = Math.max(240, window.innerWidth - gutter * 2);
        const availableH = Math.max(240, window.innerHeight - gutter * 2);
        const baseW = simulator.offsetWidth;
        const baseH = simulator.offsetHeight;
        if (!baseW || !baseH) return;

        const nextScale = Math.min(
          1.75,
          availableW / baseW,
          availableH / baseH,
        );
        setDeviceScale(Math.max(0.32, nextScale));
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    const observer = new ResizeObserver(updateScale);
    if (simulatorRef.current) observer.observe(simulatorRef.current);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  const [absoluteWeight, setAbsoluteWeight] = useState(0);
  const absoluteWeightRef = useRef(0);

  // 右侧仿真工具状态
  const [items, setItems] = useState({
    beans15: false,
    filterCup100: false,
    calib100: false,
    red2001: false,
    weight1901: false,
  });
  const [beanWeight, setBeanWeight] = useState(15);
  const [kettlePouring, setKettlePouring] = useState(false);

  const [isPouring, setIsPouring] = useState(false);
  const [buzzPhase, setBuzzPhase] = useState(false);
  const pourWeightRef = useRef(0);
  const kettleWeightRef = useRef(0);
  const [pourRate, setPourRate] = useState(2); // 默认注水速率 2 g/s

  // 同步秤盘绝对重量到 HardwareContext
  const syncWeight = useCallback((w: number) => {
    const next = Math.max(0, w);
    absoluteWeightRef.current = next;
    setAbsoluteWeight(next);
    updateWeight(next);
    setTareWeight(next);
  }, [updateWeight, setTareWeight]);

  // 过载蜂鸣器可视化闪烁
  useEffect(() => {
    if (!overloadBuzzing) { setBuzzPhase(false); return; }
    const interval = setInterval(() => setBuzzPhase((p) => !p), 250);
    return () => clearInterval(interval);
  }, [overloadBuzzing]);

  // 进入新的冲煮准备/冲煮页面时，清空上一轮残留的液体重量（注水、尖嘴壶、咖啡液滴），
  // 避免用户什么都没放时秤上仍显示 250g 等残留读数
  const resetPaths = useMemo(
    () => [
      "/mode-selection/espresso",
      "/mode-selection/espresso/brewing",
      "/mode-selection/free",
      "/mode-selection/free/brewing",
      "/mode-selection/curve/prepare",
      "/mode-selection/curve/replicate",
    ],
    [],
  );
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;
    if (!resetPaths.includes(location.pathname)) return;
    pourWeightRef.current = 0;
    kettleWeightRef.current = 0;
    setIsPouring(false);
    setKettlePouring(false);
    const base =
      (items.beans15 ? beanWeight : 0) +
      (items.filterCup100 ? 100 : 0) +
      (items.calib100 ? 100 : 0) +
      (items.red2001 ? 2001 : 0) +
      (items.weight1901 ? 1901 : 0);
    syncWeight(base);
  }, [location.pathname, resetPaths, items, beanWeight, syncWeight]);

  const isBrewSession = location.pathname === "/mode-selection/free/brewing" || location.pathname === "/mode-selection/curve/replicate";
  const isBeanWeighing = location.pathname === "/mode-selection/curve/weigh" || location.pathname === "/mode-selection/espresso/weigh" || location.pathname === "/mode-selection/free/weigh";
  const isBrewing = isBrewSession || location.pathname === "/mode-selection/espresso/brewing";

  // 持续效果：注水、尖嘴壶注水、咖啡液滴
  useEffect(() => {
    const interval = setInterval(() => {
      let changed = false;
      if (isPouring) {
        pourWeightRef.current += pourRate / 10;
        changed = true;
      }
      if (kettlePouring) {
        kettleWeightRef.current += 2;
        changed = true;
      }
      if (changed) {
        const base =
          (items.beans15 ? beanWeight : 0) +
          (items.filterCup100 ? 100 : 0) +
          (items.calib100 ? 100 : 0) +
          (items.red2001 ? 2001 : 0) +
          (items.weight1901 ? 1901 : 0);
        syncWeight(base + pourWeightRef.current + kettleWeightRef.current);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPouring, kettlePouring, pourRate, items, beanWeight, syncWeight]);

  // 停止注水后立刻同步一次重量，让 HardwareContext 的流速归零
  const prevPouringRef = useRef(false);
  const prevKettleRef = useRef(false);
  useEffect(() => {
    const stopped =
      (prevPouringRef.current && !isPouring) ||
      (prevKettleRef.current && !kettlePouring);
    prevPouringRef.current = isPouring;
    prevKettleRef.current = kettlePouring;
    if (stopped) {
      const base =
        (items.beans15 ? beanWeight : 0) +
        (items.filterCup100 ? 100 : 0) +
        (items.calib100 ? 100 : 0) +
        (items.red2001 ? 2001 : 0) +
        (items.weight1901 ? 1901 : 0);
      syncWeight(base + pourWeightRef.current + kettleWeightRef.current);
    }
  }, [isPouring, kettlePouring, items, beanWeight, syncWeight]);

  useEffect(() => {
    if (overload) return;
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type } = detail as { type?: string; direction?: number };
      switch (type) {
        case "knob-single-click":
          if (isHome) {
            tare();
            showHardwareToast(chromeT("sim.tare"), "info");
          }
          break;
        // 主页旋钮旋转：不做重量调整，由各页面/菜单自行处理
      }
    };
    window.addEventListener("hardware-action", handleAction);
    return () => window.removeEventListener("hardware-action", handleAction);
  }, [isHome, tare, overload, chromeT]);

  // 快捷键
  useEffect(() => {
    if (overload) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "t" || e.key === "T") { e.preventDefault(); tare(); showHardwareToast(chromeT("sim.tare"), "info"); return; }
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (isBeanWeighing) dispatchSimulatorAction("bean-weigh-save");
        else if (isBrewSession) dispatchSimulatorAction("brew-timer-press");
        else if (!timer.isRunning) { startTimer(); showHardwareToast(chromeT("sim.timerStarted"), "success"); }
        else { pauseTimer(); showHardwareToast(chromeT("sim.timerPaused"), "warning"); }
        return;
      }
      if (e.key === "ArrowUp") { e.preventDefault(); syncWeight(absoluteWeight + 0.5); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); syncWeight(Math.max(0, absoluteWeight - 0.5)); return; }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (isBeanWeighing) return;
        resetTimeOnly();
        showHardwareToast(chromeT("sim.timerCleared"), "info");
        return;
      }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); resetTimer(); showHardwareToast(chromeT("sim.timerCleared"), "info"); return; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [timer.isRunning, absoluteWeight, syncWeight, tare, startTimer, pauseTimer, resetTimer, resetTimeOnly, overload, chromeT, isBeanWeighing, isBrewSession]);

  const [rightPressed, setRightPressed] = useState(false);
  const [brewFeedbackState, setBrewFeedbackState] = useState<BrewFeedbackState>("normal");
  const timerLongRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerLongTriggered = useRef(false);

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const state = (event as CustomEvent<{ state?: BrewFeedbackState }>).detail?.state;
      if (state) setBrewFeedbackState(state);
    };
    window.addEventListener("brew-feedback-change", handleFeedback);
    return () => window.removeEventListener("brew-feedback-change", handleFeedback);
  }, []);

  useEffect(() => {
    if (!isBrewSession) setBrewFeedbackState("normal");
  }, [isBrewSession]);

  const handleRightUp = () => {
    if (wakeChargingDisplay()) return;
    if (!isPowered) return;
    if (shutdownCountdown !== null) { cancelShutdown(); return; }
    if (isHome) navigate("/menu");
    else dispatchSimulatorAction("navigate-back");
  };

  // 左侧计时键：日常称重短按开始/暂停，冲煮记录短按开始/结束；
  // 称量页短按保存，长按仅抑制保存，不执行计时清零。
  const handleTimerDown = () => {
    if (!isPowered) return;
    if (overload || shutdownCountdown !== null) return;
    timerLongTriggered.current = false;
    if (isBeanWeighing) {
      timerLongRef.current = setTimeout(() => {
        timerLongTriggered.current = true;
      }, 1500);
      return;
    }
    timerLongRef.current = setTimeout(() => {
      timerLongTriggered.current = true;
      resetTimeOnly();
      showHardwareToast(chromeT("sim.timerCleared"), "info");
    }, 1500);
  };

  const handleTimerUp = () => {
    if (timerLongRef.current) clearTimeout(timerLongRef.current);
    timerLongRef.current = null;
    if (wakeChargingDisplay()) return;
    if (!isPowered) return;
    if (timerLongTriggered.current) return;
    if (overload) return;
    if (shutdownCountdown !== null) { cancelShutdown(); showHardwareToast(chromeT("power.cancelledShutdown"), "success"); return; }
    if (isBeanWeighing) {
      dispatchSimulatorAction("bean-weigh-save");
      return;
    }
    if (isBrewSession) {
      dispatchSimulatorAction("brew-timer-press");
      return;
    }
    if (!timer.isRunning) {
      startTimer(); showHardwareToast(chromeT("sim.timerStarted"), "success");
    } else {
      pauseTimer(); showHardwareToast(chromeT("sim.timerPaused"), "warning");
    }
  };

  // 右侧工具：物品 / 咖啡豆 / 滤杯
  const toggleItem = (key: keyof typeof items) => {
    // 校准页中，100g 砝码是一次性的“开始／重试校准”操作，
    // 不受此前已放置物品或残留液体重量影响。
    if (key === "calib100" && location.pathname === "/calibration") {
      const calibrationItems = {
        beans15: false,
        filterCup100: false,
        calib100: true,
        red2001: false,
        weight1901: false,
      };
      pourWeightRef.current = 0;
      kettleWeightRef.current = 0;
      setItems(calibrationItems);
      setIsPouring(false);
      setKettlePouring(false);
      syncWeight(100);
      window.dispatchEvent(new CustomEvent("calibration-start", { detail: { weight: 100 } }));
      return;
    }

    const wasOn = items[key];
    const next = { ...items, [key]: !wasOn };
    setItems(next);
    const base =
      (next.beans15 ? beanWeight : 0) +
      (next.filterCup100 ? 100 : 0) +
      (next.calib100 ? 100 : 0) +
      (next.red2001 ? 2001 : 0) +
      (next.weight1901 ? 1901 : 0);
    const total = base + pourWeightRef.current + kettleWeightRef.current;
    syncWeight(total);

  };

  const adjustBeanWeight = (amount: number) => {
    if (!items.beans15) return;

    const nextWeight = Math.min(100, Math.max(1, beanWeight + amount));
    if (nextWeight === beanWeight) return;

    setBeanWeight(nextWeight);
    const base =
      nextWeight +
      (items.filterCup100 ? 100 : 0) +
      (items.calib100 ? 100 : 0) +
      (items.red2001 ? 2001 : 0) +
      (items.weight1901 ? 1901 : 0);
    syncWeight(base + pourWeightRef.current + kettleWeightRef.current);
  };

  const toggleKettle = () => {
    if (!kettlePouring) {
      kettleWeightRef.current = 0;
    }
    setKettlePouring((p) => !p);
  };

  const togglePour = () => {
    if (!isPouring) {
      // 开始注水时保持当前已注水量继续累加，不能设为绝对总重
      //（否则去皮后的滤杯/咖啡粉重量会被算作已注入水量）
      setPourRate(2); // 默认 2 g/s
    }
    setIsPouring((p) => !p);
  };

  return (
    <div className="app-stage relative h-full w-full overflow-hidden select-none">
      <div
        ref={simulatorRef}
        className="simulator-layout absolute left-1/2 top-1/2 flex items-center gap-3"
        style={{ transform: `translate(-50%, -50%) scale(${deviceScale})` }}
      >
        <div className="device-shell relative">
        {/* 顶部标题栏 */}
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/15 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(47,107,255,.8)]" />
              <span className="text-[9px] font-medium text-blue-300 tracking-wider">SMART SCALE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 冲煮速度调节 */}
            <div className="flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5">
              <button onClick={() => updateSetting("simulationSpeed", Math.max(0.1, settings.simulationSpeed - 0.5))} className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">-</button>
              <span className="text-[9px] tabular-nums text-blue-300 min-w-[28px] text-center">x{settings.simulationSpeed.toFixed(1)}</span>
              <button onClick={() => updateSetting("simulationSpeed", Math.min(5, settings.simulationSpeed + 0.5))} className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">+</button>
            </div>
            {/* 电量调节 */}
            <div className="flex items-center gap-1 rounded-full bg-white/[0.03] border border-white/[0.06] px-1.5 py-0.5">
              <button onClick={() => setBatteryLevel(Math.max(0, batteryLevel - 5))} className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">-</button>
              <div className={`h-2 w-4 rounded-[3px] border relative overflow-hidden ${isCharging ? "border-[#27C6A3]/60 bg-[#27C6A3]/10" : batteryLevel > 20 ? "border-[#27C6A3]/40 bg-[#27C6A3]/10" : "border-[#FF4D5E]/40 bg-[#FF4D5E]/10"}`}>
                <div
                  className={`absolute inset-y-0.5 left-0.5 rounded-[1px] transition-all ${isCharging ? "bg-[#27C6A3]" : batteryLevel > 20 ? "bg-[#27C6A3]" : "bg-[#FF4D5E]"}`}
                  style={{ right: `${Math.max(2, Math.round((100 - batteryLevel) * 0.14))}px` }}
                />
                {isCharging && <Zap className="pointer-events-none absolute inset-0 m-auto h-1.5 w-1.5 text-[#F5F7FA]" fill="currentColor" strokeWidth={3} />}
              </div>
              <span className="text-[9px] tabular-nums text-slate-400 min-w-[18px] text-center">{Math.round(batteryLevel)}%</span>
              <button onClick={() => setBatteryLevel(Math.min(100, batteryLevel + 5))} className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">+</button>
            </div>
            {/* 语言预览切换：与秤端设置使用同一份状态 */}
            <button
              type="button"
              onClick={() => updateSetting("language", lang === "zh" ? "English" : "简体中文")}
              aria-label={chromeT("lang.toggle")}
              title={chromeT("lang.toggle")}
              className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 transition-colors hover:border-[#2F6BFF]/45 hover:bg-[#2F6BFF]/[0.06] active:scale-[0.97]"
            >
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[8px] transition-colors ${lang === "zh" ? "bg-[#2F6BFF] text-white" : "text-slate-500"}`}>
                中
              </span>
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[8px] transition-colors ${lang === "en" ? "bg-[#2F6BFF] text-white" : "text-slate-500"}`}>
                EN
              </span>
            </button>
          </div>
        </div>

        <div className="device-deck">
          {/* 左控制区：计时 */}
          <div className="timer-area flex flex-col items-center justify-center">
            {/* 计时按键 */}
            <button
              type="button"
              onPointerDown={handleTimerDown}
              onPointerUp={handleTimerUp}
              onPointerLeave={() => {
                if (timerLongRef.current) clearTimeout(timerLongRef.current);
                timerLongRef.current = null;
              }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-blue-500/30 transition-all active:scale-95">
                <Clock className="h-6 w-6 text-blue-300" />
              </div>
              <span className={`text-[9px] tracking-wider ${isBeanWeighing ? "text-blue-300" : "text-slate-500"}`}>{isBeanWeighing ? chromeT("common.save") : chromeT("home.timer")}</span>
            </button>
          </div>

          {/* 中央屏幕 */}
          <div className="device-screen relative flex flex-col">
            {shutdownCountdown !== null && (
              <div className="absolute inset-0 z-60 flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-xl">
                <RotateCcw className="h-8 w-8 text-red-400 animate-spin" />
                <p className="text-sm text-slate-300">{t("power.shuttingDown")}</p>
                <p className="text-[10px] text-slate-500">{t("sim.cancelShutdownAny")}</p>
              </div>
            )}

            {/* 过载状态：保留页面与计时，仅标识锁定显示 */}
            {overload && (
              <div className={`absolute left-2 top-2 z-30 rounded-md border border-red-400/50 bg-red-950/85 px-2 py-1 text-[8px] font-semibold tracking-[0.12em] text-red-200 transition-opacity ${buzzPhase ? "opacity-100" : "opacity-75"}`}>
                {chromeT("home.overload").toUpperCase()} · 2,000 g
              </div>
            )}

            {/* 屏幕内状态栏：电量 */}
            {isPowered && (
            <div className="absolute top-1 right-2 z-20 flex items-center gap-1.5">
              <div className={`h-3 w-6 rounded-[4px] border relative overflow-hidden ${isCharging ? "border-[#27C6A3]/60 bg-[#27C6A3]/10" : batteryLevel > 20 ? "border-[#27C6A3]/40 bg-[#27C6A3]/10" : "border-[#FF4D5E]/40 bg-[#FF4D5E]/10"}`}>
                <div
                  className={`absolute inset-y-0.5 left-0.5 rounded-[1px] transition-all ${isCharging ? "bg-[#27C6A3]" : batteryLevel > 20 ? "bg-[#27C6A3]" : "bg-[#FF4D5E]"}`}
                  style={{ right: `${Math.max(2, Math.round((100 - batteryLevel) * 0.22))}px` }}
                />
                {isCharging && <Zap className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-[#F5F7FA]" fill="currentColor" strokeWidth={2.5} />}
              </div>
              <span className="text-[10px] tabular-nums text-slate-400">{Math.round(batteryLevel)}%</span>
            </div>
            )}

            <div className="relative flex-1 overflow-hidden" style={{ zoom: 1.5 }}>
              {!isPowered ? (
                isCharging && chargingDisplayVisible ? (
                  <ChargingDisplay batteryLevel={batteryLevel} isComplete={isChargeComplete} />
                ) : (
                  <div className="absolute inset-0 z-30 bg-black" aria-label="screen off" />
                )
              ) : (
                children
              )}
              {(isUpdating || updateComplete) && (
                <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm">
                  {updateComplete ? (
                    <>
                      <CheckCircle2 className="h-14 w-14 text-green-400 mb-4" />
                      <div className="text-lg font-medium text-white">{t("update.restarting")}</div>
                    </>
                  ) : (
                    <>
                      <div className="relative h-20 w-20 mb-4">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                          <path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                          <path className="text-blue-400" strokeDasharray={`${updateProgress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">{updateProgress}%</div>
                      </div>
                      <div className="text-base font-medium text-white">{t("update.updating")}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右控制区：菜单/返回 + 旋钮 + X键 */}
          <div className="controls-area flex flex-col items-center justify-center gap-4">
            {/* 菜单/返回键 */}
            <button
              type="button"
              onPointerDown={() => setRightPressed(true)}
              onPointerUp={() => { setRightPressed(false); if (overload) return; handleRightUp(); }}
              onPointerLeave={() => setRightPressed(false)}
              className="flex flex-col items-center gap-1"
            >
              <div className={`right-capacitive-key is-${brewFeedbackState} flex h-14 w-14 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                rightPressed
                  ? "border-blue-300/50 bg-blue-500/10"
                  : "border-white/[0.08] bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] hover:border-blue-500/30"
              }`}>
                <Menu className="relative z-[1] h-6 w-6 text-blue-300" />
              </div>
              <span className="text-[9px] text-slate-500 tracking-wider">{chromeT("menu.return")}</span>
            </button>

            {/* 旋钮 */}
            <Knob />

            {/* 快捷按键 X */}
            <button
              type="button"
              onClick={() => {
                if (wakeChargingDisplay()) return;
                if (!isPowered) return;
                if (!overload && !timer.isRunning && location.pathname !== "/calibration") {
                  handleXKeyPress();
                  showHardwareToast(chromeT("sim.xStarted"), "success");
                } else {
                  showHardwareToast(chromeT("sim.xUnavailable"), "warning");
                }
              }}
              className={`flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-base font-semibold transition-all hover:border-blue-500/30 hover:bg-white/[0.06] active:scale-95 ${
                overload ? "opacity-30 cursor-not-allowed" : "text-blue-300"
              }`}
            >
              X
            </button>
          </div>
        </div>

        {/* 底部装饰条 */}
        <div className="device-rail" />
      </div>

      {/* 右侧独立仿真工具面板 */}
      <div className="tools-area flex flex-col items-center justify-center py-2 px-1">
        <div className="grid grid-cols-2 gap-2.5">
          {/* 1. 15g 咖啡豆 */}
          <button
            type="button"
            onClick={() => toggleItem("beans15")}
            onWheel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              adjustBeanWeight(event.deltaY < 0 ? 1 : -1);
            }}
            title={chromeT("sim.beansAdjustHint")}
            className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              items.beans15
                ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                : "border-amber-500/50 bg-amber-500/25 text-amber-200 shadow-[0_0_14px_rgba(245,158,11,0.22)]"
            }`}>
              <Bean15gIcon className={`h-5 w-5 ${items.beans15 ? "opacity-60" : ""}`} />
            </div>
            <span className={`text-[9px] tracking-wider ${items.beans15 ? "text-slate-500" : "text-amber-300"}`}>{beanWeight} g {chromeT("sim.coffeeBeans")}</span>
          </button>

          {/* 2. 100g 滤杯 */}
          <button
            type="button"
            onClick={() => toggleItem("filterCup100")}
            className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              items.filterCup100
                ? "border-orange-500/25 bg-orange-500/10 text-orange-400"
                : "border-orange-500/50 bg-orange-500/25 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.22)]"
            }`}>
              <FilterCup100gIcon className={`h-5 w-5 ${items.filterCup100 ? "opacity-60" : ""}`} />
            </div>
            <span className={`text-[9px] tracking-wider ${items.filterCup100 ? "text-slate-500" : "text-orange-300"}`}>{chromeT("sim.filterCup100")}</span>
          </button>

          {/* 3. 100g 校准砝码 */}
          <button
            type="button"
            onClick={() => toggleItem("calib100")}
            className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              items.calib100
                ? "border-slate-500/25 bg-slate-500/10 text-slate-400"
                : "border-slate-400/50 bg-slate-400/25 text-slate-200 shadow-[0_0_14px_rgba(148,163,184,0.22)]"
            }`}>
              <Weight100gIcon className={`h-5 w-5 ${items.calib100 ? "opacity-60" : ""}`} />
            </div>
            <span className={`text-[9px] tracking-wider ${items.calib100 ? "text-slate-500" : "text-slate-300"}`}>{chromeT("sim.calibrationWeight100")}</span>
          </button>

          {/* 4. 2001g 红色砝码 */}
          <button
            type="button"
            onClick={() => toggleItem("red2001")}
            className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              items.red2001
                ? "border-red-500/25 bg-red-500/10 text-red-400"
                : "border-red-500/50 bg-red-500/25 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.22)]"
            }`}>
              <Weight2001gIcon className={`h-5 w-5 ${items.red2001 ? "opacity-60" : ""}`} />
            </div>
            <span className={`text-[9px] tracking-wider ${items.red2001 ? "text-slate-500" : "text-red-300"}`}>{chromeT("sim.redWeight2001")}</span>
          </button>

          {/* 5. 1901g 砝码 */}
          <button
            type="button"
            onClick={() => toggleItem("weight1901")}
            className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              items.weight1901
                ? "border-zinc-500/25 bg-zinc-500/10 text-zinc-400"
                : "border-zinc-400/50 bg-zinc-400/25 text-zinc-200 shadow-[0_0_14px_rgba(161,161,170,0.22)]"
            }`}>
              <Weight1901gIcon className={`h-5 w-5 ${items.weight1901 ? "opacity-60" : ""}`} />
            </div>
            <span className={`text-[9px] tracking-wider ${items.weight1901 ? "text-slate-500" : "text-zinc-300"}`}>{chromeT("sim.weight1901")}</span>
          </button>

            {/* 6. 注水 */}
            <button
              type="button"
              onClick={togglePour}
              onWheel={(e) => {
                e.preventDefault();
                if (!isPouring) return;
                setPourRate((prev) => Math.max(0.5, Math.min(20, prev + (e.deltaY > 0 ? -0.5 : 0.5))));
              }}
              className={`flex flex-col items-center gap-1 ${overload ? "opacity-30" : ""}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                isPouring
                  ? "border-red-400/25 bg-red-400/10 text-red-400"
                  : "border-blue-500/50 bg-blue-500/25 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.22)]"
              }`}>
                <PourIcon className={`h-5 w-5 ${isPouring ? "opacity-60" : ""}`} />
              </div>
              <span className={`text-[9px] tracking-wider ${isPouring ? "text-slate-500" : "text-blue-300"}`}>
                {isPouring ? `${pourRate.toFixed(1)} g/s` : chromeT("sim.liquid")}
              </span>
            </button>

            {/* 8. 充电 */}
            <button
              type="button"
              onClick={() => { if (isCharging) stopCharging(); else startCharging(); }}
              className="flex flex-col items-center gap-1"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                isCharging
                  ? "border-yellow-500/25 bg-yellow-500/10 text-yellow-400"
                  : "border-yellow-400/50 bg-yellow-400/25 text-yellow-200 shadow-[0_0_14px_rgba(250,204,21,0.22)]"
              }`}>
                <ChargeIcon className={`h-5 w-5 ${isCharging ? "opacity-60" : ""}`} />
              </div>
              <span className={`text-[9px] tracking-wider ${isCharging ? "text-slate-500" : "text-yellow-300"}`}>{isCharging ? chromeT("sim.charging") : chromeT("sim.charge")}</span>
            </button>

            {/* 9. 手机升级 */}
            <button
              type="button"
              onClick={() => { if (!isUpdating && !updateComplete) startUpdate(); }}
              className={`flex flex-col items-center gap-1 ${(isUpdating || updateComplete) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                (isUpdating || updateComplete)
                  ? "border-blue-500/25 bg-blue-500/10 text-blue-400"
                  : "border-blue-400/50 bg-blue-400/25 text-blue-200 shadow-[0_0_14px_rgba(59,130,246,0.22)]"
              }`}>
                <Smartphone className="h-5 w-5" />
              </div>
              <span className={`text-[9px] tracking-wider ${(isUpdating || updateComplete) ? "text-slate-500" : "text-blue-300"}`}>{isUpdating ? chromeT("update.updating") : updateComplete ? chromeT("update.restarting") : chromeT("update.phoneUpdate")}</span>
            </button>
          </div>
        </div>
      </div>

      <HardwareToast />
    </div>
  );
}
