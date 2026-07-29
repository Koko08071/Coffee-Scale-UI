import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useHardware } from "../HardwareContext";
import { MetricFocusDisplay } from "../MetricFocusDisplay";

export function HomeScreen() {
  const navigate = useNavigate();
  const { timer } = useHardware();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        navigate("/menu");
      }
    };
    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [navigate]);

  return (
    <button type="button" onClick={() => navigate("/menu")} className="screen-surface group relative flex h-full w-full flex-col overflow-hidden p-3 text-left">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[20px] border border-[#6C8EC5]/15 bg-[#050A12]/80 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_40px_rgba(0,0,0,.2)]">
        <MetricFocusDisplay weight={timer.weight} flowRate={timer.flowRate} time={timer.time} />
      </div>
    </button>
  );
}
