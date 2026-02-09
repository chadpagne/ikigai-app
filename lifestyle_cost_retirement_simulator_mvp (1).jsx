import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash,
  Home,
  Wallet,
  BarChart3,
  PiggyBank,
  LineChart as LineChartIcon,
  Menu,
  Info,
  Shield,
  Sparkles,
  ChevronDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/**
 * Ikigai v0.4
 * - Home-only Basics (guided first-time onboarding)
 * - Ikigai header + tabs + hamburger placeholder
 * - "Build Your Ikigai" (formerly Lifestyle)
 * - Savings Goals: honest % (current) + projected overlay for $/mo impact
 * - Net Worth inputs before summary + chart
 * - Retirement target toggle (ongoing vs incl. temp)
 */

// ------------------------------
// Utilities
// ------------------------------
const BRAND_GREEN = "#2f7f6f";
const BRAND_BLUE = "#3a9fbf";

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function formatMoney(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(0)}`;
}

function formatPct(n: number, decimals = 2) {
  return `${(n * 100).toFixed(decimals)}%`;
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(from: Date, toISO: string) {
  const to = new Date(toISO);
  const a = from.getFullYear() * 12 + from.getMonth();
  const b = to.getFullYear() * 12 + to.getMonth();
  return Math.max(0, b - a);
}

function onEnterBlur(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
}

// ------------------------------
// Tiny UI helpers
// ------------------------------
function Tip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full border bg-white text-neutral-600"
      title={text}
      aria-label="Info"
    >
      <Info className="h-4 w-4" />
    </span>
  );
}

function Pill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "text-xs px-2 py-1 rounded-full border transition " +
        (active
          ? `border-[${BRAND_GREEN}] bg-[#e7f3f0] text-[#1f5b50]`
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50")
      }
    >
      {label}
    </button>
  );
}

function NeedWantPill({ value }: { value: "need" | "want" }) {
  const isNeed = value === "need";
  const Icon = isNeed ? Shield : Sparkles;
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border whitespace-nowrap " +
        (isNeed
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800")
      }
      title={isNeed ? "Need" : "Want"}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="leading-none">{isNeed ? "Need" : "Want"}</span>
    </span>
  );
}

function BucketTile({
  title,
  subtitle,
  currentPct,
  projectedPct,
  footer,
  status,
}: {
  title: string;
  subtitle?: string;
  currentPct: number;
  projectedPct: number;
  footer?: string;
  status?: "on_track" | "behind" | null;
}) {
  const cur = clamp01(currentPct);
  const proj = clamp01(projectedPct);
  const curLabel = `${Math.round(cur * 100)}%`;

  return (
    <div className="border rounded-2xl bg-white overflow-hidden relative">
      {/* base fill = current */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: `${cur * 100}%`, background: BRAND_BLUE, opacity: 0.18 }}
      />
      {/* overlay fill = projected impact of $/mo */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: `${proj * 100}%`, background: BRAND_BLUE, opacity: 0.34 }}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{title}</p>
            {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {status ? (
              <span
                className={
                  "text-[11px] px-2 py-1 rounded-full border " +
                  (status === "on_track"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800")
                }
                title={status === "on_track" ? "On track" : "Behind"}
              >
                {status === "on_track" ? "On track" : "Behind"}
              </span>
            ) : null}
            <div className="text-sm font-semibold text-neutral-700">{curLabel}</div>
          </div>
        </div>

        {footer ? <div className="text-sm text-neutral-600 mt-3">{footer}</div> : null}

        <div className="text-xs text-neutral-500 mt-2">
          <span className="font-medium">Solid</span> = what you have now. <span className="font-medium">Tint</span> =
          what your current $/mo can reach.
        </div>
      </div>
    </div>
  );
}

// ------------------------------
// Data models
// ------------------------------
type IncomeSource = { id: string; name: string; monthly: number };

type IkigaiItem = {
  id: string;
  name: string;
  category: string;
  monthly: number;
  needWant: "need" | "want";
  temporary: boolean;
  endDate: string; // ISO
};

type Goal = {
  id: string;
  name: string;
  category: string;
  target: number;
  current: number;
  monthly: number;
  endDate: string;
};

type Asset = { id: string; name: string; type: string; value: number };

type Liability = { id: string; name: string; balance: number };

type Profile = {
  age: string;
  location: string;
  relationship: string;
  kids: number;
  pets: number;
  incomeSources: IncomeSource[];
};

const DEFAULT_PROFILE: Profile = {
  age: "",
  location: "",
  relationship: "",
  kids: 0,
  pets: 0,
  incomeSources: [{ id: crypto.randomUUID(), name: "Salary", monthly: 0 }],
};

const IKIGAI_CATEGORIES: { name: string; icon: React.ReactNode; color: string }[] = [
  { name: "Housing", icon: <Home className="h-4 w-4" />, color: "#7aa6a1" },
  { name: "Car / Transportation", icon: <Wallet className="h-4 w-4" />, color: "#a0a9b8" },
  { name: "Food & Drink", icon: <BarChart3 className="h-4 w-4" />, color: "#d1a06a" },
  { name: "Utilities", icon: <BarChart3 className="h-4 w-4" />, color: "#8aa4c6" },
  { name: "Insurance", icon: <Shield className="h-4 w-4" />, color: "#93b8a0" },
  { name: "Health & Fitness", icon: <BarChart3 className="h-4 w-4" />, color: "#b88fb7" },
  { name: "Personal Care", icon: <BarChart3 className="h-4 w-4" />, color: "#c6a48a" },
  { name: "Entertainment", icon: <BarChart3 className="h-4 w-4" />, color: "#caa1a7" },
  { name: "Household", icon: <BarChart3 className="h-4 w-4" />, color: "#9fb0a2" },
  { name: "Clothing", icon: <BarChart3 className="h-4 w-4" />, color: "#a8a6c7" },
  { name: "Subscriptions", icon: <BarChart3 className="h-4 w-4" />, color: "#b1b1b1" },
  { name: "Travel & Vacation", icon: <BarChart3 className="h-4 w-4" />, color: "#7fb6c4" },
  { name: "Education", icon: <BarChart3 className="h-4 w-4" />, color: "#b6a07f" },
  { name: "Donations", icon: <BarChart3 className="h-4 w-4" />, color: "#9ab6c4" },
  { name: "Debt payments", icon: <BarChart3 className="h-4 w-4" />, color: "#c08f7e" },
  { name: "Fees", icon: <BarChart3 className="h-4 w-4" />, color: "#9e9e9e" },
  { name: "Pet", icon: <BarChart3 className="h-4 w-4" />, color: "#a7b98b" },
  { name: "Other", icon: <Plus className="h-4 w-4" />, color: "#8f9aa7" },
];

const GOAL_PRESETS = ["Emergency", "Vacation", "Occasion", "Home down payment", "Car down payment", "Education", "Other"];

// ------------------------------
// Main App
// ------------------------------
export default function IkigaiApp() {
  // Tabs
  const [activeTab, setActiveTab] = useState<"home" | "ikigai" | "goals" | "networth" | "retirement">("home");

  // First-time onboarding
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Profile (Home-only)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);

  // Ikigai items
  const [items, setItems] = useState<IkigaiItem[]>([]);

  // Quick add draft
  const [quickDraft, setQuickDraft] = useState({ name: "", category: "Other", monthly: "", needWant: "need" as "need" | "want", temporary: false, endDate: "" });

  // Goals
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalDraft, setGoalDraft] = useState({ name: "", category: "Emergency", target: "", current: "", monthly: "", endDate: "" });

  // Net worth
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [assetDraft, setAssetDraft] = useState({ name: "", value: "", type: "Investment" });
  const [liabDraft, setLiabDraft] = useState({ name: "", balance: "" });
  const [netWorthHistory, setNetWorthHistory] = useState<{ t: string; value: number }[]>([]);

  // Summary toggles
  const [spendingView, setSpendingView] = useState<"monthly" | "annual">("monthly");
  const [retirementView, setRetirementView] = useState<"ongoing" | "all">("ongoing");

  // Retirement settings
  const [swr, setSwr] = useState(0.04);

  // ------------------------------
  // Persistence
  // ------------------------------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ikigai_v04_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.items) setItems(parsed.items);
        if (parsed.goals) setGoals(parsed.goals);
        if (parsed.assets) setAssets(parsed.assets);
        if (parsed.liabilities) setLiabilities(parsed.liabilities);
        if (parsed.netWorthHistory) setNetWorthHistory(parsed.netWorthHistory);
        if (typeof parsed.onboardingDone === "boolean") setOnboardingDone(parsed.onboardingDone);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "ikigai_v04_state",
        JSON.stringify({ profile, items, goals, assets, liabilities, netWorthHistory, onboardingDone })
      );
    } catch {
      // ignore
    }
  }, [profile, items, goals, assets, liabilities, netWorthHistory, onboardingDone]);

  // ------------------------------
  // Derived numbers
  // ------------------------------
  const totalIncomeMonthly = useMemo(() => profile.incomeSources.reduce((s, x) => s + safeNum(x.monthly), 0), [profile.incomeSources]);

  const monthlyIkigaiOngoing = useMemo(
    () => items.filter((i) => !i.temporary).reduce((s, i) => s + safeNum(i.monthly), 0),
    [items]
  );

  const monthlyIkigaiAll = useMemo(() => items.reduce((s, i) => s + safeNum(i.monthly), 0), [items]);

  const monthlySpendForSummary = spendingView === "monthly" ? monthlyIkigaiAll : monthlyIkigaiAll * 12;

  const leftoverMonthly = useMemo(() => Math.max(0, totalIncomeMonthly - monthlyIkigaiAll), [totalIncomeMonthly, monthlyIkigaiAll]);

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

  const totalAssets = useMemo(() => assets.reduce((s, a) => s + safeNum(a.value), 0), [assets]);
  const totalLiabilities = useMemo(() => liabilities.reduce((s, l) => s + safeNum(l.balance), 0), [liabilities]);
  const netWorth = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.category, (map.get(it.category) ?? 0) + safeNum(it.monthly));
    }
    const rows = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [items]);

  const goalProgress = useMemo(() => {
    const now = new Date();
    return goals.map((g) => {
      const target = safeNum(g.target);
      const current = safeNum(g.current);
      const monthly = safeNum(g.monthly);
      const mLeft = g.endDate ? monthsBetween(now, g.endDate) : null;

      let pct = 0; // current-only (honest completion)
      let projectedPct = 0; // shows effect of $/mo to horizon
      let status: "on_track" | "behind" | null = null;

      if (target > 0) {
        pct = clamp01(current / target);
        const monthsHorizon = mLeft !== null ? mLeft : 12;
        const projected = current + monthly * monthsHorizon;
        projectedPct = clamp01(projected / target);

        if (mLeft !== null && mLeft > 0) {
          const required = Math.max(0, target - current) / mLeft;
          status = monthly >= required ? "on_track" : "behind";
        }
      }

      return { id: g.id, pct, projectedPct, status, mLeft };
    });
  }, [goals]);

  // ------------------------------
  // Mutators
  // ------------------------------
  function setIncomeSource(id: string, patch: Partial<IncomeSource>) {
    setProfile((p) => ({
      ...p,
      incomeSources: p.incomeSources.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }

  function addIncomeSource() {
    setProfile((p) => ({
      ...p,
      incomeSources: [...p.incomeSources, { id: crypto.randomUUID(), name: "Other income", monthly: 0 }],
    }));
  }

  function removeIncomeSource(id: string) {
    setProfile((p) => ({ ...p, incomeSources: p.incomeSources.filter((x) => x.id !== id) }));
  }

  function addQuickItem(preset?: { name: string; category: string }) {
    const name = preset?.name ?? quickDraft.name.trim();
    if (!name) return;
    const monthly = safeNum(quickDraft.monthly);
    setItems((arr) => [
      {
        id: crypto.randomUUID(),
        name,
        category: preset?.category ?? quickDraft.category,
        monthly,
        needWant: quickDraft.needWant,
        temporary: quickDraft.temporary,
        endDate: quickDraft.endDate,
      },
      ...arr,
    ]);
    setQuickDraft((d) => ({ ...d, name: "", monthly: "", temporary: false, endDate: "" }));
  }

  function updateItem(id: string, patch: Partial<IkigaiItem>) {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removeItem(id: string) {
    setItems((arr) => arr.filter((x) => x.id !== id));
  }

  function addGoal() {
    const name = goalDraft.name.trim();
    if (!name) return;
    setGoals((arr) => [
      {
        id: crypto.randomUUID(),
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

  function updateGoal(id: string, patch: Partial<Goal>) {
    setGoals((arr) => arr.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGoal(id: string) {
    setGoals((arr) => arr.filter((g) => g.id !== id));
  }

  function addAsset() {
    const name = assetDraft.name.trim();
    if (!name) return;
    setAssets((arr) => [
      { id: crypto.randomUUID(), name, type: assetDraft.type, value: safeNum(assetDraft.value) },
      ...arr,
    ]);
    setAssetDraft({ name: "", value: "", type: "Investment" });
  }

  function updateAsset(id: string, key: keyof Asset, value: any) {
    setAssets((arr) => arr.map((a) => (a.id === id ? { ...a, [key]: value } : a)));
  }

  function removeAsset(id: string) {
    setAssets((arr) => arr.filter((a) => a.id !== id));
  }

  function addLiability() {
    const name = liabDraft.name.trim();
    if (!name) return;
    setLiabilities((arr) => [{ id: crypto.randomUUID(), name, balance: safeNum(liabDraft.balance) }, ...arr]);
    setLiabDraft({ name: "", balance: "" });
  }

  function updateLiability(id: string, key: keyof Liability, value: any) {
    setLiabilities((arr) => arr.map((l) => (l.id === id ? { ...l, [key]: value } : l)));
  }

  function removeLiability(id: string) {
    setLiabilities((arr) => arr.filter((l) => l.id !== id));
  }

  function snapshotNetWorth() {
    setNetWorthHistory((arr) => {
      const next = [...arr];
      next.push({ t: monthKey(new Date()), value: netWorth });
      // keep last 24
      return next.slice(-24);
    });
  }

  // ------------------------------
  // Onboarding
  // ------------------------------
  const showOnboarding = !onboardingDone;

  function finishOnboarding() {
    setOnboardingDone(true);
    setOnboardingStep(1);
  }

  // ------------------------------
  // Header + Nav
  // ------------------------------
  const tabBtn = (id: any, label: string, IconEl: any) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition " +
          (active
            ? `border-[${BRAND_GREEN}] bg-[#e7f3f0] text-[#1f5b50]`
            : "border-transparent hover:border-neutral-200 hover:bg-white/60 text-neutral-700")
        }
      >
        <IconEl className="h-4 w-4" />
        {label}
      </button>
    );
  };

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6fbf9] to-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold tracking-tight" style={{ color: BRAND_GREEN }}>
              Ikigai
            </div>
            <Tip
              text={
                "Ikigai is often translated as ‘a reason for being.’ This tool helps you understand and prioritize what is your reason for being — and how to support it over time."
              }
            />
          </div>

          <div className="hidden md:flex items-center gap-2">
            {tabBtn("home", "Home", Home)}
            {tabBtn("ikigai", "Build Your Ikigai", Wallet)}
            {tabBtn("goals", "Savings Goals", PiggyBank)}
            {tabBtn("networth", "Net Worth", LineChartIcon)}
            {tabBtn("retirement", "Retirement", BarChart3)}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border hover:bg-white"
              title="Menu (coming soon)"
            >
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline text-sm text-neutral-700">Menu</span>
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="md:hidden max-w-6xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {tabBtn("home", "Home", Home)}
          {tabBtn("ikigai", "Ikigai", Wallet)}
          {tabBtn("goals", "Goals", PiggyBank)}
          {tabBtn("networth", "Net Worth", LineChartIcon)}
          {tabBtn("retirement", "Retire", BarChart3)}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* HOME */}
        {activeTab === "home" && (
          <Card className="rounded-2xl shadow-sm border-[#d7e7e3]">
            <CardContent className="p-6 space-y-6">
              {/* Guided onboarding (first time only) */}
              {showOnboarding ? (
                <div className="max-w-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">Home</h2>
                      <p className="text-neutral-600 mt-1">
                        Everyone’s life has tradeoffs. Let’s start with where you are right now.
                      </p>
                    </div>
                    <Button variant="outline" onClick={finishOnboarding}>
                      Skip for now
                    </Button>
                  </div>

                  <div className="mt-6 border rounded-2xl bg-white p-5">
                    {onboardingStep === 1 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-500">Step 1 of 4</p>
                            <p className="text-lg font-medium">You</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Age</Label>
                            <Input value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} onKeyDown={onEnterBlur} />
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              value={profile.location}
                              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                              placeholder="Los Angeles, CA, USA"
                              onKeyDown={onEnterBlur}
                            />
                          </div>
                          <div>
                            <Label>Relationship</Label>
                            <select
                              className="border rounded-md p-2 w-full"
                              value={profile.relationship}
                              onChange={(e) => setProfile({ ...profile, relationship: e.target.value })}
                            >
                              <option value="">Select</option>
                              <option>Single</option>
                              <option>Partnered</option>
                              <option>Married</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Kids</Label>
                              <Input
                                type="number"
                                value={profile.kids}
                                onChange={(e) => setProfile({ ...profile, kids: safeNum(e.target.value) })}
                                onKeyDown={onEnterBlur}
                              />
                            </div>
                            <div>
                              <Label>Pets</Label>
                              <Input
                                type="number"
                                value={profile.pets}
                                onChange={(e) => setProfile({ ...profile, pets: safeNum(e.target.value) })}
                                onKeyDown={onEnterBlur}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="text-sm text-neutral-500 flex items-center gap-2">
                            <Tip text="Your stage of life shapes what ‘enough’ looks like. Nothing here is permanent." />
                            <span>Nothing here is permanent.</span>
                          </div>
                          <Button
                            onClick={() => setOnboardingStep(2)}
                            className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}

                    {onboardingStep === 2 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-neutral-500">Step 2 of 4</p>
                          <p className="text-lg font-medium">What supports your life</p>
                          <p className="text-sm text-neutral-600 mt-1">What currently supports your life?</p>
                        </div>

                        <div className="space-y-3">
                          {profile.incomeSources.map((src, idx) => (
                            <div key={src.id} className="grid grid-cols-12 gap-2 items-end">
                              <div className="col-span-7">
                                <Label>Source</Label>
                                <Input
                                  value={src.name}
                                  onChange={(e) => setIncomeSource(src.id, { name: e.target.value })}
                                />
                              </div>
                              <div className="col-span-4">
                                <Label>Monthly</Label>
                                <Input
                                  type="number"
                                  value={src.monthly}
                                  onChange={(e) => setIncomeSource(src.id, { monthly: safeNum(e.target.value) })}
                                  onKeyDown={onEnterBlur}
                                />
                              </div>
                              <div className="col-span-1 flex justify-end">
                                {profile.incomeSources.length > 1 ? (
                                  <Button variant="ghost" onClick={() => removeIncomeSource(src.id)}>
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between">
                            <Button variant="outline" onClick={addIncomeSource}>
                              <Plus className="h-4 w-4 mr-2" /> Add income source
                            </Button>
                            <div className="text-sm text-neutral-700">
                              Total monthly: <span className="font-semibold">{formatMoney(totalIncomeMonthly)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-neutral-500">This doesn’t need to be perfect. You can refine it anytime.</p>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button variant="outline" onClick={() => setOnboardingStep(1)}>
                            Back
                          </Button>
                          <Button
                            onClick={() => setOnboardingStep(3)}
                            className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}

                    {onboardingStep === 3 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-neutral-500">Step 3 of 4</p>
                          <p className="text-lg font-medium">What matters today</p>
                          <p className="text-sm text-neutral-600 mt-1">
                            How you spend money often reflects what matters most. Start with a few things.
                          </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          {["Housing", "Food & Drink", "Car / Transportation", "Other"].map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="border rounded-2xl p-4 bg-white hover:bg-neutral-50 text-left"
                              onClick={() => {
                                setActiveTab("ikigai");
                                setQuickDraft((d) => ({ ...d, category: c }));
                              }}
                            >
                              <p className="font-medium">{c}</p>
                              <p className="text-sm text-neutral-500 mt-1">Tap to add</p>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Button variant="outline" onClick={() => setOnboardingStep(2)}>
                            Back
                          </Button>
                          <Button
                            onClick={() => setOnboardingStep(4)}
                            className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    )}

                    {onboardingStep === 4 && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-neutral-500">Step 4 of 4</p>
                          <p className="text-lg font-medium">Looking ahead</p>
                          <p className="text-sm text-neutral-600 mt-1">Some parts of life are worth planning for.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => {
                              setActiveTab("goals");
                              finishOnboarding();
                            }}
                            className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}
                          >
                            Add a savings goal
                          </Button>
                          <Button variant="outline" onClick={finishOnboarding}>
                            Skip for now
                          </Button>
                        </div>

                        <div className="text-sm text-neutral-500 flex items-center gap-2">
                          <Tip text="Planning doesn’t mean committing — it means seeing." />
                          <span>Planning doesn’t mean committing — it means seeing.</span>
                        </div>

                        <div className="pt-2">
                          <div className="border rounded-2xl p-4 bg-[#f6fbf9]">
                            <p className="font-medium">Your Ikigai is taking shape.</p>
                            <p className="text-sm text-neutral-600 mt-1">You can change any of this as life changes.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Home dashboard
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">Home</h2>
                      <p className="text-sm text-neutral-500 mt-1">A calm snapshot of your life right now.</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOnboardingDone(false);
                        setOnboardingStep(1);
                      }}
                      title="Re-run the guided setup"
                    >
                      Edit basics
                    </Button>
                  </div>

                  {/* Snapshot tiles */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border p-4 bg-white/70">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-500">Spending</p>
                        <Tip text="This reflects your current life — not a rule you must follow forever." />
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          className="text-2xl font-bold flex items-center gap-2 hover:opacity-80"
                          onClick={() => setSpendingView((v) => (v === "monthly" ? "annual" : "monthly"))}
                          title="Toggle monthly/annual"
                        >
                          {formatMoney(monthlySpendForSummary)}
                          <span className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                            {spendingView === "monthly" ? "Monthly" : "Annual"} <ChevronDown className="h-3 w-3" />
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4 bg-white/70">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-500">Savings rate</p>
                        <Tip text="This naturally changes as priorities and seasons shift." />
                      </div>
                      <p className="text-2xl font-bold mt-2">{formatPct(savingsRate, 2)}</p>
                    </div>

                    <div className="rounded-2xl border p-4 bg-white/70">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-500">Leftover money</p>
                        <Tip text="This is the part of your money you actively choose how to direct." />
                      </div>
                      <p className="text-2xl font-bold mt-2">{formatMoney(leftoverMonthly)}</p>
                      <p className="text-xs text-neutral-500 mt-1">Based on monthly income – monthly spending.</p>
                    </div>

                    <div className="rounded-2xl border p-4 bg-white/70">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-neutral-500">Retirement target</p>
                        <Tip text="This adjusts as your Ikigai evolves." />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Pill active={retirementView === "ongoing"} label="Ongoing" onClick={() => setRetirementView("ongoing")} />
                        <Pill active={retirementView === "all"} label="Incl. temp" onClick={() => setRetirementView("all")} />
                      </div>
                      <p className="text-2xl font-bold mt-2">
                        {formatMoney(retirementView === "all" ? retirementTargetAll : retirementTargetOngoing)}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">Uses withdrawal rate {formatPct(swr, 2)}.</p>
                    </div>
                  </div>

                  {/* Gentle context */}
                  <div className="rounded-2xl border p-4 bg-white">
                    <p className="text-sm text-neutral-700">
                      People at a similar stage often see spending shift as life fills out. This snapshot reflects a real,
                      normal season.
                    </p>
                  </div>

                  {/* Pathways */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      className="rounded-2xl border p-4 bg-white text-left hover:bg-neutral-50"
                      onClick={() => setActiveTab("ikigai")}
                    >
                      <p className="font-medium">Build Your Ikigai</p>
                      <p className="text-sm text-neutral-500 mt-1">Refine how spending reflects what matters.</p>
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border p-4 bg-white text-left hover:bg-neutral-50"
                      onClick={() => setActiveTab("goals")}
                    >
                      <p className="font-medium">Savings Goals</p>
                      <p className="text-sm text-neutral-500 mt-1">See how today’s choices affect future plans.</p>
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border p-4 bg-white text-left hover:bg-neutral-50"
                      onClick={() => setActiveTab("networth")}
                    >
                      <p className="font-medium">Net Worth</p>
                      <p className="text-sm text-neutral-500 mt-1">Understand how everything connects over time.</p>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* BUILD YOUR IKIGAI */}
        {activeTab === "ikigai" && (
          <Card className="rounded-2xl shadow-sm border-[#d7e7e3]">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Build Your Ikigai</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Some parts of life are essential. Others bring meaning. Most are a mix.
                  </p>
                </div>
              </div>

              {/* Category strip */}
              <div className="flex flex-wrap gap-2">
                {IKIGAI_CATEGORIES.slice(0, 10).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-neutral-50 text-sm"
                    onClick={() => setQuickDraft((d) => ({ ...d, category: c.name }))}
                    title={`Set category to ${c.name}`}
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg" style={{ background: c.color + "33" }}>
                      {c.icon}
                    </span>
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Quick add */}
              <div className="rounded-2xl border p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Quick Add</h3>
                    <p className="text-sm text-neutral-500 mt-1">Start with what matters. You can refine anytime.</p>
                  </div>
                  <Tip text="Add a real item (Groceries, Gas, Gym, Coffee) and see everything update instantly." />
                </div>

                <div className="grid md:grid-cols-12 gap-3 mt-4 items-end">
                  <div className="md:col-span-4">
                    <Label>What is it?</Label>
                    <Input
                      value={quickDraft.name}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Groceries, Gas, Gym, Coffee"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Category</Label>
                    <select
                      className="border rounded-md p-2 w-full"
                      value={quickDraft.category}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, category: e.target.value }))}
                    >
                      {IKIGAI_CATEGORIES.map((c) => (
                        <option key={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Monthly</Label>
                    <Input
                      type="number"
                      value={quickDraft.monthly}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, monthly: e.target.value }))}
                      onKeyDown={onEnterBlur}
                      placeholder="$"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Need / Want</Label>
                    <select
                      className="border rounded-md p-2 w-full"
                      value={quickDraft.needWant}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, needWant: e.target.value as any }))}
                    >
                      <option value="need">Need</option>
                      <option value="want">Want</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <Button onClick={() => addQuickItem()} className={`bg-[${BRAND_GREEN}] hover:bg-[#256658] w-full`}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={quickDraft.temporary}
                      onChange={(e) => setQuickDraft((d) => ({ ...d, temporary: e.target.checked }))}
                    />
                    Temporary
                  </label>
                  {quickDraft.temporary ? (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Ends (optional)</Label>
                      <Input
                        type="date"
                        value={quickDraft.endDate}
                        onChange={(e) => setQuickDraft((d) => ({ ...d, endDate: e.target.value }))}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Items list + pie */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">What you currently spend on</h3>
                    <Tip text="This is a mirror, not a grade. You can change anything." />
                  </div>

                  {items.length === 0 ? (
                    <div className="border rounded-2xl p-4 bg-white text-neutral-500">No items yet. Add a few to bring your Ikigai to life.</div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div key={it.id} className="border rounded-2xl p-3 bg-white">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5">
                              <Input value={it.name} onChange={(e) => updateItem(it.id, { name: e.target.value })} />
                              <div className="text-xs text-neutral-500 mt-1">{it.category}{it.temporary ? " • Temporary" : ""}</div>
                            </div>
                            <div className="col-span-3">
                              <Input
                                type="number"
                                value={it.monthly}
                                onChange={(e) => updateItem(it.id, { monthly: safeNum(e.target.value) })}
                                onKeyDown={onEnterBlur}
                              />
                              <div className="text-xs text-neutral-500 mt-1">Monthly</div>
                            </div>
                            <div className="col-span-3 flex items-center gap-2">
                              <NeedWantPill value={it.needWant} />
                              <button
                                type="button"
                                className="text-xs underline text-neutral-600"
                                onClick={() => updateItem(it.id, { needWant: it.needWant === "need" ? "want" : "need" })}
                                title="Toggle"
                              >
                                toggle
                              </button>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button variant="ghost" onClick={() => removeItem(it.id)}>
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">Summary</h3>
                      <p className="text-sm text-neutral-500 mt-1">A simple story of where your money goes.</p>
                    </div>
                    <Tip text="Pie chart shows your monthly spending split by category." />
                  </div>

                  <div className="h-64 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={spendingByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                          {spendingByCategory.map((row, idx) => (
                            <Cell
                              key={row.name}
                              fill={IKIGAI_CATEGORIES.find((c) => c.name === row.name)?.color ?? "#9aa3af"}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatMoney(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-2 text-sm text-neutral-700">
                    Monthly total: <span className="font-semibold">{formatMoney(monthlyIkigaiAll)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SAVINGS GOALS */}
        {activeTab === "goals" && (
          <Card className="rounded-2xl shadow-sm border-[#d7e7e3]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Savings Goals</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Progress should feel clear: what you have now — and how your monthly saving changes the future.
                </p>
              </div>

              <div className="rounded-2xl border p-4 bg-white">
                <div className="grid md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <Label>Name</Label>
                    <Input value={goalDraft.name} onChange={(e) => setGoalDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Emergency fund" />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Category</Label>
                    <select className="border rounded-md p-2 w-full" value={goalDraft.category} onChange={(e) => setGoalDraft((d) => ({ ...d, category: e.target.value }))}>
                      {GOAL_PRESETS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Target</Label>
                    <Input type="number" value={goalDraft.target} onChange={(e) => setGoalDraft((d) => ({ ...d, target: e.target.value }))} onKeyDown={onEnterBlur} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Current</Label>
                    <Input type="number" value={goalDraft.current} onChange={(e) => setGoalDraft((d) => ({ ...d, current: e.target.value }))} onKeyDown={onEnterBlur} />
                  </div>
                  <div className="md:col-span-1">
                    <Button onClick={addGoal} className={`bg-[${BRAND_GREEN}] hover:bg-[#256658] w-full`}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-12 gap-3 mt-3">
                  <div className="md:col-span-3">
                    <Label>$ / month</Label>
                    <Input type="number" value={goalDraft.monthly} onChange={(e) => setGoalDraft((d) => ({ ...d, monthly: e.target.value }))} onKeyDown={onEnterBlur} />
                  </div>
                  <div className="md:col-span-4">
                    <Label>End date (optional)</Label>
                    <Input type="date" value={goalDraft.endDate} onChange={(e) => setGoalDraft((d) => ({ ...d, endDate: e.target.value }))} />
                  </div>
                  <div className="md:col-span-5 flex items-end">
                    <p className="text-sm text-neutral-500">
                      Tip: setting an end date enables “on track” guidance. Without it, we preview the next 12 months.
                    </p>
                  </div>
                </div>
              </div>

              {goals.length === 0 ? (
                <div className="border rounded-2xl p-4 bg-white text-neutral-500">No goals yet. Add one to see the bucket fill.</div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
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
                      <div key={g.id} className="space-y-2">
                        <BucketTile
                          title={g.name}
                          subtitle={`Category: ${g.category}`}
                          currentPct={gp?.pct ?? 0}
                          projectedPct={gp?.projectedPct ?? 0}
                          status={gp?.status ?? null}
                          footer={monthsLeft !== null ? `${monthsLeft} months left` : etaText()}
                        />

                        <div className="border rounded-2xl p-3 bg-white">
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-6">
                              <Label className="text-xs">Target</Label>
                              <Input type="number" value={g.target} onChange={(e) => updateGoal(g.id, { target: safeNum(e.target.value) })} onKeyDown={onEnterBlur} />
                            </div>
                            <div className="col-span-6">
                              <Label className="text-xs">Current</Label>
                              <Input type="number" value={g.current} onChange={(e) => updateGoal(g.id, { current: safeNum(e.target.value) })} onKeyDown={onEnterBlur} />
                            </div>
                            <div className="col-span-6">
                              <Label className="text-xs">$ / month</Label>
                              <Input type="number" value={g.monthly} onChange={(e) => updateGoal(g.id, { monthly: safeNum(e.target.value) })} onKeyDown={onEnterBlur} />
                            </div>
                            <div className="col-span-5">
                              <Label className="text-xs">End date</Label>
                              <Input type="date" value={g.endDate} onChange={(e) => updateGoal(g.id, { endDate: e.target.value })} />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <Button variant="ghost" onClick={() => removeGoal(g.id)}>
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* NET WORTH */}
        {activeTab === "networth" && (
          <Card className="rounded-2xl shadow-sm border-[#d7e7e3]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Net Worth</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Add assets and liabilities first—net worth updates automatically. Snapshot to track over time.
                </p>
              </div>

              {/* Inputs first */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-medium">Assets (includes investments)</h3>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Name</Label>
                      <Input value={assetDraft.name} onChange={(e) => setAssetDraft({ ...assetDraft, name: e.target.value })} placeholder="Home, 401k, Brokerage" />
                    </div>
                    <div className="col-span-4">
                      <Label>Value</Label>
                      <Input type="number" value={assetDraft.value} onChange={(e) => setAssetDraft({ ...assetDraft, value: e.target.value })} onKeyDown={onEnterBlur} placeholder="$" />
                    </div>
                    <div className="col-span-3">
                      <Label>Type</Label>
                      <select className="border rounded-md p-2 w-full" value={assetDraft.type} onChange={(e) => setAssetDraft({ ...assetDraft, type: e.target.value })}>
                        <option>Investment</option>
                        <option>Real Estate</option>
                        <option>Cash</option>
                        <option>Vehicle</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="col-span-12">
                      <Button onClick={addAsset} className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}>
                        <Plus className="h-4 w-4 mr-2" /> Add asset
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {assets.length === 0 && <p className="text-neutral-400">No assets yet.</p>}
                    {assets.map((a) => (
                      <div key={a.id} className="border rounded-2xl p-3 bg-white">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <Input value={a.name} onChange={(e) => updateAsset(a.id, "name", e.target.value)} />
                          </div>
                          <div className="col-span-4">
                            <Input type="number" value={a.value} onChange={(e) => updateAsset(a.id, "value", safeNum(e.target.value))} onKeyDown={onEnterBlur} />
                          </div>
                          <div className="col-span-2">
                            <select className="border rounded-md p-2 w-full" value={a.type} onChange={(e) => updateAsset(a.id, "type", e.target.value)}>
                              <option>Investment</option>
                              <option>Real Estate</option>
                              <option>Cash</option>
                              <option>Vehicle</option>
                              <option>Other</option>
                            </select>
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button variant="ghost" onClick={() => removeAsset(a.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">Liabilities</h3>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                      <Label>Name</Label>
                      <Input value={liabDraft.name} onChange={(e) => setLiabDraft({ ...liabDraft, name: e.target.value })} placeholder="Mortgage, Student loan, Credit card" />
                    </div>
                    <div className="col-span-5">
                      <Label>Balance</Label>
                      <Input type="number" value={liabDraft.balance} onChange={(e) => setLiabDraft({ ...liabDraft, balance: e.target.value })} onKeyDown={onEnterBlur} placeholder="$" />
                    </div>
                    <div className="col-span-12">
                      <Button onClick={addLiability} className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}>
                        <Plus className="h-4 w-4 mr-2" /> Add liability
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {liabilities.length === 0 && <p className="text-neutral-400">No liabilities yet.</p>}
                    {liabilities.map((l) => (
                      <div key={l.id} className="border rounded-2xl p-3 bg-white">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7">
                            <Input value={l.name} onChange={(e) => updateLiability(l.id, "name", e.target.value)} />
                          </div>
                          <div className="col-span-4">
                            <Input type="number" value={l.balance} onChange={(e) => updateLiability(l.id, "balance", safeNum(e.target.value))} onKeyDown={onEnterBlur} />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button variant="ghost" onClick={() => removeLiability(l.id)}>
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary after */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-4 bg-white/70">
                  <p className="text-sm text-neutral-500">Assets</p>
                  <p className="text-2xl font-bold">{formatMoney(totalAssets)}</p>
                </div>
                <div className="rounded-2xl border p-4 bg-white/70">
                  <p className="text-sm text-neutral-500">Liabilities</p>
                  <p className="text-2xl font-bold">{formatMoney(totalLiabilities)}</p>
                </div>
              </div>

              <div className="rounded-2xl border p-4 bg-white/70 flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Net worth</p>
                  <p className={"text-3xl font-bold " + (netWorth < 0 ? "text-red-500" : "text-green-600")}>
                    {formatMoney(netWorth)}
                  </p>
                </div>
                <Button onClick={snapshotNetWorth} className={`bg-[${BRAND_GREEN}] hover:bg-[#256658]`}>
                  <Plus className="h-4 w-4 mr-2" /> Save snapshot
                </Button>
              </div>

              <div className="rounded-2xl border p-4 bg-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Net worth over time</h3>
                  <p className="text-xs text-neutral-500">(Projection + investment linking comes next.)</p>
                </div>
                <div className="h-64 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netWorthHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} />
                      <Line type="monotone" dataKey="value" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RETIREMENT */}
        {activeTab === "retirement" && (
          <Card className="rounded-2xl shadow-sm border-[#d7e7e3]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold">Retirement</h2>
                <p className="text-sm text-neutral-500 mt-1">Sustain what matters — without needing perfection.</p>
              </div>

              <div className="rounded-2xl border p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">Retirement target</p>
                    <p className="text-sm text-neutral-500 mt-1">Toggle whether to include temporary items.</p>
                  </div>
                  <Tip text="This is a simple, high-level target. We can add a timeline and inflation next." />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Pill active={retirementView === "ongoing"} label="Ongoing" onClick={() => setRetirementView("ongoing")} />
                  <Pill active={retirementView === "all"} label="Incl. temporary" onClick={() => setRetirementView("all")} />
                </div>

                <p className="text-3xl font-bold mt-3">
                  {formatMoney(retirementView === "all" ? retirementTargetAll : retirementTargetOngoing)}
                </p>

                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Withdrawal rate</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="range"
                        min={2.5}
                        max={6}
                        step={0.25}
                        value={swr * 100}
                        onChange={(e) => setSwr(safeNum(e.target.value) / 100)}
                        className="w-full"
                      />
                      <Input
                        className="w-24"
                        value={(swr * 100).toFixed(2)}
                        onChange={(e) => setSwr(safeNum(e.target.value) / 100)}
                        onKeyDown={onEnterBlur}
                      />
                      <span className="text-sm text-neutral-600">%</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                      Most people explore ~3%–5%. Higher rates lower the target but increase risk.
                    </p>
                  </div>

                  <div className="rounded-2xl border p-4 bg-white/70">
                    <p className="text-sm text-neutral-500">Monthly spending (all)</p>
                    <p className="text-xl font-bold mt-1">{formatMoney(monthlyIkigaiAll)}</p>
                    <p className="text-sm text-neutral-500 mt-3">Monthly spending (ongoing)</p>
                    <p className="text-xl font-bold mt-1">{formatMoney(monthlyIkigaiOngoing)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
