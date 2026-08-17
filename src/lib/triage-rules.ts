export type TriageCategory =
  "performance" | "integration" | "availability" | "data_integrity" | "security" | "other";

export type TriageSeverity = "P1" | "P2" | "P3" | "P4";

export function inferCategory(text: string): TriageCategory {
  const lower = text.toLocaleLowerCase("tr");
  if (
    /yetkisiz|şüpheli|supheli|sızma|sizma|sızmış|sizmis|credential|token\w*\s+sız|veri\w*\s+ihlal/.test(
      lower,
    )
  ) {
    return "security";
  }
  if (/zaman aşımı|zaman asimi|timeout|yavaş|yavas|gecikme|yanıt sür|latency|havuz/.test(lower)) {
    return "performance";
  }
  if (/sertifika|entegrasyon|format|api|servis çağrı|handshake|webhook/.test(lower)) {
    return "integration";
  }
  if (/mutabakat|dosya|eksik satır|eksik satir|tutarsız|tutarsiz|duplicate|mükerrer/.test(lower)) {
    return "data_integrity";
  }
  if (
    /erişilemiyor|erisilemiyor|kesinti|boş ekran|bos ekran|ekran[^\s]*\s+boş|çalışmıyor|calismiyor|unavailable/.test(
      lower,
    )
  ) {
    return "availability";
  }
  return "other";
}

export function inferSeverity(text: string): TriageSeverity {
  const lower = text.toLocaleLowerCase("tr");
  if (
    /kritik|tüm müşteri|tum musteri|genel kesinti|p1|ödeme alınamıyor|odeme alinamiyor|veri ihlal/.test(
      lower,
    )
  ) {
    return "P1";
  }
  if (/test|geliştirme|gelistirme|tek kullanıcı|tek kullanici|p4/.test(lower)) return "P4";
  if (/%[5-9]|%\d{2}|artış|artis|hata oranı|hata orani|kısmi|kismi|yavaş|yavas|p2/.test(lower)) {
    return "P2";
  }
  return "P3";
}
