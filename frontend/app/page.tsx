"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, LineChart, ShieldCheck, Trophy } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const trend = [
  { season: "20/21", value: 8 },
  { season: "21/22", value: 13 },
  { season: "22/23", value: 21 },
  { season: "23/24", value: 38 },
  { season: "24/25", value: 54 },
  { season: "25/26", value: 68 },
];

const featureCards = [
  { label: "Data engineering", value: "5 CSV joins", icon: ShieldCheck },
  { label: "Model stack", value: "LR, RF, XGBoost", icon: BrainCircuit },
  { label: "API latency", value: "FastAPI ready", icon: BarChart3 },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-300 text-slate-950">
            <Trophy size={18} />
          </span>
          TransferLab
        </Link>
        <Link
          href="/predict"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-2xl shadow-teal-500/10 transition hover:border-teal-300/60 hover:bg-teal-300 hover:text-slate-950"
        >
          Predict <ArrowRight size={16} />
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-8 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-14">
        <div>
          <p className="mb-5 w-fit rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
            Football Transfer Market Value Predictor
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[1.02] text-white md:text-7xl">
            Price the next transfer window with machine learning.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Predict player market value from age, match output, minutes, club context, league level, and value momentum using a production-ready FastAPI model service.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/predict"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-white"
            >
              Open predictor <ArrowRight size={18} />
            </Link>
            <a
              href="https://www.kaggle.com/datasets/davidcariboo/player-scores"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/10 px-5 py-3 font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
            >
              Kaggle dataset
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Sample player card</p>
                <h2 className="text-2xl font-bold text-white">Explosive Winger</h2>
              </div>
              <div className="rounded-lg bg-rose-400 px-3 py-2 text-sm font-black text-slate-950">&euro;68M</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {featureCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                    <Icon className="text-teal-200" size={20} />
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                    <p className="mt-1 font-bold text-white">{item.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 h-72 rounded-lg border border-white/10 bg-slate-900/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <LineChart size={16} className="text-teal-200" />
                Historical value trend
              </div>
              <ResponsiveContainer width="100%" height="88%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="season" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}M`} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} formatter={(v) => [`EUR ${v}M`, "Market value"]} />
                  <Area type="monotone" dataKey="value" stroke="#2dd4bf" fill="url(#valueFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
