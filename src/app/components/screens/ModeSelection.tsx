import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MenuList, MenuItem } from "../MenuList";
import { useT } from "../../i18n/I18nContext";
import { ChartSpline, Coffee, Waves } from "lucide-react";

export function ModeSelection() {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const modes: MenuItem[] = [
    { key: "espresso", label: t("mode.espresso"), icon: Coffee },
    { key: "curve", label: t("mode.curveGuide"), icon: ChartSpline },
    { key: "free", label: t("mode.freeBrewing"), icon: Waves },
  ];

  const paths = ["/mode-selection/espresso", "/mode-selection/curve/select", "/mode-selection/free"];

  const handleSelect = useCallback((idx: number) => {
    navigate(paths[idx]);
  }, [navigate]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => {
          const n = modes.length;
          return (prev + (direction ?? 1) + n) % n;
        });
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < modes.length) {
          handleSelect(selected);
        }
      } else if (type === "navigate-back") {
        navigate("/menu");
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [selected, handleSelect, navigate, modes.length]);

  return (
    <div className="h-full screen-surface">
      <MenuList
        title={t("mode.title")}
        subtitle={t("menu.knobHint")}
        items={modes}
        selectedIndex={selected}
        onSelect={handleSelect}
        onMove={setSelected}
        pageSize={3}
      />
    </div>
  );
}
