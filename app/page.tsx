"use client"

export const dynamic = 'force-dynamic'

import Link from "next/link"
import { useState, useEffect } from "react"
import { ArrowRight, CheckCircle2, Shield, Target, X, TrendingUp, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isScrollingUp, setIsScrollingUp] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY || currentScrollY < 100) {
        setIsScrollingUp(true)
      } else {
        setIsScrollingUp(false)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const openModal = (modalType: string) => {
    setActiveModal(modalType)
  }

  const closeModal = () => {
    setActiveModal(null)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${isScrollingUp ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="container mx-auto px-8 lg:px-12">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={scrollToTop}
              className="text-lg font-bold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] hover:scale-105 transition-transform duration-200"
            >
              The Sierra Suites
            </button>

            <nav className="hidden items-center gap-4 md:flex">
              <Link
                href="#features"
                className="text-sm text-foreground/90 drop-shadow-sm transition-all hover:text-foreground bg-white px-4 py-2 rounded-md shadow-sm hover:shadow-md hover:scale-105 duration-200"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-foreground/90 drop-shadow-sm transition-all hover:text-foreground bg-white px-4 py-2 rounded-md shadow-sm hover:shadow-md hover:scale-105 duration-200"
              >
                Pricing
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="drop-shadow-sm hover:scale-105 transition-transform duration-200"
                >
                  Log In
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 drop-shadow-md hover:scale-105 transition-transform duration-200"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-construction.jpg"
            alt="Construction site at dusk"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-24 lg:pt-40 lg:pb-28 z-10">
          <div className="container mx-auto px-8 lg:px-12">
            <div className="mx-auto max-w-4xl text-center animate-fade-in">
              <h1 className="text-3xl font-bold tracking-tight text-balance text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] md:text-4xl lg:text-5xl">
                The AI-Powered Future of
                <br />
                <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-300 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                  Construction Management
                </span>
              </h1>

              <p className="mt-6 text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] font-medium md:text-lg lg:leading-relaxed max-w-3xl mx-auto">
                The intelligent sustainable construction platform that transforms how modern contractors manage
                projects, teams, and profitability—all in one intelligent workspace.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Statistics Section - shares the same background */}
        <section className="relative py-16 md:py-20 z-10">
          <div className="container relative z-10 mx-auto px-8 lg:px-12">
            <div className="mx-auto max-w-3xl text-center mb-12 animate-slide-up">
              <h2 className="text-2xl font-bold tracking-tight text-balance md:text-3xl">
                <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Construction's </span>
                <span className="bg-gradient-to-r from-destructive via-chart-5 to-destructive bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  $177 Billion Open Secret
                </span>
              </h2>
              <p className="mt-4 text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-relaxed font-medium">
                While other industries innovate, construction remains trapped in a cycle of delays, cost overruns, and
                chaotic communication. The tools meant to help have become part of the problem.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              <div
                className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-destructive" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Budget Crisis
                  </div>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2">98%</div>
                <div className="text-sm font-semibold text-foreground mb-3">Projects Over Budget</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Average overruns of <span className="font-semibold text-destructive">80%</span> eat directly into your
                  already-thin margins.
                </div>
              </div>

              <div
                className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
                style={{ animationDelay: "0.2s" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-8 w-8 text-chart-5" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time Waste</div>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2">35%</div>
                <div className="text-sm font-semibold text-foreground mb-3">Weekly Time Wasted</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  That's <span className="font-semibold text-chart-5">14 hours per PM</span> spent searching across
                  disconnected apps.
                </div>
              </div>

              <div
                className="group rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
                style={{ animationDelay: "0.3s" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="h-8 w-8 text-chart-3" />
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Schedule Delays
                  </div>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2">77%</div>
                <div className="text-sm font-semibold text-foreground mb-3">Projects Finish Late</div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  Average <span className="font-semibold text-chart-3">40% beyond schedule</span>, damaging client
                  relationships.
                </div>
              </div>
            </div>

            <div className="mt-10 text-center max-w-2xl mx-auto">
              <p className="text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-relaxed font-medium md:text-lg">
                The current choice is impossible: overpriced, complex enterprise software or generic tools that lack
                construction DNA.
              </p>
              <p className="mt-3 text-lg font-bold md:text-xl">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  The Sierra Suites is the Solution
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>

      <section id="features" className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <h2 className="text-3xl font-bold tracking-tight text-balance md:text-4xl lg:text-5xl">
              <span className="text-foreground">A Unified Platform, </span>
              <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                Not Another Tool to Manage
              </span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              We built Sierra Suites from the ground up for the realities of the job site and the pressures of the front
              office. Everything you need, working in concert.
            </p>
          </div>

          {/* Feature 1: Project Management Core */}
          <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="animate-slide-up">
              <h3 className="text-2xl font-bold md:text-3xl">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                  The Project Management Core
                </span>
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Finally, a single source of truth. Intuitive scheduling, real-time budget tracking, and seamless
                document management replace the jumble of Excel, email, and Dropbox.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Gantt scheduling with drag-and-drop simplicity</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Real-time budget tracking and resource allocation</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Centralized document management and collaboration hub</span>
                </li>
              </ul>
            </div>
            <div className="relative rounded-xl border border-border bg-card p-2 overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300">
              <img
                src="/project-management.jpg"
                alt="Project Management"
                className="rounded-lg w-full h-auto group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Feature 2: Construction Execution Toolkit */}
          <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 relative rounded-xl border border-border bg-card p-2 overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300">
              <img
                src="/team-planning.jpg"
                alt="Construction Execution"
                className="rounded-lg w-full h-auto group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="order-1 lg:order-2 animate-slide-up">
              <h3 className="text-2xl font-bold md:text-3xl">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                  The Construction Execution Toolkit
                </span>
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Built by contractors, for contractors. Streamline RFIs, submittals, daily logs, and punch lists with
                mobile-first workflows your field crew will actually use.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Mobile-optimized RFIs and submittal tracking</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Digital daily logs with photo documentation</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Punch list management with automated notifications</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Feature 3: AI Co-Pilot */}
          <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="animate-slide-up">
              <h3 className="text-2xl font-bold md:text-3xl">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                  The AI Co-Pilot
                </span>
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Your unfair advantage. Move from reactive firefighting to proactive control. Our AI predicts delays
                weeks in advance, flags budget anomalies, and automates tedious reporting.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Predictive delay detection before issues escalate</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Intelligent budget anomaly alerts and forecasting</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Automated progress reporting and resource optimization</span>
                </li>
              </ul>
            </div>
            <div className="relative rounded-xl border border-border bg-card p-2 overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300">
              <img
                src="/ai-dashboard.jpg"
                alt="AI Co-Pilot"
                className="rounded-lg w-full h-auto group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Feature 4: ESG & Compliance */}
          <div className="mt-20 grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 relative rounded-xl border border-border bg-card p-2 overflow-hidden group animate-slide-up hover:shadow-xl transition-all duration-300">
              <img
                src="/esg-compliance.jpg"
                alt="ESG Compliance"
                className="rounded-lg w-full h-auto group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="order-1 lg:order-2 animate-slide-up">
              <h3 className="text-2xl font-bold md:text-3xl">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                  ESG & Compliance Made Simple
                </span>
              </h3>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Win more bids. Effortlessly track carbon emissions, generate compliant ESG reports for government
                tenders, and navigate local regulations with our built-in advisory.
              </p>
              <ul className="mt-6 space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Automated ESG reporting for government bids</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Carbon emissions tracking and sustainability metrics</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                  <span>Built-in compliance advisory for local regulations</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 lg:py-28 border-y border-border bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center animate-slide-up">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-foreground drop-shadow-lg md:text-4xl lg:text-5xl">
              <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-4 bg-clip-text text-transparent">
                Enterprise-Grade Security,
              </span>
              <span className="text-foreground"> Built In</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground md:text-lg">
              Rest easy knowing your data is protected with bank-level encryption, SOC 2 compliance, and robust access
              controls. Your intellectual property is yours alone.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <div
              className="rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <Shield className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-bold text-foreground">Bank-Level Encryption</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                256-bit encryption and SOC 2 compliance protect your sensitive project data
              </p>
            </div>
            <div
              className="rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Target className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-bold text-foreground">Robust Access Controls</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Granular permissions and role-based access ensure data security
              </p>
            </div>
            <div
              className="rounded-xl border border-border bg-card p-8 transition-all duration-300 hover:shadow-xl hover:scale-105 hover:border-primary/50 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-bold text-foreground">Your Data, Your Control</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Full data export, API access, and daily backups give you complete ownership
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-construction.jpg"
            alt="Construction team"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="container relative z-10 mx-auto px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] md:text-4xl lg:text-5xl">
              Build Smarter, Not Harder.
            </h2>
            <p className="mt-6 text-base text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] md:text-lg leading-relaxed font-medium">
              Join the thousands of forward-thinking contractors who have replaced chaos with clarity. See how Sierra
              Suites delivers an 11x ROI by preventing delays and reclaiming billable hours.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16 md:py-20">
        <div className="container mx-auto px-8 lg:px-12">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-lg font-semibold text-foreground">The Sierra Suites</div>
              <p className="mt-3 text-sm text-muted-foreground">The future of construction management</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Company</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#careers"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Connect</h4>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="mailto:hello@thesierrasuites.com"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <Link
                    href="#linkedin"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    LinkedIn
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">© 2025 The Sierra Suites. All rights reserved.</p>
            <div className="flex gap-6">
              <button
                onClick={() => openModal("privacy")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => openModal("terms")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => openModal("cookies")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-8 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="text-foreground">
              {activeModal === "privacy" && (
                <>
                  <h2 className="text-3xl font-bold">Privacy Policy</h2>
                  <p className="mt-6 text-sm text-muted-foreground">
                    <strong>Last Updated: January 1, 2025</strong>
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">1. Introduction</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    The Sierra Suites ("we," "our," or "us") is committed to protecting your privacy. This Privacy
                    Policy explains how your personal information is collected, used, and disclosed by The Sierra
                    Suites.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">2. Information We Collect</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    We collect information you provide directly to us, including when you create an account, update your
                    profile, use our services, or communicate with us. This information may include:
                  </p>
                  <ul className="mt-3 ml-6 list-disc text-sm text-muted-foreground space-y-1">
                    <li>Name, email address, and contact information</li>
                    <li>Company information and business details</li>
                    <li>Payment information and billing details</li>
                    <li>Project data, construction documentation, and team information</li>
                    <li>Communications with our support team</li>
                  </ul>

                  <h3 className="mt-8 text-xl font-semibold">3. How We Use Your Information</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    We may use the information we collect for various purposes, including to provide, maintain, and
                    improve our services, process transactions, send technical notices and support messages, respond to
                    your questions, monitor usage trends, and detect fraudulent transactions.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">4. Contact Us</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us at{" "}
                    <a href="mailto:privacy@thesierrasuites.com" className="text-primary hover:underline">
                      privacy@thesierrasuites.com
                    </a>
                    .
                  </p>
                </>
              )}

              {activeModal === "terms" && (
                <>
                  <h2 className="text-3xl font-bold">Terms of Service</h2>
                  <p className="mt-6 text-sm text-muted-foreground">
                    <strong>Last Updated: January 1, 2025</strong>
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">1. Agreement to Terms</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    By accessing or using The Sierra Suites ("Service"), you agree to be bound by these Terms of Service
                    and all applicable laws and regulations. If you do not agree with any of these terms, you are
                    prohibited from using or accessing our Service.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">2. Use License</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Permission is granted to temporarily use The Sierra Suites for your business operations. This is the
                    grant of a license, not a transfer of title, and under this license you may not modify or copy the
                    materials, use them for commercial purposes, attempt to reverse engineer any software, remove
                    proprietary notations, or transfer the materials to another person.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">3. Account Registration</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    To access certain features of our Service, you must register for an account. You agree to provide
                    accurate, current, and complete information during the registration process and to update such
                    information to keep it accurate, current, and complete.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">4. Contact Information</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    If you have any questions about these Terms, please contact us at{" "}
                    <a href="mailto:legal@thesierrasuites.com" className="text-primary hover:underline">
                      legal@thesierrasuites.com
                    </a>
                    .
                  </p>
                </>
              )}

              {activeModal === "cookies" && (
                <>
                  <h2 className="text-3xl font-bold">Cookie Policy</h2>
                  <p className="mt-6 text-sm text-muted-foreground">
                    <strong>Last Updated: January 1, 2025</strong>
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">1. Introduction</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    This Cookie Policy explains how The Sierra Suites ("we", "us", and "our") uses cookies and similar
                    technologies to recognize you when you visit our website. It explains what these technologies are
                    and why we use them, as well as your rights to control our use of them.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">2. What are cookies?</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    Cookies are small data files that are placed on your computer or mobile device when you visit a
                    website. Cookies are widely used by website owners to make their websites work, or to work more
                    efficiently, as well as to provide reporting information.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">3. Why do we use cookies?</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    We use first and third-party cookies for several reasons. Some cookies are required for technical
                    reasons for our Website to operate, and we refer to these as "essential" or "strictly necessary"
                    cookies. Other cookies enable us to track and target the interests of our users to enhance the
                    experience on our Website.
                  </p>

                  <h3 className="mt-8 text-xl font-semibold">4. Contact Us</h3>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    If you have any questions about our use of cookies, please contact us at{" "}
                    <a href="mailto:privacy@thesierrasuites.com" className="text-primary hover:underline">
                      privacy@thesierrasuites.com
                    </a>
                    .
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
