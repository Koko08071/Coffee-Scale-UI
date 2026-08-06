import { createContext, useContext, useState, ReactNode } from "react";

export type CurveSource = "推荐" | "最近" | "我的曲线" | "豆卡曲线" | "大师（官方）";

export interface BrewCurve {
  id: string;
  name: string;
  weight: string;
  duration: string;
  source: CurveSource;
  dose: number;
  ratio: number;
  grind: number;
}

interface BrewHistoryRecord {
  id: string;
  name: string;
  weight: string;
  duration: string;
  score: string;
  curveId?: string;
}

interface Settings {
  xKeyMode: "智能曲线指导" | "自由冲煮" | "意式模式";
  dynamicStrategy: "固定目标" | "动态补偿";
  autoTare: boolean;
  autoTimer: boolean;
  unit: "g" | "oz";
  brightness: number;
  autoOff: string;
  sound: boolean;
  language: string;
  bluetooth: boolean;
  lastUsedCurve: string | null;
  curves: BrewCurve[];
  brewHistory: BrewHistoryRecord[];
  espressoDose: number;
  espressoYield: number;
  freeDose: number;
  freeYield: number;
  simulationSpeed: number;
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
}

const sampleCurves: BrewCurve[] = [
  { id: "recommended-1", name: "新手推荐 · 耶加雪菲 V60", weight: "240g", duration: "02:20", source: "推荐", dose: 15, ratio: 16, grind: 5 },
  { id: "recent-1", name: "最近使用 · 花魁三段式", weight: "225g", duration: "02:10", source: "最近", dose: 15, ratio: 15, grind: 5 },
  { id: "my-1", name: "我的曲线 01", weight: "240g", duration: "02:20", source: "我的曲线", dose: 15, ratio: 16, grind: 5 },
  { id: "my-2", name: "我的曲线 02", weight: "250g", duration: "02:35", source: "我的曲线", dose: 16, ratio: 15.6, grind: 6 },
  { id: "my-3", name: "我的曲线 03", weight: "180g", duration: "01:55", source: "我的曲线", dose: 18, ratio: 10, grind: 4 },
  { id: "bean-1", name: "豆卡 · 水洗耶加", weight: "240g", duration: "02:20", source: "豆卡曲线", dose: 15, ratio: 16, grind: 5 },
  { id: "bean-2", name: "豆卡 · 日晒花魁", weight: "225g", duration: "02:10", source: "豆卡曲线", dose: 15, ratio: 15, grind: 5 },
  { id: "bean-3", name: "豆卡 · 肯尼亚 AA", weight: "255g", duration: "02:40", source: "豆卡曲线", dose: 15, ratio: 17, grind: 6 },
  { id: "master-1", name: "大师 · 4:6 法", weight: "300g", duration: "03:20", source: "大师（官方）", dose: 20, ratio: 15, grind: 6 },
  { id: "master-2", name: "大师 · 三段萃取", weight: "240g", duration: "02:25", source: "大师（官方）", dose: 15, ratio: 16, grind: 5 },
  { id: "master-3", name: "大师 · 浅烘高萃", weight: "255g", duration: "02:50", source: "大师（官方）", dose: 15, ratio: 17, grind: 7 },
];

const LANGUAGE_STORAGE_KEY = "coffee-scale-language";

const getStoredLanguage = () => {
  if (typeof window === "undefined") return "简体中文";
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "English" ? "English" : "简体中文";
};

const createInitialSettings = (): Settings => ({
  xKeyMode: "智能曲线指导",
  dynamicStrategy: "固定目标",
  autoTare: true,
  autoTimer: true,
  unit: "g",
  brightness: 2, // 索引 0-3，对应低/中/高/超高
  autoOff: "5min",
  sound: true,
  language: getStoredLanguage(),
  bluetooth: false,
  lastUsedCurve: null,
  curves: sampleCurves.map((curve) => ({ ...curve })),
  brewHistory: [],
  espressoDose: 15,
  espressoYield: 30,
  freeDose: 15,
  freeYield: 225,
  simulationSpeed: 1,
});

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(createInitialSettings);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (key === "language" && typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, String(value));
    }
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const resetSettings = () => setSettings(createInitialSettings());

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
