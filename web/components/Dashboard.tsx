"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnalyzerResponse, DailyAnalysis, Level, Signal } from "@/lib/types";
import { TradingChart } from "@/components/TradingChart";

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "success"; payload: AnalyzerResponse };

export function Dashboard() {
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [selectedDay, setSelectedDay] = useState(0);

  const load = useCallback(async () => {
    setState((prev) => (prev.status === "success" ? prev : { status: "loading" }));
    try {
      const response = await fetch("/api/nifty", {
        next: { revalidate: 30 },
      });
      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }
      const data = (await response.json()) as AnalyzerResponse;
      setState({ status: "success", payload: data });
      setSelectedDay(0);
    } catch (error) {
      setState({
        status: "error",
        message: (error as Error).message ?? "Unknown failure",
      });
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-8 py-16 text-slate-200 shadow-lg">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-transparent" />
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          Calibrating levels…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-rose-700/40 bg-rose-950/60 px-8 py-16 text-rose-100 shadow-lg">
        <h2 className="text-xl font-semibold">Data link overwhelmed</h2>
        <p className="text-sm opacity-80">{state.message}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full bg-rose-500 px-5 py-2 font-medium text-rose-50 shadow-md shadow-rose-500/30 transition hover:bg-rose-400"
        >
          Retry sync
        </button>
      </div>
    );
  }

  if (state.status !== "success") {
    return null;
  }

  const days = state.payload.days;
  const day = days[selectedDay] ?? days[0];

  return (
    <div className="flex w-full flex-col gap-10">
      <HeaderSection day={day} fetchedAt={state.payload.fetchedAt} onRefresh={load} days={days} selectedIndex={selectedDay} onSelectDay={setSelectedDay} />
      <TradingChart candles={day.candles} levels={day.levels} signals={day.signals} />
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <LevelsPanel levels={day.levels} />
        <SignalsPanel signals={day.signals} />
      </div>
      <NarrativePanel day={day} />
    </div>
  );
}

type HeaderSectionProps = {
  day: DailyAnalysis;
  fetchedAt: number;
  onRefresh: () => void;
  days: DailyAnalysis[];
  selectedIndex: number;
  onSelectDay: (index: number) => void;
};

function HeaderSection({ day, fetchedAt, onRefresh, days, selectedIndex, onSelectDay }: HeaderSectionProps) {
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(day.tradingDate));
  }, [day.tradingDate]);

  const updatedAt = useMemo(() => {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(fetchedAt);
  }, [fetchedAt]);

  return (
    <section className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Nifty 50 | Opening Framework
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            {formattedDate}
          </h1>
          <p className="text-sm text-slate-400">First 5-minute range {day.firstFiveLow.toFixed(2)} — {day.firstFiveHigh.toFixed(2)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-slate-800/60 bg-slate-900 px-4 py-2 text-sm text-slate-200">
            Session
            <select
              value={selectedIndex}
              onChange={(event) => onSelectDay(Number(event.target.value))}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-slate-100 focus:border-indigo-400 focus:outline-none"
            >
              {days.map((item, index) => (
                <option key={item.tradingDate} value={index}>
                  {item.tradingDate}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/40 transition hover:bg-indigo-400"
          >
            Refresh data
          </button>
          <p className="text-xs text-slate-500">
            Updated {updatedAt} IST
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Primary Resistance" value={formatLevel(day.summary.dominantResistances[0])} tone="bearish" />
        <MetricCard title="Secondary Resistance" value={formatLevel(day.summary.dominantResistances[1])} tone="bearish" />
        <MetricCard title="Primary Support" value={formatLevel(day.summary.dominantSupports[0])} tone="bullish" />
        <MetricCard title="Secondary Support" value={formatLevel(day.summary.dominantSupports[1])} tone="bullish" />
      </div>
    </section>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  tone: "bullish" | "bearish";
};

function MetricCard({ title, value, tone }: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border px-5 py-4 ${
        tone === "bullish"
          ? "border-emerald-500/40 bg-emerald-900/20"
          : "border-rose-500/40 bg-rose-900/20"
      }`}
    >
      <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {title}
      </h3>
      <p className="mt-3 text-2xl font-semibold text-slate-50">{value}</p>
    </article>
  );
}

function formatLevel(level?: Level) {
  if (!level) {
    return "—";
  }
  return `${level.label} • ${level.value.toFixed(2)}`;
}

type LevelsPanelProps = {
  levels: Level[];
};

function LevelsPanel({ levels }: LevelsPanelProps) {
  const grouped = useMemo(() => {
    return {
      supports: levels.filter((level) => level.kind === "support"),
      resistances: levels.filter((level) => level.kind === "resistance"),
    };
  }, [levels]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100">Support & Resistance Matrix</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-xs uppercase tracking-[0.3em] text-emerald-400">Supports</h3>
          <ul className="mt-3 space-y-3">
            {grouped.supports.map((level) => (
              <li key={level.id} className="rounded-2xl border border-emerald-600/40 bg-emerald-900/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-emerald-200">
                    {level.label} @ {level.value.toFixed(2)}
                  </span>
                  <span className="text-xs text-emerald-300/80">
                    touches {level.touches}
                  </span>
                </div>
                <p className="mt-2 text-xs text-emerald-200/70">
                  Strongest move {level.strongestMove.toFixed(2)} pts · Avg reaction {level.avgReactionMagnitude.toFixed(2)} pts
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs uppercase tracking-[0.3em] text-rose-400">Resistances</h3>
          <ul className="mt-3 space-y-3">
            {grouped.resistances.map((level) => (
              <li key={level.id} className="rounded-2xl border border-rose-600/40 bg-rose-900/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-rose-200">
                    {level.label} @ {level.value.toFixed(2)}
                  </span>
                  <span className="text-xs text-rose-300/80">
                    touches {level.touches}
                  </span>
                </div>
                <p className="mt-2 text-xs text-rose-200/70">
                  Strongest move {level.strongestMove.toFixed(2)} pts · Avg reaction {level.avgReactionMagnitude.toFixed(2)} pts
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

type SignalsProps = {
  signals: Signal[];
};

function SignalsPanel({ signals }: SignalsProps) {
  if (signals.length === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-center text-slate-400 shadow-lg">
        <p className="text-lg font-semibold text-slate-200">No actionable signals yet</p>
        <p className="text-sm opacity-80">
          Levels are holding quietly. Await a decisive reaction before committing capital.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100">Live Signals</h2>
      <ul className="mt-4 space-y-3">
        {signals.map((signal) => (
          <li
            key={signal.id}
            className={`rounded-2xl border p-4 ${
              signal.action === "buy"
                ? "border-emerald-500/40 bg-emerald-900/20"
                : "border-rose-500/40 bg-rose-900/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold text-slate-50">
                {signal.action === "buy" ? "Buy" : "Sell"} {signal.levelId}
              </span>
              <span className="text-sm text-slate-200">
                @ {signal.price.toFixed(2)}
              </span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              Confidence {(signal.confidence * 100).toFixed(0)}%
            </p>
            <p className="mt-2 text-sm text-slate-200/80">
              {signal.confirmation}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type NarrativePanelProps = {
  day: DailyAnalysis;
};

function NarrativePanel({ day }: NarrativePanelProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-slate-100">Price Action Narrative</h2>
      <ul className="mt-4 space-y-3">
        {day.summary.narrative.map((line, index) => (
          <li key={index} className="rounded-2xl border border-slate-800/70 bg-slate-900/50 p-4 text-sm text-slate-200/90">
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
