import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  e164?: string;
  error?: string;
}

export function validateAndNormalizePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone number is required',
    };
  }

  const trimmedPhone = phone.trim();

  // Must start with +
  if (!trimmedPhone.startsWith('+')) {
    return {
      isValid: false,
      error: 'Enter a valid phone number with country code (e.g., +12025550123 / +447700900123 / +919876543210)',
    };
  }

  try {
    // Parse without country hint to support all countries
    const phoneNumber = parsePhoneNumberFromString(trimmedPhone);

    if (!phoneNumber) {
      return {
        isValid: false,
        error: 'Enter a valid phone number with country code (e.g., +12025550123 / +447700900123 / +919876543210)',
      };
    }

    // Check if it's a valid number
    if (!phoneNumber.isValid()) {
      return {
        isValid: false,
        error: 'Enter a valid phone number with country code (e.g., +12025550123 / +447700900123 / +919876543210)',
      };
    }

    // Get E.164 format
    const e164 = phoneNumber.format('E.164');

    return {
      isValid: true,
      e164,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Enter a valid phone number with country code (e.g., +12025550123 / +447700900123 / +919876543210)',
    };
  }
}

export function getCountryCodeFromE164(e164: string): string | null {
  try {
    const phoneNumber = parsePhoneNumberFromString(e164);
    if (phoneNumber) {
      return phoneNumber.countryCallingCode;
    }
  } catch {
    // Ignore errors
  }
  return null;
}