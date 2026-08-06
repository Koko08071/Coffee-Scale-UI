import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useHardware } from "../HardwareContext";
import { MenuList, MenuItem } from "../MenuList";
import { useT } from "../../i18n/I18nContext";

export function CurveBrewingMode() {
  const navigate = useNavigate();
  const { timer, resetTimer } = useHardware();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const actions: MenuItem[] = [
    { key: "continue", label: t("curve.finish.continue"), info: t("curve.finish.continueHint") },
    { key: "save", label: t("curve.finish.save"), info: t("curve.finish.saveHint") },
    { key: "discard", label: t("curve.finish.discard"), info: t("curve.finish.discardHint") },
  ];

  const handleSelect = useCallback((idx: number) => {
    if (idx === 0) navigate(-1);
    else if (idx === 1) {
      resetTimer();
      navigate("/mode-selection/curve/recent");
    } else {
      resetTimer();
      navigate("/mode-selection");
    }
  }, [navigate, resetTimer]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => ((prev + (direction ?? 1) + actions.length) % actions.length));
      } else if (type === "knob-single-click") {
        handleSelect(selected);
      } else if (type === "navigate-back") {
        navigate("/mode-selection");
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [selected, handleSelect, navigate, actions.length]);

  return (
    <div className="h-full screen-surface overflow-hidden">
      <MenuList title={t("curve.finish.title")} subtitle={t("curve.finish.subtitle")} items={actions} selectedIndex={selected} onSelect={handleSelect} onMove={setSelected} pageSize={3} />
    </div>
  );
}
