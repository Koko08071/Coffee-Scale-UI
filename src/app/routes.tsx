import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { HomeScreen } from "./components/screens/HomeScreen";
import { MainMenu } from "./components/screens/MainMenu";
import { SettingsMenu } from "./components/screens/SettingsMenu";
import { XKeySettings } from "./components/screens/XKeySettings";
import { SmartModeSelect } from "./components/screens/SmartModeSelect";
import { ManageCurves } from "./components/screens/ManageCurves";
import { ModeSelection } from "./components/screens/ModeSelection";
import { CurveBrewingMode } from "./components/screens/CurveBrewingMode";
import { RecentCurves } from "./components/screens/RecentCurves";
import { ReplicateCurve } from "./components/screens/ReplicateCurve";
import { FreeBrewing } from "./components/screens/FreeBrewing";
import { FreePreparation } from "./components/screens/FreePreparation";
import { EspressoMode } from "./components/screens/EspressoMode";
import { EspressoPreparation } from "./components/screens/EspressoPreparation";
import { OneKeyCalibration } from "./components/screens/OneKeyCalibration";
import { NotFound } from "./components/screens/NotFound";
import { CurveSelect } from "./components/screens/CurveSelect";
import { CurvePreparation } from "./components/screens/CurvePreparation";
import { CurveBeanWeighing, EspressoBeanWeighing } from "./components/screens/CurveBeanWeighing";
import { SimpleSettings } from "./components/screens/SimpleSettings";
import { SoftwareUpdate } from "./components/screens/SoftwareUpdate";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomeScreen },
      { path: "menu", Component: MainMenu },
      { path: "settings", Component: SettingsMenu },
      { path: "settings/bluetooth", Component: SimpleSettings },
      { path: "settings/update", Component: SoftwareUpdate },
      { path: "settings/language", Component: SimpleSettings },
      { path: "settings/unit", Component: SimpleSettings },
      { path: "settings/brightness", Component: SimpleSettings },
      { path: "settings/auto-off", Component: SimpleSettings },
      { path: "settings/sound", Component: SimpleSettings },
      { path: "settings/auto-timer", Component: SimpleSettings },
      { path: "settings/factory-reset", Component: SimpleSettings },
      { path: "settings/dynamic-strategy", Component: SmartModeSelect },
      { path: "settings/x-quick", Component: XKeySettings },
      { path: "mode-selection", Component: ModeSelection },
      { path: "mode-selection/curve", Component: CurveBrewingMode },
      { path: "mode-selection/curve/recent", Component: RecentCurves },
      { path: "mode-selection/curve/select", Component: CurveSelect },
      { path: "mode-selection/curve/select/:category", Component: CurveSelect },
      { path: "mode-selection/curve/select/:category/manage", Component: ManageCurves },
      { path: "mode-selection/curve/prepare", Component: CurvePreparation },
      { path: "mode-selection/curve/weigh", Component: CurveBeanWeighing },
      { path: "mode-selection/curve/replicate", Component: ReplicateCurve },
      { path: "mode-selection/free", Component: FreePreparation },
      { path: "mode-selection/free/brewing", Component: FreeBrewing },
      { path: "mode-selection/espresso", Component: EspressoPreparation },
      { path: "mode-selection/espresso/weigh", Component: EspressoBeanWeighing },
      { path: "mode-selection/espresso/brewing", Component: EspressoMode },
      { path: "calibration", Component: OneKeyCalibration },
      { path: "*", Component: NotFound },
    ],
  },
]);
