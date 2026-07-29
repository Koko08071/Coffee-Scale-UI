import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MenuList } from "../MenuList";
import { CurveSource, useSettings } from "../SettingsContext";
import { useT } from "../../i18n/I18nContext";
import { showHardwareToast } from "../HardwareToast";
import { RemoveCurveDialog, type RemoveCurveChoice } from "../RemoveCurveDialog";
import { LineChart } from "lucide-react";

export function ManageCurves() {
  const navigate = useNavigate();
  const { category } = useParams();
  const { t } = useT();
  const { settings, updateSetting } = useSettings();
  const [selected, setSelected] = useState(-1);
  const [pendingCurveId, setPendingCurveId] = useState<string | null>(null);
  const [removeChoice, setRemoveChoice] = useState<RemoveCurveChoice>("cancel");

  const sources: Array<{ slug: string; label: string; source: CurveSource }> = [
    { slug: "mine", label: t("manage.myCurves"), source: "我的曲线" },
    { slug: "bean", label: t("manage.cardCurves"), source: "豆卡曲线" },
    { slug: "master", label: t("manage.masterCurves"), source: "大师（官方）" },
  ];

  const categoryInfo = sources.find((s) => s.slug === category) ?? sources[0];
  const curves = settings.curves.filter((c) => c.source === categoryInfo.source);
  const pendingCurve = settings.curves.find((curve) => curve.id === pendingCurveId) ?? null;

  const items = curves.map((c) => ({
    key: c.id,
    label: c.name,
    info: `${c.weight} · ${c.duration}`,
    icon: LineChart,
  }));

  const requestDeleteCurve = useCallback(() => {
    if (selected < 0 || selected >= curves.length) {
      showHardwareToast(t("manage.selToDelete"), "warning");
      return;
    }
    setPendingCurveId(curves[selected].id);
    setRemoveChoice("cancel");
  }, [curves, selected, t]);

  const cancelDeleteCurve = useCallback(() => {
    setPendingCurveId(null);
    setRemoveChoice("cancel");
  }, []);

  const confirmDeleteCurve = useCallback(() => {
    if (!pendingCurveId) return;
    const updated = settings.curves.filter((curve) => curve.id !== pendingCurveId);
    const remainingInCategory = updated.filter((curve) => curve.source === categoryInfo.source);
    updateSetting("curves", updated as never);
    showHardwareToast(t("manage.deleted"), "info");
    setPendingCurveId(null);
    setRemoveChoice("cancel");
    setSelected((current) => remainingInCategory.length === 0 ? -1 : Math.min(current, remainingInCategory.length - 1));
  }, [categoryInfo.source, pendingCurveId, settings.curves, t, updateSetting]);

  const goBack = () => navigate(-1);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (pendingCurve) {
        if (type === "rotary-turn") {
          setRemoveChoice((current) => (current === "cancel" ? "remove" : "cancel"));
        } else if (type === "knob-single-click") {
          if (removeChoice === "remove") confirmDeleteCurve();
          else cancelDeleteCurve();
        } else if (type === "navigate-back") {
          cancelDeleteCurve();
        }
        return;
      }
      if (type === "rotary-turn") {
        setSelected((prev) => {
          if (items.length === 0) return -1;
          return ((prev + (direction ?? 1) + items.length) % items.length);
        });
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < items.length) requestDeleteCurve();
      } else if (type === "navigate-back") {
        goBack();
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [cancelDeleteCurve, confirmDeleteCurve, items.length, navigate, pendingCurve, removeChoice, requestDeleteCurve, selected]);

  return (
    <div className="screen-surface flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <MenuList
          title={t("manage.delete")}
          subtitle={`${categoryInfo.label} · ${items.length} ${t("manage.count")}`}
          items={items}
          selectedIndex={selected}
          onSelect={() => {}}
        />
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3">
        <button type="button" onClick={goBack} className="linear-secondary flex-1 py-2.5 text-[13px]">
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={requestDeleteCurve}
          className="flex-1 rounded-xl bg-gradient-to-br from-red-500/80 to-red-700/80 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_16px_rgba(239,68,68,.2)] active:scale-[0.97] transition-all"
        >
          {t("manage.removeCurve")}
        </button>
      </div>
      <RemoveCurveDialog
        open={Boolean(pendingCurve)}
        curveName={pendingCurve?.name ?? ""}
        selectedChoice={removeChoice}
        onSelectChoice={setRemoveChoice}
        onCancel={cancelDeleteCurve}
        onConfirm={confirmDeleteCurve}
      />
    </div>
  );
}
