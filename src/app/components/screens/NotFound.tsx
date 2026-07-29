import { useNavigate } from "react-router";
import { Home } from "lucide-react";
import { useT } from "../../i18n/I18nContext";

export function NotFound() {
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <div className="screen-surface h-full flex flex-col items-center justify-center p-6">
      <div className="text-7xl font-extralight text-slate-700 tracking-tighter">404</div>
      <div className="mt-4 text-[13px] text-slate-400 tracking-wide">{t("common.notFound")}</div>
      <button
        onClick={() => navigate("/")}
        className="linear-primary mt-8 flex items-center gap-2 px-5 py-2.5"
      >
        <Home className="h-4 w-4" />
        <span className="text-[13px]">{t("common.backHome")}</span>
      </button>
    </div>
  );
}
