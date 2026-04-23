// Metadata for the 50 US states. Keys match the `id` attribute of the
// matching <path> in docs/games/data/us-states.svg (USPS 2-letter codes).
// Regions follow the U.S. Census Bureau's 4-region grouping.

export const STATES = {
  AL: { name: 'Alabama',        capital: 'Montgomery',     region: 'south'     },
  AK: { name: 'Alaska',         capital: 'Juneau',         region: 'west'      },
  AZ: { name: 'Arizona',        capital: 'Phoenix',        region: 'west'      },
  AR: { name: 'Arkansas',       capital: 'Little Rock',    region: 'south'     },
  CA: { name: 'California',     capital: 'Sacramento',     region: 'west'      },
  CO: { name: 'Colorado',       capital: 'Denver',         region: 'west'      },
  CT: { name: 'Connecticut',    capital: 'Hartford',       region: 'northeast' },
  DE: { name: 'Delaware',       capital: 'Dover',          region: 'south'     },
  FL: { name: 'Florida',        capital: 'Tallahassee',    region: 'south'     },
  GA: { name: 'Georgia',        capital: 'Atlanta',        region: 'south'     },
  HI: { name: 'Hawaii',         capital: 'Honolulu',       region: 'west'      },
  ID: { name: 'Idaho',          capital: 'Boise',          region: 'west'      },
  IL: { name: 'Illinois',       capital: 'Springfield',    region: 'midwest'   },
  IN: { name: 'Indiana',        capital: 'Indianapolis',   region: 'midwest'   },
  IA: { name: 'Iowa',           capital: 'Des Moines',     region: 'midwest'   },
  KS: { name: 'Kansas',         capital: 'Topeka',         region: 'midwest'   },
  KY: { name: 'Kentucky',       capital: 'Frankfort',      region: 'south'     },
  LA: { name: 'Louisiana',      capital: 'Baton Rouge',    region: 'south'     },
  ME: { name: 'Maine',          capital: 'Augusta',        region: 'northeast' },
  MD: { name: 'Maryland',       capital: 'Annapolis',      region: 'south'     },
  MA: { name: 'Massachusetts',  capital: 'Boston',         region: 'northeast' },
  MI: { name: 'Michigan',       capital: 'Lansing',        region: 'midwest'   },
  MN: { name: 'Minnesota',      capital: 'St. Paul',       region: 'midwest'   },
  MS: { name: 'Mississippi',    capital: 'Jackson',        region: 'south'     },
  MO: { name: 'Missouri',       capital: 'Jefferson City', region: 'midwest'   },
  MT: { name: 'Montana',        capital: 'Helena',         region: 'west'      },
  NE: { name: 'Nebraska',       capital: 'Lincoln',        region: 'midwest'   },
  NV: { name: 'Nevada',         capital: 'Carson City',    region: 'west'      },
  NH: { name: 'New Hampshire',  capital: 'Concord',        region: 'northeast' },
  NJ: { name: 'New Jersey',     capital: 'Trenton',        region: 'northeast' },
  NM: { name: 'New Mexico',     capital: 'Santa Fe',       region: 'west'      },
  NY: { name: 'New York',       capital: 'Albany',         region: 'northeast' },
  NC: { name: 'North Carolina', capital: 'Raleigh',        region: 'south'     },
  ND: { name: 'North Dakota',   capital: 'Bismarck',       region: 'midwest'   },
  OH: { name: 'Ohio',           capital: 'Columbus',       region: 'midwest'   },
  OK: { name: 'Oklahoma',       capital: 'Oklahoma City',  region: 'south'     },
  OR: { name: 'Oregon',         capital: 'Salem',          region: 'west'      },
  PA: { name: 'Pennsylvania',   capital: 'Harrisburg',     region: 'northeast' },
  RI: { name: 'Rhode Island',   capital: 'Providence',     region: 'northeast' },
  SC: { name: 'South Carolina', capital: 'Columbia',       region: 'south'     },
  SD: { name: 'South Dakota',   capital: 'Pierre',         region: 'midwest'   },
  TN: { name: 'Tennessee',      capital: 'Nashville',      region: 'south'     },
  TX: { name: 'Texas',          capital: 'Austin',         region: 'south'     },
  UT: { name: 'Utah',           capital: 'Salt Lake City', region: 'west'      },
  VT: { name: 'Vermont',        capital: 'Montpelier',     region: 'northeast' },
  VA: { name: 'Virginia',       capital: 'Richmond',       region: 'south'     },
  WA: { name: 'Washington',     capital: 'Olympia',        region: 'west'      },
  WV: { name: 'West Virginia',  capital: 'Charleston',     region: 'south'     },
  WI: { name: 'Wisconsin',      capital: 'Madison',        region: 'midwest'   },
  WY: { name: 'Wyoming',        capital: 'Cheyenne',       region: 'west'      },
};

export const STATE_CODES = Object.keys(STATES);

export const REGIONS = {
  northeast: { label: 'Northeast', icon: '🍂' },
  midwest:   { label: 'Midwest',   icon: '🌾' },
  south:     { label: 'South',     icon: '🌴' },
  west:      { label: 'West',      icon: '🏔️' },
};

export function codesByRegion(region) {
  return STATE_CODES.filter((code) => STATES[code].region === region);
}
