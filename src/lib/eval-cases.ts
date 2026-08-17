import {
  inferCategory,
  inferSeverity,
  type TriageCategory,
  type TriageSeverity,
} from "./triage-rules";
import { shouldGenerateActions } from "./domain";

export type EvalCase = {
  id: string;
  input: string;
  expectedCategory: TriageCategory;
  expectedSeverity: TriageSeverity;
  hasEvidence: boolean;
};

export const EVAL_CASES: EvalCase[] = [
  {
    id: "EV-001",
    input: "Kart switch bağlantı havuzu doldu, timeout oranı %12",
    expectedCategory: "performance",
    expectedSeverity: "P2",
    hasEvidence: true,
  },
  {
    id: "EV-002",
    input: "Tüm müşteriler POS ödemelerinde timeout alıyor, kritik kesinti",
    expectedCategory: "performance",
    expectedSeverity: "P1",
    hasEvidence: true,
  },
  {
    id: "EV-003",
    input: "3D Secure SSL handshake sertifika hatası %8",
    expectedCategory: "integration",
    expectedSeverity: "P2",
    hasEvidence: true,
  },
  {
    id: "EV-004",
    input: "Mutabakat dosyasında eksik satır ve tutarsız işlem sayısı",
    expectedCategory: "data_integrity",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-005",
    input: "Mobil uygulamada bakiye ekranı boş geliyor",
    expectedCategory: "availability",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-006",
    input: "Yetkisiz token kullanımı ve şüpheli erişim tespit edildi",
    expectedCategory: "security",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-007",
    input: "Müşteri verisi ihlali, tüm kanallarda kritik durum",
    expectedCategory: "security",
    expectedSeverity: "P1",
    hasEvidence: false,
  },
  {
    id: "EV-008",
    input: "Webhook API formatı sağlayıcı ile uyumsuz",
    expectedCategory: "integration",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-009",
    input: "Gece batch işlemi iki saat gecikmeli tamamlandı",
    expectedCategory: "performance",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-010",
    input: "Ödeme servisi tüm müşteriler için erişilemiyor",
    expectedCategory: "availability",
    expectedSeverity: "P1",
    hasEvidence: true,
  },
  {
    id: "EV-011",
    input: "Tek kullanıcı test ortamında yavaş yanıt alıyor",
    expectedCategory: "performance",
    expectedSeverity: "P4",
    hasEvidence: false,
  },
  {
    id: "EV-012",
    input: "Mükerrer ödeme kayıtları oluştu",
    expectedCategory: "data_integrity",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-013",
    input: "Sanal POS taksit alan format hatası",
    expectedCategory: "integration",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-014",
    input: "Core bankacılık genel kesinti; ödeme alınamıyor",
    expectedCategory: "availability",
    expectedSeverity: "P1",
    hasEvidence: true,
  },
  {
    id: "EV-015",
    input: "p95 latency 1800 ms üzerine çıktı ve hata oranı arttı",
    expectedCategory: "performance",
    expectedSeverity: "P2",
    hasEvidence: true,
  },
  {
    id: "EV-016",
    input: "Gün sonu dosyasında duplicate kayıtlar var",
    expectedCategory: "data_integrity",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-017",
    input: "Servis çağrısı yeni API sürümünde başarısız",
    expectedCategory: "integration",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-018",
    input: "Kimlik doğrulama ekranı çalışmıyor",
    expectedCategory: "availability",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-019",
    input: "Credential sızıntısı şüphesi",
    expectedCategory: "security",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-020",
    input: "Kart işlemlerinde kısmi yavaşlama ve %6 hata",
    expectedCategory: "performance",
    expectedSeverity: "P2",
    hasEvidence: true,
  },
  {
    id: "EV-021",
    input: "Staging ortamında sertifika süresi doldu",
    expectedCategory: "integration",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-022",
    input: "Kaynak işlem toplamı ile rapor toplamı tutarsız",
    expectedCategory: "data_integrity",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-023",
    input: "Mobil servis unavailable hatası veriyor",
    expectedCategory: "availability",
    expectedSeverity: "P3",
    hasEvidence: true,
  },
  {
    id: "EV-024",
    input: "Genel bilgilendirme talebi, teknik belirti yok",
    expectedCategory: "other",
    expectedSeverity: "P3",
    hasEvidence: false,
  },
  {
    id: "EV-025",
    input: "Tüm müşterilerin ödeme tokenları sızmış olabilir",
    expectedCategory: "security",
    expectedSeverity: "P1",
    hasEvidence: false,
  },
];

export function runDeterministicEval() {
  const results = EVAL_CASES.map((testCase) => {
    const category = inferCategory(testCase.input);
    const severity = inferSeverity(testCase.input);
    return {
      ...testCase,
      category,
      severity,
      categoryPass: category === testCase.expectedCategory,
      severityPass: severity === testCase.expectedSeverity,
      noAnswerPass:
        shouldGenerateActions(testCase.hasEvidence ? 0.82 : 0.18) === testCase.hasEvidence,
    };
  });
  return {
    results,
    categoryAccuracy: results.filter((result) => result.categoryPass).length / results.length,
    severityAccuracy: results.filter((result) => result.severityPass).length / results.length,
    noAnswerAccuracy: results.filter((result) => result.noAnswerPass).length / results.length,
  };
}
