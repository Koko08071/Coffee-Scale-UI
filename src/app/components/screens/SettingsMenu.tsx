import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MenuList, MenuItem } from "../MenuList";
import { useT } from "../../i18n/I18nContext";
import {
  ChartSpline, Info, Keyboard, Languages, Power, RotateCcw,
  Ruler, SunMedium, Timer, Volume2,
} from "lucide-react";

export function SettingsMenu() {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const settingsItems: MenuItem[] = [
    { key: "unit", label: t("settings.menu.unit"), icon: Ruler },
    { key: "brightness", label: t("settings.menu.brightness"), icon: SunMedium },
    { key: "sound", label: t("settings.menu.sound"), icon: Volume2 },
    { key: "xKey", label: t("settings.menu.xKey"), icon: Keyboard },
    { key: "autoTimer", label: t("settings.menu.autoTimer"), icon: Timer },
    { key: "autoOff", label: t("settings.menu.autoOff"), icon: Power },
    { key: "language", label: t("settings.menu.language"), icon: Languages },
    { key: "dynamicStrategy", label: t("settings.menu.dynamicStrategy"), icon: ChartSpline },
    { key: "factoryReset", label: t("settings.menu.factoryReset"), icon: RotateCcw },
    { key: "deviceInfo", label: t("settings.menu.deviceInfo"), icon: Info },
  ];

  const paths = [
    "/settings/unit", "/settings/brightness", "/settings/sound",
    "/settings/x-quick", "/settings/auto-timer", "/settings/auto-off",
    "/settings/language", "/settings/dynamic-strategy", "/settings/factory-reset", "/settings/update",
  ];

  const handleSelect = useCallback((idx: number) => {
    navigate(paths[idx]);
  }, [navigate]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => {
          const n = settingsItems.length;
          return (prev + (direction ?? 1) + n) % n;
        });
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < settingsItems.length) {
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
  }, [selected, handleSelect, navigate, settingsItems.length]);

  return (
    <div className="h-full screen-surface overflow-hidden">
      <MenuList
        title="设置"
        subtitle="旋转旋钮选择，按下进入"
        items={settingsItems}
        selectedIndex={selected}
        onSelect={handleSelect}
        onMove={setSelected}
        pageSize={3}
      />
    </div>
  );
}
