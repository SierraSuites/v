"use client"

export const dynamic = 'force-dynamic'

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InternationalPhoneInput } from "@/components/auth/InternationalPhoneInput"
import { CurrencySelector } from "@/components/auth/CurrencySelector"
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter"
import { OAuthButtons } from "@/components/auth/OAuthButtons"
import { createClient } from "@/lib/supabase/client"
import { countries } from "@/lib/countries"
import { priceMapping, formatPrice, getCurrencyByCountry } from "@/lib/currencies"
import type { Currency, Plan } from "@/types/international"
import {
  registrationStep1Schema,
  registrationStep2Schema,
  registrationStep3Schema,
} from "@/lib/validation"

export default function RegisterPage() {
  const router = useRouter()

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Step 1: Account Information
  const [step1Data, setStep1Data] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    companyName: "",
    phoneNumber: "",
    countryCode: "US",
    countryRegion: "US",
  })

  // Step 2: Plan Selection
  const [selectedPlan, setSelectedPlan] = useState<Plan>("professional")
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("usd")

  // Step 3: Terms and Conditions
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  // Handle currency change based on country selection
  const handleCountryChange = (countryCode: string) => {
    setStep1Data({ ...step1Data, countryCode, countryRegion: countryCode })
    setSelectedCurrency(getCurrencyByCountry(countryCode))
  }

  // Validate Step 1
  const validateStep1 = () => {
    try {
      registrationStep1Schema.parse(step1Data)
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err: any) => {
        fieldErrors[err.path[0]] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  // Validate Step 2
  const validateStep2 = () => {
    try {
      registrationStep2Schema.parse({ selectedPlan, selectedCurrency })
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err: any) => {
        fieldErrors[err.path[0]] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  // Validate Step 3
  const validateStep3 = () => {
    try {
      registrationStep3Schema.parse({ acceptTerms, acceptPrivacy })
      setErrors({})
      return true
    } catch (error: any) {
      const fieldErrors: Record<string, string> = {}
      error.errors.forEach((err: any) => {
        fieldErrors[err.path[0]] = err.message
      })
      setErrors(fieldErrors)
      return false
    }
  }

  // Handle Next Step
  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  // Handle Back Step
  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
  }

  // Handle Final Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep3()) return

    setIsLoading(true)
    setError("")

    try {
      // Create Supabase client
      const supabase = createClient()

      // Combine phone number with country code
      const fullPhone = `${countries.find((c) => c.code === step1Data.countryCode)?.dialCode || ""}${step1Data.phoneNumber}`

      // Register user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: step1Data.email,
        password: step1Data.password,
        options: {
          data: {
            full_name: step1Data.fullName,
            company_name: step1Data.companyName,
            phone: fullPhone,
            country: step1Data.countryRegion,
            selected_plan: selectedPlan,
            selected_currency: selectedCurrency,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      if (authData.user) {
        // Successfully registered - show email verification message
        setUserEmail(step1Data.email)
        setRegistrationComplete(true)
        setIsLoading(false)
      } else {
        setError("Registration failed. Please try again.")
        setIsLoading(false)
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const plans = [
    {
      id: "starter" as Plan,
      name: "Starter",
      description: "Perfect for small teams",
      features: ["Up to 5 users", "Basic features", "Email support"],
    },
    {
      id: "professional" as Plan,
      name: "Professional",
      description: "For growing businesses",
      features: ["Up to 20 users", "Advanced features", "Priority support"],
      popular: true,
    },
    {
      id: "enterprise" as Plan,
      name: "Enterprise",
      description: "For large organizations",
      features: ["Unlimited users", "All features", "24/7 dedicated support"],
    },
  ]

  // Show email verification screen after successful registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold">
              The Sierra Suites
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a verification link to
              </p>
              <p className="text-lg font-semibold text-[#1E3A8A] mb-6">
                {userEmail}
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2 text-sm">Next Steps:</h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#1E3A8A]">1.</span>
                    <span>Open the email we just sent you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#1E3A8A]">2.</span>
                    <span>Click the verification link (works on any device)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-[#1E3A8A]">3.</span>
                    <span>You'll be redirected to login automatically</span>
                  </li>
                </ol>
              </div>

              <div className="space-y-3">
                <Link href="/login">
                  <Button className="w-full">
                    Go to Login Page
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => setRegistrationComplete(false)}
                    className="text-[#1E3A8A] hover:underline font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-[#1E3A8A] hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
            </div>
          </div>
        </div>
      </header>

      {/* Registration Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Create Your Account
            </h1>
            <p className="text-muted-foreground">
              Join thousands of contractors using The Sierra Suites to grow their business
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step
                        ? "bg-[#1E3A8A] text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        currentStep > step ? "bg-[#1E3A8A]" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-lg">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Account Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Account Information</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tell us about yourself and your business
                    </p>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={step1Data.fullName}
                      onChange={(e) =>
                        setStep1Data({ ...step1Data, fullName: e.target.value })
                      }
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.fullName ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                      placeholder="Enter your full name"
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={step1Data.email}
                      onChange={(e) => setStep1Data({ ...step1Data, email: e.target.value })}
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.email ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                      placeholder="you@company.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium mb-2">
                      Company Name *
                    </label>
                    <input
                      id="companyName"
                      type="text"
                      value={step1Data.companyName}
                      onChange={(e) =>
                        setStep1Data({ ...step1Data, companyName: e.target.value })
                      }
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.companyName ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                      placeholder="Your Company Ltd."
                    />
                    {errors.companyName && (
                      <p className="text-sm text-destructive mt-1">{errors.companyName}</p>
                    )}
                  </div>

                  {/* Phone Number with International Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone Number *
                    </label>
                    <InternationalPhoneInput
                      value={step1Data.phoneNumber}
                      onChange={(value) =>
                        setStep1Data({ ...step1Data, phoneNumber: value })
                      }
                      countryCode={step1Data.countryCode}
                      onCountryCodeChange={handleCountryChange}
                      error={errors.phoneNumber}
                    />
                  </div>

                  {/* Country/Region */}
                  <div>
                    <label htmlFor="countryRegion" className="block text-sm font-medium mb-2">
                      Country/Region *
                    </label>
                    <select
                      id="countryRegion"
                      value={step1Data.countryRegion}
                      onChange={(e) => {
                        setStep1Data({ ...step1Data, countryRegion: e.target.value })
                        setSelectedCurrency(getCurrencyByCountry(e.target.value))
                      }}
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.countryRegion ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                    {errors.countryRegion && (
                      <p className="text-sm text-destructive mt-1">{errors.countryRegion}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                      Password *
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={step1Data.password}
                      onChange={(e) =>
                        setStep1Data({ ...step1Data, password: e.target.value })
                      }
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.password ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                      placeholder="Create a strong password"
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive mt-1">{errors.password}</p>
                    )}
                    <PasswordStrengthMeter
                      password={step1Data.password}
                      userInputs={[step1Data.email, step1Data.fullName, step1Data.companyName]}
                      showFeedback={true}
                    />
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium mb-2"
                    >
                      Confirm Password *
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={step1Data.confirmPassword}
                      onChange={(e) =>
                        setStep1Data({ ...step1Data, confirmPassword: e.target.value })
                      }
                      className={`w-full px-4 py-2 rounded-md border ${
                        errors.confirmPassword ? "border-destructive" : "border-input"
                      } bg-background focus:outline-none focus:ring-2 focus:ring-ring`}
                      placeholder="Confirm your password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button type="button" onClick={handleNext} className="w-full">
                    Continue to Plan Selection
                  </Button>

                  <OAuthButtons showDivider={true} />

                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              )}

              {/* Step 2: Plan Selection */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Choose Your Plan</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select the plan that best fits your needs
                    </p>
                  </div>

                  {/* Currency Selector */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-center">
                      Select Your Currency
                    </label>
                    <CurrencySelector
                      value={selectedCurrency}
                      onChange={setSelectedCurrency}
                    />
                  </div>

                  {/* Plans */}
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                          selectedPlan === plan.id
                            ? "border-[#1E3A8A] bg-[#1E3A8A]/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="bg-[#1E3A8A] text-white text-xs font-semibold px-3 py-1 rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}
                        <div className="text-lg font-bold">{plan.name}</div>
                        <div className="text-2xl font-bold mt-2 text-[#1E3A8A]">
                          {formatPrice(priceMapping[plan.id][selectedCurrency], selectedCurrency)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-4">per month</div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {plan.description}
                        </p>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <svg
                                className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button type="button" onClick={handleNext} className="flex-1">
                      Continue to Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Terms and Review */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">Review & Confirm</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review your information and accept our terms
                    </p>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </div>
                  )}

                  {/* Review Information */}
                  <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                    <div>
                      <h3 className="font-semibold mb-3">Account Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="font-medium">{step1Data.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{step1Data.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Company:</span>
                          <span className="font-medium">{step1Data.companyName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">
                            {countries.find((c) => c.code === step1Data.countryCode)
                              ?.dialCode || ""}{" "}
                            {step1Data.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h3 className="font-semibold mb-3">Selected Plan</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan:</span>
                          <span className="font-medium">
                            {plans.find((p) => p.id === selectedPlan)?.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium text-[#1E3A8A]">
                            {formatPrice(
                              priceMapping[selectedPlan][selectedCurrency],
                              selectedCurrency
                            )}{" "}
                            / month
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Currency:</span>
                          <span className="font-medium">
                            {selectedCurrency.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        id="acceptTerms"
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 rounded border-input"
                      />
                      <label htmlFor="acceptTerms" className="text-sm">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setActiveModal("terms")}
                          className="text-[#1E3A8A] hover:underline font-medium"
                        >
                          Terms of Service
                        </button>{" "}
                        and understand that my subscription will automatically renew monthly
                      </label>
                    </div>
                    {errors.acceptTerms && (
                      <p className="text-sm text-destructive">{errors.acceptTerms}</p>
                    )}

                    <div className="flex items-start gap-3">
                      <input
                        id="acceptPrivacy"
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(e) => setAcceptPrivacy(e.target.checked)}
                        className="mt-1 rounded border-input"
                      />
                      <label htmlFor="acceptPrivacy" className="text-sm">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => setActiveModal("privacy")}
                          className="text-[#1E3A8A] hover:underline font-medium"
                        >
                          Privacy Policy
                        </button>{" "}
                        and consent to the processing of my personal data
                      </label>
                    </div>
                    {errors.acceptPrivacy && (
                      <p className="text-sm text-destructive">{errors.acceptPrivacy}</p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Complete Registration"}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-[#1E3A8A] hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-8 lg:px-12 text-center text-sm text-muted-foreground">
          <p>© 2025 The Sierra Suites. All rights reserved.</p>
        </div>
      </footer>

      {/* Terms / Privacy Modal */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-8 md:p-12"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModal(null)}
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
                    The Sierra Suites (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to protecting your privacy. This Privacy
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
                    By accessing or using The Sierra Suites (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
