import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16 pt-12 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-8 lg:px-12">
        <Dashboard />
      </div>
    </main>
  );
}
