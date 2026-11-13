import type { GrokTheme } from "../grok";
import { ChainPair } from "../icons";
import { Pill, craft as makeCraft, fontStack } from "./chrome";

export function Welcome({ theme, onBegin }: { theme: GrokTheme; onBegin: () => void }) {
  const c = makeCraft(theme);
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "32px 24px calc(32px + env(safe-area-inset-bottom))",
        background: c.paper,
        color: theme.text.primary,
        fontFamily: fontStack(theme),
        animation: "dcFade 400ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, maxWidth: 340, margin: "0 auto" }}>
        <ChainPair size={72} />
        <div style={{ ...theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: "0.14em", textTransform: "uppercase", color: c.goldDeep }}>
          DayCraft
        </div>
        <h1 style={{ ...theme.font.heading1, fontWeight: theme.weight.semibold, letterSpacing: "-0.03em", margin: 0, lineHeight: "34px" }}>
          This is your day.
        </h1>
        <p style={{ ...theme.font.body1, color: theme.text.secondary, margin: 0, lineHeight: "24px" }}>
          Four blocks, a short stack of lines. Check them off. Finish them all, and today becomes a link in the chain.
        </p>
        <p style={{ ...theme.font.body1, color: theme.text.secondary, margin: 0, lineHeight: "24px" }}>
          Do more than the day asks, and a coin drops into your treat jar. Don't miss twice.
        </p>
        <div style={{ marginTop: 8 }}>
          <Pill theme={theme} strong color={c.gold} onClick={onBegin}>
            Begin
          </Pill>
        </div>
      </div>
    </div>
  );
}
