import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, ShieldCheck, Link2, MessageSquare, Zap } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Campaign Builder",
    description:
      "Describe your business and goals. The AI writes your ads, picks your audiences, and sets your budgets.",
  },
  {
    icon: TrendingUp,
    title: "Always Optimizing",
    description:
      "Performance is monitored around the clock. Bids, budgets, and creatives adjust automatically.",
  },
  {
    icon: ShieldCheck,
    title: "Guardrails Built In",
    description:
      "Spending limits, frequency caps, and safety checks keep your campaigns on track. No surprises.",
  },
];

const steps = [
  {
    icon: Link2,
    number: "1",
    title: "Connect your accounts",
    description: "Link your Meta and Google Ads accounts in a few clicks.",
  },
  {
    icon: MessageSquare,
    number: "2",
    title: "Describe your business",
    description: "Tell us what you sell, who you serve, and what you want to achieve.",
  },
  {
    icon: Zap,
    number: "3",
    title: "Let the AI run",
    description: "Campaigns go live. The AI optimizes daily. You watch the results come in.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="lumora" size="sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative lumora-glow">
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Your ads, managed by{" "}
            <span className="gradient-text">AI</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            LumoraAI builds, launches, and optimizes your paid ads on Meta and
            Google. You focus on your business. The AI handles the rest.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button variant="lumora" size="lg">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            No dashboards to learn. No levers to pull. Just results.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-card rounded-xl p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-5">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Three steps. That&apos;s it.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lumora-gradient text-white text-xl font-bold mx-auto mb-5">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative lumora-glow border-t border-border/50">
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Stop managing ads. Start growing.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Let AI handle the complexity so you can focus on what matters.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button variant="lumora" size="lg">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign up
            </Link>
            <span>&copy; {new Date().getFullYear()} LumoraAI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
