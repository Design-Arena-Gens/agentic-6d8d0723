"use client";

import { useEffect, useRef } from "react";
import type { Candle, Level, Signal } from "@/lib/types";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type UTCTimestamp,
} from "lightweight-charts";

type Props = {
  candles: Candle[];
  levels: Level[];
  signals: Signal[];
};

export function TradingChart({ candles, levels, signals }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick", UTCTimestamp> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<UTCTimestamp> | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const container = containerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: "#0B1120" },
        textColor: "#CBD5F5",
        fontFamily: "var(--font-geist-mono)",
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#1E293B",
      },
      timeScale: {
        borderColor: "#1E293B",
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        horzLines: { color: "#1E293B", style: LineStyle.SparseDotted },
        vertLines: { color: "#1E293B", style: LineStyle.SparseDotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#94A3B8", width: 1, style: LineStyle.Solid },
        horzLine: { color: "#94A3B8", width: 1, style: LineStyle.Solid },
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#16A34A",
      downColor: "#DC2626",
      borderUpColor: "#16A34A",
      borderDownColor: "#DC2626",
      wickUpColor: "#16A34A",
      wickDownColor: "#DC2626",
    }) as ISeriesApi<"Candlestick", UTCTimestamp>;

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = createSeriesMarkers<UTCTimestamp>(series);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      markersRef.current?.detach();
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) {
      return;
    }
    seriesRef.current.setData(
      candles.map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    );
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) {
      return;
    }

    priceLinesRef.current.forEach((line) => {
      series.removePriceLine(line);
    });

    priceLinesRef.current =
      levels.map((level) =>
        series.createPriceLine({
          price: level.value,
          color: level.kind === "support" ? "#22C55E" : "#F87171",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          title: `${level.label} ${level.value.toFixed(2)}`,
        })
      ) ?? [];
  }, [levels]);

  useEffect(() => {
    if (!markersRef.current) {
      return;
    }

    markersRef.current.setMarkers(
      signals.map((signal) => ({
        time: signal.time as UTCTimestamp,
        position: signal.action === "buy" ? "belowBar" : "aboveBar",
        color: signal.action === "buy" ? "#22C55E" : "#F87171",
        shape: signal.action === "buy" ? "arrowUp" : "arrowDown",
        text: `${signal.action === "buy" ? "Buy" : "Sell"} ${signal.levelId}`,
      }))
    );
  }, [signals]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 shadow-lg">
      <div ref={containerRef} className="h-[520px] w-full" />
    </div>
  );
}
