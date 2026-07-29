import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const OUT = "C:/Users/Koko/Desktop/工作/俊辰给的ui操作器/Smart Coffee Scale UI Design/咖啡MasterScale_UI交互逻辑优化方案_可编辑.pptx";
const PREVIEW = "C:/Users/Koko/Desktop/工作/俊辰给的ui操作器/Smart Coffee Scale UI Design/ppt_ui_logic_build/rendered";

const W = 1280;
const H = 720;
const C = {
  bg: "#050A12",
  panel: "#0D1624",
  panel2: "#111D2E",
  blue: "#2F6BFF",
  ice: "#43C7FF",
  white: "#F5F7FA",
  soft: "#F2F5F8",
  muted: "#8291A6",
  dim: "#59687D",
  green: "#27C6A3",
  amber: "#FFC247",
  red: "#FF4D5E",
  line: "#21334C",
};

const deck = Presentation.create({ slideSize: { width: W, height: H } });

function rect(slide, x, y, w, h, fill, radius = "rounded-xl", line = fill, lineWidth = 0, name) {
  return slide.shapes.add({
    geometry: "roundRect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: lineWidth },
    borderRadius: radius,
  });
}

function line(slide, x, y, w, h, color = C.line, width = 2, name) {
  return slide.shapes.add({
    geometry: "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function text(slide, value, x, y, w, h, size = 20, color = C.white, bold = false, align = "left", name) {
  const s = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  s.text = value;
  s.text.style = { fontSize: size, color, bold, alignment: align, fontFamily: "Microsoft YaHei" };
  return s;
}

function title(slide, eyebrow, heading, page) {
  text(slide, eyebrow.toUpperCase(), 64, 38, 600, 24, 13, C.ice, true, "left", `eyebrow-${page}`);
  text(slide, heading, 64, 68, 1120, 54, 38, C.white, true, "left", `title-${page}`);
  text(slide, String(page).padStart(2, "0"), 1172, 44, 44, 24, 13, C.dim, true, "right", `page-${page}`);
  line(slide, 64, 126, 1152, 2, C.line, 0, `title-rule-${page}`);
}

function footer(slide, label = "MASTER SCALE · UI INTERACTION SPEC") {
  text(slide, label, 64, 684, 560, 18, 11, C.dim, true);
}

function tag(slide, label, x, y, w, fill = C.panel2, color = C.ice, border = C.line) {
  rect(slide, x, y, w, 30, fill, "rounded-lg", border, 1);
  text(slide, label, x, y + 5, w, 18, 13, color, true, "center");
}

function metricCard(slide, { x, y, w, h = 104, label, value, unit = "", active = false, badge = "", sub = "" }) {
  rect(slide, x, y, w, h, active ? "#122A54" : C.panel, "rounded-xl", active ? C.ice : C.line, active ? 2 : 1);
  if (badge) tag(slide, badge, x + w - 66, y + 10, 52, badge === "实测" ? "#0B2B29" : C.panel2, badge === "实测" ? C.green : C.muted, "#1A5149");
  text(slide, label, x + 14, y + 16, w - 28, 24, 15, C.muted, false, "center");
  text(slide, value, x + 12, y + 43, w - 24, 40, 30, active ? C.ice : C.white, true, "center");
  if (unit) text(slide, unit, x + w - 40, y + 57, 28, 20, 13, C.muted, false, "left");
  if (sub) text(slide, sub, x + 12, y + h - 23, w - 24, 18, 12, active ? C.ice : C.dim, true, "center");
}

function button(slide, label, x, y, w, h, primary = false, icon = "") {
  rect(slide, x, y, w, h, primary ? C.blue : C.panel2, "rounded-xl", primary ? "#5E8BFF" : C.line, 1);
  text(slide, `${icon ? icon + "  " : ""}${label}`, x + 10, y + (h - 28) / 2, w - 20, 28, 20, primary ? C.white : "#AAB6C8", true, "center");
}

function device(slide, x, y, w, h, options = {}) {
  rect(slide, x, y, w, h, "#101B2C", "rounded-2xl", "#223550", 2, options.name || "device");
  rect(slide, x + 20, y + 18, 120, 28, "#16325A", "rounded-lg", "#275596", 1);
  text(slide, "●  SMART SCALE", x + 34, y + 24, 94, 16, 11, "#7ACBFF", true);
  rect(slide, x + 108, y + 50, w - 210, h - 82, "#030811", "rounded-xl", "#182942", 3, `${options.name || "device"}-screen`);
  tag(slide, "95%", x + w - 126, y + 18, 72, C.panel2, C.green, C.line);
  if (options.leftLabel) {
    rect(slide, x + 24, y + h / 2 - 29, 54, 54, C.panel2, "rounded-xl", C.line, 1);
    text(slide, options.leftIcon || "◷", x + 24, y + h / 2 - 20, 54, 26, 24, options.leftActive ? C.ice : C.muted, true, "center");
    text(slide, options.leftLabel, x + 10, y + h / 2 + 31, 82, 18, 11, options.leftActive ? C.ice : C.muted, true, "center");
  }
  rect(slide, x + w - 82, y + h / 2 - 82, 48, 48, C.panel2, "rounded-xl", C.line, 1);
  text(slide, "☰", x + w - 82, y + h / 2 - 72, 48, 24, 22, C.ice, true, "center");
  text(slide, "菜单 / 返回", x + w - 104, y + h / 2 - 27, 92, 16, 10, C.muted, false, "center");
  rect(slide, x + w - 100, y + h / 2 + 12, 84, 84, "#142239", "rounded-full", "#2A3D5B", 2);
  rect(slide, x + w - 84, y + h / 2 + 28, 52, 52, "#1B2D49", "rounded-full", "#3A547B", 1);
  text(slide, "↻", x + w - 84, y + h / 2 + 39, 52, 28, 23, C.soft, false, "center");
  text(slide, "旋转 · 按下", x + w - 104, y + h / 2 + 102, 92, 16, 10, C.muted, false, "center");
  return { sx: x + 108, sy: y + 50, sw: w - 210, sh: h - 82 };
}

function arrow(slide, x1, y1, x2, y2, color = C.ice) {
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  if (horizontal) {
    line(slide, Math.min(x1, x2), y1, Math.abs(x2 - x1), 2, color);
    text(slide, x2 >= x1 ? "›" : "‹", x2 - 10, y1 - 16, 20, 30, 26, color, true, "center");
  } else {
    line(slide, x1, Math.min(y1, y2), 2, Math.abs(y2 - y1), color);
    text(slide, y2 >= y1 ? "⌄" : "⌃", x1 - 10, y2 - 16, 22, 30, 22, color, true, "center");
  }
}

function note(slide, heading, body, x, y, w, color = C.ice) {
  line(slide, x, y, 4, 78, color);
  text(slide, heading, x + 18, y, w - 18, 28, 19, C.white, true);
  text(slide, body, x + 18, y + 34, w - 18, 48, 15, C.muted, false);
}

// 1 — Cover
{
  const s = deck.slides.add();
  s.background.fill = C.bg;
  text(s, "MASTER SCALE", 64, 52, 400, 24, 14, C.ice, true);
  text(s, "咖啡秤 UI 交互逻辑\n优化方案", 64, 132, 520, 126, 54, C.white, true);
  text(s, "在现有深色科技风界面上，统一参数调整、开放称重与实体按键反馈。", 64, 286, 486, 62, 21, C.muted, false);
  tag(s, "2.4 寸屏幕", 64, 382, 114);
  tag(s, "旋钮交互", 190, 382, 104);
  tag(s, "全元素可编辑", 306, 382, 132, "#102743", C.green, "#1D574F");
  const d = device(s, 628, 104, 574, 474, { leftLabel: "保存", leftIcon: "✓", leftActive: true, name: "cover-device" });
  text(s, "RECIPE SETUP", d.sx + 26, d.sy + 24, 220, 18, 12, C.muted, true);
  text(s, "曲线冲煮 · 确认配方", d.sx + 26, d.sy + 50, 320, 28, 22, C.white, true);
  metricCard(s, { x: d.sx + 26, y: d.sy + 102, w: 128, h: 104, label: "粉量", value: "15.0", unit: "g", badge: "实测" });
  metricCard(s, { x: d.sx + 166, y: d.sy + 102, w: 128, h: 104, label: "粉水比", value: "1:15.5", active: true, sub: "0.5 / 格" });
  metricCard(s, { x: d.sx + 306, y: d.sy + 102, w: 128, h: 104, label: "总水量", value: "233", unit: "g" });
  button(s, "开始准备", d.sx + 26, d.sy + 226, 210, 62, true, "▶");
  button(s, "称豆", d.sx + 250, d.sy + 226, 184, 62, false, "⚖");
  text(s, "旋钮调整粉水比 · 单击确认", d.sx + 26, d.sy + 316, 408, 22, 13, C.ice, true, "center");
  footer(s, "PRODUCT REVIEW DECK · 2026.07");
}

// 2 — Principle
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Interaction principle", "固定步骤改成状态驱动，误操作不再迫使用户重来", 2);
  text(s, "原逻辑", 76, 166, 130, 28, 20, C.red, true);
  const old = ["放滤杯", "去皮", "加咖啡", "保存"];
  old.forEach((v, i) => { rect(s, 76 + i * 164, 218, 126, 66, C.panel, "rounded-xl", i === 1 ? C.red : C.line, 1); text(s, v, 76 + i * 164, 238, 126, 24, 18, C.white, true, "center"); if (i < 3) arrow(s, 205 + i * 164, 250, 233 + i * 164, 250, C.dim); });
  note(s, "问题", "在“加咖啡”之后误按旋钮，流程状态已经前进，用户只能退出并重新进入。", 774, 211, 396, C.red);
  line(s, 64, 340, 1152, 2, C.line);
  text(s, "新逻辑", 76, 382, 130, 28, 20, C.green, true);
  rect(s, 76, 432, 430, 96, "#0B2028", "rounded-xl", "#1C655D", 2);
  text(s, "自由称重工作区", 102, 452, 260, 28, 24, C.white, true);
  text(s, "旋钮可无限次去皮 · 允许负重量 · 页面不自动跳转", 102, 492, 372, 22, 15, C.green, false);
  arrow(s, 520, 480, 598, 480, C.ice);
  rect(s, 620, 432, 248, 96, "#102743", "rounded-xl", C.blue, 2);
  text(s, "左侧键保存", 646, 452, 196, 28, 24, C.white, true, "center");
  text(s, "唯一提交动作", 646, 492, 196, 22, 15, C.ice, true, "center");
  note(s, "设计原则", "去皮是可重复的工具动作；保存才是不可逆的提交动作。", 924, 432, 268, C.green);
  text(s, "用户始终能在当前页面修正，系统只在明确保存后改变配方。", 76, 590, 1050, 34, 24, C.soft, true);
  footer(s);
}

// 3 — Hardware map
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Hardware mapping", "同一组实体按键，始终遵循“浏览—进入—调整—提交”", 3);
  const d = device(s, 350, 162, 580, 430, { leftLabel: "计时 / 保存", leftIcon: "◷", leftActive: true, name: "hardware-map" });
  text(s, "页面焦点", d.sx + 88, d.sy + 72, 196, 30, 24, C.white, true, "center");
  rect(s, d.sx + 74, d.sy + 126, 224, 72, "#102743", "rounded-xl", C.blue, 2);
  text(s, "旋钮旋转", d.sx + 98, d.sy + 140, 176, 24, 20, C.white, true, "center");
  text(s, "移动焦点 / 调整数值", d.sx + 98, d.sy + 170, 176, 18, 13, C.ice, false, "center");
  rect(s, d.sx + 74, d.sy + 220, 224, 72, C.panel, "rounded-xl", C.line, 1);
  text(s, "旋钮单击", d.sx + 98, d.sy + 234, 176, 24, 20, C.white, true, "center");
  text(s, "进入 / 确认；称重页去皮", d.sx + 98, d.sy + 264, 176, 18, 13, C.muted, false, "center");
  note(s, "右侧菜单键", "普通页面返回上一级；参数编辑中取消本次修改。", 70, 192, 250, C.ice);
  note(s, "左侧功能键", "冲煮页负责计时；称重页明确改名为“保存”。", 70, 398, 250, C.green);
  note(s, "旋钮旋转", "非编辑态移动焦点；编辑态改变当前值。", 960, 192, 246, C.blue);
  note(s, "旋钮单击", "非编辑态进入；编辑态确认；称重态随时去皮。", 960, 398, 246, C.amber);
  footer(s);
}

// 4 — Steps matrix
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Parameter rules", "步进按冲煮方式区分，不用一套刻度勉强覆盖所有场景", 4);
  const xs = [74, 356, 572, 788, 1004];
  const ws = [266, 200, 200, 200, 202];
  ["模式", "粉量", "比例", "总量", "推荐范围"].forEach((h, i) => { text(s, h, xs[i], 164, ws[i], 24, 16, C.muted, true, i ? "center" : "left"); });
  const rows = [
    { y: 204, mode: "意式模式", sub: "粉液比", dose: "0.1g / 格", ratio: "0.1 / 格", total: "0.5g / 格", range: "1:1.0–1:5.0", color: C.blue },
    { y: 316, mode: "自由冲煮", sub: "手冲", dose: "0.1g / 格", ratio: "0.5 / 格", total: "1g / 格", range: "1:8–1:20", color: C.ice },
    { y: 428, mode: "智能曲线复刻", sub: "手冲", dose: "0.1g / 格", ratio: "0.5 / 格", total: "1g / 格", range: "1:10–1:25", color: C.green },
  ];
  rows.forEach(r => {
    rect(s, 64, r.y, 1152, 88, C.panel, "rounded-xl", C.line, 1);
    line(s, 64, r.y, 6, 88, r.color);
    text(s, r.mode, 88, r.y + 17, 228, 25, 21, C.white, true);
    text(s, r.sub, 88, r.y + 51, 228, 18, 13, r.color, true);
    text(s, r.dose, xs[1], r.y + 30, ws[1], 25, 18, C.soft, true, "center");
    text(s, r.ratio, xs[2], r.y + 30, ws[2], 25, 18, r.color, true, "center");
    text(s, r.total, xs[3], r.y + 30, ws[3], 25, 18, C.soft, true, "center");
    text(s, r.range, xs[4], r.y + 30, ws[4], 25, 17, C.muted, false, "center");
  });
  rect(s, 64, 552, 1152, 90, "#0A1422", "rounded-xl", "#203855", 1);
  text(s, "联动规则", 88, 572, 120, 24, 18, C.ice, true);
  text(s, "调整粉量 → 保持比例，重算总量", 240, 572, 290, 24, 17, C.white, true);
  text(s, "调整比例 → 保持粉量，重算总量", 540, 572, 290, 24, 17, C.white, true);
  text(s, "调整总量 → 保持粉量，反算比例", 840, 572, 300, 24, 17, C.white, true);
  text(s, "快转旋钮可按 5 倍步进加速；慢转保持精细刻度。", 240, 608, 770, 20, 14, C.muted, false);
  footer(s);
}

// 5 — Hand pour UI
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Hand-pour confirmation", "手冲比例用 0.5 / 格，既保留精度又减少旋钮圈数", 5);
  const d = device(s, 58, 158, 850, 478, { leftLabel: "计时", leftIcon: "◷", name: "handpour-ui" });
  text(s, "RECIPE SETUP", d.sx + 24, d.sy + 18, 200, 18, 12, C.muted, true);
  text(s, "曲线冲煮 · 确认配方", d.sx + 24, d.sy + 44, 330, 28, 22, C.white, true);
  text(s, "新手推荐 · 耶加雪菲 V60", d.sx + 270, d.sy + 46, 224, 20, 13, C.muted, false, "right");
  metricCard(s, { x: d.sx + 24, y: d.sy + 92, w: 150, h: 108, label: "粉量", value: "15.0", unit: "g", badge: "实测" });
  metricCard(s, { x: d.sx + 188, y: d.sy + 92, w: 150, h: 108, label: "粉水比", value: "1:15.5", active: true, sub: "旋钮 ±0.5" });
  metricCard(s, { x: d.sx + 352, y: d.sy + 92, w: 150, h: 108, label: "总水量", value: "233", unit: "g" });
  button(s, "开始准备", d.sx + 24, d.sy + 222, 244, 68, true, "▶");
  button(s, "称豆", d.sx + 282, d.sy + 222, 220, 68, false, "⚖");
  rect(s, d.sx + 24, d.sy + 310, 478, 46, "#0B1C32", "rounded-xl", "#1B4670", 1);
  text(s, "正在调整粉水比 · 单击旋钮确认", d.sx + 42, d.sy + 324, 442, 20, 14, C.ice, true);
  note(s, "为什么不是 1 / 格", "15g 粉从 1:15 跳到 1:16，水量一次变化 15g；0.5 / 格更适合微调。", 948, 190, 276, C.ice);
  note(s, "保持当前视觉", "三张参数卡、主次按钮和底部提示不变，只强化编辑态高亮和步进提示。", 948, 354, 276, C.blue);
  note(s, "参数来源可见", "粉量保留“配方 / 实测 / 手动”标签，避免用户忘记当前数值从哪里来。", 948, 512, 276, C.green);
  footer(s);
}

// 6 — Espresso UI
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Espresso confirmation", "意式比例必须细到 0.1 / 格，一格就能改变萃取目标", 6);
  const d = device(s, 58, 158, 850, 478, { leftLabel: "计时", leftIcon: "◷", name: "espresso-ui" });
  text(s, "ESPRESSO RECIPE", d.sx + 24, d.sy + 18, 210, 18, 12, C.muted, true);
  text(s, "意式萃取 · 确认配方", d.sx + 24, d.sy + 44, 330, 28, 22, C.white, true);
  text(s, "1:2.1 · 31.5g", d.sx + 320, d.sy + 46, 182, 20, 13, C.muted, false, "right");
  metricCard(s, { x: d.sx + 24, y: d.sy + 92, w: 150, h: 108, label: "粉量", value: "15.0", unit: "g", badge: "实测" });
  metricCard(s, { x: d.sx + 188, y: d.sy + 92, w: 150, h: 108, label: "粉液比", value: "1:2.1", active: true, sub: "旋钮 ±0.1" });
  metricCard(s, { x: d.sx + 352, y: d.sy + 92, w: 150, h: 108, label: "总重量", value: "31.5", unit: "g" });
  button(s, "开始萃取", d.sx + 24, d.sy + 222, 244, 68, true, "▶");
  button(s, "称豆", d.sx + 282, d.sy + 222, 220, 68, false, "⚖");
  rect(s, d.sx + 24, d.sy + 310, 478, 46, "#0B1C32", "rounded-xl", "#1B4670", 1);
  text(s, "正在调整粉液比 · 单击旋钮确认", d.sx + 42, d.sy + 324, 442, 20, 14, C.ice, true);
  note(s, "一格的实际影响", "15g 粉从 1:2.0 调到 1:2.1，总重量从 30.0g 变为 31.5g。", 948, 190, 276, C.ice);
  note(s, "避免 1 / 格", "如果一次跳到 1:3.0，目标重量会直接变为 45g，无法用于意式精调。", 948, 354, 276, C.red);
  note(s, "与手冲保持一致", "页面结构、焦点逻辑和实体按键一致，只让参数步进随模式变化。", 948, 512, 276, C.green);
  footer(s);
}

// 7 — Weighing UI
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Open weighing workspace", "称豆页不规定先后顺序，只判断当前重量能不能保存", 7);
  const d = device(s, 58, 158, 850, 478, { leftLabel: "保存", leftIcon: "✓", leftActive: true, name: "weigh-ui" });
  text(s, "COFFEE MEASURE", d.sx + 24, d.sy + 18, 200, 18, 12, C.muted, true);
  text(s, "称量咖啡", d.sx + 24, d.sy + 44, 200, 28, 22, C.white, true);
  tag(s, "已稳定", d.sx + 402, d.sy + 20, 82, "#0B2B29", C.green, "#1A5149");
  rect(s, d.sx + 24, d.sy + 92, 478, 188, "#0B1C32", "rounded-xl", "#22578C", 1);
  text(s, "⚖", d.sx + 218, d.sy + 110, 90, 34, 28, C.ice, true, "center");
  text(s, "19.0", d.sx + 134, d.sy + 150, 270, 66, 58, C.white, false, "center");
  text(s, "g", d.sx + 386, d.sy + 184, 30, 26, 18, C.muted);
  text(s, "●  重量稳定，可以保存", d.sx + 122, d.sy + 232, 282, 22, 15, C.green, true, "center");
  rect(s, d.sx + 24, d.sy + 296, 230, 58, "#092421", "rounded-xl", "#12665C", 1);
  text(s, "↻  旋钮：随时去皮", d.sx + 42, d.sy + 306, 194, 22, 15, C.ice, true, "center");
  text(s, "本页已去皮 2 次", d.sx + 42, d.sy + 330, 194, 16, 11, C.muted, false, "center");
  rect(s, d.sx + 270, d.sy + 296, 232, 58, "#102743", "rounded-xl", C.blue, 1);
  text(s, "保存当前稳定重量", d.sx + 286, d.sy + 306, 200, 22, 15, C.white, true, "center");
  text(s, "左侧键保存", d.sx + 286, d.sy + 330, 200, 16, 11, C.ice, true, "center");
  text(s, "未按左侧键保存前，可按需要重复去皮，不会自动跳转。", d.sx + 24, d.sy + 370, 478, 18, 12, C.muted, false, "center");
  note(s, "旋钮只做工具动作", "按多少次都只更新零点，不推进步骤、不离开页面。", 948, 190, 276, C.ice);
  note(s, "左侧键只做提交", "重量稳定且在有效范围内才保存；否则原地提示。", 948, 354, 276, C.green);
  note(s, "曲线与意式共用", "两种模式进入同一称重工作区，返回时携带“实测粉量”。", 948, 512, 276, C.blue);
  footer(s);
}

// 8 — Recovery
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Error recovery", "误去皮后仍能在原页面恢复，不需要退出再进入", 8);
  const steps = [
    { n: "01", t: "得到正确重量", v: "19.0g · 已稳定", c: C.green },
    { n: "02", t: "误按旋钮去皮", v: "显示回到 0.0g", c: C.amber },
    { n: "03", t: "取下咖啡", v: "显示 −19.0g", c: C.red },
    { n: "04", t: "再次去皮并放回", v: "恢复 19.0g", c: C.ice },
    { n: "05", t: "按左侧键保存", v: "返回确认配方页", c: C.blue },
  ];
  steps.forEach((st, i) => {
    const x = 64 + i * 234;
    rect(s, x, 216, 202, 212, C.panel, "rounded-xl", st.c, 2);
    text(s, st.n, x + 18, 234, 58, 30, 18, st.c, true);
    rect(s, x + 68, 254, 66, 66, "#09131F", "rounded-full", st.c, 2);
    text(s, i === 0 ? "✓" : i === 1 ? "↻" : i === 2 ? "−" : i === 3 ? "↺" : "→", x + 68, 268, 66, 34, 30, st.c, true, "center");
    text(s, st.t, x + 16, 342, 170, 52, 19, C.white, true, "center");
    text(s, st.v, x + 16, 398, 170, 20, 13, C.muted, false, "center");
    if (i < 4) arrow(s, x + 204, 322, x + 230, 322, C.dim);
  });
  rect(s, 64, 482, 1138, 108, "#0A1727", "rounded-xl", "#204568", 1);
  text(s, "关键反馈", 88, 508, 126, 24, 20, C.ice, true);
  text(s, "负重量不是错误，而是可恢复状态", 240, 504, 350, 28, 20, C.white, true);
  text(s, "“当前为负值，可重新放置后再次去皮”", 240, 544, 420, 22, 15, C.muted, false);
  text(s, "无效保存不退出", 722, 504, 220, 28, 20, C.white, true);
  text(s, "等待稳定或重新去皮后再按左侧键", 722, 544, 392, 22, 15, C.muted, false);
  footer(s);
}

// 9 — State language
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "State feedback", "颜色只表达状态，不让用户猜下一步该做什么", 9);
  const states = [
    { y: 168, label: "零点 / 可操作", value: "0.0g", msg: "当前为零，可自由放置或再次去皮", c: C.ice },
    { y: 258, label: "正在稳定", value: "19.0g", msg: "正在等待重量稳定", c: C.muted },
    { y: 348, label: "稳定 / 可保存", value: "19.0g", msg: "重量稳定，可以保存", c: C.green },
    { y: 438, label: "负重量 / 可恢复", value: "−19.0g", msg: "重新放置后再次去皮", c: C.amber },
    { y: 528, label: "保存被阻止", value: "0.0g", msg: "等待稳定或重新去皮", c: C.red },
  ];
  states.forEach(st => {
    rect(s, 64, st.y, 1152, 70, C.panel, "rounded-xl", C.line, 1);
    line(s, 64, st.y, 6, 70, st.c);
    text(s, st.label, 92, st.y + 21, 246, 25, 18, C.white, true);
    text(s, st.value, 392, st.y + 16, 210, 36, 28, st.c, true, "center");
    text(s, st.msg, 664, st.y + 23, 470, 22, 17, C.muted, false);
  });
  footer(s);
}

// 10 — Hand-off
{
  const s = deck.slides.add(); s.background.fill = C.bg;
  title(s, "Implementation hand-off", "原交互图只需改四处，就能形成一致、可容错的闭环", 10);
  const items = [
    { n: "01", h: "参数步进", b: "意式比例 0.1 / 格；手冲与曲线比例 0.5 / 格；粉量 0.1g / 格。", c: C.blue },
    { n: "02", h: "称豆流程", b: "删除固定步骤，改成开放称重工作区；旋钮可无限次去皮。", c: C.ice },
    { n: "03", h: "保存返回", b: "只有左侧键提交稳定重量，返回确认页并标记为“实测”。", c: C.green },
    { n: "04", h: "按键标签", b: "称重页左侧键显示“保存”；其它页面继续显示“计时”。", c: C.amber },
  ];
  items.forEach((it, i) => {
    const y = 166 + i * 106;
    text(s, it.n, 68, y + 18, 60, 28, 19, it.c, true);
    line(s, 132, y + 6, 4, 70, it.c);
    text(s, it.h, 162, y + 4, 248, 30, 23, C.white, true);
    text(s, it.b, 430, y + 8, 718, 54, 18, C.muted, false);
    if (i < items.length - 1) line(s, 162, y + 86, 986, 1, C.line);
  });
  rect(s, 64, 602, 1152, 58, "#102743", "rounded-xl", C.blue, 1);
  text(s, "验收标准：用户在任意一次误去皮后，都能留在当前页面恢复正确重量并成功保存。", 88, 619, 1104, 26, 20, C.white, true, "center");
  footer(s, "READY FOR UI REVIEW · ALL ELEMENTS EDITABLE");
}

async function writeBlob(path, blob) {
  await fs.writeFile(path, new Uint8Array(await blob.arrayBuffer()));
}

await fs.mkdir(PREVIEW, { recursive: true });
for (const [i, slide] of deck.slides.items.entries()) {
  const n = String(i + 1).padStart(2, "0");
  await writeBlob(`${PREVIEW}/slide-${n}.png`, await deck.export({ slide, format: "png", scale: 1 }));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(`${PREVIEW}/slide-${n}.layout.json`, await layout.text(), "utf8");
}
await writeBlob(`${PREVIEW}/montage.webp`, await deck.export({ format: "webp", montage: true, scale: 1 }));
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(OUT);
