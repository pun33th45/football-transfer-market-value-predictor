"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Loader2, Search, Swords, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const clubs = ["Manchester City", "Real Madrid", "Barcelona", "Bayern Munich", "Arsenal", "Liverpool", "Paris Saint-Germain", "Inter Milan", "Borussia Dortmund", "Benfica"];
const positions = ["Goalkeeper", "Centre-Back", "Full-Back", "Defensive Midfield", "Central Midfield", "Attacking Midfield", "Winger", "Centre-Forward"];
const importance = [
  { feature: "Value lag", score: 32 },
  { feature: "Age", score: 18 },
  { feature: "Goals/90", score: 16 },
  { feature: "Assists/90", score: 12 },
  { feature: "Minutes", score: 10 },
];

type FormState = {
  age: number;
  goals_per_90: number;
  assists_per_90: number;
  minutes_played_avg: number;
  club: string;
  position: string;
};

const initialState: FormState = {
  age: 24,
  goals_per_90: 0.42,
  assists_per_90: 0.18,
  minutes_played_avg: 76,
  club: "Manchester City",
  position: "Winger",
};

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span className="rounded-lg bg-teal-300/15 px-2 py-1 text-sm font-bold text-teal-100">{value}</span>
      </div>
      <input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function PredictionPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filteredClubs = useMemo(() => clubs.filter((club) => club.toLowerCase().includes(query.toLowerCase())).slice(0, 5), [query]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        throw new Error("Prediction API failed");
      }
      const data = await response.json();
      router.push(`/result?value=${encodeURIComponent(data.predicted_market_value)}&club=${encodeURIComponent(form.club)}&position=${encodeURIComponent(form.position)}&age=${form.age}`);
    } catch {
      setError("Could not reach the prediction API. Start FastAPI on port 8000 and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            Prediction studio
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={onSubmit} className="rounded-lg border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="mb-6">
              <h1 className="text-3xl font-black text-white md:text-5xl">Build a player valuation profile</h1>
              <p className="mt-3 max-w-2xl text-slate-300">Tune core performance signals, club context, and position to estimate market value.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Slider label="Age" value={form.age} min={16} max={40} step={1} onChange={(age) => setForm((prev) => ({ ...prev, age }))} />
              <Slider label="Goals per 90" value={form.goals_per_90} min={0} max={2} step={0.01} onChange={(goals_per_90) => setForm((prev) => ({ ...prev, goals_per_90 }))} />
              <Slider label="Assists per 90" value={form.assists_per_90} min={0} max={2} step={0.01} onChange={(assists_per_90) => setForm((prev) => ({ ...prev, assists_per_90 }))} />
              <Slider label="Average minutes" value={form.minutes_played_avg} min={0} max={120} step={1} onChange={(minutes_played_avg) => setForm((prev) => ({ ...prev, minutes_played_avg }))} />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="relative rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <span className="text-sm font-semibold text-slate-200">Club</span>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
                  <Search size={16} className="text-slate-500" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={form.club} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500" />
                </div>
                {query && (
                  <div className="absolute left-4 right-4 top-[92px] z-10 overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-xl">
                    {filteredClubs.map((club) => (
                      <button key={club} type="button" onClick={() => { setForm((prev) => ({ ...prev, club })); setQuery(""); }} className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-teal-300 hover:text-slate-950">
                        {club}
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <label className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <span className="text-sm font-semibold text-slate-200">Position</span>
                <select value={form.position} onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))} className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none">
                  {positions.map((position) => (
                    <option key={position}>{position}</option>
                  ))}
                </select>
              </label>
            </div>

            {error && <p className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}

            <button disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 py-4 font-black text-slate-950 transition hover:bg-white disabled:cursor-wait disabled:opacity-70">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <BarChart3 size={18} />}
              {loading ? "Calculating valuation" : "Predict market value"}
            </button>
          </form>

          <aside className="space-y-6">
            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-5 backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Live player card</p>
                  <h2 className="text-2xl font-black text-white">{form.position}</h2>
                </div>
                <UserRound className="text-teal-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/[0.06] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Club</p>
                  <p className="mt-2 font-bold text-white">{form.club}</p>
                </div>
                <div className="rounded-lg bg-white/[0.06] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Age curve</p>
                  <p className="mt-2 font-bold text-white">{form.age <= 27 ? "Peak growth" : "Experience premium"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-5 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-200">
                <Swords size={17} className="text-rose-200" /> Compare drivers
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={importance}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="feature" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                    <Bar dataKey="score" fill="#2dd4bf" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
