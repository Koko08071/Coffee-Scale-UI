import { ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import { useT } from "../i18n/I18nContext";

type CrumbLabel = string;
type CrumbResolver = (t: (key: string) => string) => CrumbLabel;

const crumbMap: Record<string, string | CrumbResolver> = {
  "/": "主页",
  "/menu": "主菜单",
  "/settings": "设置",
  "/settings/unit": "设置 / 单位",
  "/settings/brightness": "设置 / 亮度",
  "/settings/sound": "设置 / 声音",
  "/settings/auto-timer": "设置 / 自动计时",
  "/settings/auto-off": "设置 / 自动关机",
  "/settings/language": "设置 / 语言",
  "/settings/x-quick": "设置 / X快捷启动",
  "/settings/dynamic-strategy": "设置 / 动态策略",
  "/settings/factory-reset": "设置 / 恢复出厂",
  "/settings/update": "设置 / 设备信息",
  "/mode-selection": "模式选择",
  "/mode-selection/espresso": "意式模式",
  "/mode-selection/curve": "曲线指导",
  "/mode-selection/curve/select": "选择曲线",
  "/mode-selection/curve/select/categories": "选择曲线",
  "/mode-selection/curve/select/mine": "我的曲线",
  "/mode-selection/curve/select/bean": "豆卡曲线",
  "/mode-selection/curve/select/master": "大师曲线",
  "/curve-manage": (t) => t("crumb.deleteCurve"),
  "/mode-selection/free": "自由冲煮",
  "/calibration": "校准",
};

function getCrumb(path: string, t: (key: string) => string): string {
  const entry = crumbMap[path];
  if (!entry) {
    // fallback: show last segment
    const seg = path.replace(/^\/+|\/+$/g, "").split("/").pop() || path;
    return seg;
  }
  return typeof entry === "function" ? entry(t) : entry;
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
