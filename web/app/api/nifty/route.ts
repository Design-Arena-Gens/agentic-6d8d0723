import { NextResponse } from "next/server";
import { fetchAndAnalyze } from "@/lib/analysis";

export async function GET() {
  try {
    const data = await fetchAndAnalyze();
    return NextResponse.json(data, {
      headers: {
        "cache-control": "s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("[api/nifty] failed", error);
    return NextResponse.json(
      { error: (error as Error).message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
