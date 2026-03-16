export function buildContentPrompt(topic: string, type: string, locale: string) {
  const { languageCode, countryCode } = parseLocale(locale);
  const languageName = getLanguageName(languageCode);
  const countryName = getCountryName(countryCode);
  const countryStyle = getCountryStyleGuidance(countryCode);

  return `
You are a marketing copywriter.

Generate marketing content adapted to the requested locale.

Topic: ${topic}
Content type: ${type}
Locale: ${locale}
Base language: ${languageName}
Country/region: ${countryName}

Localization requirements:
- Write fully in ${languageName}.
- Use wording, idioms, spelling, and punctuation common in ${countryName}.
- Keep references culturally natural for ${countryName}.
- Avoid mixing other regional variants unless they are standard in ${countryName}.
- Tone guidance for ${countryName}: ${countryStyle}

Return JSON:

{
 "title": "...",
 "body": "..."
}
`;
}

function parseLocale(locale: string): { languageCode: string; countryCode: string } {
  const [languageCode = 'en', countryCode = 'US'] = locale.split('-');
  return {
    languageCode: languageCode.toLowerCase(),
    countryCode: countryCode.toUpperCase(),
  };
}

function getLanguageName(code: string): string {
  const map: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    pt: 'Portuguese',
    de: 'German',
    it: 'Italian',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    nl: 'Dutch',
    sv: 'Swedish',
    no: 'Norwegian',
    da: 'Danish',
    fi: 'Finnish',
    pl: 'Polish',
    cs: 'Czech',
    tr: 'Turkish',
    ru: 'Russian',
    uk: 'Ukrainian',
    ar: 'Arabic',
    he: 'Hebrew',
    hi: 'Hindi',
    th: 'Thai',
    vi: 'Vietnamese',
    id: 'Indonesian',
    ms: 'Malay',
    ro: 'Romanian',
    el: 'Greek',
    hu: 'Hungarian',
  };
  return map[code] ?? `Language (${code})`;
}

function getCountryName(code: string): string {
  const map: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    ES: 'Spain',
    MX: 'Mexico',
    AR: 'Argentina',
    FR: 'France',
    BR: 'Brazil',
    PT: 'Portugal',
    DE: 'Germany',
    IT: 'Italy',
    JP: 'Japan',
    CN: 'China',
    TW: 'Taiwan',
    KR: 'South Korea',
    NL: 'Netherlands',
    SE: 'Sweden',
    NO: 'Norway',
    DK: 'Denmark',
    FI: 'Finland',
    PL: 'Poland',
    CZ: 'Czechia',
    TR: 'Turkey',
    RU: 'Russia',
    UA: 'Ukraine',
    SA: 'Saudi Arabia',
    IL: 'Israel',
    IN: 'India',
    TH: 'Thailand',
    VN: 'Vietnam',
    ID: 'Indonesia',
    MY: 'Malaysia',
    RO: 'Romania',
    GR: 'Greece',
    HU: 'Hungary',
  };
  return map[code] ?? `Region (${code})`;
}

function getCountryStyleGuidance(code: string): string {
  const map: Record<string, string> = {
    US: 'clear, energetic, direct, with modern US vocabulary',
    GB: 'polished, concise, with UK spelling and phrasing',
    CA: 'friendly and inclusive, balancing US/UK style naturally',
    ES: 'neutral Spain Spanish, clear and informative',
    MX: 'warm and approachable Mexican Spanish',
    AR: 'natural Rioplatense-friendly Spanish (without overusing slang)',
    FR: 'formal-friendly French used in France',
    BR: 'conversational Brazilian Portuguese with local phrasing',
    PT: 'European Portuguese style and orthography',
    JP: 'respectful, concise Japanese with culturally appropriate politeness',
    DE: 'precise, trustworthy German tone',
    IT: 'warm and expressive Italian tone',
  };
  return map[code] ?? 'natural and professional for local readers';
}
