import { readFileSync } from "node:fs";

const clientFiles = [
  "src/integrations/supabase/client.ts",
  "src/routes/_app/komuta.tsx",
  "src/routes/_app/olaylar.$id.tsx",
];
for (const file of clientFiles) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  if (source.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    throw new Error(`Service role key referenced by client-shipped file: ${file}`);
  }
}

const serverClient = readFileSync(
  new URL("../src/integrations/supabase/client.server.ts", import.meta.url),
  "utf8",
);
if (!serverClient.includes("persistSession: false")) {
  throw new Error("Server admin client must not persist sessions");
}

console.log("Security boundary checks passed.");
