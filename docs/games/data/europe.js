// Europe country metadata for the geography games.
// Keys are ISO-3166 alpha-2 codes (matching the path ids in europe.svg).
// `region` follows a kid-friendly grouping: Western, Northern, Southern,
// Eastern, and Central Europe.

export const COUNTRIES = {
  // Western Europe
  FR: { name: 'France', capital: 'Paris', region: 'western' },
  DE: { name: 'Germany', capital: 'Berlin', region: 'western' },
  NL: { name: 'Netherlands', capital: 'Amsterdam', region: 'western' },
  BE: { name: 'Belgium', capital: 'Brussels', region: 'western' },
  LU: { name: 'Luxembourg', capital: 'Luxembourg', region: 'western' },
  CH: { name: 'Switzerland', capital: 'Bern', region: 'western' },
  AT: { name: 'Austria', capital: 'Vienna', region: 'western' },
  IE: { name: 'Ireland', capital: 'Dublin', region: 'western' },
  GB: { name: 'United Kingdom', capital: 'London', region: 'western' },
  LI: { name: 'Liechtenstein', capital: 'Vaduz', region: 'western' },
  MC: { name: 'Monaco', capital: 'Monaco', region: 'western' },

  // Northern Europe
  NO: { name: 'Norway', capital: 'Oslo', region: 'northern' },
  SE: { name: 'Sweden', capital: 'Stockholm', region: 'northern' },
  FI: { name: 'Finland', capital: 'Helsinki', region: 'northern' },
  DK: { name: 'Denmark', capital: 'Copenhagen', region: 'northern' },
  IS: { name: 'Iceland', capital: 'Reykjavík', region: 'northern' },
  EE: { name: 'Estonia', capital: 'Tallinn', region: 'northern' },
  LV: { name: 'Latvia', capital: 'Riga', region: 'northern' },
  LT: { name: 'Lithuania', capital: 'Vilnius', region: 'northern' },

  // Southern Europe
  ES: { name: 'Spain', capital: 'Madrid', region: 'southern' },
  PT: { name: 'Portugal', capital: 'Lisbon', region: 'southern' },
  IT: { name: 'Italy', capital: 'Rome', region: 'southern' },
  GR: { name: 'Greece', capital: 'Athens', region: 'southern' },
  MT: { name: 'Malta', capital: 'Valletta', region: 'southern' },
  CY: { name: 'Cyprus', capital: 'Nicosia', region: 'southern' },
  AD: { name: 'Andorra', capital: 'Andorra la Vella', region: 'southern' },
  SM: { name: 'San Marino', capital: 'San Marino', region: 'southern' },
  VA: { name: 'Vatican City', capital: 'Vatican City', region: 'southern' },

  // Central Europe
  PL: { name: 'Poland', capital: 'Warsaw', region: 'central' },
  CZ: { name: 'Czechia', capital: 'Prague', region: 'central' },
  SK: { name: 'Slovakia', capital: 'Bratislava', region: 'central' },
  HU: { name: 'Hungary', capital: 'Budapest', region: 'central' },
  SI: { name: 'Slovenia', capital: 'Ljubljana', region: 'central' },
  HR: { name: 'Croatia', capital: 'Zagreb', region: 'central' },

  // Eastern / Southeastern Europe
  RO: { name: 'Romania', capital: 'Bucharest', region: 'eastern' },
  BG: { name: 'Bulgaria', capital: 'Sofia', region: 'eastern' },
  RS: { name: 'Serbia', capital: 'Belgrade', region: 'eastern' },
  BA: { name: 'Bosnia & Herzegovina', capital: 'Sarajevo', region: 'eastern' },
  ME: { name: 'Montenegro', capital: 'Podgorica', region: 'eastern' },
  MK: { name: 'North Macedonia', capital: 'Skopje', region: 'eastern' },
  AL: { name: 'Albania', capital: 'Tirana', region: 'eastern' },
  KV: { name: 'Kosovo', capital: 'Pristina', region: 'eastern' },
  MD: { name: 'Moldova', capital: 'Chișinău', region: 'eastern' },
  UA: { name: 'Ukraine', capital: 'Kyiv', region: 'eastern' },
  BY: { name: 'Belarus', capital: 'Minsk', region: 'eastern' },
  RU: { name: 'Russia', capital: 'Moscow', region: 'eastern' },
  TR: { name: 'Turkey', capital: 'Ankara', region: 'eastern' },
};

export const COUNTRY_CODES = Object.keys(COUNTRIES);

export const REGIONS = {
  western: { label: 'Western Europe', icon: '🏰' },
  northern: { label: 'Northern Europe', icon: '❄️' },
  southern: { label: 'Southern Europe', icon: '☀️' },
  central: { label: 'Central Europe', icon: '🏔️' },
  eastern: { label: 'Eastern Europe', icon: '🌲' },
};

export function codesByRegion(region) {
  return COUNTRY_CODES.filter((code) => COUNTRIES[code].region === region);
}
