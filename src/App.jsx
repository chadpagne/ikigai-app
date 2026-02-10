import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Home as HomeIcon,
  Wallet,
  PiggyBank,
  BarChart3,
  LineChart as LineChartIcon,
  Menu,
  Info,
  ChevronDown,
  Shield,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/**
 * Ikigai v0.4.2 (deployable)
 * - Vite + React
 * - localStorage persistence
 * - Guided onboarding (first time only)
 * - Tabs: Home, Build Your Ikigai, Savings Goals, Net Worth, Retirement, About
 * - Dark mode fixed for tiles + nav text (CSS patch below)
 * - Mobile tooltip clamped to viewport (fixed here)
 * - Pie drill-down by category
 */

const BRAND_GREEN = "#2f7f6f";
const BRAND_BLUE = "#3a9fbf";

// Helpers
function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function formatMoney(n) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(0)}`;
}
function formatPct(n, decimals = 2) {
  return `${(n * 100).toFixed(decimals)}%`;
}
function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthsBetween(from, toISO) {
  const to = new Date(toISO);
  const a = from.getFullYear() * 12 + from.getMonth();
  const b = to.getFullYear() * 12 + to.getMonth();
  return Math.max(0, b - a);
}
function isSameMonthKey(a, b) {
  return a === b;
}

// Data
const IKIGAI_CATEGORIES = [
  { name: "Housing", color: "#7aa6a1" },
  { name: "Car / Transportation", color: "#a0a9b8" },
  { name: "Food & Drink", color: "#d1a06a" },
  { name: "Utilities", color: "#8aa4c6" },
  { name: "Insurance", color: "#93b8a0" },
  { name: "Health & Fitness", color: "#b88fb7" },
  { name: "Personal Care", color: "#c6a48a" },
  { name: "Entertainment", color: "#caa1a7" },
  { name: "Household", color: "#9fb0a2" },
  { name: "Gifts", color: "#a8b6c7" },
  { name: "Clothing", color: "#a8a6c7" },
  { name: "Subscriptions", color: "#b1b1b1" },
  { name: "Travel & Vacation", color: "#7fb6c4" },
  { name: "Taxes", color: "#b6a07f" },
  { name: "Education", color: "#b6a07f" },
  { name: "Donations", color: "#9ab6c4" },
  { name: "Debt payments", color: "#c08f7e" },
  { name: "Fees", color: "#9e9e9e" },
  { name: "Pet", color: "#a7b98b" },
  { name: "Other", color: "#8f9aa7" },
];

const GOAL_PRESETS = [
  "Emergency",
  "Vacation",
  "Occasion",
  "Home down payment",
  "Car down payment",
  "Education",
  "Other",
];

const DEFAULT_PROFILE = {
  age: "",
  location: "",
  relationship: "",
  kids: "0",
  pets: "0",
  // NOTE: monthly is string to avoid the "0 sticks while typing" issue
  incomeSources: [{ id: uid(), name: "Salary", monthly: "" }],
};

function Tip({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 12, left: 12 });

  // Clamp to viewport so it doesn't fly off-screen on mobile Chrome.
  const TIP_PAD = 12;
  const TIP_W = 280;   // matches CSS max-width patch
  const TIP_H = 120;   // rough height estimate; top logic keeps it visible

  function openAt(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const centerX = r.left + r.width / 2;

    const left = Math.min(
      window.innerWidth - TIP_PAD - TIP_W / 2,
      Math.max(TIP_PAD + TIP_W / 2, centerX)
    );

    const below = r.bottom + 10;
    const above = r.top - 10;

    const top =
      below + TIP_H > window.innerHeight - TIP_PAD
        ? Math.max(TIP_PAD, above - TIP_H)
        : Math.min(window.innerHeight - TIP_PAD, below);

    setPos({ left, top });
    setOpen(true);
  }

  useEffect(() => {
    function onDoc(e) {
      if (!open) return;
      const t = e.target;
      if (t && t.closest && t.closest(".tooltip-wrap")) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  return (
    <span className="tooltip-wrap" style={{ display: "inline-flex" }}>
      <button
        type="button"
        className="chip"
        aria-label="Info"
        onClick={open ? () => setOpen(false) : openAt}
      >
        <Info size={16} />
      </button>
      {open ? (
        <span
          className="tooltip-pop"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}

function Pill({ active, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={"pill " + (active ? "active" : "")}>
      {label}
    </button>
  );
}

function NeedWantBadge({ value }) {
  const isNeed = value === "need";
  const Icon = isNeed ? Shield : Sparkles;
  return (
    <span className={"badge " + (isNeed ? "good" : "warn")} title={isNeed ? "Need" : "Want"}>
      <Icon size={14} />
      {isNeed ? "Need" : "Want"}
    </span>
  );
}

function BucketTile({ title, subtitle, currentPct, projectedPct, footer, status }) {
  const cur = clamp01(currentPct);
  const proj = clamp01(projectedPct);

  // Blue + a clearly different overlay
  const SOLID = "rgba(58,159,191,0.28)"; // blue
  const TINT = "rgba(58,159,191,0.72)";  // stronger blue overlay

  return (
    <div className="tile progress-tile">
      {/* current fill */}
      <div
        className="progress-fill"
        style={{
          background: SOLID,
          height: `${cur * 100}%`,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {/* projected overlay */}
      <div
        className="progress-fill"
        style={{
          background: TINT,
          height: `${proj * 100}%`,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          mixBlendMode: "multiply",
        }}
      />
      <div style={{ position: "relative" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 750 }}>{title}</div>
            {subtitle ? <div className="small muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
          </div>
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            {status ? (
              <span className={"badge " + (status === "on_track" ? "good" : "warn")}>
                {status === "on_track" ? "On track" : "Behind"}
              </span>
            ) : null}
            <div style={{ fontWeight: 850 }}>{Math.round(cur * 100)}%</div>
          </div>
        </div>

        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <div className="small muted">{footer ?? ""}</div>
          <Tip text="Solid = what you have now. Tint = what your current $/mo can reach by your end date (or next 12 months)." />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // App state
  const [activeTab, setActiveTab] = useState("home"); // home | ikigai | goals | networth | retirement | about
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem("ikigai_theme") || "light");

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [items, setItems] = useState([]);
  const [quickDraft, setQuickDraft] = useState({
    name: "",
    category: "Other",
    monthly: "",
    needWant: "need",
    temporary: false,
    endDate: "",
  });

  const [goals, setGoals] = useState([]);
  const [goalDraft, setGoalDraft] = useState({
    name: "",
    category: "Emergency",
    target: "",
    current: "",
    monthly: "",
    endDate: "",
  });

  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [assetDraft, setAssetDraft] = useState({ name: "", value: "", type: "Investment" });
  const [liabDraft, setLiabDraft] = useState({ name: "", balance: "" });
  const [netWorthHistory, setNetWorthHistory] = useState([]);

  const [spendingView, setSpendingView] = useState("monthly"); // monthly | annual
  const [retirementView, setRetirementView] = useState("ongoing"); // ongoing | all
  const [swr, setSwr] = useState(0.04);

  const [pieMode, setPieMode] = useState("category"); // category | needwant
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Theme apply
  useEffect(() => {
    localStorage.setItem("ikigai_theme", theme);
    document.body.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Hash routing (so browser back stays inside app)
  useEffect(() => {
    function applyHash() {
      const h = (window.location.hash || "").replace("#", "");
      if (h) setActiveTab(h);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  useEffect(() => {
    const h = "#" + activeTab;
    if (window.location.hash !== h) window.history.pushState(null, "", h);
  }, [activeTab]);

  // Load saved state
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ikigai_v042_state");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.items) setItems(parsed.items);
      if (parsed.goals) setGoals(parsed.goals);
      if (parsed.assets) setAssets(parsed.assets);
      if (parsed.liabilities) setLiabilities(parsed.liabilities);
      if (parsed.netWorthHistory) setNetWorthHistory(parsed.netWorthHistory);
      if (typeof parsed.onboardingDone === "boolean") setOnboardingDone(parsed.onboardingDone);
    } catch {
      // ignore
    }
  }, []);

  // Save state
  useEffect(() => {
    try {
      localStorage.setItem(
        "ikigai_v042_state",
        JSON.stringify({ profile, items, goals, assets, liabilities, netWorthHistory, onboardingDone })
      );
    } catch {
      // ignore
    }
  }, [profile, items, goals, assets, liabilities, netWorthHistory, onboardingDone]);

  // Derived totals
  const totalIncomeMonthly = useMemo(
    () => profile.incomeSources.reduce((s, x) => s + safeNum(x.monthly), 0),
    [profile.incomeSources]
  );

  const monthlyIkigaiOngoing = useMemo(
    () => items.filter((i) => !i.temporary).reduce((s, i) => s + safeNum(i.monthly), 0),
    [items]
  );
  const monthlyIkigaiAll = useMemo(() => items.reduce((s, i) => s + safeNum(i.monthly), 0), [items]);

  const monthlySpendForSummary = spendingView === "monthly" ? monthlyIkigaiAll : monthlyIkigaiAll * 12;

  const leftoverMonthly = useMemo(
    () => Math.max(0, totalIncomeMonthly - monthlyIkigaiAll),
    [totalIncomeMonthly, monthlyIkigaiAll]
  );

  const savingsRate = useMemo(() => {
    if (totalIncomeMonthly <= 0) return 0;
    return clamp01(leftoverMonthly / totalIncomeMonthly);
  }, [leftoverMonthly, totalIncomeMonthly]);

  const retirementTargetOngoing = useMemo(() => {
    const annual = monthlyIkigaiOngoing * 12;
    if (swr <= 0) return 0;
    return annual / swr;
  }, [monthlyIkigaiOngoing, swr]);

  const retirementTargetAll = useMemo(() => {
    const annual = monthlyIkigaiAll * 12;
    if (swr <= 0) return 0;
    return annual / swr;
  }, [monthlyIkigaiAll, swr]);

  const spendingByCategory = useMemo(() => {
    const map = new Map();
    for (const it of items) map.set(it.category, (map.get(it.category) ?? 0) + safeNum(it.monthly));
    const rows = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [items]);

  const spendingByNeedWant = useMemo(() => {
    const need = items.filter((i) => i.needWant === "need").reduce((s, i) => s + safeNum(i.monthly), 0);
    const want = items.filter((i) => i.needWant === "want").reduce((s, i) => s + safeNum(i.monthly), 0);
    return [
      { name: "Need", value: need },
      { name: "Want", value: want },
    ].filter((r) => r.value > 0);
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!categoryFilter) return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  // Net worth
  const totalAssets = useMemo(() => assets.reduce((s, a) => s + safeNum(a.value), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + safeNum(l.balance), 0), [liabilities]);
  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  // Auto snapshot net worth monthly (no manual button)
  useEffect(() => {
    const key = monthKey(new Date());
    setNetWorthHistory((arr) => {
      if (arr.length > 0 && isSameMonthKey(arr[arr.length - 1].t, key)) return arr;
      const next = [...arr, { t: key, value: netWorth }];
      return next.slice(-24);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netWorth]);

  // Goals progress
  const goalProgress = useMemo(() => {
    const now = new Date();
    return goals.map((g) => {
      const target = safeNum(g.target);
      const current = safeNum(g.current);
      const monthly = safeNum(g.monthly);
      const mLeft = g.endDate ? monthsBetween(now, g.endDate) : null;

      let pct = 0; // current-only
      let projectedPct = 0; // current + monthly * horizon
      let status = null;

      if (target > 0) {
        pct = clamp01(current / target);

        const horizon = mLeft !== null ? mLeft : 12;
        projectedPct = clamp01((current + monthly * horizon) / target);

        if (mLeft !== null && mLeft > 0) {
          const required = Math.max(0, target - current) / mLeft;
          status = monthly >= required ? "on_track" : "behind";
        }
      }

      return { id: g.id, pct, projectedPct, status, mLeft };
    });
  }, [goals]);

  // Mutators: profile income
  function setIncomeSource(id, patch) {
    setProfile((p) => ({
      ...p,
      incomeSources: p.incomeSources.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }
  function addIncomeSource(name = "Other income") {
    setProfile((p) => ({
      ...p,
      incomeSources: [...p.incomeSources, { id: uid(), name, monthly: "" }],
    }));
  }
  function removeIncomeSource(id) {
    setProfile((p) => ({ ...p, incomeSources: p.incomeSources.filter((x) => x.id !== id) }));
  }

  // Mutators: spending items
  function addQuickItem() {
    const name = quickDraft.name.trim();
    if (!name) return;
    setItems((arr) => [
      {
        id: uid(),
        name,
        category: quickDraft.category,
        monthly: safeNum(quickDraft.monthly),
        needWant: quickDraft.needWant,
        temporary: !!quickDraft.temporary,
        endDate: quickDraft.endDate,
      },
      ...arr,
    ]);
    setQuickDraft((d) => ({ ...d, name: "", monthly: "", temporary: false, endDate: "" }));
  }
  function updateItem(id, patch) {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeItem(id) {
    setItems((arr) => arr.filter((x) => x.id !== id));
  }

  // Mutators: goals
  function addGoal() {
    const name = goalDraft.name.trim();
    if (!name) return;
    setGoals((arr) => [
      {
        id: uid(),
        name,
        category: goalDraft.category,
        target: safeNum(goalDraft.target),
        current: safeNum(goalDraft.current),
        monthly: safeNum(goalDraft.monthly),
        endDate: goalDraft.endDate,
      },
      ...arr,
    ]);
    setGoalDraft({ name: "", category: "Emergency", target: "", current: "", monthly: "", endDate: "" });
  }
  function updateGoal(id, patch) {
    setGoals((arr) => arr.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  function removeGoal(id) {
    setGoals((arr) => arr.filter((g) => g.id !== id));
  }

  // Mutators: assets/liabilities
  function addAsset() {
    const name = assetDraft.name.trim();
    if (!name) return;
    setAssets((arr) => [{ id: uid(), name, type: assetDraft.type, value: safeNum(assetDraft.value) }, ...arr]);
    setAssetDraft({ name: "", value: "", type: "Investment" });
  }
  function updateAsset(id, key, value) {
    setAssets((arr) => arr.map((a) => (a.id === id ? { ...a, [key]: value } : a)));
  }
  function removeAsset(id) {
    setAssets((arr) => arr.filter((a) => a.id !== id));
  }

  function addLiability() {
    const name = liabDraft.name.trim();
    if (!name) return;
    setLiabilities((arr) => [{ id: uid(), name, balance: safeNum(liabDraft.balance) }, ...arr]);
    setLiabDraft({ name: "", balance: "" });
  }
  function updateLiability(id, key, value) {
    setLiabilities((arr) => arr.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }
  function removeLiability(id) {
    setLiabilities((arr) => arr.filter((l) => l.id !== id));
  }

  const showOnboarding = !onboardingDone;
  function finishOnboarding() {
    setOnboardingDone(true);
    setOnboardingStep(1);
  }

  function TabButton({ id, label, Icon }) {
    const active = activeTab === id;
    return (
      <button
        type="button"
        className={"tab " + (active ? "active" : "")}
        onClick={() => setActiveTab(id)}
      >
        <Icon size={16} />
        {label}
      </button>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="header-inner">
          <div className="header-toprow">
            <button className="btn outline" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <Menu size={16} />
            </button>
            <div className="brand">Ikigai</div>
            <button
              className="btn outline"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="nav" role="navigation" aria-label="Primary">
            <TabButton id="home" label="Home" Icon={HomeIcon} />
            <TabButton id="ikigai" label="Build Your Ikigai" Icon={Wallet} />
            <TabButton id="goals" label="Savings Goals" Icon={PiggyBank} />
            <TabButton id="networth" label="Net Worth" Icon={LineChartIcon} />
            <TabButton id="retirement" label="Retirement" Icon={BarChart3} />
          </div>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen ? (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="drawer" role="dialog" aria-label="Menu">
            <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 850, color: "var(--text)" }}>Ikigai</div>
              <button className="btn outline" onClick={() => setDrawerOpen(false)} aria-label="Close menu">Close</button>
            </div>

            <div className="drawer-section">
              <h3 style={{ margin: "8px 0" }}>Navigate</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button className="btn outline" onClick={() => (setActiveTab("home"), setDrawerOpen(false))}>Home</button>
                <button className="btn outline" onClick={() => (setActiveTab("ikigai"), setDrawerOpen(false))}>Build Your Ikigai</button>
                <button className="btn outline" onClick={() => (setActiveTab("goals"), setDrawerOpen(false))}>Savings Goals</button>
                <button className="btn outline" onClick={() => (setActiveTab("networth"), setDrawerOpen(false))}>Net Worth</button>
                <button className="btn outline" onClick={() => (setActiveTab("retirement"), setDrawerOpen(false))}>Retirement</button>
                <button className="btn outline" onClick={() => (setActiveTab("about"), setDrawerOpen(false))}>About</button>
              </div>
            </div>

            <div className="drawer-section" style={{ marginTop: "auto" }}>
              <h3 style={{ margin: "8px 0" }}>Appearance</h3>
              <button className="btn outline" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div className="container">
        {/* HOME */}
        {activeTab === "home" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* ... everything below unchanged from your version ... */}
              {/* (kept identical to minimize risk) */}

              {showOnboarding ? (
                <div style={{ maxWidth: 760 }}>
                  <div className="row" style={{ alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <h2 className="h1">Home</h2>
                      <p className="sub">Everyone’s life has tradeoffs. Let’s start with where you are right now.</p>
                    </div>
                    <button className="btn" onClick={finishOnboarding}>Skip for now</button>
                  </div>

                  <div className="note" style={{ marginTop: 12 }}>
                    {/* Step 1 */}
                    {onboardingStep === 1 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <div className="kicker">Step 1 of 4</div>
                          <div style={{ fontWeight: 850, fontSize: 18 }}>You</div>
                        </div>

                        <div className="grid-2">
                          <div className="field">
                            <div className="label">Age</div>
                            <input className="input" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} />
                          </div>
                          <div className="field">
                            <div className="label">Location</div>
                            <input className="input" value={profile.location} placeholder="Los Angeles, CA, USA" onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
                          </div>

                          <div className="field">
                            <div className="label">Relationship</div>
                            <select value={profile.relationship} onChange={(e) => setProfile({ ...profile, relationship: e.target.value })}>
                              <option value="">Select</option>
                              <option>Single</option>
                              <option>Partnered</option>
                              <option>Married</option>
                            </select>
                          </div>

                          <div className="grid-2" style={{ gap: 10 }}>
                            <div className="field">
                              <div className="label">Kids</div>
                              <input
                                className="input"
                                inputMode="numeric"
                                value={profile.kids}
                                onChange={(e) => setProfile({ ...profile, kids: e.target.value })}
                              />
                            </div>
                            <div className="field">
                              <div className="label">Pets</div>
                              <input
                                className="input"
                                inputMode="numeric"
                                value={profile.pets}
                                onChange={(e) => setProfile({ ...profile, pets: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                          <Tip text="Your stage of life shapes what ‘enough’ looks like. Nothing here is permanent." />
                          <button className="btn primary" onClick={() => setOnboardingStep(2)}>Continue</button>
                        </div>
                      </div>
                    )}

                    {/* Step 2 */}
                    {onboardingStep === 2 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <div className="kicker">Step 2 of 4</div>
                          <div style={{ fontWeight: 850, fontSize: 18 }}>What supports your life</div>
                          <div className="small muted" style={{ marginTop: 4 }}>
                            Add your income sources (monthly take-home).
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {profile.incomeSources.map((src) => (
                            <div key={src.id} className="grid-2" style={{ gap: 10 }}>
                              <div className="field">
                                <div className="label">Source</div>
                                <input className="input" value={src.name} onChange={(e) => setIncomeSource(src.id, { name: e.target.value })} />
                              </div>
                              <div className="row" style={{ alignItems: "flex-end" }}>
                                <div className="field" style={{ flex: 1 }}>
                                  <div className="label">Monthly</div>
                                  <input
                                    className="input"
                                    inputMode="numeric"
                                    value={src.monthly}
                                    placeholder="e.g., 6500"
                                    onChange={(e) => setIncomeSource(src.id, { monthly: e.target.value })}
                                  />
                                </div>
                                {profile.incomeSources.length > 1 ? (
                                  <button className="btn ghost" onClick={() => removeIncomeSource(src.id)} title="Remove">
                                    <Trash2 size={16} />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}

                          <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                            <button className="btn" onClick={() => addIncomeSource("Other income")}><Plus size={16} /> Add income source</button>
                            <div className="small">
                              Total monthly: <b>{formatMoney(totalIncomeMonthly)}</b>
                            </div>
                          </div>

                          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                            {["Dividend income", "Interest income", "Side hustle", "Bonus", "Rental income"].map((n) => (
                              <button key={n} className="btn" onClick={() => addIncomeSource(n)}>
                                + {n}
                              </button>
                            ))}
                          </div>

                          <div className="small muted">This doesn’t need to be perfect. You can refine it anytime.</div>
                        </div>

                        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                          <button className="btn" onClick={() => setOnboardingStep(1)}>Back</button>
                          <button className="btn primary" onClick={() => setOnboardingStep(3)}>Continue</button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 */}
                    {onboardingStep === 3 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <div className="kicker">Step 3 of 4</div>
                          <div style={{ fontWeight: 850, fontSize: 18 }}>What matters today</div>
                          <div className="small muted" style={{ marginTop: 4 }}>Start with a few things that feel important.</div>
                        </div>

                        <div className="grid-2">
                          {["Housing", "Food & Drink", "Car / Transportation", "Pet"].map((c) => (
                            <button
                              key={c}
                              className="tile"
                              onClick={() => {
                                setActiveTab("ikigai");
                                setQuickDraft((d) => ({ ...d, category: c }));
                              }}
                              style={{ textAlign: "left", cursor: "pointer" }}
                            >
                              <div style={{ fontWeight: 850 }}>{c}</div>
                              <div className="small muted" style={{ marginTop: 6 }}>Tap to add</div>
                            </button>
                          ))}
                        </div>

                        <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                          <button className="btn" onClick={() => setOnboardingStep(2)}>Back</button>
                          <button className="btn primary" onClick={() => setOnboardingStep(4)}>Continue</button>
                        </div>
                      </div>
                    )}

                    {/* Step 4 */}
                    {onboardingStep === 4 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <div className="kicker">Step 4 of 4</div>
                          <div style={{ fontWeight: 850, fontSize: 18 }}>Looking ahead</div>
                          <div className="small muted" style={{ marginTop: 4 }}>Some parts of life are worth planning for.</div>
                        </div>

                        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                          <button
                            className="btn primary"
                            onClick={() => {
                              setActiveTab("goals");
                              finishOnboarding();
                            }}
                          >
                            Add a savings goal
                          </button>
                          <button className="btn" onClick={finishOnboarding}>Skip for now</button>
                        </div>

                        <div className="row small muted" style={{ alignItems: "center", gap: 10 }}>
                          <Tip text="Planning doesn’t mean committing — it means seeing." />
                          <span>Planning doesn’t mean committing — it means seeing.</span>
                        </div>

                        <div className="note">
                          <div style={{ fontWeight: 850 }}>Your Ikigai is taking shape.</div>
                          <div className="small muted" style={{ marginTop: 4 }}>You can change any of this as life changes.</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <h2 className="h1">Home</h2>
                      <p className="sub">A calm snapshot of your life right now.</p>
                    </div>
                    <button className="btn" onClick={() => { setOnboardingDone(false); setOnboardingStep(1); }}>
                      Edit basics
                    </button>
                  </div>

                  <div className="grid-4">
                    <div className="tile">
                      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div className="label">Spending</div>
                        <Tip text="This reflects your current life — not a rule you must follow forever." />
                      </div>
                      <div
                        className="big-number"
                        onClick={() => setSpendingView((v) => (v === "monthly" ? "annual" : "monthly"))}
                        title="Toggle monthly/annual"
                      >
                        {formatMoney(monthlySpendForSummary)}
                        <small>
                          {spendingView === "monthly" ? "Monthly" : "Annual"} <ChevronDown size={12} />
                        </small>
                      </div>
                    </div>

                    <div className="tile">
                      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div className="label">Savings rate</div>
                        <Tip text="This naturally changes as priorities and seasons shift." />
                      </div>
                      <div className="big-number" style={{ cursor: "default" }}>{formatPct(savingsRate, 2)}</div>
                    </div>

                    <div className="tile">
                      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div className="label">Leftover money</div>
                        <Tip text="This is the part of your money you actively choose how to direct." />
                      </div>
                      <div className="big-number" style={{ cursor: "default" }}>{formatMoney(leftoverMonthly)}</div>
                      <div className="small muted">Monthly income − monthly spending.</div>
                    </div>

                    <div className="tile">
                      <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                        <div className="label">Retirement target</div>
                        <Tip text="This adjusts as your Ikigai evolves." />
                      </div>

                      <button
                        className="btn"
                        style={{ marginTop: 10 }}
                        onClick={() => setRetirementView((v) => (v === "ongoing" ? "all" : "ongoing"))}
                      >
                        {retirementView === "ongoing" ? "Ongoing (tap to include temporary)" : "Including temporary (tap for ongoing)"}
                      </button>

                      <div className="big-number" style={{ cursor: "default" }}>
                        {formatMoney(retirementView === "all" ? retirementTargetAll : retirementTargetOngoing)}
                      </div>
                      <div className="small muted">Uses withdrawal rate {formatPct(swr, 2)}.</div>
                    </div>
                  </div>

                  <div className="note">
                    <div className="small">
                      This is a mirror, not a grade. You’re seeing what your life implies — and you get to decide what changes, if any.
                    </div>
                  </div>

                  <div className="grid-3">
                    <button className="tile" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("ikigai")}>
                      <div style={{ fontWeight: 850 }}>Build Your Ikigai</div>
                      <div className="small muted" style={{ marginTop: 6 }}>Refine how spending reflects what matters.</div>
                    </button>
                    <button className="tile" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("goals")}>
                      <div style={{ fontWeight: 850 }}>Savings Goals</div>
                      <div className="small muted" style={{ marginTop: 6 }}>See how today’s choices affect future plans.</div>
                    </button>
                    <button className="tile" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("about")}>
                      <div style={{ fontWeight: 850 }}>About</div>
                      <div className="small muted" style={{ marginTop: 6 }}>What “Ikigai” means here.</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BUILD YOUR IKIGAI */}
        {activeTab === "ikigai" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 className="h1">Build Your Ikigai</h2>
                <p className="sub">Some parts of life are essential. Others bring meaning. Most are a mix.</p>
              </div>

              <div className="note">
                <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 850 }}>Quick Add</div>
                    <div className="small muted" style={{ marginTop: 4 }}>
                      Add one item at a time. Everything updates instantly.
                    </div>
                  </div>
                  <Tip text="Examples: Groceries, Gas, Gym, Coffee, Rent, Pet food, Streaming." />
                </div>

                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div className="field">
                    <div className="label">Name</div>
                    <input
                      className="input"
                      value={quickDraft.name}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Groceries, Gas, Gym, Coffee"
                    />
                  </div>

                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <div className="label">Category</div>
                      <select
                        value={quickDraft.category}
                        onChange={(e) => setQuickDraft((d) => ({ ...d, category: e.target.value }))}
                      >
                        {IKIGAI_CATEGORIES.map((c) => (
                          <option key={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <div className="label">Monthly</div>
                      <input
                        className="input"
                        inputMode="numeric"
                        value={quickDraft.monthly}
                        onChange={(e) => setQuickDraft((d) => ({ ...d, monthly: e.target.value }))}
                        placeholder="e.g., 450"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginTop: 10 }}>
                  <div className="field">
                    <div className="label">Need / Want</div>
                    <select
                      value={quickDraft.needWant}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, needWant: e.target.value }))}
                    >
                      <option value="need">Need</option>
                      <option value="want">Want</option>
                    </select>
                  </div>

                  <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
                    <label className="row small" style={{ alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={quickDraft.temporary}
                        onChange={(e) => setQuickDraft((d) => ({ ...d, temporary: e.target.checked }))}
                      />
                      Temporary
                    </label>

                    {quickDraft.temporary ? (
                      <div className="field" style={{ flex: 1 }}>
                        <div className="label">Ends (optional)</div>
                        <input
                          className="input"
                          type="date"
                          value={quickDraft.endDate}
                          onChange={(e) => setQuickDraft((d) => ({ ...d, endDate: e.target.value }))}
                        />
                      </div>
                    ) : null}

                    <button className="btn primary right" onClick={addQuickItem}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                {/* Left: item list */}
                <div>
                  <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 850 }}>What you currently spend on</div>
                    <Tip text="This is a mirror, not a grade. You can change anything." />
                  </div>

                  {categoryFilter ? (
                    <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <div className="small">
                        Showing category: <b>{categoryFilter}</b>
                      </div>
                      <button className="btn" onClick={() => setCategoryFilter(null)}>Clear</button>
                    </div>
                  ) : null}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    {visibleItems.length === 0 ? (
                      <div className="tile muted">No items yet. Add a few to bring your Ikigai to life.</div>
                    ) : (
                      visibleItems.map((it) => (
                        <div key={it.id} className="tile">
                          <div className="grid-2" style={{ gap: 10 }}>
                            <div>
                              <input
                                className="input"
                                value={it.name}
                                onChange={(e) => updateItem(it.id, { name: e.target.value })}
                              />
                              <div className="small muted" style={{ marginTop: 6 }}>
                                {it.category}
                                {it.temporary ? " • Temporary" : ""}
                              </div>
                            </div>

                            <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
                              <div className="field" style={{ flex: 1 }}>
                                <div className="label">Monthly</div>
                                <input
                                  className="input"
                                  inputMode="numeric"
                                  value={String(it.monthly)}
                                  onChange={(e) => updateItem(it.id, { monthly: safeNum(e.target.value) })}
                                />
                              </div>

                              <button
                                className="btn ghost"
                                onClick={() => updateItem(it.id, { needWant: it.needWant === "need" ? "want" : "need" })}
                                title="Toggle need/want"
                              >
                                <NeedWantBadge value={it.needWant} />
                              </button>

                              <button className="btn ghost" onClick={() => removeItem(it.id)} title="Remove">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: summary pie */}
                <div className="tile">
                  <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 850 }}>Summary</div>
                      <div className="small muted" style={{ marginTop: 4 }}>A simple story of where your money goes.</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Pill active={pieMode === "category"} label="By category" onClick={() => setPieMode("category")} />
                    <Pill active={pieMode === "needwant"} label="Needs vs. Wants" onClick={() => setPieMode("needwant")} />
                  </div>

                  <div style={{ height: 260, marginTop: 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieMode === "category" ? spendingByCategory : spendingByNeedWant}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          onClick={(data) => {
                            // Drill down only for category mode
                            if (pieMode !== "category") return;
                            if (data?.name) setCategoryFilter(data.name);
                          }}
                        >
                          {(pieMode === "category" ? spendingByCategory : spendingByNeedWant).map((row) => (
                            <Cell
                              key={row.name}
                              fill={
                                pieMode === "category"
                                  ? IKIGAI_CATEGORIES.find((c) => c.name === row.name)?.color ?? "#9aa3af"
                                  : row.name === "Need"
                                    ? "rgba(47,127,111,0.78)"
                                    : "rgba(58,159,191,0.78)"
                              }
                            />
                          ))}
                        </Pie>
                        <ReTooltip formatter={(v) => formatMoney(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="small" style={{ marginTop: 6 }}>
                    Monthly total: <b>{formatMoney(monthlyIkigaiAll)}</b>
                  </div>

                  {pieMode === "category" ? (
                    <div className="small muted" style={{ marginTop: 8 }}>
                      Tip: tap a slice to drill into that category.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="row" style={{ justifyContent: "flex-end" }}>
                <button className="btn primary" onClick={() => setActiveTab("goals")}>
                  Next: Savings Goals →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SAVINGS GOALS */}
        {activeTab === "goals" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 className="h1">Savings Goals</h2>
                <p className="sub">Progress should feel clear: what you have now — and how your monthly saving changes the future.</p>
              </div>

              <div className="note">
                <div className="grid-2">
                  <div className="field">
                    <div className="label">Name</div>
                    <input
                      className="input"
                      value={goalDraft.name}
                      onChange={(e) => setGoalDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Emergency fund"
                    />
                  </div>
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <div className="label">Category</div>
                      <select value={goalDraft.category} onChange={(e) => setGoalDraft((d) => ({ ...d, category: e.target.value }))}>
                        {GOAL_PRESETS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <div className="label">Target</div>
                      <input className="input" inputMode="numeric" value={goalDraft.target} onChange={(e) => setGoalDraft((d) => ({ ...d, target: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="grid-2" style={{ marginTop: 10 }}>
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <div className="label">Current</div>
                      <input className="input" inputMode="numeric" value={goalDraft.current} onChange={(e) => setGoalDraft((d) => ({ ...d, current: e.target.value }))} />
                    </div>
                    <div className="field">
                      <div className="label">$ / month</div>
                      <input className="input" inputMode="numeric" value={goalDraft.monthly} onChange={(e) => setGoalDraft((d) => ({ ...d, monthly: e.target.value }))} />
                    </div>
                  </div>
                  <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
                    <div className="field" style={{ flex: 1 }}>
                      <div className="label">End date (optional)</div>
                      <input className="input" type="date" value={goalDraft.endDate} onChange={(e) => setGoalDraft((d) => ({ ...d, endDate: e.target.value }))} />
                    </div>
                    <button className="btn primary" onClick={addGoal}><Plus size={16} /> Add goal</button>
                  </div>
                </div>

                <div className="small muted" style={{ marginTop: 10 }}>
                  Tip: setting an end date enables “on track” guidance. Without it, we preview the next 12 months.
                </div>
              </div>

              {goals.length === 0 ? (
                <div className="tile muted">No goals yet. Add one to see progress.</div>
              ) : (
                <div className="grid-3">
                  {goals.map((g) => {
                    const gp = goalProgress.find((x) => x.id === g.id);
                    const monthsLeft = gp?.mLeft;

                    const etaText = () => {
                      const target = safeNum(g.target);
                      const current = safeNum(g.current);
                      const monthly = safeNum(g.monthly);
                      if (target <= 0) return "";
                      const remaining = Math.max(0, target - current);
                      if (monthly <= 0) return "Add a $/mo to estimate timing.";
                      const m = Math.ceil(remaining / monthly);
                      return `At this pace, you’ll reach this in ~${m} months.`;
                    };

                    return (
                      <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <BucketTile
                          title={g.name}
                          subtitle={`Category: ${g.category}`}
                          currentPct={gp?.pct ?? 0}
                          projectedPct={gp?.projectedPct ?? 0}
                          status={gp?.status ?? null}
                          footer={monthsLeft !== null ? `${monthsLeft} months left` : etaText()}
                        />

                        <div className="note">
                          <div className="grid-2">
                            <div className="field">
                              <div className="label">Target</div>
                              <input className="input" inputMode="numeric" value={g.target} onChange={(e) => updateGoal(g.id, { target: safeNum(e.target.value) })} />
                            </div>
                            <div className="field">
                              <div className="label">Current</div>
                              <input className="input" inputMode="numeric" value={g.current} onChange={(e) => updateGoal(g.id, { current: safeNum(e.target.value) })} />
                            </div>
                          </div>

                          <div className="grid-2" style={{ marginTop: 10 }}>
                            <div className="field">
                              <div className="label">$ / month</div>
                              <input className="input" inputMode="numeric" value={g.monthly} onChange={(e) => updateGoal(g.id, { monthly: safeNum(e.target.value) })} />
                            </div>
                            <div className="field">
                              <div className="label">End date</div>
                              <input className="input" type="date" value={g.endDate} onChange={(e) => updateGoal(g.id, { endDate: e.target.value })} />
                            </div>
                          </div>

                          <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                            <button className="btn" onClick={() => removeGoal(g.id)} title="Remove">
                              <Trash2 size={16} /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NET WORTH */}
        {activeTab === "networth" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 className="h1">Net Worth</h2>
                <p className="sub">Add assets and liabilities—net worth updates automatically. (Account linking comes later.)</p>
              </div>

              <div className="grid-2">
                <div className="note">
                  <div style={{ fontWeight: 850 }}>Assets (includes investments)</div>
                  <div className="divider" />
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <div className="label">Name</div>
                      <input className="input" value={assetDraft.name} onChange={(e) => setAssetDraft({ ...assetDraft, name: e.target.value })} placeholder="Home, 401k, Brokerage" />
                    </div>
                    <div className="field">
                      <div className="label">Value</div>
                      <input className="input" inputMode="numeric" value={assetDraft.value} onChange={(e) => setAssetDraft({ ...assetDraft, value: e.target.value })} placeholder="e.g., 250000" />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 10 }}>
                    <div className="field" style={{ flex: 1 }}>
                      <div className="label">Type</div>
                      <select value={assetDraft.type} onChange={(e) => setAssetDraft({ ...assetDraft, type: e.target.value })}>
                        <option>Investment</option>
                        <option>Real Estate</option>
                        <option>Cash</option>
                        <option>Vehicle</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <button className="btn primary" onClick={addAsset}><Plus size={16} /> Add</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {assets.length === 0 ? <div className="muted small">No assets yet.</div> : null}
                    {assets.map((a) => (
                      <div key={a.id} className="tile">
                        <div className="grid-2" style={{ gap: 10 }}>
                          <input className="input" value={a.name} onChange={(e) => updateAsset(a.id, "name", e.target.value)} />
                          <div className="row" style={{ alignItems: "center", gap: 10 }}>
                            <input className="input" inputMode="numeric" value={String(a.value)} onChange={(e) => updateAsset(a.id, "value", safeNum(e.target.value))} style={{ flex: 1 }} />
                            <button className="btn ghost" onClick={() => removeAsset(a.id)} title="Remove"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="small muted" style={{ marginTop: 6 }}>{a.type}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="note">
                  <div style={{ fontWeight: 850 }}>Liabilities</div>
                  <div className="divider" />
                  <div className="grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <div className="label">Name</div>
                      <input className="input" value={liabDraft.name} onChange={(e) => setLiabDraft({ ...liabDraft, name: e.target.value })} placeholder="Mortgage, Student loan" />
                    </div>
                    <div className="field">
                      <div className="label">Balance</div>
                      <input className="input" inputMode="numeric" value={liabDraft.balance} onChange={(e) => setLiabDraft({ ...liabDraft, balance: e.target.value })} placeholder="e.g., 180000" />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                    <button className="btn primary" onClick={addLiability}><Plus size={16} /> Add</button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                    {liabilities.length === 0 ? <div className="muted small">No liabilities yet.</div> : null}
                    {liabilities.map((l) => (
                      <div key={l.id} className="tile">
                        <div className="grid-2" style={{ gap: 10 }}>
                          <input className="input" value={l.name} onChange={(e) => updateLiability(l.id, "name", e.target.value)} />
                          <div className="row" style={{ alignItems: "center", gap: 10 }}>
                            <input className="input" inputMode="numeric" value={String(l.balance)} onChange={(e) => updateLiability(l.id, "balance", safeNum(e.target.value))} style={{ flex: 1 }} />
                            <button className="btn ghost" onClick={() => removeLiability(l.id)} title="Remove"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid-2">
                <div className="tile">
                  <div className="label">Assets</div>
                  <div className="big-number" style={{ cursor: "default" }}>{formatMoney(totalAssets)}</div>
                </div>
                <div className="tile">
                  <div className="label">Liabilities</div>
                  <div className="big-number" style={{ cursor: "default" }}>{formatMoney(totalLiabilities)}</div>
                </div>
              </div>

              <div className="tile">
                <div className="label">Net worth</div>
                <div className="big-number" style={{ cursor: "default", color: netWorth < 0 ? "#ef4444" : "#16a34a" }}>
                  {formatMoney(netWorth)}
                </div>
              </div>

              <div className="note">
                <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 850 }}>Net worth over time</div>
                  <div className="small muted">(Auto snapshots monthly. Account linking comes later.)</div>
                </div>
                <div style={{ height: 260, marginTop: 10 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netWorthHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                      <ReTooltip formatter={(v) => formatMoney(Number(v))} />
                      <Line type="monotone" dataKey="value" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RETIREMENT */}
        {activeTab === "retirement" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 className="h1">Retirement</h2>
                <p className="sub">Sustain what matters — without needing perfection.</p>
              </div>

              <div className="note">
                <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 850 }}>Retirement target</div>
                    <div className="small muted" style={{ marginTop: 4 }}>Toggle whether to include temporary items.</div>
                  </div>
                  <Tip text="This is a simple, high-level target. We can add a timeline and inflation next." />
                </div>

                <button
                  className="btn"
                  style={{ marginTop: 12 }}
                  onClick={() => setRetirementView((v) => (v === "ongoing" ? "all" : "ongoing"))}
                >
                  {retirementView === "ongoing" ? "Ongoing (tap to include temporary)" : "Including temporary (tap for ongoing)"}
                </button>

                <div className="big-number" style={{ cursor: "default", marginTop: 10 }}>
                  {formatMoney(retirementView === "all" ? retirementTargetAll : retirementTargetOngoing)}
                </div>

                <div className="grid-2" style={{ marginTop: 14 }}>
                  <div className="field">
                    <div className="label">Withdrawal rate</div>
                    <div className="row" style={{ alignItems: "center", gap: 10 }}>
                      <input
                        type="range"
                        className="range"
                        min={2.5}
                        max={6}
                        step={0.25}
                        value={swr * 100}
                        onChange={(e) => setSwr(safeNum(e.target.value) / 100)}
                        style={{ flex: 1 }}
                      />
                      <input
                        className="input"
                        style={{ width: 92 }}
                        inputMode="decimal"
                        value={(swr * 100).toFixed(2)}
                        onChange={(e) => setSwr(safeNum(e.target.value) / 100)}
                      />
                      <span className="small muted">%</span>
                    </div>
                    <div className="small muted" style={{ marginTop: 8 }}>
                      Most people explore ~3%–5%. Higher rates lower the target but increase risk.
                    </div>
                  </div>

                  <div className="tile">
                    <div className="small muted">Monthly spending (all)</div>
                    <div style={{ fontWeight: 850, fontSize: 18, marginTop: 6 }}>{formatMoney(monthlyIkigaiAll)}</div>
                    <div className="small muted" style={{ marginTop: 14 }}>Monthly spending (ongoing)</div>
                    <div style={{ fontWeight: 850, fontSize: 18, marginTop: 6 }}>{formatMoney(monthlyIkigaiOngoing)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT */}
        {activeTab === "about" && (
          <div className="card">
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 820 }}>
              <h2 className="h1">About</h2>
              <p className="sub">
                Ikigai is often translated as “a reason for being” — what gets you up in the morning.
              </p>

              <div className="note">
                <div style={{ fontWeight: 850, marginBottom: 6 }}>What Ikigai means in this app</div>
                <div className="small">
                  Financial planning is rarely just about money. It’s about funding what matters to you.
                  Ikigai doesn’t tell people what to do. It shows them what their life implies — and lets them decide.
                </div>
              </div>

              <div className="note">
                <div style={{ fontWeight: 850, marginBottom: 6 }}>Tone and intent</div>
                <div className="small">
                  We aim for calm and reassuring — realistic but supportive. Life changes; budgets aren’t moral report cards.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* First-time only: finish onboarding button (when they’re done) */}
        {!onboardingDone && activeTab !== "home" ? (
          <div className="note" style={{ marginTop: 14 }}>
            <div className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <div className="small muted">Still onboarding? You can finish anytime.</div>
              <button className="btn" onClick={finishOnboarding}>Mark onboarding done</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
