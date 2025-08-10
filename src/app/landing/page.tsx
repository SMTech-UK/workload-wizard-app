"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WandSparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@clerk/nextjs";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col bg-transparent">
      <header className="w-full border-b bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex h-8 items-center gap-3">
            <div
              className="flex aspect-square size-8 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: "#0F59FF" }}
            >
              <WandSparkles className="size-4" />
            </div>
            <p className="truncate font-semibold text-base md:text-lg leading-none">
              WorkloadWizard
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <Link href="/dashboard">
                <Button variant="default" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/sign-in">
                <Button variant="default" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <div className="fixed inset-0 -z-10 animated-gradient pointer-events-none" />
        <section className="relative max-w-5xl mx-auto px-4 pt-40 md:pt-56 pb-24 md:pb-40 flex flex-col items-center text-center">
          <h1 className="text-[clamp(2rem,6vw,4rem)] md:text-[clamp(3rem,5vw,4.5rem)] font-extrabold tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
            Plan and track academic workload with clarity
          </h1>
          <p className="mt-5 max-w-3xl text-white/85 text-base md:text-lg leading-relaxed">
            A modern, privacy‑respecting platform for modules, allocations and
            staff workload. Built for universities and colleges.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-2 w-full max-w-md opacity-80">
            <div className="h-px bg-white/40" />
            <div className="h-px bg-white/60" />
            <div className="h-px bg-white/40" />
          </div>
        </section>
        <style jsx>{`
          .animated-gradient {
            background:
              radial-gradient(
                1200px 600px at 20% 10%,
                rgba(255, 255, 255, 0.08),
                transparent 60%
              ),
              linear-gradient(120deg, #0f59ff, #8b5cf6, #06b6d4);
            background-size: 200% 200%;
            animation: gradientShift 12s ease infinite;
          }
          @keyframes gradientShift {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
        `}</style>
      </main>

      <footer className="w-full border-t bg-background/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} Workload Wizard</span>
          <div className="flex gap-4">
            <a href="/terms" className="hover:underline">
              Terms
            </a>
            <a href="/privacy" className="hover:underline">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
