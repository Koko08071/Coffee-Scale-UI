import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSettings } from "../SettingsContext";
import { MenuList } from "../MenuList";
import { useT } from "../../i18n/I18nContext";

const MODE_KEYS = ["智能曲线指导", "自由冲煮", "意式模式"] as const;

export function XKeySettings() {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { t } = useT();
  const [selected, setSelected] = useState(() => MODE_KEYS.indexOf(settings.xKeyMode));

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "navigate-back") navigate("/settings");
      else if (type === "rotary-turn") setSelected((value) => (value + (direction ?? 1) + MODE_KEYS.length) % MODE_KEYS.length);
      else if (type === "knob-single-click") updateSetting("xKeyMode", MODE_KEYS[selected]);
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [navigate, selected, updateSetting]);

  const MODE_LABELS: Record<string, string> = {
    "智能曲线指导": t("mode.curveGuide"),
    "自由冲煮": t("mode.freeBrewing"),
    "意式模式": t("mode.espresso"),
  };

  return (
    <div className="screen-surface h-full text-white">
      <MenuList
        title={t("settings.menu.xKey")}
        items={MODE_KEYS.map((mode) => ({ label: MODE_LABELS[mode], info: settings.xKeyMode === mode ? t("common.current") : undefined }))}
        selectedIndex={selected}
        onSelect={(index) => { setSelected(index); updateSetting("xKeyMode", MODE_KEYS[index]); }}
        onMove={setSelected}
        pageSize={3}
      />
    </div>
  );
}
