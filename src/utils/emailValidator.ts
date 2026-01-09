export interface ValidationResult {
  email: string;
  isValid: boolean;
  error?: string;
}

// Basic email regex pattern
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common disposable email domains to block
const disposableDomains = [
  'tempmail.com',
  'throwaway.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
];

// Common typos in email domains
const commonTypos: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
};

export function validateEmail(email: string): ValidationResult {
  const trimmedEmail = email.trim().toLowerCase();

  // Check basic format
  if (!emailRegex.test(trimmedEmail)) {
    return {
      email: trimmedEmail,
      isValid: false,
      error: 'Invalid email format',
    };
  }

  // Extract domain
  const domain = trimmedEmail.split('@')[1];

  // Check for disposable domains
  if (disposableDomains.includes(domain)) {
    return {
      email: trimmedEmail,
      isValid: false,
      error: 'Disposable email addresses are not allowed',
    };
  }

  // Check for common typos
  if (commonTypos[domain]) {
    return {
      email: trimmedEmail,
      isValid: false,
      error: `Did you mean ${trimmedEmail.replace(domain, commonTypos[domain])}?`,
    };
  }

  // Check minimum length requirements
  const localPart = trimmedEmail.split('@')[0];
  if (localPart.length < 1) {
    return {
      email: trimmedEmail,
      isValid: false,
      error: 'Email local part is too short',
    };
  }

  // Valid email
  return {
    email: trimmedEmail,
    isValid: true,
  };
}

export async function validateEmails(emails: string[]): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const seen = new Set<string>();

  for (const email of emails) {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Check for duplicates
    if (seen.has(trimmedEmail)) {
      results.push({
        email: trimmedEmail,
        isValid: false,
        error: 'Duplicate email address',
      });
      continue;
    }
    
    seen.add(trimmedEmail);
    results.push(validateEmail(email));
  }

  return results;
}

export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
