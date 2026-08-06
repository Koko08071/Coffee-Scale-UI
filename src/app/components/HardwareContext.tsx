import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useSettings } from "./SettingsContext";

interface TimerState {
  isRunning: boolean;
  time: number;
  weight: number;
  flowRate: number;
}

interface HardwareContextType {
  // Timer state
  timer: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  resetTimeOnly: () => void;
  updateWeight: (weight: number) => void;

  // Tare function
  tare: () => void;

  // 同步去皮时的秤盘物品总重（由 CoffeeScaleSimulator 调用）
  setTareWeight: (weight: number) => void;

  // 当前去皮偏移量（页面模拟萃取时需要加到 updateWeight 参数上）
  tareOffset: number;

  // Navigation
  confirmSelection: () => void;
  navigateBack: () => void;
  navigateHome: () => void;
  navigateModeStart: () => void;

  // Overload
  overload: boolean;
  setOverload: (value: boolean) => void;
  // 过载恢复前记录的页面路径（用于自动返回）
  overloadPrevPath: string | null;
  // 过载蜂鸣器状态
  overloadBuzzing: boolean;

  // Power
  isPowered: boolean;
  shutdownCountdown: number | null;
  powerOff: () => void;
  togglePower: () => void;
  restart: () => void;
  cancelShutdown: () => void;

  // X shortcut
  handleXKeyPress: () => void;

  // Firmware update
  isUpdating: boolean;
  updateProgress: number;
  updateComplete: boolean;
  startUpdate: () => void;

  // Battery
  batteryLevel: number;
  isCharging: boolean;
  isChargeComplete: boolean;
  chargingDisplayVisible: boolean;
  wakeChargingDisplay: () => boolean;
  startCharging: () => void;
  stopCharging: () => void;
  setBatteryLevel: (level: number) => void;
}

const HardwareContext = createContext<HardwareContextType | undefined>(undefined);

export function HardwareProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const lastWeightRef = useRef(0);
  const lastWeightTimeRef = useRef(Date.now());
  const taredRef = useRef(false); // 追踪是否已去皮
  const tareOffsetRef = useRef(0); // 去皮偏移量：记录去皮时秤盘物品总重
  const tareWeightSnapRef = useRef(0); // 快照：由 CoffeeScaleSimulator 在每次物品变化时更新
  const overloadStartTimeRef = useRef(0); // 记录第一次超过量程的时间戳，用于300ms确认
  const overloadRecoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null); // 恢复计时器：降至1950g以下持续1s
  const overloadActiveRef = useRef(false); // 过载区间标记（冲煮中用，标记当前重量是否为无效数据）
  const flowRateRef = useRef(0); // 用于流速指数平滑，减少闪烁
  const autoStartCandidateRef = useRef<{ since: number } | null>(null);

  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    time: 0,
    weight: 0,
    flowRate: 0,
  });
  const [isPowered, setIsPowered] = useState(true);
  const [shutdownCountdown, setShutdownCountdown] = useState<number | null>(null);
  const [overload, setOverload] = useState(false);
  const overloadRef = useRef(false);
  useEffect(() => {
    overloadRef.current = overload;
  }, [overload]);
  const [overloadPrevPath, setOverloadPrevPath] = useState<string | null>(null);
  const [overloadBuzzing, setOverloadBuzzing] = useState(false);
  const [tareOffset, setTareOffset] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateComplete, setUpdateComplete] = useState(false);

  // 电池状态
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [chargingDisplayVisible, setChargingDisplayVisible] = useState(false);
  const chargingDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const batteryChargerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isChargeComplete = isCharging && batteryLevel >= 100;

  const showChargingDisplayForFiveSeconds = useCallback(() => {
    if (chargingDisplayTimerRef.current) {
      window.clearTimeout(chargingDisplayTimerRef.current);
    }
    setChargingDisplayVisible(true);
    chargingDisplayTimerRef.current = window.setTimeout(() => {
      setChargingDisplayVisible(false);
      chargingDisplayTimerRef.current = null;
    }, 5000);
  }, []);

  const wakeChargingDisplay = useCallback(() => {
    if (isPowered || !isCharging) return false;
    showChargingDisplayForFiveSeconds();
    return true;
  }, [isCharging, isPowered, showChargingDisplayForFiveSeconds]);

  useEffect(() => () => {
    if (chargingDisplayTimerRef.current) {
      window.clearTimeout(chargingDisplayTimerRef.current);
    }
  }, []);

  const startTimer = useCallback(() => {
    setTimer((prev) => ({ ...prev, isRunning: true }));
  }, []);

  const pauseTimer = useCallback(() => {
    flowRateRef.current = 0;
    setTimer((prev) => ({ ...prev, isRunning: false, flowRate: 0 }));
  }, []);

  const resetTimer = useCallback(() => {
    lastWeightRef.current = 0;
    lastWeightTimeRef.current = Date.now();
    taredRef.current = false;
    tareOffsetRef.current = 0;
    flowRateRef.current = 0;
    autoStartCandidateRef.current = null;
    setTareOffset(0);
    setTimer({ isRunning: false, time: 0, weight: 0, flowRate: 0 });
  }, []);

  // 只清零计时（时间、流速、停止计时），保留当前重量不动
  const resetTimeOnly = useCallback(() => {
    flowRateRef.current = 0;
    setTimer((prev) => ({ ...prev, isRunning: false, time: 0, flowRate: 0 }));
  }, []);

  const updateWeight = useCallback((weight: number) => {
    const now = Date.now();
    const displayWeight = weight - tareOffsetRef.current;
    const deltaWeight = weight - lastWeightRef.current;
    const deltaTime = (now - lastWeightTimeRef.current) / 1000;

    lastWeightRef.current = weight;
    lastWeightTimeRef.current = now;

    setTimer((prev) => {
      // 手冲自动计时：累计增重 >=2g、流速 >=0.8g/s 且连续 300ms 后触发。
      const isHandBrewRoute = location.pathname === "/mode-selection/free/brewing" || location.pathname === "/mode-selection/curve/replicate";
      const rawPositiveFlow = deltaTime > 0.001 ? Math.max(0, deltaWeight / deltaTime) : 0;
      const qualifies = settings.autoTimer && isHandBrewRoute && taredRef.current && !prev.isRunning && displayWeight >= 2 && rawPositiveFlow >= 0.8 && deltaWeight > 0;
      if (qualifies) {
        if (!autoStartCandidateRef.current) autoStartCandidateRef.current = { since: now };
      } else if (!prev.isRunning) {
        autoStartCandidateRef.current = null;
      }
      const shouldAutoStart = Boolean(autoStartCandidateRef.current && now - autoStartCandidateRef.current.since >= 300);
      if (shouldAutoStart) autoStartCandidateRef.current = null;
      const isRunning = shouldAutoStart ? true : prev.isRunning;
      // 流速基于去皮后的净重变化率计算；放宽时间阈值避免 50ms 采样周期下经常为 0，
      // 同时使用指数移动平均平滑数值，减少闪烁。
      // 当增重停止时立即归零，避免停止注水后仍残留高流速。
      let flowRate = 0;
      if (isRunning && deltaTime > 0.001) {
        const rawFlow = Math.max(0, deltaWeight / deltaTime);
        if (rawFlow <= 0.001) {
          flowRate = 0;
        } else {
          const alpha = 0.35;
          flowRate = flowRateRef.current > 0 ? alpha * rawFlow + (1 - alpha) * flowRateRef.current : rawFlow;
        }
      }
      flowRateRef.current = flowRate;
      // 显示限幅立即生效：300ms 只用于确认进入过载状态，不能在此期间显示 2001g 等越界值。
      // 实际总载荷一旦超过量程，秤端立即固定显示 2000g，并隐藏无效流速。
      const isBeyondCapacity = weight > 2000 || overloadActiveRef.current;
      const effectiveWeight = isBeyondCapacity ? 2000 : Math.min(2000, displayWeight);
      const effectiveFlowRate = isBeyondCapacity ? 0 : Math.round(flowRate * 10) / 10;
      return { ...prev, isRunning, weight: effectiveWeight, flowRate: effectiveFlowRate };
    });

  }, [location.pathname, settings.autoTimer]);

  // CoffeeScaleSimulator 在物品变化时调用，同步当前秤盘绝对总重
  const setTareWeight = useCallback((w: number) => {
    tareWeightSnapRef.current = w;
  }, []);

  // =================== 独立过载检测 ===================
  // 不依赖 updateWeight 调用频率，直接基于秤盘实际总载荷（未去皮）周期性检测
  useEffect(() => {
    if (!isPowered) return;
    const interval = setInterval(() => {
      const weight = tareWeightSnapRef.current;
      const now = Date.now();

      if (weight > 2000) {
        if (!overloadStartTimeRef.current) {
          overloadStartTimeRef.current = now;
        }
        if (now - overloadStartTimeRef.current >= 300) {
          const enteringOverload = !overloadActiveRef.current;
          setOverload(true);
          setOverloadBuzzing(true);
          overloadActiveRef.current = true;
          overloadRef.current = true;
          if (enteringOverload) {
            flowRateRef.current = 0;
            setTimer((prev) => ({ ...prev, weight: 2000, flowRate: 0 }));
          }
          // 恢复中再次超载，取消恢复计时
          if (overloadRecoveryTimer.current) {
            clearTimeout(overloadRecoveryTimer.current);
            overloadRecoveryTimer.current = null;
          }
        }
      } else {
        overloadStartTimeRef.current = 0;
        if (overloadRef.current && weight < 1950) {
          if (!overloadRecoveryTimer.current) {
            overloadRecoveryTimer.current = setTimeout(() => {
              setOverload(false);
              setOverloadBuzzing(false);
              overloadActiveRef.current = false;
              overloadRef.current = false;
              flowRateRef.current = 0;
              setTimer((prev) => ({
                ...prev,
                weight: Math.max(0, tareWeightSnapRef.current - tareOffsetRef.current),
                flowRate: 0,
              }));
              overloadRecoveryTimer.current = null;
            }, 1000);
          }
        } else if (overloadRef.current && weight >= 1950) {
          // 重量回升到 1950 以上，取消恢复计时
          if (overloadRecoveryTimer.current) {
            clearTimeout(overloadRecoveryTimer.current);
            overloadRecoveryTimer.current = null;
          }
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPowered]);
  // =================== 独立过载检测结束 ===================

  const tare = useCallback(() => {
    // 记录去皮时的秤盘绝对总重作为偏移量，lastWeightRef 也设为此值
    // 这样后续增量（deltaWeight）和显示重量都是去皮后的净重
    const offset = tareWeightSnapRef.current;
    tareOffsetRef.current = offset;
    lastWeightRef.current = offset;
    lastWeightTimeRef.current = Date.now();
    flowRateRef.current = 0;
    autoStartCandidateRef.current = null;
    taredRef.current = true; // 标记已去皮，之后重量增加时自动计时
    setTareOffset(offset); // 同步到 state 供页面组件使用
    setTimer((prev) => ({ ...prev, weight: 0, flowRate: 0 }));
    // 注意：去皮不清除过载状态，过载由实际总载荷（未去皮）持续判断
  }, []);

  const confirmSelection = useCallback(() => {
    console.log("Confirm selection");
  }, []);

  const navigateBack = useCallback(() => {
    const path = location.pathname;
    if (path === "/") return;
    if (["/menu", "/settings", "/mode-selection", "/calibration"].includes(path)) {
      navigate(path === "/menu" ? "/" : "/menu");
      return;
    }

    const segments = path.split("/").filter(Boolean);
    segments.pop();
    navigate(segments.length ? `/${segments.join("/")}` : "/");
  }, [location.pathname, navigate]);

  const navigateHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const navigateModeStart = useCallback(() => {
    const path = location.pathname;
    // 不清零 weight/timer，保留当前秤盘上的重量和计时状态
    if (path.includes("/mode-selection/curve")) navigate("/mode-selection/curve");
    else if (path.includes("/mode-selection/free")) navigate("/mode-selection/free");
    else if (path.includes("/espresso")) navigate("/mode-selection/espresso");
    else navigate("/");
  }, [location.pathname, navigate]);

  const powerOff = useCallback(() => {
    setIsPowered(false);
    if (isCharging) showChargingDisplayForFiveSeconds();
    setShutdownCountdown(null);
    setOverload(false);
    setOverloadBuzzing(false);
    overloadActiveRef.current = false;
    overloadRef.current = false;
    if (overloadRecoveryTimer.current) {
      clearTimeout(overloadRecoveryTimer.current);
      overloadRecoveryTimer.current = null;
    }
    overloadStartTimeRef.current = 0;
    lastWeightRef.current = 0;
    lastWeightTimeRef.current = Date.now();
    navigate("/");
    resetTimer();
  }, [isCharging, navigate, resetTimer, showChargingDisplayForFiveSeconds]);

  const togglePower = useCallback(() => {
    if (isPowered) {
      powerOff();
      return;
    }

    if (chargingDisplayTimerRef.current) {
      window.clearTimeout(chargingDisplayTimerRef.current);
      chargingDisplayTimerRef.current = null;
    }
    setChargingDisplayVisible(false);
    setIsPowered(true);

    // 开机时若秤体已超载（实际总载荷 > 2000g），立即进入过载提示
    // 使用 setTimeout 确保 setIsPowered 已生效
    setTimeout(() => {
      const currentTotalWeight = tareWeightSnapRef.current;
      if (currentTotalWeight > 2000) {
        setOverload(true);
        setOverloadBuzzing(true);
        overloadActiveRef.current = true;
        overloadRef.current = true;
        overloadStartTimeRef.current = Date.now();
        setTimer((prev) => ({ ...prev, weight: 2000, flowRate: 0 }));
      }
    }, 100);

    navigate("/");
  }, [isPowered, navigate, powerOff]);

  // 重启设备：先关机，2s 后自动开机回到主页（不受闭包影响）
  const restart = useCallback(() => {
    setShutdownCountdown(null);
    setOverload(false);
    setOverloadBuzzing(false);
    overloadActiveRef.current = false;
    overloadRef.current = false;
    if (overloadRecoveryTimer.current) {
      clearTimeout(overloadRecoveryTimer.current);
      overloadRecoveryTimer.current = null;
    }
    overloadStartTimeRef.current = 0;
    lastWeightRef.current = 0;
    lastWeightTimeRef.current = Date.now();
    taredRef.current = false;
    resetTimer();

    // 关机
    setIsPowered(false);

    // 2s 后开机，开机时检查秤盘是否已超载
    setTimeout(() => {
      setIsPowered(true);
      const currentTotalWeight = tareWeightSnapRef.current;
      if (currentTotalWeight > 2000) {
        setOverload(true);
        setOverloadBuzzing(true);
        overloadActiveRef.current = true;
        overloadRef.current = true;
        overloadStartTimeRef.current = Date.now();
        setTimer((prev) => ({ ...prev, weight: 2000, flowRate: 0 }));
      }
      navigate("/");
    }, 2000);
  }, [navigate, resetTimer]);

  const cancelShutdown = useCallback(() => {
    setShutdownCountdown(null);
    setIsPowered(true);
  }, []);

  const startUpdate = useCallback(() => {
    if (isUpdating || updateComplete) return;
    setIsUpdating(true);
    setUpdateProgress(0);
    setUpdateComplete(false);

    let progress = 0;
    const interval = window.setInterval(() => {
      progress += 2;
      if (progress >= 100) {
        progress = 100;
        window.clearInterval(interval);
        setUpdateProgress(100);
        setIsUpdating(false);
        setUpdateComplete(true);

        // 3 秒后自动重置并返回主页（模拟重启）
        window.setTimeout(() => {
          setUpdateComplete(false);
          setUpdateProgress(0);
          setIsPowered(false);
          window.setTimeout(() => {
            setIsPowered(true);
            navigate("/");
          }, 1200);
        }, 3000);
        return;
      }
      setUpdateProgress(progress);
    }, 80);
  }, [isUpdating, updateComplete, navigate]);

  // 充电逻辑
  const startCharging = useCallback(() => {
    if (isCharging) return;
    setIsCharging(true);
    if (!isPowered) showChargingDisplayForFiveSeconds();
    // 清除旧的充电定时器
    if (batteryChargerRef.current) window.clearInterval(batteryChargerRef.current);
    // 每秒充 3%，满电自动停止
    batteryChargerRef.current = window.setInterval(() => {
      setBatteryLevel((prev) => {
        const next = Math.min(100, prev + 3);
        if (next >= 100) {
          if (batteryChargerRef.current) {
            window.clearInterval(batteryChargerRef.current);
            batteryChargerRef.current = null;
          }
        }
        return next;
      });
    }, 1000);
  }, [isCharging, isPowered, showChargingDisplayForFiveSeconds]);

  const stopCharging = useCallback(() => {
    setIsCharging(false);
    setChargingDisplayVisible(false);
    if (chargingDisplayTimerRef.current) {
      window.clearTimeout(chargingDisplayTimerRef.current);
      chargingDisplayTimerRef.current = null;
    }
    if (batteryChargerRef.current) {
      window.clearInterval(batteryChargerRef.current);
      batteryChargerRef.current = null;
    }
  }, []);

  // 电池自然放电：开机时每 3 秒掉 0.1%，关机时不掉电
  useEffect(() => {
    if (!isPowered || isCharging) return;
    const interval = window.setInterval(() => {
      setBatteryLevel((prev) => {
        const next = Math.max(0, prev - 0.1);
        return Math.round(next * 10) / 10;
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isPowered, isCharging]);

  const handleXKeyPress = useCallback(() => {
    // X 键仅在设备已开机且空闲时有效，不得开机或打断冲煮、升级与校准。
    if (!isPowered || timer.isRunning || overload || isUpdating || location.pathname === "/calibration") return;
    setShutdownCountdown(null);

    let target = "/";
    switch (settings.xKeyMode) {
      case "智能曲线指导": {
        const recent = settings.lastUsedCurve;
        target = recent
          ? `/mode-selection/curve/prepare?curve=${recent}`
          : "/mode-selection/curve/prepare?curve=recommended-1";
        break;
      }
      case "自由冲煮":
        target = "/mode-selection/free";
        break;
      case "意式模式":
        target = "/mode-selection/espresso";
        break;
    }

    navigate(target);
  }, [isPowered, isUpdating, location.pathname, navigate, overload, settings.lastUsedCurve, settings.xKeyMode, timer.isRunning]);

  // 右侧电容式按键：主页进入菜单，菜单内返回上一级（过载时屏蔽）
  useEffect(() => {
    const handler = (event: Event) => {
      const { type } = (event as CustomEvent<{ type: string }>).detail;
      if (type !== "right-single-click") return;
      if (!isPowered || overload) return;
      if (location.pathname === "/") {
        navigate("/menu");
      } else {
        navigateBack();
      }
    };
    window.addEventListener("hardware-action", handler);
    return () => window.removeEventListener("hardware-action", handler);
  }, [isPowered, overload, location.pathname, navigate, navigateBack]);

  useEffect(() => {
    if (shutdownCountdown === null) return;
    if (shutdownCountdown <= 0) {
      powerOff();
      return;
    }

    const timeout = window.setTimeout(() => {
      setShutdownCountdown((current) => current === null ? null : current - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [powerOff, shutdownCountdown]);

  // Timer effect - increment time every second when running
  // 使用 simulationSpeed 进行模拟倍速控制
  useEffect(() => {
    if (!timer.isRunning || !isPowered) return;

    const speed = Math.max(0.1, settings.simulationSpeed);
    const interval = setInterval(() => {
      setTimer((prev) => ({ ...prev, time: prev.time + 1 }));
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isPowered, timer.isRunning, settings.simulationSpeed]);

  return (
    <HardwareContext.Provider
      value={{
        timer,
        startTimer,
        pauseTimer,
        resetTimer,
        resetTimeOnly,
        updateWeight,
        tare,
        setTareWeight,
        tareOffset,
        confirmSelection,
        navigateBack,
        navigateHome,
        navigateModeStart,
        overload,
        setOverload,
        overloadPrevPath,
        overloadBuzzing,
        isPowered,
        shutdownCountdown,
        powerOff,
        togglePower,
        restart,
        cancelShutdown,
        handleXKeyPress,
        isUpdating,
        updateProgress,
        updateComplete,
        startUpdate,
        batteryLevel,
        isCharging,
        isChargeComplete,
        chargingDisplayVisible,
        wakeChargingDisplay,
        startCharging,
        stopCharging,
        setBatteryLevel,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
}

export function useHardware() {
  const context = useContext(HardwareContext);
  if (!context) {
    throw new Error("useHardware must be used within HardwareProvider");
  }
  return context;
}
