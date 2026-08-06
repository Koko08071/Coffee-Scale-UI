import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useSettings } from "../SettingsContext";
import { MenuList } from "../MenuList";
import { useT } from "../../i18n/I18nContext";

export function SmartModeSelect() {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "navigate-back") navigate("/settings");
      else if (type === "rotary-turn") setSelected((value) => (value + (direction ?? 1) + 2) % 2);
      else if (type === "knob-single-click") updateSetting("dynamicStrategy", options[selected].label as typeof settings.dynamicStrategy);
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [navigate, selected, settings.dynamicStrategy, updateSetting]);

  const options = [
    { label: t("curve.fixedTarget"), info: t("curve.fixedDesc") },
    { label: t("curve.dynamicComp"), info: t("curve.compDesc") },
  ] as const;

  return (
    <div className="screen-surface h-full overflow-hidden pt-4 text-white">
      <MenuList
        title={t("crumb.dynamicStrategy")}
        items={options.map((option) => ({
          label: option.label,
          info: settings.dynamicStrategy === option.label ? t("common.current") : option.info,
        }))}
        selectedIndex={selected}
        onSelect={(index) => { setSelected(index); updateSetting("dynamicStrategy", options[index].label as typeof settings.dynamicStrategy); }}
        onMove={setSelected}
        pageSize={3}
      />
    </div>
  );
}
