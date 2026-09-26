// Identification client par téléphone (CDC #7)
// Format de référence : 00 + indicatif pays + numéro national
// sans « + », sans espace, sans séparateur. Ex. +216 98123456 → 0021698123456

const DEFAULT_COUNTRY_CODE = "216"; // indicatif par défaut (configurable — setting `default_country_code`)

export function normalizePhone(raw: string, defaultCountryCode: string = DEFAULT_COUNTRY_CODE): string {
  let value = raw.trim().replace(/[\s.\-()\u00a0]/g, "");
  if (value.startsWith("+")) {
    value = "00" + value.slice(1);
  } else if (!value.startsWith("00")) {
    // Numéro national saisi : on préfixe avec l'indicatif par défaut
    value = "00" + defaultCountryCode + value;
  }
  return value;
}

export function isValidNormalizedPhone(value: string): boolean {
  // 00 + indicatif (1 à 4 chiffres) + numéro national (au moins 6 chiffres)
  return /^00\d{1,4}\d{6,14}$/.test(value);
}

// Formatage d'affichage : 0021698123456 → +216 98 123 456 (lisible, indicatif TN)
export function displayPhone(normalized: string): string {
  const m = normalized.match(/^00(\d{1,4})(\d+)$/);
  if (!m) return normalized;
  const [, code, national] = m;
  const groups = national.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  return `+${code} ${groups}`;
}
