import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { RotateCcw, Save, ArrowLeft } from "lucide-react";
import { MenuItem, MenuList } from "../MenuList";
import { useHardware } from "../HardwareContext";
import { useSettings, type BrewCurve } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";

type BrewMode = "free" | "curve";
type ViewState = "ready" | "brewing" | "result" | "actions";
type Sample = { time: number; weight: number; flow: number; invalid?: boolean };
type BrewFeedbackState = "normal" | "near" | "over" | "severe";

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

function parseDuration(value?: string) {
  const [minutes = "0", seconds = "0"] = (value ?? "02:20").split(":");
  return Number(minutes) * 60 + Number(seconds);
}

function getNextMyCurveName(curves: BrewCurve[]) {
  const highestSequence = curves.reduce((highest, item) => {
    if (item.source !== "我的曲线") return highest;
    const match = item.name.match(/^我的曲线\s+(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `我的曲线 ${String(highestSequence + 1).padStart(2, "0")}`;
}

export function BrewSession({ mode }: { mode: BrewMode }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useT();
  const { timer, tare, startTimer, pauseTimer, resetTimer, overload } = useHardware();
  const { settings, updateSetting } = useSettings();
  const curve = useMemo(
    () => settings.curves.find((item) => item.id === searchParams.get("curve")) ?? settings.curves[0],
    [searchParams, settings.curves],
  );
  const from = useMemo(() => searchParams.get("from") ?? "", [searchParams]);
  const sessionWater = Number.parseFloat(searchParams.get("water") ?? "");
  const sessionDose = Number.parseFloat(searchParams.get("dose") ?? "");
  const targetWeight = mode === "curve"
    ? Number.isFinite(sessionWater) ? sessionWater : Number.parseFloat(curve?.weight ?? "240")
    : Number.isFinite(sessionWater) ? sessionWater : settings.freeYield;
  const targetDuration = mode === "curve" ? parseDuration(curve?.duration) : 150;
  const dose = mode === "curve"
    ? Number.isFinite(sessionDose) ? sessionDose : curve?.dose ?? 15
    : Number.isFinite(sessionDose) ? sessionDose : settings.freeDose;
  const doseKnown = dose > 0;

  const [view, setView] = useState<ViewState>("ready");
  const [isTared, setIsTared] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const lastValidWeightRef = useRef(0);
  const [cursor, setCursor] = useState(0);
  const [selectedAction, setSelectedAction] = useState(0);
  const [reviewing, setReviewing] = useState(false); // 回看模式
  const [saved, setSaved] = useState(false); // 是否已保存曲线
  const [savedCurveName, setSavedCurveName] = useState("");
  const [activeBrewStage, setActiveBrewStage] = useState(0);
  const pourStageRef = useRef({ pourCount: 0, pouring: false, pauseStartedAt: 0 });
  const viewRef = useRef(view);
  const cursorRef = useRef(cursor);
  const selectedActionRef = useRef(selectedAction);
  viewRef.current = view;
  cursorRef.current = cursor;
  selectedActionRef.current = selectedAction;
  const reviewingRef = useRef(false);
  reviewingRef.current = reviewing;

  // 冲煮结束时间（固定，不会随游标变化）
  const finishTimeRef = useRef(0);

  useEffect(() => {
    resetTimer();
    setView("ready");
    setSamples([]);
    lastValidWeightRef.current = 0;
    setCursor(0);
    setReviewing(false);
    setSaved(false);
    setSavedCurveName("");
    setActiveBrewStage(0);
    pourStageRef.current = { pourCount: 0, pouring: false, pauseStartedAt: 0 };
  }, [mode, curve?.id, resetTimer]);

  useEffect(() => {
    if (!timer.isRunning || viewRef.current !== "ready") return;
    // 无论手动还是自动开始，都在 00:00 先写入起点。
    // 手动计时后尚未注水时，后续采样会自然形成 0g 的水平线。
    const initialSample = overload
      ? { time: 0, weight: 0, flow: 0, invalid: true }
      : { time: 0, weight: timer.weight, flow: 0 };
    if (!initialSample.invalid) lastValidWeightRef.current = initialSample.weight;
    setSamples((previous) => previous.length ? previous : [initialSample]);
    setView("brewing");
  }, [overload, timer.isRunning, timer.weight]);

  useEffect(() => {
    if (view !== "brewing" || !timer.isRunning) return;
    setSamples((previous) => {
      const next = overload
        ? { time: timer.time, weight: 0, flow: 0, invalid: true }
        : { time: timer.time, weight: timer.weight, flow: timer.flowRate };
      if (!next.invalid) lastValidWeightRef.current = next.weight;
      if (previous.at(-1)?.time === next.time) return [...previous.slice(0, -1), next];
      return [...previous, next].slice(-360);
    });
  }, [overload, timer.flowRate, timer.isRunning, timer.time, timer.weight, view]);

  const targetAt = useCallback((time: number) => {
    const progress = Math.max(0, Math.min(1, time / targetDuration));
    // 统一三段式目标曲线：闷蒸、第一段注水、第二段注水。
    // 每次注水后都有一小段平稳停留，最终注完后保持至配方结束。
    const points: Array<[number, number]> = [
      [0, 0],
      [0.13, 0.3],  // 闷蒸注水至 30%
      [0.2, 0.3],   // 闷蒸停留
      [0.3, 0.3],
      [0.48, 0.65], // 第一段注水至 65%
      [0.6, 0.65],  // 停留
      [0.68, 0.65],
      [0.78, 1],    // 第二段注水至目标重量
      [1, 1],       // 收尾停留
    ];
    const endIndex = points.findIndex(([pointTime]) => progress <= pointTime);
    if (endIndex <= 0) return 0;
    const [startTime, startWeight] = points[endIndex - 1];
    const [endTime, endWeight] = points[endIndex];
    const segmentProgress = (progress - startTime) / Math.max(0.0001, endTime - startTime);
    return targetWeight * (startWeight + (endWeight - startWeight) * segmentProgress);
  }, [targetDuration, targetWeight]);

  const finishBrew = useCallback(() => {
    pauseTimer();
    finishTimeRef.current = timer.time;
    setCursor(timer.time);
    setReviewing(false);
    setView("result");
    // 自动保存到本地历史记录
    const finalWeight = overload ? lastValidWeightRef.current : timer.weight;
    const record = {
      id: `brew-${Date.now()}`,
      name: mode === "curve" ? curve?.name ?? "曲线复刻" : "最近曲线",
      weight: `${finalWeight.toFixed(1)}g`,
      duration: formatTime(timer.time),
      score: "—",
      curveId: mode === "curve" ? curve?.id : undefined,
    };
    updateSetting("brewHistory", [record, ...settings.brewHistory].slice(0, 3));
  }, [curve?.id, curve?.name, mode, overload, pauseTimer, settings.brewHistory, timer.time, timer.weight, updateSetting]);

  const handleTimerPress = useCallback(() => {
    if (viewRef.current === "ready") {
      startTimer();
      setView("brewing");
      return;
    }
    if (viewRef.current === "brewing" && timer.isRunning) finishBrew();
  }, [finishBrew, startTimer, timer.isRunning]);

  const leaveSession = useCallback(() => {
    resetTimer();
    if (mode === "free") {
      navigate("/mode-selection");
      return;
    }

    const curveReturnPaths: Record<string, string> = {
      recommended: "/mode-selection/curve/select",
      recent: "/mode-selection/curve/recent",
      mine: "/mode-selection/curve/select/mine",
      bean: "/mode-selection/curve/select/bean",
      master: "/mode-selection/curve/select/master",
    };
    navigate(curveReturnPaths[from] ?? "/mode-selection/curve/select");
  }, [from, mode, navigate, resetTimer]);

  const brewAgain = useCallback(() => {
    resetTimer();
    if (mode === "curve") {
      const params = new URLSearchParams(searchParams);
      params.set("curve", curve?.id ?? "recommended-1");
      if (from) params.set("from", from);
      navigate(`/mode-selection/curve/prepare?${params.toString()}`);
    } else {
      navigate("/mode-selection/free");
    }
  }, [curve?.id, from, mode, navigate, resetTimer, searchParams]);

  const saveRecord = useCallback(() => {
    const finalWeight = overload ? lastValidWeightRef.current : timer.weight;
    const curveName = getNextMyCurveName(settings.curves);
    const savedCurve: BrewCurve = {
      id: `my-${Date.now()}`,
      name: curveName,
      weight: `${finalWeight.toFixed(1)}g`,
      duration: formatTime(finishTimeRef.current || timer.time),
      source: "我的曲线",
      dose,
      ratio: dose > 0 ? Math.round((finalWeight / dose) * 10) / 10 : 0,
      grind: mode === "curve" ? curve?.grind ?? 5 : 5,
    };
    updateSetting("curves", [...settings.curves, savedCurve]);
    updateSetting("lastUsedCurve", savedCurve.id);
    setSavedCurveName(curveName);
    setSaved(true);
  }, [curve?.grind, dose, mode, overload, settings.curves, timer.time, timer.weight, updateSetting]);

  const backLabelKey = useMemo(() => {
    if (mode === "free") return "free.backToFree";
    const curveBackLabels = {
      recommended: "replicate.backRecommended",
      recent: "replicate.backRecent",
      mine: "replicate.backMine",
      bean: "replicate.backBean",
      master: "replicate.backMaster",
    } as const;
    return curveBackLabels[from as keyof typeof curveBackLabels] ?? "replicate.backToCurveGuide";
  }, [from, mode]);

  const actions: MenuItem[] = [
    { key: "brewAgain", label: t(mode === "curve" ? "replicate.brewAgain" : "free.brewAgain"), subtitle: t(mode === "curve" ? "replicate.brewAgainHint" : "free.brewAgainHint"), icon: RotateCcw },
    { key: "save", label: saved ? t(mode === "curve" ? "replicate.saved" : "free.saved") : t(mode === "curve" ? "replicate.saveCurve" : "free.saveAsMine"), subtitle: saved ? t("curve.savedAs").replace("{name}", savedCurveName) : t("brew.keepActual"), icon: Save },
    { key: "back", label: t(backLabelKey), subtitle: "", icon: ArrowLeft },
  ];

  const performAction = useCallback((index: number) => {
    if (index === 0) { brewAgain(); return; }
    if (index === 1 && !saved) { saveRecord(); return; }
    if (index === 1 && saved) return; // 已保存，不可重复点击
    if (index === 2) { leaveSession(); return; }
  }, [brewAgain, leaveSession, saveRecord, saved]);

  // 旋钮事件：结果页旋转回看，单击进确认页
  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      if (detail.type === "brew-timer-press") {
        handleTimerPress();
        return;
      }
      if (detail.type === "navigate-back") {
        leaveSession();
        return;
      }
      if (detail.type === "rotary-turn") {
        const direction = detail.direction ?? 1;
        if (viewRef.current === "result") {
          setCursor((value) => {
            const next = value + direction;
            const clamped = Math.max(0, Math.min(finishTimeRef.current, next));
            if (next !== clamped) return clamped; // 到边界停住
            if (next !== value && !reviewingRef.current) {
              setReviewing(true); // 首次旋转进入回看
              reviewingRef.current = true;
            }
            return clamped;
          });
        } else if (viewRef.current === "actions") {
          setSelectedAction((value) => (value + direction + actions.length) % actions.length);
        }
        return;
      }
      if (detail.type !== "knob-single-click") return;
      if (viewRef.current === "ready") {
        tare();
        setIsTared(true);
      } else if (viewRef.current === "result") {
        setView("actions");
      } else if (viewRef.current === "actions") {
        performAction(selectedActionRef.current);
      }
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);
    return () => {
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [actions.length, handleTimerPress, leaveSession, performAction, tare]);

  // ----- 结果页默认数据（游标=终点时） -----
  const validSamples = samples.filter((sample) => !sample.invalid);
  const endSample = validSamples.at(-1) ?? { time: timer.time, weight: overload ? 0 : timer.weight, flow: overload ? 0 : timer.flowRate };
  const avgFlow = endSample.time > 0 ? endSample.weight / endSample.time : 0;
  const finalRatio = doseKnown ? endSample.weight / dose : 0;

  // ----- 回看/冲煮中数据（游标时刻） -----
  const cursorSample = view === "result"
    ? samples.reduce((best, item) => Math.abs(item.time - cursor) < Math.abs(best.time - cursor) ? item : best, endSample)
    : { time: timer.time, weight: timer.weight, flow: timer.flowRate };
  const cursorRatio = doseKnown ? cursorSample.weight / dose : 0;
  const cursorWeight = cursorSample.weight;
  const cursorFlow = cursorSample.flow;
  const cursorTime = cursorSample.time;

  const isResult = view === "result";

  // 阶段由实际注水次数推进，而不是按配方时间自动推进。
  // 第一次注水=闷蒸，第二次注水=第一段注水，第三次注水=第二段注水。
  useEffect(() => {
    if (view !== "brewing" || !timer.isRunning) return;
    const detector = pourStageRef.current;
    const isPouringNow = timer.flowRate > 0.3;

    if (isPouringNow && !detector.pouring) {
      const isFirstPour = detector.pourCount === 0;
      const hasDistinctPause = detector.pauseStartedAt > 0 && Date.now() - detector.pauseStartedAt >= 600;
      if (isFirstPour || hasDistinctPause) {
        detector.pourCount = Math.min(3, detector.pourCount + 1);
        setActiveBrewStage(Math.max(0, detector.pourCount - 1));
      }
      detector.pouring = true;
      detector.pauseStartedAt = 0;
      return;
    }

    if (!isPouringNow && detector.pouring) {
      detector.pouring = false;
      detector.pauseStartedAt = Date.now();
    }
  }, [timer.flowRate, timer.isRunning, view]);

  // 冲煮标题颜色与当前三段式阶段保持一致。
  const brewingStage = useMemo((): { label: string; color: string } => {
    if (view !== "brewing") return { label: t("brew.ready"), color: "#8291A6" };
    if (activeBrewStage === 0) return { label: t("brew.blooming"), color: "#FFC247" };
    return { label: t("brew.pouring"), color: "#43C7FF" };
  }, [activeBrewStage, t, view]);
  const brewStageLabels = [t("brew.stageBloom"), t("brew.stageFirst"), t("brew.stageSecond")];

  // 冲煮中偏差判定（用于曲线颜色和氛围灯）
  const alertStateRef = useRef({
    weightOverStart: 0,
    flowOverStart: 0,
    severeStart: 0,
  });
  const rawBrewingAlert = useMemo((): BrewFeedbackState => {
    if (view !== "brewing" || mode !== "curve") return "normal";
    const expected = targetAt(timer.time);
    const weightDev = timer.weight - expected;
    const weightOverThreshold = Math.max(3, targetWeight * 0.03);
    const flowLimit = 6; // 流速上限 g/s
    const flowOverExcess = Math.max(0.5, flowLimit * 0.15);

    const isWeightOver = weightDev > weightOverThreshold;
    const isWeightSevere = weightDev > weightOverThreshold * 2;
    const isFlowOver = timer.flowRate > flowLimit + flowOverExcess;
    const isFlowSevere = timer.flowRate > flowLimit + flowOverExcess * 2;
    const isFlowNear = timer.flowRate >= flowLimit * 0.9 && timer.flowRate <= flowLimit + flowOverExcess;
    const isWeightNear = weightDev > weightOverThreshold * 0.5 && weightDev <= weightOverThreshold;
    const isSevere = isWeightSevere || isFlowSevere || (isWeightOver && isFlowOver);

    const now = Date.now();
    const s = alertStateRef.current;
    if (isWeightOver) { if (s.weightOverStart === 0) s.weightOverStart = now; }
    else { s.weightOverStart = 0; }
    if (isFlowOver) { if (s.flowOverStart === 0) s.flowOverStart = now; }
    else { s.flowOverStart = 0; }
    if (isSevere) { if (s.severeStart === 0) s.severeStart = now; }
    else { s.severeStart = 0; }

    const weightOverDuration = s.weightOverStart ? now - s.weightOverStart : 0;
    const flowOverDuration = s.flowOverStart ? now - s.flowOverStart : 0;

    if (isSevere) return "severe";
    if ((isWeightOver && weightOverDuration > 500) || (isFlowOver && flowOverDuration > 1000)) return "over";
    if (isFlowNear || isWeightNear) return "near";
    return "normal";
  }, [view, mode, timer.time, timer.weight, timer.flowRate, targetAt, targetWeight]);

  // 降级或恢复必须稳定 1.5s；升级则立即生效，避免瞬时波动造成灯光频闪。
  const [brewingAlert, setBrewingAlert] = useState<BrewFeedbackState>("normal");
  const brewingAlertRef = useRef<BrewFeedbackState>("normal");
  const recoveryTargetRef = useRef<BrewFeedbackState | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const clearRecovery = () => {
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
      recoveryTargetRef.current = null;
    };
    const applyAlert = (state: BrewFeedbackState) => {
      brewingAlertRef.current = state;
      setBrewingAlert(state);
    };

    if (view !== "brewing" || mode !== "curve") {
      clearRecovery();
      applyAlert("normal");
      return;
    }

    const rank: Record<BrewFeedbackState, number> = { normal: 0, near: 1, over: 2, severe: 3 };
    const current = brewingAlertRef.current;
    if (rank[rawBrewingAlert] >= rank[current]) {
      clearRecovery();
      if (rawBrewingAlert !== current) applyAlert(rawBrewingAlert);
      return;
    }

    if (recoveryTimerRef.current && recoveryTargetRef.current === rawBrewingAlert) return;
    clearRecovery();
    recoveryTargetRef.current = rawBrewingAlert;
    recoveryTimerRef.current = setTimeout(() => {
      if (recoveryTargetRef.current === rawBrewingAlert) applyAlert(rawBrewingAlert);
      recoveryTimerRef.current = null;
      recoveryTargetRef.current = null;
    }, 1500);
  }, [mode, rawBrewingAlert, view]);

  useEffect(() => () => {
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
  }, []);

  const alertText = useMemo(() => {
    switch (brewingAlert) {
      case "near": return t("curve.nearLimit");
      case "over": return t("curve.overLimit");
      case "severe": return t("curve.severeOverLimit");
      default: return t("curve.brewingNormal");
    }
  }, [brewingAlert]);

  // 秤体右侧电容按键的灯环与屏幕外圈氛围灯共用同一个偏差状态。
  useEffect(() => {
    const state: BrewFeedbackState = view === "brewing" && mode === "curve" ? brewingAlert : "normal";
    window.dispatchEvent(new CustomEvent("brew-feedback-change", { detail: { state } }));
  }, [brewingAlert, mode, view]);

  useEffect(() => () => {
    window.dispatchEvent(new CustomEvent("brew-feedback-change", { detail: { state: "normal" } }));
  }, []);

  // 顶部卡片：冲煮中始终用实时数据
  const displayWeight = isResult && !reviewing ? endSample.weight : cursorWeight;
  const displayFlow = isResult && !reviewing ? avgFlow : cursorFlow;
  const displayTime = isResult && !reviewing ? endSample.time : cursorTime;
  const displayRatio = isResult && !reviewing ? finalRatio : cursorRatio;

  // 所有 Hook 必须在任何条件返回之前执行，避免结果页切换到操作页时 Hook 数量变化。
  if (view === "actions") {
    return (
      <div className="screen-surface h-full">
        <MenuList title={t("brew.session")} subtitle={t("brew.actionHint")} items={actions} selectedIndex={selectedAction} onSelect={performAction} onMove={setSelectedAction} pageSize={3} />
      </div>
    );
  }

  return (
    <div className={`brew-session screen-surface flex h-full flex-col px-3 pb-3 pt-2 text-[#F5F7FA] ${view === "brewing" && mode === "curve" ? `is-${brewingAlert}` : ""}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            <span
              className={`h-1.5 w-1.5 rounded-full ${view === "ready" ? "animate-[pulse_2.8s_ease-in-out_infinite]" : ""}`}
              style={{ backgroundColor: view === "brewing" ? brewingStage.color : isResult ? "#2F6BFF" : "#8291A6" }}
            />
            {isResult ? t("brew.result") : view === "ready" ? t("brew.ready") : view === "brewing" ? brewingStage.label : ""}
          </div>
          </div>
      </div>

      {/* 结果页顶部：最终重量/总水量、平均流速、总时长、粉水比（粉量已知时） */}
      {isResult && !reviewing && (
        <div className={`mt-2 grid gap-1.5 ${doseKnown ? "grid-cols-4" : "grid-cols-3"}`}>
          <ResultMetric label={t("brew.finalWeight")} value={displayWeight.toFixed(1)} unit="g" />
          <ResultMetric label={t("curve.avgFlow")} value={avgFlow.toFixed(1)} unit="g/s" />
          <ResultMetric label={t("brew.totalDuration")} value={formatTime(endSample.time)} />
          {doseKnown && <ResultMetric label={t("curve.brewRatio")} value={`1:${finalRatio.toFixed(1)}`} />}
        </div>
      )}

      {/* 回看状态顶部：游标时刻数据 */}
      {isResult && reviewing && (
        <div className={`mt-2 grid gap-1.5 ${doseKnown ? "grid-cols-4" : "grid-cols-3"}`}>
          <ResultMetric label={t("brew.cumulativeWeight")} value={displayWeight.toFixed(1)} unit="g" emphasis />
          <ResultMetric label={t("brew.cursorFlow")} value={displayFlow.toFixed(1)} unit="g/s" />
          <ResultMetric label={t("curve.time")} value={formatTime(displayTime)} />
          {doseKnown && <ResultMetric label={t("brew.dynamicRatio")} value={`1:${displayRatio.toFixed(1)}`} />}
        </div>
      )}

      {/* 冲煮中顶部：重量(g) / 流速(g/s) / 时间(mm:ss) */}
      {view === "brewing" && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <ResultMetric label={t("curve.weight")} value={timer.weight.toFixed(1)} unit="g" emphasis />
          <ResultMetric label={t("curve.realtimeFlow")} value={timer.flowRate.toFixed(1)} unit="g/s" />
          <ResultMetric label={t("curve.time")} value={formatTime(timer.time)} />
        </div>
      )}

      {/* 准备中顶部 */}
      {view === "ready" && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <ResultMetric label={t("curve.weight")} value={timer.weight.toFixed(1)} unit="g" emphasis />
          <ResultMetric label={t("curve.realtimeFlow")} value="0.0" unit="g/s" />
          <ResultMetric label={t("curve.time")} value="00:00" />
        </div>
      )}

      {/* 曲线区 */}
      <CurveGraph
        actual={samples}
        currentTime={isResult ? cursor : timer.time}
        endTime={isResult ? finishTimeRef.current : undefined}
        targetAt={mode === "curve" ? targetAt : undefined}
        targetDuration={mode === "curve" ? targetDuration : undefined}
        maxWeight={Math.max(targetWeight, timer.weight, 1)}
        showCursor={isResult}
        showTarget={mode === "curve"}
        showReadyTargetPreview={view === "ready" && mode === "curve"}
        alert={isResult ? "normal" : brewingAlert}
      />

      {isResult && (
        <div className="mt-1.5 flex h-4 flex-none items-center justify-center text-[9px] font-medium tracking-wide text-[#8291A6]">
          {t("brew.pressKnobContinue")}
        </div>
      )}

      {/* 底部提示与冲煮阶段：结果页仅保留数据与曲线 */}
      {!isResult && <div className="mt-2">
        {view !== "brewing" && <div className="flex items-center justify-center gap-2 text-center">
          <div className="min-w-0">
            {view === "ready" ? (
              <>
                <div className="truncate text-[10px] font-medium text-[#8291A6]">
                  {isTared
                    ? settings.autoTimer
                      ? t("brew.pourToStart")
                      : t("brew.pressTimerStart")
                    : t("brew.pressKnobTare")}
                </div>
              </>
            ) : view === "brewing" ? (
              <>
                <div className={`truncate text-[10px] font-medium ${
                  brewingAlert === "severe" || brewingAlert === "over" ? "text-[#FF4D5E]" : brewingAlert === "near" ? "text-[#FFC247]" : "text-[#27C6A3]"
                }`}>
                  {mode === "curve" ? alertText : t("brew.pressLeftStop")}
                </div>
                <div className="mt-0.5 text-[8px] text-[#8291A6]">
                  {t("brew.targetProgress").replace("{target}", String(targetWeight)).replace("{actual}", timer.weight.toFixed(1))}
                </div>
              </>
            ) : reviewing ? (
              <>
                <div className="truncate text-[10px] font-medium text-[#DCE5F1]">
                  {t("brew.reviewEverySecond")}
                </div>
                <div className="mt-0.5 text-[8px] text-[#8291A6]">
                  {t("brew.cursorSummary").replace("{time}", formatTime(displayTime)).replace("{weight}", displayWeight.toFixed(1))}{doseKnown ? ` · ${t("curve.brewRatio")} 1:${displayRatio.toFixed(1)}` : ""}
                </div>
              </>
            ) : (
              <>
                <div className="truncate text-[10px] font-medium text-[#DCE5F1]">
                  {t("brew.review")}
                </div>
                <div className="mt-0.5 text-[8px] text-[#8291A6]">
                  {t("brew.resultSummary").replace("{time}", formatTime(endSample.time)).replace("{flow}", avgFlow.toFixed(1))}{doseKnown ? ` · ${t("curve.brewRatio")} 1:${finalRatio.toFixed(1)}` : ""}
                </div>
              </>
            )}
          </div>
        </div>}
        {view !== "ready" && <BrewStageIndicator activeStage={activeBrewStage} labels={brewStageLabels} />}
      </div>}
    </div>
  );
}

function ResultMetric({ label, value, unit, emphasis }: { label: string; value: string; unit?: string; emphasis?: boolean }) {
  return (
    <div className={`metric-glass rounded-[11px] px-2 py-2 text-center ${emphasis ? "metric-primary" : ""}`}>
      <div className="text-[8px] tracking-wide text-[#8291A6]">{label}</div>
      <div className={`mt-0.5 whitespace-nowrap font-light tabular-nums tracking-[-0.035em] ${emphasis ? "text-[22px]" : "text-[15px]"}`}>
        {value}{unit && <span className="ml-0.5 text-[8px] tracking-normal text-[#8291A6]">{unit}</span>}
      </div>
    </div>
  );
}

function BrewStageIndicator({ activeStage, labels }: { activeStage: number; labels: string[] }) {
  const { t } = useT();
  return (
    <div className="mx-auto mt-2 flex w-full max-w-[132px] items-center gap-1.5" aria-label={t("brew.stageAria").replace("{stage}", labels[activeStage])}>
      {labels.map((label, index) => {
        const lit = index <= activeStage;
        return (
          <div
            key={label}
            className={`h-2 flex-1 rounded-full border transition-all ${
              lit
                ? "border-[#43C7FF] bg-[#2F6BFF]/60 shadow-[0_0_12px_rgba(67,199,255,.5)]"
                : "border-white/[0.14] bg-white/[0.035]"
            }`}
          >
            <span className={`block h-full rounded-full transition-opacity ${lit ? "bg-gradient-to-r from-[#2F6BFF] to-[#43C7FF] opacity-90" : "opacity-0"}`} />
          </div>
        );
      })}
    </div>
  );
}

function CurveGraph({ actual, currentTime, endTime, targetAt, targetDuration, maxWeight, showCursor, showTarget, showReadyTargetPreview = false, alert = "normal" }: {
  actual: Sample[];
  currentTime: number;
  endTime?: number;
  targetAt?: (time: number) => number;
  targetDuration?: number;
  maxWeight: number;
  showCursor: boolean;
  showTarget: boolean;
  /** 准备阶段固定预览未来 20 秒；冲煮中则保留 10 秒前瞻的滚动窗口。 */
  showReadyTargetPreview?: boolean;
  alert?: "normal" | "near" | "over" | "severe";
}) {
  const { t } = useT();
  const width = 320;
  const height = 112;
  const tEnd = endTime ?? currentTime;
  const isResult = endTime !== undefined;

  // 横轴 20s 滚动窗口：[max(0, t-10s), t+10s]
  // 不足 10s 时显示 0-20s；接近目标曲线末端时窗口向前补足
  let windowStart: number;
  let windowEnd: number;

  if (showReadyTargetPreview) {
    // 复刻开始前，固定展示从 00:00 起的未来 20 秒目标走势。
    windowStart = 0;
    windowEnd = 20;
  } else if (isResult) {
    // 结果页：展示完整曲线范围
    windowStart = 0;
    windowEnd = Math.max(20, tEnd + 2);
  } else {
    // 冲煮中：20s 滚动窗口
    windowStart = Math.max(0, currentTime - 10);
    windowEnd = currentTime + 10;
    // 起始不足 10s：显示 0-20s
    if (currentTime < 10) {
      windowStart = 0;
      windowEnd = 20;
    }
  }

  // 实际曲线绘制到当前时间；结果页绘制到冲煮结束时间。
  const actualDrawEnd = isResult ? tEnd : currentTime;

  // 滚动窗口必须继承窗口左侧最后一个有效重量。
  // 否则停止注水或采样较稀疏时，窗口内只剩一个点，SVG 不会显示出实际曲线。
  const sampleAtWindowStart = actual
    .filter((item) => item.time <= windowStart)
    .at(-1);
  const carriedSample = sampleAtWindowStart && !sampleAtWindowStart.invalid
    ? { ...sampleAtWindowStart, time: windowStart }
    : undefined;
  const samplesInsideWindow = actual.filter(
    (item) => item.time >= windowStart && item.time <= actualDrawEnd,
  );
  const drawableSamples = carriedSample && samplesInsideWindow[0]?.time !== windowStart
    ? [carriedSample, ...samplesInsideWindow]
    : samplesInsideWindow;

  // Y 轴缩放：根据窗口内的目标与实际最大重量，加 15% 安全边距
  const windowSamples = drawableSamples.filter((item) => !item.invalid);
  const actualMaxInWindow = windowSamples.length > 0 ? Math.max(...windowSamples.map((s) => s.weight)) : 0;
  // 冲煮中会提前显示未来 10 秒目标，因此纵轴也必须包含这段未来重量。
  // 准备页 currentTime=0 时若只按 0g 缩放，未来目标会全部被夹在顶部，视觉上变成陡直线。
  const visibleTargetEnd = showReadyTargetPreview
    ? Math.min(windowEnd, targetDuration ?? Number.POSITIVE_INFINITY)
    : isResult
    ? Math.min(windowEnd, tEnd, targetDuration ?? Number.POSITIVE_INFINITY)
    : Math.min(windowEnd, currentTime + 10, targetDuration ?? Number.POSITIVE_INFINITY);
  const targetMaxInWindow = showTarget && targetAt ? targetAt(visibleTargetEnd) : 0;
  const rawMax = Math.max(actualMaxInWindow, targetMaxInWindow, 1);
  const yMax = rawMax * 1.15; // 15% 安全边距

  const toX = (time: number) => ((time - windowStart) / (windowEnd - windowStart)) * width;
  const toY = (weight: number) => height - 12 - Math.max(0, Math.min(1, weight / yMax)) * (height - 24);

  let hasPreviousActualPoint = false;
  let lastActualPoint: Sample | undefined;
  let endsWithInvalidSample = false;
  const actualPathParts: string[] = [];
  drawableSamples.forEach((item) => {
      if (item.invalid) {
        hasPreviousActualPoint = false;
        endsWithInvalidSample = true;
        return;
      }
      const command = hasPreviousActualPoint ? "L" : "M";
      actualPathParts.push(`${command}${toX(item.time).toFixed(1)},${toY(item.weight).toFixed(1)}`);
      hasPreviousActualPoint = true;
      lastActualPoint = item;
      endsWithInvalidSample = false;
  });
  // 没有新重量时也把最后一个有效点延伸到当前时间，保证横轴推进时显示水平线。
  if (lastActualPoint && !endsWithInvalidSample && lastActualPoint.time < actualDrawEnd) {
    actualPathParts.push(`L${toX(actualDrawEnd).toFixed(1)},${toY(lastActualPoint.weight).toFixed(1)}`);
  }
  const actualPath = actualPathParts.join(" ");
  const invalidSamples = actual.filter((item) => item.invalid && item.time >= windowStart && item.time <= actualDrawEnd);
  const invalidStart = invalidSamples.at(0)?.time;
  const invalidEnd = invalidSamples.at(-1)?.time ?? invalidStart;

  // 目标曲线：显示到窗口右边界或 tEnd（取较小值），结果页截断到 tEnd
  const targetPath = (showTarget && targetAt)
      ? Array.from({ length: 81 }, (_, i) => {
        const t = windowStart + (i / 80) * (windowEnd - windowStart);
        if (targetDuration !== undefined && t > targetDuration) return null;
        if (isResult && t > tEnd) return null;
        if (!isResult && !showReadyTargetPreview && t > currentTime + 10) return null;
        return { t, w: targetAt(t) };
      })
      .filter((p): p is { t: number; w: number } => p !== null)
      .map((p, i) => `${i ? "L" : "M"}${toX(p.t).toFixed(1)},${toY(p.w).toFixed(1)}`)
      .join(" ")
    : "";

  // 实际曲线颜色：青绿默认，琥珀接近上限，红色超限/严重超限
  const actualColor = alert === "over" || alert === "severe" ? "#FF4D5E" : alert === "near" ? "#FFC247" : "#27C6A3";
  const glowId = isResult ? "resultGlow" : "brewingGlow";

  return (
    <div className="curve-glass relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[13px]">
      <div className="absolute left-2.5 top-2 z-10 flex items-center gap-3 text-[7px] uppercase tracking-[0.14em] text-[#8291A6]">
        {showTarget && targetAt && <span className="flex items-center gap-1"><i className="h-px w-3 bg-[#F2F5F8]" />{t("curve.target")}</span>}
        <span className="flex items-center gap-1"><i className="h-px w-3" style={{ backgroundColor: actualColor }} />{t("curve.actual")}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-label={t("brew.graphAria")}>
        <defs>
          <linearGradient id={glowId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
            <stop offset="0" stopColor={actualColor} stopOpacity="0.9" />
            <stop offset="1" stopColor={actualColor} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} stroke="rgba(130,145,166,.12)" strokeWidth="1" />)}
        {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} y1="0" y2={height} x1={width * ratio} x2={width * ratio} stroke="rgba(130,145,166,.08)" strokeWidth="1" />)}
        {invalidStart !== undefined && invalidEnd !== undefined && (
          <rect x={toX(invalidStart)} y="0" width={Math.max(3, toX(Math.min(actualDrawEnd, invalidEnd + 1)) - toX(invalidStart))} height={height} fill="rgba(255,77,94,.14)" />
        )}
        {targetPath && <path d={targetPath} fill="none" stroke="#F2F5F8" strokeOpacity=".88" strokeWidth="2" strokeDasharray="4 4" />}
        {actualPath && <path d={actualPath} fill="none" stroke={`url(#${glowId})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />}
        {showCursor && <line x1={toX(currentTime)} x2={toX(currentTime)} y1="0" y2={height} stroke="#43C7FF" strokeOpacity=".7" strokeWidth="1" />}
      </svg>
      <div className="absolute bottom-1.5 left-2.5 right-2.5 flex justify-between text-[7px] tabular-nums text-[#59687D]">
        <span>{formatTime(windowStart)}</span><span>{formatTime(windowEnd)}</span>
      </div>
    </div>
  );
}
