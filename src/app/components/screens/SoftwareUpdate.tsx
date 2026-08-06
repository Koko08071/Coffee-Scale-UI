import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useT } from "../../i18n/I18nContext";

const DEVICE_NAME = "MasterScale";
const SERIAL_NUMBER = "MS26XXXX";
const FIRMWARE_VERSION = "V1.2.0";

export function SoftwareUpdate() {
  const navigate = useNavigate();
  const { t } = useT();

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type } = detail as { type?: string };
      if (type === "navigate-back") navigate("/settings");
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [navigate]);

  return (
    <div className="screen-surface flex h-full flex-col">
      <div className="px-5 pt-6 pb-3">
        <div className="screen-kicker">{t("device.title")}</div>
      </div>

      <div className="px-5">
        <div className="linear-card grid gap-4 rounded-xl px-4 py-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 tracking-wide">{t("device.firmware")}</span>
            <span className="tabular-nums text-blue-200 font-medium">{FIRMWARE_VERSION}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 tracking-wide">{t("device.name")}</span>
            <span className="text-white font-medium">{DEVICE_NAME}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 tracking-wide">{t("device.serial")}</span>
            <span className="tabular-nums text-white font-medium">{SERIAL_NUMBER}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
