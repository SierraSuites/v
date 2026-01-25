export type Currency = 'usd' | 'gbp' | 'eur' | 'cad'
export type Plan = 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled' | 'past_due'

export interface Country {
  code: string
  name: string
  dialCode: string
  flag: string
  format?: string
}

export interface PriceMapping {
  [key: string]: {
    [currency in Currency]: number
  }
}

export interface UserProfile {
  id: string
  full_name: string
  company_name: string
  phone_number: string
  country_code: string
  country_region: string
  selected_plan: Plan
  selected_currency: Currency
  subscription_status: SubscriptionStatus
  stripe_customer_id?: string
  stripe_subscription_id?: string
  current_period_end?: string
  created_at: string
  updated_at: string
}

export interface RegistrationStep1Data {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  companyName: string
  phoneNumber: string
  countryCode: string
  countryRegion: string
}

export interface RegistrationStep2Data {
  selectedPlan: Plan
  selectedCurrency: Currency
}

export interface RegistrationStep3Data {
  acceptTerms: boolean
  acceptPrivacy: boolean
}

export type RegistrationData = RegistrationStep1Data & RegistrationStep2Data & RegistrationStep3Data
