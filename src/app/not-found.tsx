import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-4xl font-bold font-mono mb-2">404</h2>
      <p className="text-slate-400 text-sm mb-6">Page not found.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
      >
        Return to Glotty
      </Link>
    </div>
  );
}
