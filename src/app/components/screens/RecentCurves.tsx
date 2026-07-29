import { useEffect } from "react";
import { useNavigate } from "react-router";
import { MenuList } from "../MenuList";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";
import { LineChart } from "lucide-react";

export function RecentCurves() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { t } = useT();

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type } = detail as { type?: string };
      if (type === "navigate-back") navigate("/mode-selection/curve/select");
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [navigate]);

  const recentMap = new Map<string, { id: string; name: string; info: string }>();

  for (const record of settings.brewHistory) {
    if (!record.curveId) continue;
    if (recentMap.has(record.curveId)) continue;
    const curve = settings.curves.find((c) => c.id === record.curveId);
    recentMap.set(record.curveId, {
      id: record.curveId,
      name: curve?.name ?? record.name,
      info: `${record.weight} · ${record.duration}`,
    });
  }

  if (settings.lastUsedCurve && !recentMap.has(settings.lastUsedCurve)) {
    const curve = settings.curves.find((c) => c.id === settings.lastUsedCurve);
    if (curve) {
      recentMap.set(curve.id, {
        id: curve.id,
        name: curve.name,
        info: `${curve.weight} · ${curve.duration}`,
      });
    }
  }

  const items = Array.from(recentMap.values()).map((item) => ({
    label: item.name,
    icon: LineChart,
  }));

  return (
    <div className="screen-surface flex h-full flex-col text-white">
      <div className="mb-3 px-4 pt-4 text-center">
        <h1 className="text-lg font-medium">{t("curve.recent")}</h1>
      </div>

      {items.length > 0 ? (
        <MenuList
          items={items}
          onSelect={(index) => {
            const selected = Array.from(recentMap.values())[index];
            if (selected) {
              navigate(`/mode-selection/curve/prepare?curve=${selected.id}&from=recent`);
            }
          }}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center text-slate-400">
          <p>{t("manage.noRecent")}</p>
          <button
            type="button"
            onClick={() => navigate("/mode-selection/curve/select")}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
          >
            {t("manage.goSelect")}
          </button>
        </div>
      )}
    </div>
  );
}
