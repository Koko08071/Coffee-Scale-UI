import { RefreshCcw, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useSettings } from "../SettingsContext";
import { useHardware } from "../HardwareContext";
import { MenuList } from "../MenuList";
import { useT } from "../../i18n/I18nContext";

type SettingConfig = {
  title: string;
  settingKey?: "unit" | "autoOff" | "language";
  options?: string[];
  message?: string;
};

export function SimpleSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { restart } = useHardware();
  const { t } = useT();
  const [selected, setSelected] = useState(-1);

  const configs: Record<string, SettingConfig> = {
    "/settings/language": { title: t("crumb.language"), settingKey: "language", options: [t("lang.zh"), "English"] },
    "/settings/unit": { title: t("crumb.unit"), settingKey: "unit", options: ["g", "oz"] },
    "/settings/auto-off": { title: t("settings.menu.autoOff"), settingKey: "autoOff", options: ["1min", "5min", "10min", "30min", "Never"] },
    "/settings/factory-reset": { title: t("settings.menu.factoryReset"), message: t("settings.menu.resetHint") },
  };

  const BRIGHTNESS_LEVELS = [
    { label: t("brightness.low"), pos: 0, value: 25 },
    { label: t("brightness.medium"), pos: 1 / 3, value: 50 },
    { label: t("brightness.high"), pos: 2 / 3, value: 75 },
    { label: t("brightness.ultra"), pos: 1, value: 100 },
  ];

  const config = configs[location.pathname] ?? { title: t("settings.menu.settings"), message: "此功能将在硬件联调后开放" };
  const currentValue = config.settingKey ? settings[config.settingKey] : undefined;

  useEffect(() => {
    if (location.pathname === "/settings/factory-reset") {
      setSelected(0);
      return;
    }
    const index = config.options?.findIndex((option) => option === currentValue) ?? -1;
    setSelected(index);
  }, [location.pathname]);

  useEffect(() => {
    const handleBack = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "navigate-back") navigate("/settings");
    };
    window.addEventListener("simulator-action", handleBack);
    window.addEventListener("hardware-action", handleBack);
    return () => {
      window.removeEventListener("simulator-action", handleBack);
      window.removeEventListener("hardware-action", handleBack);
    };
  }, [navigate]);

  useEffect(() => {
    const handleHardware = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.type === "rotary-turn") {
        if (location.pathname === "/settings/brightness") {
          updateSetting("brightness", Math.max(0, Math.min(3, settings.brightness + detail.direction)));
        } else if (location.pathname === "/settings/factory-reset") {
          setSelected((value) => (value + detail.direction + 2) % 2);
        } else if (config.options?.length) {
          setSelected((value) => (value + detail.direction + config.options!.length) % config.options!.length);
        }
        return;
      }
      if (detail?.type !== "knob-single-click") return;
      if (location.pathname === "/settings/factory-reset") {
        if (selected === 0) navigate("/settings");
        else { resetSettings(); restart(); }
      } else if (config.options?.length && config.settingKey && selected >= 0) {
        updateSetting(config.settingKey, config.options[selected] as never);
      } else if (location.pathname === "/settings/sound") updateSetting("sound", !settings.sound);
      else if (location.pathname === "/settings/auto-timer") updateSetting("autoTimer", !settings.autoTimer);
      else if (location.pathname === "/settings/bluetooth") updateSetting("bluetooth", !settings.bluetooth);
    };
    window.addEventListener("hardware-action", handleHardware);
    return () => window.removeEventListener("hardware-action", handleHardware);
  }, [config.options, config.settingKey, location.pathname, selected, settings.bluetooth, settings.brightness, settings.sound, settings.autoTimer, updateSetting]);

  const handleBrightnessWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = Math.max(0, Math.min(3, settings.brightness + (e.deltaY > 0 ? -1 : 1)));
      updateSetting("brightness", next);
    },
    [settings.brightness, updateSetting],
  );

  if (location.pathname === "/settings/sound") {
    return (
      <div className="screen-surface flex h-full flex-col items-center justify-center p-5 text-center">
        <div className="text-[15px] font-medium text-white tracking-wide">{t("settings.menu.sound")}</div>
        <button
          type="button"
          onClick={() => updateSetting("sound", !settings.sound)}
          className={`relative mt-6 inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.sound ? "bg-blue-500 shadow-[0_0_16px_rgba(47,107,255,.35)]" : "bg-slate-600"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.sound ? "translate-x-6" : "translate-x-1"}`} />
        </button>
        <div className="mt-3 text-[11px] text-slate-400">{settings.sound ? t("settings.menu.soundOn") : t("settings.menu.soundOff")}</div>
        <p className="mt-3 text-[10px] text-slate-500 tracking-wide">{t("settings.menu.overloadNotAffected")}</p>
      </div>
    );
  }

  if (location.pathname === "/settings/auto-timer") {
    return (
      <div className="screen-surface flex h-full flex-col items-center justify-center p-5 text-center">
        <div className="text-[15px] font-medium text-white tracking-wide">{t("settings.menu.autoTimer")}</div>
        <button
          type="button"
          onClick={() => updateSetting("autoTimer", !settings.autoTimer)}
          className={`relative mt-6 inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.autoTimer ? "bg-blue-500 shadow-[0_0_16px_rgba(47,107,255,.35)]" : "bg-slate-600"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.autoTimer ? "translate-x-6" : "translate-x-1"}`} />
        </button>
        <div className="mt-3 text-[11px] text-slate-400">{settings.autoTimer ? t("settings.menu.autoTimerOn") : t("settings.menu.autoTimerOff")}</div>
        <p className="mt-3 text-[10px] text-slate-500 tracking-wide">{t("settings.menu.autoTimerDesc")}</p>
      </div>
    );
  }

  if (location.pathname === "/settings/factory-reset") {
    return (
      <div className="screen-surface flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-400/40 bg-amber-400/[0.08] backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,.12)]">
            <RefreshCcw className="h-9 w-9 text-amber-300" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-[17px] font-medium text-white tracking-tight">{t("settings.menu.factoryReset")}</h2>
          <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-slate-400">
            {t("settings.menu.factoryResetWarn")}
          </p>
        </div>
        <div className="flex gap-3 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className={`linear-secondary flex-1 py-2.5 text-[13px] transition-all ${selected === 0 ? "ring-2 ring-blue-300" : ""}`}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => { resetSettings(); restart(); }}
            className={`flex-1 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(251,191,36,.25)] active:scale-[0.97] transition-all ${selected === 1 ? "ring-2 ring-white/60" : ""}`}
          >
            {t("settings.menu.confirmReset")}
          </button>
        </div>
      </div>
    );
  }

  if (location.pathname === "/settings/bluetooth") {
    const connected = settings.bluetooth;
    const toggle = () => updateSetting("bluetooth", !settings.bluetooth);
    return (
      <div className="screen-surface flex h-full flex-col items-center justify-center p-5 text-center">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 backdrop-blur-xl transition-all ${connected ? "border-blue-300/50 bg-blue-500/[0.1] shadow-[0_0_34px_rgba(47,107,255,.15)]" : "border-white/[0.08] bg-white/[0.03]"}`}>
          <span className={`text-2xl transition-colors ${connected ? "text-blue-300" : "text-slate-500"}`}>ᛒ</span>
        </div>
        <div className="mt-4 text-[15px] font-medium text-white">{connected ? t("settings.menu.connected") : t("settings.menu.disconnected")}</div>
        {!connected && <div className="mt-1 font-mono text-xs tracking-[0.2em] text-blue-300">{t("settings.menu.pairCode")}</div>}
        <button type="button" onClick={toggle} className="linear-primary mt-6 px-6 py-2.5 text-[13px]">
          {connected ? t("settings.menu.disconnect") : t("settings.menu.connect")}
        </button>
        <p className="mt-3 text-[10px] text-slate-500 tracking-wide">{t("settings.menu.tapHint")}</p>
      </div>
    );
  }

  if (location.pathname === "/settings/brightness") {
    const index = settings.brightness;
    const level = BRIGHTNESS_LEVELS[index];
    const fillPercent = level.pos * 100;

    return (
      <div className="screen-surface flex h-full flex-col items-center justify-center px-8">
        <Sun className="h-10 w-10 text-amber-300 mb-6" strokeWidth={1.5} />

        <div className="w-full max-w-[240px]" onWheel={handleBrightnessWheel}>
          <div className="relative h-3 rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 shadow-[0_0_12px_rgba(251,191,36,.4)] transition-all duration-200"
              style={{ width: `${fillPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-white border-2 border-amber-400 shadow-lg shadow-amber-400/20 transition-all duration-200"
              style={{ left: `${fillPercent}%` }}
            />
          </div>
          <div className="relative mt-2 h-4">
            {BRIGHTNESS_LEVELS.map((l, i) => (
              <span key={l.label} className="absolute top-0 -translate-x-1/2 text-[10px] transition-colors" style={{ left: `${l.pos * 100}%` }}>
                <span className={i <= index ? "text-amber-300" : "text-slate-600"}>{l.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 text-[13px] text-slate-400">
          {t("common.current")}：<span className="text-amber-200 font-medium">{level.label} · {level.value}%</span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500 tracking-wide">{t("settings.menu.brightnessAdj")}</p>
      </div>
    );
  }

  if (!config.options || !config.settingKey) {
    return (
      <div className="screen-surface flex h-full flex-col items-center justify-center p-6 text-center">
        <RefreshCcw className="h-9 w-9 text-blue-300/80" strokeWidth={1.5} />
        <h2 className="mt-4 text-[17px] font-medium text-white tracking-tight">{config.title}</h2>
        <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-slate-400">{config.message}</p>
      </div>
    );
  }

  return (
    <div className="screen-surface h-full overflow-hidden pt-4">
      <MenuList
        title={config.title}
        items={config.options.map((option) => ({ label: option, info: currentValue === option ? t("common.current") : undefined }))}
        selectedIndex={selected}
        onSelect={(idx) => { setSelected(idx); const opt = config.options![idx]; updateSetting(config.settingKey!, opt as never); }}
        onMove={setSelected}
        pageSize={3}
      />
    </div>
  );
}
