import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js'

export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode as CountryCode)
    return parsed?.formatInternational() || phoneNumber
  } catch (error) {
    return phoneNumber
  }
}

export function validatePhoneNumber(phoneNumber: string, countryCode: string): boolean {
  try {
    return isValidPhoneNumber(phoneNumber, countryCode as CountryCode)
  } catch (error) {
    return false
  }
}

export function parsePhoneNumberToE164(phoneNumber: string, countryCode: string): string {
  try {
    const parsed = parsePhoneNumber(phoneNumber, countryCode as CountryCode)
    return parsed?.number || phoneNumber
  } catch (error) {
    return phoneNumber
  }
}

export function stripPhoneFormatting(phoneNumber: string): string {
  return phoneNumber.replace(/[\s()-]/g, '')
}
