import { RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { useHardware } from "./HardwareContext";
import { showHardwareToast } from "./HardwareToast";

type PressTimer = ReturnType<typeof setTimeout> | null;

function dispatchHardwareAction(type: string, detail: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent("hardware-action", { detail: { type, ...detail } }));
}

export function Knob() {
  const {
    shutdownCountdown,
    togglePower,
    cancelShutdown,
    overload,
  } = useHardware();

  const [knobPressed, setKnobPressed] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const knobLongTimer = useRef<PressTimer>(null);
  const knobLongTriggered = useRef(false);

  const STEP_DEG = 15;

  const rotate = (direction: -1 | 1) => {
    if (overload) return;
    dispatchHardwareAction("rotary-turn", { direction });
    setRotationAngle((prev) => prev + direction * STEP_DEG);
  };

  const handleKnobDown = () => {
    if (overload) return;
    knobLongTriggered.current = false;
    setKnobPressed(true);
    knobLongTimer.current = setTimeout(() => {
      knobLongTriggered.current = true;
      togglePower();
      showHardwareToast("电源状态已切换", "warning");
    }, 2000);
  };

  const handleKnobUp = () => {
    setKnobPressed(false);
    if (knobLongTimer.current) clearTimeout(knobLongTimer.current);
    knobLongTimer.current = null;
    if (knobLongTriggered.current || overload) return;

    if (shutdownCountdown !== null) {
      cancelShutdown();
      showHardwareToast("已取消关机", "success");
    } else {
      dispatchHardwareAction("knob-single-click");
    }
  };

  return (
    <section className="flex flex-col items-center gap-2">
      <div
        className="relative h-[88px] w-[88px] rounded-full border border-white/[0.08] bg-gradient-to-br from-slate-800 to-[#040610] shadow-[0_8px_32px_rgba(0,0,0,.5),0_0_40px_rgba(47,107,255,.06)] backdrop-blur-xl"
        onWheel={(event) => {
          event.preventDefault();
          rotate(event.deltaY > 0 ? 1 : -1);
        }}
      >
        {/* 外环装饰 */}
        <div className="absolute inset-[2px] rounded-full border border-white/[0.04]" />
        {/* 内按钮 */}
        <button
          type="button"
          aria-label="旋钮确认"
          onPointerDown={handleKnobDown}
          onPointerUp={handleKnobUp}
          onPointerLeave={() => {
            setKnobPressed(false);
            if (knobLongTimer.current) clearTimeout(knobLongTimer.current);
            knobLongTimer.current = null;
          }}
          onPointerCancel={() => {
            setKnobPressed(false);
            if (knobLongTimer.current) clearTimeout(knobLongTimer.current);
            knobLongTimer.current = null;
          }}
          style={{ transform: `rotate(${rotationAngle}deg)` }}
          className={`absolute inset-[15px] flex items-center justify-center rounded-full bg-gradient-to-br transition-all duration-200 ${
            knobPressed
              ? "scale-95 border-2 border-blue-300/60 from-slate-700 to-slate-950 shadow-[0_0_24px_rgba(47,107,255,.3)]"
              : "border border-white/[0.12] from-slate-600 to-slate-900 hover:border-blue-400/40 hover:shadow-[0_0_20px_rgba(47,107,255,.15)]"
          }`}
        >
          <RotateCcw className={`h-5 w-5 ${knobPressed ? "text-blue-300" : "text-slate-300"} transition-colors`} strokeWidth={1.5} />
        </button>
        {/* 位置指示点 */}
        <span className="absolute left-1/2 top-1 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(47,107,255,.8)]" />
      </div>
      <span className="text-[9px] text-slate-500 tracking-wider">滚轮旋转</span>
    </section>
  );
}

export function XKeyButton() {
  const { handleXKeyPress } = useHardware();
  return (
    <section className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label="X 快捷按键"
        onClick={() => {
          handleXKeyPress();
          showHardwareToast("X 快捷启动", "success");
        }}
        className="flex h-13 w-13 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl text-[17px] font-semibold text-blue-300 transition-all hover:border-blue-500/40 hover:bg-blue-500/[0.06] hover:shadow-[0_0_20px_rgba(47,107,255,.2)] active:scale-95"
      >
        X
      </button>
      <span className="text-[9px] text-slate-500 tracking-wider">X 快捷按键</span>
    </section>
  );
}

export function HardwareControls() {
  return (
    <aside className="hardware-panel flex h-full flex-col items-center justify-center gap-5 text-slate-300 select-none">
      <Knob />
      <XKeyButton />
    </aside>
  );
}
