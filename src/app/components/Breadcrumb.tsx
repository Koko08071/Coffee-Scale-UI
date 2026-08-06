import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import { useT } from "../i18n/I18nContext";
import type { TranslationKey } from "../i18n/translations";

const crumbMap: Record<string, TranslationKey> = {
  "/": "home.title",
  "/menu": "crumb.menu",
  "/settings": "crumb.settings",
  "/settings/unit": "crumb.unit",
  "/settings/brightness": "crumb.brightness",
  "/settings/sound": "crumb.sound",
  "/settings/auto-timer": "crumb.autoTimer",
  "/settings/auto-off": "crumb.autoOff",
  "/settings/language": "crumb.language",
  "/settings/x-quick": "crumb.xKey",
  "/settings/dynamic-strategy": "crumb.dynamicStrategy",
  "/settings/factory-reset": "crumb.factoryReset",
  "/settings/update": "crumb.deviceInfo",
  "/mode-selection": "crumb.modeSelect",
  "/mode-selection/espresso": "crumb.espressoMode",
  "/mode-selection/curve": "crumb.curveGuide",
  "/mode-selection/curve/select": "crumb.selectCurve",
  "/mode-selection/curve/select/categories": "crumb.selectCurve",
  "/mode-selection/curve/select/mine": "crumb.myCurves",
  "/mode-selection/curve/select/bean": "crumb.cardCurves",
  "/mode-selection/curve/select/master": "crumb.masterCurves",
  "/curve-manage": "crumb.deleteCurve",
  "/mode-selection/free": "crumb.freeBrew",
  "/calibration": "crumb.calibration",
};

function getCrumb(path: string, t: (key: TranslationKey) => string): string {
  const entry = crumbMap[path];
  if (!entry) {
    // fallback: show last segment
    const seg = path.replace(/^\/+|\/+$/g, "").split("/").pop() || path;
    return seg;
  }
  return t(entry);
}

export function Breadcrumb() {
  const { pathname } = useLocation();
  const { t } = useT();

  const segments = pathname === "/"
    ? ["/"]
    : ["/", ...pathname.replace(/\/$/, "").split("/").filter(Boolean).reduce<string[]>((acc, seg) => {
        const prev = acc.length ? acc[acc.length - 1] : "";
        const next = prev === "/" ? `/${seg}` : `${prev}/${seg}`;
        acc.push(next);
        return acc;
      }, [])];

  const items = segments.map((seg) => getCrumb(seg, t));

  return (
    <div className="breadcrumb-bar mx-1 flex items-center gap-1.5 rounded-xl px-3 py-2 mb-2">
      {items.map((label, idx) => (
        <span key={segments[idx]} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="h-3 w-3 text-white/[0.2]" />}
          <span className={`text-[11px] ${idx === items.length - 1 ? "text-blue-300 font-medium" : "text-slate-500"} tracking-wide`}>
            {label}
          </span>
        </span>
      ))}
    </div>
  );
}
