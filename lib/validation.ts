import { z } from 'zod'

// International email validation
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .refine((email) => {
    // Support all international email domains
    const domain = email.split('@')[1]
    if (!domain) return false
    return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)
  }, 'Please enter a valid email domain')

// Strong password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// International phone validation
export const phoneSchema = z
  .string()
  .min(5, 'Phone number is too short')
  .refine((phone) => {
    // International phone validation
    const cleaned = phone.replace(/[\s()-]/g, '')
    return /^\+?[1-9]\d{1,14}$/.test(cleaned)
  }, 'Please enter a valid international phone number')

// Step 1: Account Information
export const registrationStep1Schema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    phoneNumber: phoneSchema,
    countryCode: z.string().min(1, 'Please select a country code'),
    countryRegion: z.string().min(2, 'Please select your country/region'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Step 2: Plan Selection
export const registrationStep2Schema = z.object({
  selectedPlan: z.enum(['starter', 'professional', 'enterprise'], {
    required_error: 'Please select a plan',
  }),
  selectedCurrency: z.enum(['usd', 'gbp', 'eur', 'cad'], {
    required_error: 'Please select a currency',
  }),
})

// Step 3: Terms and Conditions
export const registrationStep3Schema = z.object({
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service',
  }),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Privacy Policy',
  }),
})

// Complete registration schema (combined type for reference)
// Note: Since step1 uses .refine(), we can't use .merge()
// Instead, validate each step separately in the form
export type RegistrationData = RegistrationStep1Input & RegistrationStep2Input & RegistrationStep3Input

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegistrationStep1Input = z.infer<typeof registrationStep1Schema>
export type RegistrationStep2Input = z.infer<typeof registrationStep2Schema>
export type RegistrationStep3Input = z.infer<typeof registrationStep3Schema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
