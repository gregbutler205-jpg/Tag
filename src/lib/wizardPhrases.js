// ── Wizard Easter Egg Phrase Library ─────────────────────────────────────────
// Adjust trigger frequency here — 0.125 = 1-in-8 chance on any decode
export const EASTER_EGG_PROBABILITY = 0.125

// ── Phrase pools ──────────────────────────────────────────────────────────────

export const GENERAL_PHRASES = [
  "Abracadabra. The tag reveals itself.",
  "The Wizard waves his wand...",
  "A flick of the wand, and the meaning appears.",
  "The Wizard has spoken.",
  "Behold! The runes reveal...",
  "By the ancient scrolls, this plate means...",
  "The mists part — I see...",
  "A clear vision from the crystal ball.",
  "The stars align! This decodes to...",
  "My cauldron bubbles with this revelation.",
  "The Wizard waves his staff and proclaims...",
  "Poof! The meaning appears in a puff of smoke.",
  "The Wizard has consulted the great library of plates.",
  "Another plate conquered by the arcane arts.",
  "The spell is cast. You're welcome.",
  "The wand knows things, traveler.",
  "Consider it decoded. The Wizard does not miss.",
]

export const VICTORY_PHRASES = [
  "The Wizard's magic carries the day.",
  "Victory is merely the natural result of consulting The Wizard.",
  "Another challenge falls to the arcane arts.",
  "The wand wins again. As expected.",
  "The ancient scrolls predicted this outcome.",
]

export const LEGENDARY_PHRASES = [
  "Well. The Wizard doesn't impress easily.",
  "A Legendary tag. Even the crystal ball went quiet for a moment.",
  "The ancient tomes speak of plates like this one.",
  "The stars themselves paused to watch this decode.",
  "The wand trembles. This is rare magic.",
]

export const STREAK_PHRASES = [
  "The Wizard approves of this pace.",
  "Five plates and counting. The spell grows stronger.",
  "The roads are speaking. The Wizard is listening.",
  "A streak worthy of the great scrolls.",
  "The wand is warm today.",
]

export const WELCOME_PHRASES = [
  "The Wizard is always watching the roads. Welcome back.",
  "Return anytime, mortal — the wand is ready.",
  "A new day. A new road. Let's see what the tags have to say.",
  "The crystal ball has been waiting.",
  "The Wizard's work begins anew.",
]

export const UNCERTAIN_PHRASES = [
  "The Wizard's vision is clouded today.",
  "The runes are cryptic even for me.",
  "The crystal ball is hazy on this one.",
  "The fog is thick, but I divine these options...",
  "The Wizard's spell may have a slight misfire.",
  "A tricky enchantment — this is my best read, but the stars could disagree.",
  "The ancient tomes are divided on this one.",
  "Even the great Wizard allows for more than one possibility here.",
]

// ── Helper ────────────────────────────────────────────────────────────────────

const POOLS = {
  general:   GENERAL_PHRASES,
  victory:   VICTORY_PHRASES,
  legendary: LEGENDARY_PHRASES,
  streak:    STREAK_PHRASES,
  welcome:   WELCOME_PHRASES,
  uncertain: UNCERTAIN_PHRASES,
}

let _lastPhrase = null

/**
 * Returns a random phrase from the given trigger pool.
 * Avoids repeating the same phrase twice in a row (general pool only).
 * @param {'general'|'victory'|'legendary'|'streak'|'welcome'|'uncertain'} trigger
 */
export function getEasterEggPhrase(trigger = 'general') {
  const pool = POOLS[trigger] || GENERAL_PHRASES
  let phrase
  let attempts = 0
  do {
    phrase = pool[Math.floor(Math.random() * pool.length)]
    attempts++
  } while (trigger === 'general' && phrase === _lastPhrase && pool.length > 1 && attempts < 10)
  if (trigger === 'general') _lastPhrase = phrase
  return phrase
}
