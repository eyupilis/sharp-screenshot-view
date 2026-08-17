import { describe, expect, it } from "vitest";
import { redactSensitiveText } from "./redaction";

describe("sensitive text redaction", () => {
  it("redacts secrets, email and Turkish IBAN values", () => {
    const output = redactSensitiveText(
      "token=abc123 user@example.com TR12 3456 7890 1234 5678 9012 34",
    );
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("user@example.com");
    expect(output).not.toContain("TR12");
    expect(output).toContain("[SECRET REDACTED]");
    expect(output).toContain("[EMAIL REDACTED]");
    expect(output).toContain("[IBAN REDACTED]");
  });
});
