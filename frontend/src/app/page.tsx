import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/TCGMentor.png";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Image src={logo} alt="TCGMentor" width={100} height={100} className="rounded-2xl" />
        </div>
        <h1 className="text-5xl font-bold text-slate-900 mb-4">TCGMentor</h1>
        <p className="text-xl text-slate-600 mb-8">
          Your AI-powered guide to Trading Card Games. Learn Pokemon, Magic: The Gathering, Yu-Gi-Oh!, and more — from absolute zero.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="rounded-xl bg-indigo-600 px-8 py-3 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>
          <Link
            href="/chat"
            className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            Try Free
          </Link>
        </div>
      </div>
    </main>
  );
}
