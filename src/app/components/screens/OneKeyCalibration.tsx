import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge } from "lucide-react";
import { useNavigate } from "react-router";
import { useHardware } from "../HardwareContext";

type Phase = "place" | "calibrating" | "done" | "error";

export function OneKeyCalibration() {
  const navigate = useNavigate();
  const { timer } = useHardware();
  const [phase, setPhase] = useState<Phase>("place");
  const [progress, setProgress] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const begin = useCallback((weightOverride?: number) => {
    const weight = weightOverride ?? timer.weight;
    if (weight >= 98 && weight <= 102) {
      setPhase("calibrating");
      setProgress(0);
    } else {
      setPhase("error");
    }
  }, [timer.weight]);

  useEffect(() => {
    if (phase !== "calibrating") return;
    const interval = window.setInterval(() => {
      setProgress((value) => {
        const next = value + 5;
        if (next >= 100) {
          window.clearInterval(interval);
          setPhase("done");
          return 100;
        }
        return next;
      });
    }, 90);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const timeout = window.setTimeout(() => navigate("/menu"), 1800);
    return () => window.clearTimeout(timeout);
  }, [navigate, phase]);

  useEffect(() => {
    const handleCalibrationStart = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      if (phaseRef.current === "place" || phaseRef.current === "error") {
        begin(detail.weight as number | undefined);
      }
    };
    window.addEventListener("calibration-start", handleCalibrationStart);

    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      if (detail.type === "navigate-back") {
        navigate("/menu");
      } else if (detail.type === "knob-single-click") {
        if (phaseRef.current === "place" || phaseRef.current === "error") begin();
      }
    };
    window.addEventListener("hardware-action", handleHardware);
    window.addEventListener("simulator-action", handleHardware);

    return () => {
      window.removeEventListener("calibration-start", handleCalibrationStart);
      window.removeEventListener("hardware-action", handleHardware);
      window.removeEventListener("simulator-action", handleHardware);
    };
  }, [begin, navigate]);

  return (
    <div className="screen-surface flex h-full w-full flex-col items-center justify-center overflow-hidden p-5 text-center text-[#F5F7FA]">
      <div className={`relative grid h-20 w-20 place-items-center rounded-full border backdrop-blur-xl ${
        phase === "done" ? "border-[#27C6A3]/45 bg-[#27C6A3]/10 text-[#27C6A3]" :
        phase === "error" ? "border-[#FFC247]/45 bg-[#FFC247]/10 text-[#FFC247]" :
        "border-[#2F6BFF]/45 bg-[#2F6BFF]/10 text-[#8EB1FF]"
      }`}>
        <span className="absolute inset-2 rounded-full border border-white/[0.05]" />
        {phase === "done" ? <CheckCircle2 className="h-8 w-8" strokeWidth={1.5} /> : phase === "error" ? <AlertTriangle className="h-8 w-8" strokeWidth={1.5} /> : <Gauge className={`h-8 w-8 ${phase === "calibrating" ? "animate-pulse" : ""}`} strokeWidth={1.5} />}
      </div>

      <div className="mt-4 screen-kicker">Precision calibration</div>
      <h1 className="mt-1.5 text-[18px] font-semibold tracking-tight">
        {phase === "place" ? "请放上 100g 校准砝码" : phase === "calibrating" ? "校准中" : phase === "done" ? "校准完成" : "未检测到 100g 砝码"}
      </h1>
      {phase === "calibrating" && (
        <div className="mt-5 w-[220px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2F6BFF] to-[#43C7FF] shadow-[0_0_12px_rgba(67,199,255,.4)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-[9px] tabular-nums text-[#8291A6]">{progress}%</div>
        </div>
      )}

    </div>
  );
}
