"use client"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CurrencySelector } from "@/components/auth/CurrencySelector"
import { priceMapping, formatPrice } from "@/lib/currencies"
import type { Currency, Plan } from "@/types/international"

export default function PricingPage() {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("usd")

  const plans = [
    {
      id: "starter" as Plan,
      name: "Starter",
      description: "Perfect for small contractors getting started",
      features: [
        "Up to 5 active projects",
        "Basic project management",
        "Document storage (5GB)",
        "Mobile app access",
        "Email support",
      ],
    },
    {
      id: "professional" as Plan,
      name: "Professional",
      description: "For growing construction businesses",
      features: [
        "Unlimited projects",
        "Advanced project management",
        "Document storage (50GB)",
        "AI-powered insights",
        "Priority support",
        "Team collaboration tools",
        "Custom reporting",
      ],
      popular: true,
    },
    {
      id: "enterprise" as Plan,
      name: "Enterprise",
      description: "For large-scale construction operations",
      features: [
        "Everything in Professional",
        "Unlimited storage",
        "Advanced ESG & compliance tracking",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom integrations",
        "Advanced security features",
        "Training & onboarding",
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-8 lg:px-12">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="text-lg font-bold">
              The Sierra Suites
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-8 lg:px-12">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your business. All plans include a 14-day free trial.
            </p>

            {/* Currency Selector */}
            <div className="flex justify-center mb-8">
              <div className="inline-block">
                <p className="text-sm font-medium mb-3">Select Your Currency</p>
                <CurrencySelector
                  value={selectedCurrency}
                  onChange={setSelectedCurrency}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-xl border p-8 ${
                  plan.popular
                    ? "border-[#1E3A8A] shadow-xl scale-105"
                    : "border-border"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#1E3A8A] text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-[#1E3A8A]">
                      {formatPrice(priceMapping[plan.id][selectedCurrency], selectedCurrency)}
                    </span>
                    <span className="text-muted-foreground ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="block">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center text-sm text-muted-foreground">
            <p>All plans include 14-day free trial • No credit card required • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-8 lg:px-12 text-center text-sm text-muted-foreground">
          <p>© 2025 The Sierra Suites. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
