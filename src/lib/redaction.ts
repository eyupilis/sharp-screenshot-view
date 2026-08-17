const SECRET_ASSIGNMENT = /(?:password|parola|token|secret)\s*[:=]\s*\S+/gi;
const EMAIL_ADDRESS = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const TURKISH_IBAN = /\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi;

export function redactSensitiveText(value: string) {
  return value
    .replace(SECRET_ASSIGNMENT, "[SECRET REDACTED]")
    .replace(EMAIL_ADDRESS, "[EMAIL REDACTED]")
    .replace(TURKISH_IBAN, "[IBAN REDACTED]");
}
