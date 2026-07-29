import { Outlet } from "react-router";
import { SettingsProvider, useSettings } from "./SettingsContext";
import { HardwareProvider } from "./HardwareContext";
import { CoffeeScaleSimulator } from "./CoffeeScaleSimulator";
import { I18nProvider } from "../i18n/I18nContext";
import type { Lang } from "../i18n/translations";

function I18nWrapper({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const lang: Lang = settings.language === "English" ? "en" : "zh";
  return <I18nProvider lang={lang}>{children}</I18nProvider>;
}

export function Root() {
  return (
    <SettingsProvider>
      <I18nWrapper>
        <HardwareProvider>
      <div className="app-stage h-full flex items-start justify-center pt-3 pb-2 px-2 lg:pt-4 lg:pb-3 lg:px-4">
        <CoffeeScaleSimulator>
          <Outlet />
        </CoffeeScaleSimulator>
      </div>
        </HardwareProvider>
      </I18nWrapper>
    </SettingsProvider>
  );
}
