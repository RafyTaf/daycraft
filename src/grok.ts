import { useEffect, useState } from "react";

export { useState, useEffect, useRef, useMemo, useCallback, useReducer, Fragment } from "react";
export type {
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
  RefObject,
  SyntheticEvent,
} from "react";

interface TextStyle {
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

const ts = (size: number, line: number, spacing = "0"): TextStyle => ({
  fontSize: size + "px",
  lineHeight: line + "px",
  letterSpacing: spacing,
});

const font = {
  family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  heading1: ts(28, 34, "-0.01em"),
  heading2: ts(22, 28, "-0.005em"),
  heading3: ts(18, 24),
  body1: ts(16, 22),
  body2: ts(15, 21),
  subtext: ts(14, 20),
  table: ts(14, 20),
  metric: ts(40, 44, "-0.02em"),
  label: ts(14, 19),
  caption: ts(13, 18),
  code: ts(14, 20),
};

const shared = {
  font,
  radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 } as const,
  weight: { regular: 400, medium: 500, semibold: 600 } as const,
  motion: { hover: "150ms", easing: "cubic-bezier(.4,0,.2,1)" },
};

const light = {
  ...shared,
  kind: "light" as "light" | "dark",
  bg: { base: "#FFFFFF", subtle: "#F4F4F7", elevated: "#FAFAFC" },
  text: {
    primary: "#16161A",
    secondary: "#5C5C66",
    tertiary: "#85858F",
    onColor: "#FFFFFF",
    onPrimary: "#FFFFFF",
    accent: "#2F6BFF",
    success: "#17914F",
    warning: "#B86E00",
    danger: "#E0383E",
    accentDeep: "#1C4FD1",
    successDeep: "#0F6E3B",
    warningDeep: "#8A5200",
    dangerDeep: "#B3242A",
  },
  fill: {
    primary: "#16161A",
    primaryHover: "#2A2A30",
    secondary: "#F0F0F3",
    secondaryHover: "#E7E7EC",
    hover: "#F2F2F5",
    pressed: "#E7E7EC",
    accent: "#2F6BFF",
    controlChecked: "#2F6BFF",
    accentSubtle: "#EAF0FF",
    successSubtle: "#E5F5EB",
    warningSubtle: "#FFF4E0",
    dangerSubtle: "#FDECEC",
  },
  border: { subtle: "#EFEFF3", weak: "#E8E8ED", default: "#E0E0E6", strong: "#C2C2CB", focus: "#2F6BFF" },
  dataviz: {
    categorical: ["#2F6BFF", "#E5A800", "#00A8C2"],
    other: "#A0A0AA",
    negative: "#E0383E",
    singleSeriesRest: "#C9D7FF",
    areaAlpha: "33",
    bandAlpha: "22",
    blueTint: "#EAF0FF",
    blue5: "#2F6BFF",
    sequential: ["#EAF0FF", "#B9CCFF", "#7FA2FF", "#2F6BFF"],
    diverging: ["#E0383E", "#F3B5B7", "#EEEEEE", "#B9CCFF", "#2F6BFF"],
  },
};

export type GrokTheme = typeof light;

const dark: GrokTheme = {
  ...shared,
  kind: "dark",
  bg: { base: "#111114", subtle: "#17171B", elevated: "#1C1C21" },
  text: {
    primary: "#F2F2F5",
    secondary: "#A9A9B3",
    tertiary: "#7E7E89",
    onColor: "#0B0B0D",
    onPrimary: "#0B0B0D",
    accent: "#7AA3FF",
    success: "#3DD68C",
    warning: "#F2B13C",
    danger: "#FF6B6B",
    accentDeep: "#A9C3FF",
    successDeep: "#7EE8B3",
    warningDeep: "#F8CC7A",
    dangerDeep: "#FF9C9C",
  },
  fill: {
    primary: "#F2F2F5",
    primaryHover: "#DADAE0",
    secondary: "#24242A",
    secondaryHover: "#2C2C33",
    hover: "#222228",
    pressed: "#2C2C33",
    accent: "#7AA3FF",
    controlChecked: "#7AA3FF",
    accentSubtle: "#1B2440",
    successSubtle: "#12301F",
    warningSubtle: "#30250F",
    dangerSubtle: "#3A191B",
  },
  border: { subtle: "#222228", weak: "#28282F", default: "#303038", strong: "#4C4C57", focus: "#7AA3FF" },
  dataviz: {
    categorical: ["#7AA3FF", "#F2C230", "#2CC7DD"],
    other: "#6E6E78",
    negative: "#FF6B6B",
    singleSeriesRest: "#2E3B63",
    areaAlpha: "33",
    bandAlpha: "22",
    blueTint: "#1B2440",
    blue5: "#7AA3FF",
    sequential: ["#1B2440", "#2E4A99", "#4F78E0", "#7AA3FF"],
    diverging: ["#FF6B6B", "#7A3A3C", "#333338", "#2E4A99", "#7AA3FF"],
  },
};

const query = "(prefers-color-scheme: dark)";

export function useGrokTheme(): GrokTheme {
  const [isDark, setIsDark] = useState<boolean>(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setIsDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDark ? dark : light;
}

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  const Ctx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

/** Call inside a tap handler: iOS only lets audio start from a user gesture. */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state !== "running") void ctx.resume();
  // Play one silent frame so iOS fully unlocks output.
  const buffer = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start(0);
}

/** Keep the iOS status bar / browser chrome color matched to the page background. */
export function syncChrome(color: string): void {
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}
