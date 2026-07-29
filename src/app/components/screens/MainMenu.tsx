import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useT } from "../../i18n/I18nContext";
import { ChevronRight, LayoutGrid, Settings } from "lucide-react";

function CalibrationTargetCheck({
  className,
  strokeWidth = 1.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
      <path d="m8.5 12.25 2.15 2.15 4.85-5" />
    </svg>
  );
}

export function MainMenu() {
  const navigate = useNavigate();
  const { t } = useT();
  const [selected, setSelected] = useState(0);

  const menuItems = [
    { key: "settings", label: t("menu.settings"), icon: Settings },
    { key: "mode", label: t("menu.modeSelect"), icon: LayoutGrid },
    { key: "calibration", label: t("menu.calibration"), icon: CalibrationTargetCheck },
  ];

  const paths = ["/settings", "/mode-selection", "/calibration"];

  const handleSelect = useCallback((idx: number) => {
    navigate(paths[idx]);
  }, [navigate]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const { type, direction } = detail as { type?: string; direction?: number };
      if (type === "rotary-turn") {
        setSelected((prev) => {
          const n = menuItems.length;
          const next = (prev + (direction ?? 1) + n) % n;
          return next;
        });
      } else if (type === "knob-single-click") {
        if (selected >= 0 && selected < menuItems.length) {
          handleSelect(selected);
        }
      } else if (type === "navigate-back") {
        navigate("/");
      }
    };
    window.addEventListener("simulator-action", handleAction);
    window.addEventListener("hardware-action", handleAction);
    return () => {
      window.removeEventListener("simulator-action", handleAction);
      window.removeEventListener("hardware-action", handleAction);
    };
  }, [selected, handleSelect, navigate, menuItems.length]);

  return (
    <div className="screen-surface flex h-full flex-col overflow-hidden px-3 pb-3 pt-2 text-[#F5F7FA]">
      <header className="flex h-10 flex-none items-center justify-center">
        <h1 className="text-[17px] font-semibold tracking-[-0.025em]">{t("menu.title")}</h1>
      </header>

      <div className="mt-2 grid min-h-0 flex-1 grid-rows-3 gap-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isSelected = selected === index;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleSelect(index)}
              className={`menu-row group relative flex min-h-0 w-full items-center gap-3 overflow-hidden px-3 text-left ${isSelected ? "is-selected" : ""}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border transition-all ${
                isSelected
                  ? "border-[#43C7FF]/30 bg-[#2F6BFF]/20 text-[#C7E3FF] shadow-[0_0_18px_rgba(47,107,255,.16)]"
                  : "border-white/[0.07] bg-white/[0.025] text-[#8291A6]"
              }`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
              </span>

              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[15px] font-medium tracking-wide ${isSelected ? "text-white" : "text-[#D8E0EA]"}`}>{item.label}</span>
              </span>

              <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${isSelected ? "translate-x-0.5 text-[#43C7FF]" : "text-[#40516A]"}`} strokeWidth={1.5} />
            </button>
          );
        })}
      </div>

    </div>
  );
}
