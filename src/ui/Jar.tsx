import { useState } from "react";
import type { GrokTheme } from "../grok";
import { TreatJar } from "../icons";
import { jarBalance, jarProgress, type Jar, type Spend } from "../store";
import { Card, Field, Money, Pill, craft as makeCraft, fontStack } from "./chrome";

export function JarPage({
  theme,
  jar,
  onSaveGoal,
  onSpend,
  onAmounts,
}: {
  theme: GrokTheme;
  jar: Jar;
  onSaveGoal: (goal: string, price: number) => void;
  onSpend: (text: string, amount: number) => void;
  onAmounts: (perExtra: number, gymBonus: number) => void;
}) {
  const c = makeCraft(theme);
  const [goal, setGoal] = useState(jar.goal);
  const [price, setPrice] = useState(jar.price ? String(jar.price) : "");
  const [spendText, setSpendText] = useState("");
  const [spendAmt, setSpendAmt] = useState("");
  const [per, setPer] = useState(String(jar.perExtra));
  const [bonus, setBonus] = useState(String(jar.gymBonus));
  const bal = jarBalance(jar);
  const prog = jarProgress(jar);
  const funded = jar.price > 0 && bal >= jar.price;

  const saveGoal = () => {
    const n = Number(price);
    if (!goal.trim() || !(n > 0)) return;
    onSaveGoal(goal.trim(), Math.round(n * 100) / 100);
  };
  const saveSpend = () => {
    const n = Number(spendAmt);
    if (!(n > 0)) return;
    onSpend(spendText.trim() || "Spend", Math.round(n * 100) / 100);
    setSpendText("");
    setSpendAmt("");
  };
  const saveAmounts = () => {
    const a = Number(per);
    const b = Number(bonus);
    if (a >= 0 && b >= 0) onAmounts(a, b);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16, animation: "dcIn 280ms ease" }}>
      <header>
        <div style={{ ...theme.font.caption, color: theme.text.tertiary, fontWeight: theme.weight.medium }}>Treat jar</div>
        <div style={{ ...theme.font.heading2, fontWeight: theme.weight.semibold, letterSpacing: "-0.02em", marginTop: 1 }}>
          {jar.goal || "What are you saving for?"}
        </div>
      </header>

      <Card theme={theme} c={c} pad={20} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <TreatJar size={120} progress={prog} pulse={funded} />
        <div style={{ ...theme.font.heading1, fontWeight: theme.weight.semibold, letterSpacing: "-0.03em", color: c.goldDeep }}>
          {Money(bal)}
        </div>
        {jar.price > 0 ? (
          <>
            <div style={{ ...theme.font.body2, color: theme.text.secondary }}>of {Money(jar.price)} for {jar.goal}</div>
            <div style={{ width: "100%", height: 8, borderRadius: 4, background: c.goldSoft, overflow: "hidden", marginTop: 4 }}>
              <div style={{ width: prog * 100 + "%", height: "100%", background: c.gold, borderRadius: 4, transition: "width 500ms ease" }} />
            </div>
            {funded ? (
              <div style={{ ...theme.font.body2, fontWeight: theme.weight.semibold, color: c.goldDeep, marginTop: 4 }}>
                Funded. Go get it.
              </div>
            ) : (
              <div style={{ ...theme.font.caption, color: theme.text.tertiary, marginTop: 2 }}>
                {Money(Math.max(0, jar.price - bal))} to go · {Money(jar.perExtra)} per extra credit
              </div>
            )}
          </>
        ) : (
          <div style={{ ...theme.font.body2, color: theme.text.secondary, textAlign: "center" }}>
            The jar fills only from extra credit — doing more than the day asks — and from a full gym week.
          </div>
        )}
      </Card>

      <Card theme={theme} c={c}>
        <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold, marginBottom: 10 }}>The goal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field theme={theme} value={goal} onChange={setGoal} placeholder="A new putter, a dinner out…" />
          <Field theme={theme} value={price} onChange={setPrice} placeholder="What it costs" inputMode="decimal" type="text" />
          <div>
            <Pill theme={theme} strong color={c.gold} onClick={saveGoal}>
              Save goal
            </Pill>
          </div>
        </div>
      </Card>

      <Card theme={theme} c={c}>
        <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold, marginBottom: 6 }}>I spent some</div>
        <div style={{ ...theme.font.caption, color: theme.text.secondary, marginBottom: 10 }}>
          Record what you bought. It comes out of the jar.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field theme={theme} value={spendText} onChange={setSpendText} placeholder="What you bought" />
          <Field theme={theme} value={spendAmt} onChange={setSpendAmt} placeholder="Amount" inputMode="decimal" />
          <div>
            <Pill theme={theme} strong color={c.gold} onClick={saveSpend} disabled={bal <= 0}>
              Record spend
            </Pill>
          </div>
        </div>
        {jar.spends.length > 0 ? (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {jar.spends
              .slice()
              .reverse()
              .map((s: Spend) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, ...theme.font.body2 }}>
                  <span style={{ color: theme.text.primary }}>{s.text}</span>
                  <span style={{ color: theme.text.secondary, flex: "0 0 auto" }}>−{Money(s.amount)}</span>
                </div>
              ))}
          </div>
        ) : null}
      </Card>

      <Card theme={theme} c={c}>
        <div style={{ ...theme.font.body1, fontWeight: theme.weight.semibold, marginBottom: 6 }}>Amounts</div>
        <div style={{ ...theme.font.caption, color: theme.text.secondary, marginBottom: 10 }}>
          Defaults are {Money(5)} per extra credit and {Money(15)} for a full gym week. You can change them.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ ...theme.font.caption, color: theme.text.secondary }}>
            Per extra credit
            <div style={{ marginTop: 4 }}>
              <Field theme={theme} value={per} onChange={setPer} inputMode="decimal" />
            </div>
          </label>
          <label style={{ ...theme.font.caption, color: theme.text.secondary }}>
            Full gym week bonus
            <div style={{ marginTop: 4 }}>
              <Field theme={theme} value={bonus} onChange={setBonus} inputMode="decimal" />
            </div>
          </label>
          <div>
            <Pill theme={theme} color={c.gold} onClick={saveAmounts}>
              Save amounts
            </Pill>
          </div>
        </div>
      </Card>
    </div>
  );
}
