export const RARITY = {
  common:    { label: 'Common',    color: 'text-gray-400',   bg: 'bg-gray-700',   multiplier: 1,   points: 100 },
  uncommon:  { label: 'Uncommon',  color: 'text-green-400',  bg: 'bg-green-900',  multiplier: 1.5, points: 150 },
  rare:      { label: 'Rare',      color: 'text-blue-400',   bg: 'bg-blue-900',   multiplier: 2,   points: 200 },
  epic:      { label: 'Epic',      color: 'text-purple-400', bg: 'bg-purple-900', multiplier: 3,   points: 300 },
  legendary: { label: 'Legendary', color: 'text-yellow-400', bg: 'bg-yellow-900', multiplier: 5,   points: 500 },
}

export const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
]

export const STATE_NAMES = {
  AL:'Alabama',     AK:'Alaska',       AZ:'Arizona',      AR:'Arkansas',
  CA:'California',  CO:'Colorado',     CT:'Connecticut',  DE:'Delaware',
  FL:'Florida',     GA:'Georgia',      HI:'Hawaii',       ID:'Idaho',
  IL:'Illinois',    IN:'Indiana',      IA:'Iowa',         KS:'Kansas',
  KY:'Kentucky',    LA:'Louisiana',    ME:'Maine',        MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',    MN:'Minnesota',    MS:'Mississippi',
  MO:'Missouri',    MT:'Montana',      NE:'Nebraska',     NV:'Nevada',
  NH:'New Hampshire',NJ:'New Jersey',  NM:'New Mexico',   NY:'New York',
  NC:'North Carolina',ND:'North Dakota',OH:'Ohio',        OK:'Oklahoma',
  OR:'Oregon',      PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',    TX:'Texas',        UT:'Utah',
  VT:'Vermont',     VA:'Virginia',     WA:'Washington',   WV:'West Virginia',
  WI:'Wisconsin',   WY:'Wyoming',      DC:'Washington D.C.',
}
