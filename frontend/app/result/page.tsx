"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Gauge, LineChart, Sparkles, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatMillions(value: number) {
  return (value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2);
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const value = Number(searchParams.get("value") ?? 0);
  const valueMillions = formatMillions(value);
  const club = searchParams.get("club") ?? "Selected club";
  const position = searchParams.get("position") ?? "Player";
  const age = Number(searchParams.get("age") ?? 24);
  const trend = [
    { year: "Y-4", value: Math.max(value * 0.34, 1_000_000) },
    { year: "Y-3", value: Math.max(value * 0.48, 1_000_000) },
    { year: "Y-2", value: Math.max(value * 0.62, 1_000_000) },
    { year: "Y-1", value: Math.max(value * 0.82, 1_000_000) },
    { year: "Now", value },
  ];

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/predict" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white">
          <ArrowLeft size={16} /> Adjust prediction
        </Link>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/75 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-teal-100">Estimated Market Value</p>
                <h1 className="mt-3 text-5xl font-black text-white">&euro;{valueMillions} Million</h1>
              </div>
              <Sparkles className="text-teal-200" size={30} />
            </div>
            <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-5">
              <p className="text-lg font-black text-white">Estimated Market Value: &euro;{valueMillions} Million</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The estimate combines production rates, playing time, age curve, categorical club and position effects, and historical value momentum when a trained model artifact is available.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Club</p>
                <p className="mt-2 font-bold text-white">{club}</p>
              </div>
              <div className="rounded-lg bg-white/[0.06] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Profile</p>
                <p className="mt-2 font-bold text-white">{age}-year-old {position}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/75 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <LineChart className="text-teal-200" size={18} /> Historical value projection
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-rose-400/15 px-3 py-2 text-sm font-bold text-rose-100">
                <TrendingUp size={16} /> Momentum view
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="resultFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="year" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}M`} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} formatter={(v) => [`EUR ${formatMillions(Number(v))}M`, "Value"]} />
                  <Area type="monotone" dataKey="value" stroke="#fb7185" fill="url(#resultFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-300">
              <Gauge className="shrink-0 text-teal-200" />
              Run `python train_model.py --data-dir ../data` from `backend/` after downloading the Kaggle CSVs to replace fallback estimates with trained model predictions.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
