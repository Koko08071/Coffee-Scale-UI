import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CurveSource, useSettings, type BrewCurve } from "../SettingsContext";
import { MenuList, MenuItem } from "../MenuList";
import { RemoveCurveDialog, type RemoveCurveChoice } from "../RemoveCurveDialog";
import { useT } from "../../i18n/I18nContext";
import { localizeCurveName } from "../../i18n/curveNames";
import { Archive, Layers, Award, Clock3, Compass, List, Trash2, AlertTriangle, LineChart } from "lucide-react";

type CategoryDef = { slug: string; label: string; source: CurveSource; icon: typeof Archive };

function useCategories() {
  const { t } = useT();
  return useMemo<CategoryDef[]>(
    () => [
      { slug: "mine", label: t("manage.myCurves"), source: "我的曲线", icon: Archive },
      { slug: "bean", label: t("manage.cardCurves"), source: "豆卡曲线", icon: Layers },
      { slug: "master", label: t("manage.masterCurves"), source: "大师（官方）", icon: Award },
    ],
    [t]
  );
}

function RootCurveSelect({ recommendedId }: { recommendedId: string }) {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const items: MenuItem[] = useMemo(
    () => [
      { key: "recommended", label: t("curve.recommended"), icon: Compass },
      { key: "recent", label: t("curve.recent"), icon: Clock3 },
      { key: "select-curve", label: t("curve.selectCurve"), icon: List },
    ],
    [t]
  );
  const paths = useMemo(
    () => [`/mode-selection/curve/prepare?curve=${recommendedId}&from=recommended`, "/mode-selection/curve/recent", "/mode-selection/curve/select/categories"],
    [recommendedId]
  );

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => ((prev + (direction ?? 1) + items.length) % items.length));
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < paths.length) navigate(paths[selected]);
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
  }, [items.length, navigate, paths, selected]);

  return (
    <div className="h-full screen-surface">
      <MenuList title={t("curve.titleGuide")} subtitle={t("curve.selectStartHint")} items={items} selectedIndex={selected} onSelect={(idx) => navigate(paths[idx])} onMove={setSelected} pageSize={3} />
    </div>
  );
}

function CategoryCurveSelect({ categories }: { categories: CategoryDef[] }) {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const items: MenuItem[] = useMemo(
    () =>
      categories.map((item) => ({
        key: item.slug,
        label: item.label,
        icon: item.icon as unknown as React.ComponentType<{ className?: string }>,
      })),
    [categories]
  );
  const paths = useMemo(() => categories.map((item) => `/mode-selection/curve/select/${item.slug}`), [categories]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => ((prev + (direction ?? 1) + items.length) % items.length));
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < paths.length) navigate(paths[selected]);
      } else if (type === "navigate-back") {
        navigate("/mode-selection/curve/select");
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [items.length, navigate, paths, selected]);

  return (
    <div className="h-full screen-surface">
      <MenuList title={t("curve.selectCurve")} subtitle={t("curve.selectCategoryHint")} items={items} selectedIndex={selected} onSelect={(idx) => navigate(paths[idx])} onMove={setSelected} pageSize={3} />
    </div>
  );
}

function CurveListSelect({ category }: { category: CategoryDef }) {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { t, lang } = useT();
  const [selected, setSelected] = useState(0);
  const [removeMode, setRemoveMode] = useState(false);
  const [pendingCurveId, setPendingCurveId] = useState<string | null>(null);
  const [removeChoice, setRemoveChoice] = useState<RemoveCurveChoice>("cancel");

  const curves = useMemo(() => settings.curves.filter((c) => c.source === category.source), [settings.curves, category.source]);
  const pendingCurve = useMemo(() => curves.find((curve) => curve.id === pendingCurveId) ?? null, [curves, pendingCurveId]);

  const items: MenuItem[] = useMemo(() => {
    if (removeMode) {
      return curves.map((c) => ({
        key: c.id,
        label: localizeCurveName(c, lang, t),
        icon: LineChart,
        rightIcon: Trash2,
        rightClassName: "text-red-500",
      }));
    }
    if (curves.length === 0) {
      return [];
    }
    const curveItems: MenuItem[] = curves.map((c) => ({
      key: c.id,
      label: localizeCurveName(c, lang, t),
      icon: LineChart,
    }));
    const removeItem: MenuItem = {
      key: "remove",
      label: t("curve.removeCurve"),
      subtitle: t("curve.removeCurveHint"),
      icon: AlertTriangle,
      danger: true,
    };
    return [...curveItems, removeItem];
  }, [curves, lang, removeMode, t]);

  const requestCurveRemoval = useCallback((idx: number) => {
    if (idx < 0 || idx >= curves.length) return;
    setPendingCurveId(curves[idx].id);
    setRemoveChoice("cancel");
  }, [curves]);

  const cancelCurveRemoval = useCallback(() => {
    setPendingCurveId(null);
    setRemoveChoice("cancel");
  }, []);

  const confirmCurveRemoval = useCallback(() => {
    if (!pendingCurveId) return;
    updateSetting("curves", settings.curves.filter((curve) => curve.id !== pendingCurveId));
    setPendingCurveId(null);
    setRemoveChoice("cancel");
    if (curves.length <= 1) {
      setRemoveMode(false);
      setSelected(-1);
    } else {
      setSelected((current) => Math.min(current, curves.length - 2));
    }
  }, [curves.length, pendingCurveId, settings.curves, updateSetting]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (removeMode) {
        requestCurveRemoval(idx);
        return;
      }
      if (idx < curves.length) {
        updateSetting("lastUsedCurve", curves[idx].id);
        navigate(`/mode-selection/curve/prepare?curve=${curves[idx].id}&from=${category.slug}`);
      } else {
        setRemoveMode(true);
        setSelected(0);
      }
    },
    [category.slug, curves, navigate, removeMode, requestCurveRemoval, updateSetting]
  );

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (pendingCurve) {
        if (type === "rotary-turn") {
          setRemoveChoice((current) => (current === "cancel" ? "remove" : "cancel"));
        } else if (type === "knob-single-click") {
          if (removeChoice === "remove") confirmCurveRemoval();
          else cancelCurveRemoval();
        } else if (type === "navigate-back") {
          cancelCurveRemoval();
        }
        return;
      }
      if (type === "rotary-turn") {
        setSelected((prev) => ((prev + (direction ?? 1) + items.length) % items.length));
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < items.length) handleSelect(selected);
      } else if (type === "navigate-back") {
        if (removeMode) {
          setRemoveMode(false);
          setSelected(-1);
        } else {
          navigate("/mode-selection/curve/select/categories");
        }
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [cancelCurveRemoval, confirmCurveRemoval, handleSelect, items.length, navigate, pendingCurve, removeChoice, removeMode, selected]);

  const subtitle = removeMode ? t("curve.removeModeHint") : curves.length > 0 ? t("curve.selectItemHint") : t("curve.emptyCurves");

  return (
    <div className="h-full screen-surface overflow-hidden">
      <MenuList title={category.label} subtitle={subtitle} items={items} selectedIndex={selected} onSelect={handleSelect} onMove={setSelected} pageSize={3} />
      <RemoveCurveDialog
        open={Boolean(pendingCurve)}
        curveName={pendingCurve ? localizeCurveName(pendingCurve, lang, t) : ""}
        selectedChoice={removeChoice}
        onSelectChoice={setRemoveChoice}
        onCancel={cancelCurveRemoval}
        onConfirm={confirmCurveRemoval}
      />
    </div>
  );
}

export function CurveSelect() {
  const { category } = useParams();
  const { settings } = useSettings();
  const categories = useCategories();

  const recommended = useMemo(() => settings.curves.find((curve) => curve.source === "推荐") ?? settings.curves[0], [settings.curves]);

  if (!category) {
    return <RootCurveSelect recommendedId={recommended?.id ?? ""} />;
  }

  if (category === "categories") {
    return <CategoryCurveSelect categories={categories} />;
  }

  const selectedCategory = categories.find((item) => item.slug === category);
  if (!selectedCategory) return null;

  return <CurveListSelect category={selectedCategory} />;
}
