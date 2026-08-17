import { describe, expect, it } from "vitest";
import { inferCategory, inferSeverity } from "./triage-rules";

describe("deterministic triage rules", () => {
  it.each([
    ["DB havuzu doldu ve timeout başladı", "performance"],
    ["SSL handshake sertifika hatası", "integration"],
    ["Mutabakat dosyasında eksik satır", "data_integrity"],
    ["Mobil servis erişilemiyor", "availability"],
    ["Yetkisiz token sızıntısı", "security"],
    ["Genel operasyon notu", "other"],
  ] as const)("classifies %s", (input, expected) => {
    expect(inferCategory(input)).toBe(expected);
  });

  it.each([
    ["Tüm müşteriler ödeme alınamıyor, kritik", "P1"],
    ["Hata oranı %8 arttı", "P2"],
    ["Tek kullanıcı test ortamında", "P4"],
    ["Sınırlı bir belirti", "P3"],
  ] as const)("infers severity for %s", (input, expected) => {
    expect(inferSeverity(input)).toBe(expected);
  });
});
