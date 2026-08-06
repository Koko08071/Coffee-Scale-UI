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
    <button type="button" onClick={() => navigate("/menu")} className="group relative block h-full w-full overflow-hidden text-left">
      <MetricFocusDisplay weight={timer.weight} flowRate={timer.flowRate} time={timer.time} />
    </button>
  );
}
