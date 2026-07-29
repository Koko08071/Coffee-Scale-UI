import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { MenuList } from "../MenuList";
import { useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";
import { LineChart } from "lucide-react";

export function RecentCurves() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

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

  const recentItems = Array.from(recentMap.values());
  const items = recentItems.map((item) => ({
    label: item.name,
    icon: LineChart,
  }));

  const handleSelect = (index: number) => {
    const curve = recentItems[index];
    if (curve) navigate(`/mode-selection/curve/prepare?curve=${curve.id}&from=recent`);
  };

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "navigate-back") {
        navigate("/mode-selection/curve/select");
      } else if (type === "rotary-turn" && items.length > 0) {
        setSelected((value) => (value + (direction ?? 1) + items.length) % items.length);
      } else if (type === "knob-single-click") {
        handleSelect(selected);
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [items.length, navigate, selected]);

  return (
    <div className="screen-surface flex h-full flex-col text-white">
      {items.length > 0 ? (
        <MenuList
          title={t("curve.recent")}
          items={items}
          selectedIndex={selected}
          onSelect={handleSelect}
          onMove={setSelected}
          pageSize={3}
        />
      ) : (
        <>
          <div className="px-4 pt-4 text-center">
            <h1 className="text-lg font-medium">{t("curve.recent")}</h1>
          </div>
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
        </>
      )}
    </div>
  );
}
