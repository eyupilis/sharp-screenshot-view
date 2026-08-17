import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((file) => !/\.(png|jpg|jpeg|gif|ico|pdf|pptx|docx|zip)$/i.test(file));
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  /^SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!\$\{|<|your-|server-only-)[^\s#]+/m,
];
const findings = [];
for (const file of tracked) {
  const content = readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}
if (findings.length) throw new Error(`Potential secret material in: ${findings.join(", ")}`);
console.log(`Secret scan passed (${tracked.length} tracked text files).`);
