import BackButton from '../components/BackButton'

const TOPICS = [
  { id: 'getting-started',  label: 'Getting Started',         emoji: '🚀' },
  { id: 'scan-a-tag',       label: 'Scan a Tag',              emoji: '📸' },
  { id: 'beat-ai',          label: 'Can You Beat AI?',        emoji: '🏆' },
  { id: 'tag-of-the-day',   label: 'Tag of the Day',          emoji: '🏷️' },
  { id: 'groups',           label: 'Groups',                  emoji: '👥' },
  { id: 'family-fun',       label: 'How to Play Family Fun',  emoji: '🏠' },
  { id: 'state-collection', label: 'State Collection',        emoji: '🗺️' },
  { id: 'points-rarity',    label: 'Points & Rarity Tiers',   emoji: '⭐' },
  { id: 'rank-tiers',       label: 'Rank Tiers',              emoji: '🎖️' },
  { id: 'leaderboard',      label: 'Leaderboard',             emoji: '📊' },
  { id: 'sharing',          label: 'Sharing & Bonus Points',  emoji: '📣' },
  { id: 'tips',             label: 'Tips for High Scores',    emoji: '💡' },
]

export default function Help() {
  return (
    <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-5">

      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">How to Play</h1>
        <p className="text-slate-500 text-sm">Everything you need to know about iWonde Tag</p>
      </div>

      {/* Table of Contents */}
      <div className="glass-card rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Jump to a Topic</p>
        <div className="grid grid-cols-1 gap-1">
          {TOPICS.map(t => (
            <a key={t.id} href={`#${t.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-navy-700 transition-colors group">
              <span className="text-base w-6 text-center">{t.emoji}</span>
              <span className="text-sm text-brand-yellow group-hover:text-yellow-300 font-semibold transition-colors">
                {t.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Getting Started ───────────────────────────────── */}
      <Section id="getting-started" title="Getting Started" emoji="🚀">
        <P>iWonde Tag is a vanity license plate spotting and decoding game. Spot plates on the road, decode their hidden meanings, earn points, and climb the leaderboard.</P>
        <P>You can play as a guest without an account — your points and streak are saved locally on your device. Create a free account to save progress across devices and appear on the global leaderboard.</P>
        <Step n={1} text='Tap the person icon in the top-right corner of any screen.' />
        <Step n={2} text='Tap "Create Account," enter a username and email address, then tap Create Account.' />
        <Step n={3} text="To sign in on another device, tap Sign In and enter your username." />
      </Section>

      {/* ── Scan a Tag ───────────────────────────────────── */}
      <Section id="scan-a-tag" title="Scan a Tag" emoji="📸">
        <P>The main way to earn points. When you spot a vanity plate on the road, submit it and let the AI decode it.</P>
        <Step n={1} text='Tap "Submit a Plate" from the home screen.' />
        <Step n={2} text="Take a photo or upload one from your camera roll. The AI will automatically read the plate text using OCR." />
        <Step n={3} text="If OCR misreads the plate, type the correct text in the plate text box." />
        <Step n={4} text="Select the state the plate is from — this helps the AI interpret regional references." />
        <Step n={5} text='Tap "Decode This Tag." The AI interprets the plate and assigns it a rarity tier and point value.' />
        <Callout>Each new state you spot for the first time earns a bonus 100 points added to your State Collection.</Callout>
      </Section>

      {/* ── Can You Beat AI ──────────────────────────────── */}
      <Section id="beat-ai" title="Can You Beat AI?" emoji="🏆">
        <P>After the AI decodes a plate, you get a chance to challenge it with your own interpretation.</P>
        <Step n={1} text="Read the AI's interpretation shown on screen." />
        <Step n={2} text='Type your own meaning in the "Can You Beat AI?" box below the result.' />
        <Step n={3} text='Tap "Submit My Interpretation." An AI judge compares your answer to the official decoding.' />
        <P>Verdicts and bonus points:</P>
        <div className="space-y-1.5 mt-1">
          <VerdictRow verdict="Agree" color="text-emerald-400" pts="+75 pts" desc="Your reading is clearly correct — full bonus." />
          <VerdictRow verdict="Partial" color="text-yellow-400" pts="+35 pts" desc="Your reading has merit but is less certain." />
          <VerdictRow verdict="Disagree" color="text-red-400" pts="0 pts" desc="Not well-supported by the plate characters." />
        </div>
      </Section>

      {/* ── Tag of the Day ───────────────────────────────── */}
      <Section id="tag-of-the-day" title="Tag of the Day" emoji="🏷️">
        <P>Every day a new plate is featured as the daily challenge. Everyone in the world sees the same plate — making it a global competition.</P>
        <Step n={1} text='Tap "Tag of the Day" from the home screen.' />
        <Step n={2} text="Type what you think the plate means and tap Submit." />
        <Step n={3} text="See how close you were and earn your daily points." />
        <P>You can only submit the daily challenge once per day. Coming back every day builds your streak — the longer your streak, the bigger your bonus multiplier.</P>
        <Callout>Miss a day and your streak resets to zero. Check in daily to keep it going!</Callout>
      </Section>

      {/* ── Groups ───────────────────────────────────────── */}
      <Section id="groups" title="Groups" emoji="👥">
        <P>Groups let you compete against friends, family, or coworkers. Anyone in the group can post a plate challenge; everyone else tries to decode it.</P>
        <SubHead>Creating a Group</SubHead>
        <Step n={1} text='Tap "Groups" in the nav bar, then tap "Create Group."' />
        <Step n={2} text="Give your group a name. A unique 6-character invite code is generated automatically." />
        <Step n={3} text="Share the invite code with the people you want to invite." />
        <SubHead>Joining a Group</SubHead>
        <Step n={1} text='Tap "Groups," then tap "Join Group."' />
        <Step n={2} text="Enter the 6-character invite code you received and tap Join." />
        <SubHead>Inside a Group</SubHead>
        <Step n={1} text='Tap "Post a Plate" to submit a vanity plate as a challenge to your group.' />
        <Step n={2} text="Group members type their guesses during the blind window — nobody can see each other's answers yet." />
        <Step n={3} text="After the reveal window closes, everyone sees the AI's official answer and the full score breakdown." />
        <P>Points are awarded based on accuracy and speed. Faster correct answers score higher.</P>
      </Section>

      {/* ── Family Fun ───────────────────────────────────── */}
      <Section id="family-fun" title="How to Play Family Fun" emoji="🏠">
        <P>Family Fun is a great way to play iWonde Tag on a road trip or during a car ride together. Here's how to set it up:</P>
        <Step n={1} text='One person creates a group and names it anything you like — "Family Fun," "Road Trip," etc.' />
        <Step n={2} text="Share the 6-character code so everyone in the car can join." />
        <Step n={3} text="When someone spots a vanity plate, the spotter posts it as a challenge — type in the plate text and state." />
        <Step n={4} text="Everyone else in the car types their guess before the reveal." />
        <Step n={5} text="After the window closes, the AI reveals the official answer and who got it right." />
        <Callout>Tip: Take turns being the spotter so everyone gets a chance to post plates and rack up points.</Callout>
        <P>You can also play asynchronously — post plates you spotted during the day and let family members guess when they have time.</P>
      </Section>

      {/* ── State Collection ─────────────────────────────── */}
      <Section id="state-collection" title="State Collection" emoji="🗺️">
        <P>Every plate you scan from a new state is added to your State Collection. The goal is to spot plates from all 50 states plus Washington D.C. — 51 total.</P>
        <P>Your collection shows all states grouped by region. Collected states are highlighted in blue with a checkmark. Your completion percentage is shown at the top.</P>
        <Callout>Each new state you add for the first time earns a bonus 100 points.</Callout>
        <P>States are added automatically when you select the state while submitting a plate. You only need to spot one plate per state to collect it.</P>
      </Section>

      {/* ── Points & Rarity ──────────────────────────────── */}
      <Section id="points-rarity" title="Points & Rarity Tiers" emoji="⭐">
        <P>Every plate is scored on a five-tier rarity system based on how clever or obscure the vanity message is.</P>
        <div className="space-y-2 mt-1">
          <RarityRow tier="Common"    color="text-slate-300"   pts="50 pts"   desc="Straightforward phonetics — easy to decode." />
          <RarityRow tier="Uncommon"  color="text-emerald-400" pts="75 pts"   desc="Requires a bit of thought or wordplay." />
          <RarityRow tier="Rare"      color="text-blue-400"    pts="100 pts"  desc="Multi-step logic or number substitution." />
          <RarityRow tier="Epic"      color="text-purple-400"  pts="150 pts"  desc="Cultural references, foreign phrases, or clever misdirection." />
          <RarityRow tier="Legendary" color="text-yellow-400"  pts="250 pts"  desc="Elite-level wit. The absolute best." />
        </div>
        <P>Additional bonuses on top of the base plate score:</P>
        <div className="space-y-1 mt-1">
          <BonusRow label="Photo submitted"     pts="+25 pts" />
          <BonusRow label="Beat the AI (agree)" pts="+75 pts" />
          <BonusRow label="Beat the AI (partial)" pts="+35 pts" />
          <BonusRow label="New state collected"  pts="+100 pts" />
          <BonusRow label="Daily challenge"      pts="+50 pts base" />
          <BonusRow label="Share the app"        pts="+50 pts (once per day)" />
        </div>
      </Section>

      {/* ── Rank Tiers ───────────────────────────────────── */}
      <Section id="rank-tiers" title="Rank Tiers" emoji="🎖️">
        <P>Your total points determine your rank. Ranks are shown on your profile and next to your name on the leaderboard.</P>
        <div className="space-y-2 mt-1">
          <RankRow icon="🔰" rank="Rookie"     pts="0"      />
          <RankRow icon="👁️" rank="Spotter"    pts="500"    />
          <RankRow icon="🔍" rank="Decoder"    pts="2,000"  />
          <RankRow icon="🎯" rank="Hunter"     pts="5,000"  />
          <RankRow icon="🏆" rank="Tag Master" pts="10,000" />
          <RankRow icon="🧙" rank="Wizard"     pts="25,000" />
        </div>
      </Section>

      {/* ── Leaderboard ──────────────────────────────────── */}
      <Section id="leaderboard" title="Leaderboard" emoji="📊">
        <P>See how you stack up against all players. Switch between All Time, Weekly, and Daily views using the tabs at the top.</P>
        <P>The top three players appear on a podium. Your own rank is shown below the list so you can track progress without scrolling.</P>
        <P>You must be signed in to appear on the leaderboard.</P>
      </Section>

      {/* ── Sharing ──────────────────────────────────────── */}
      <Section id="sharing" title="Sharing & Bonus Points" emoji="📣">
        <P>Share iWonde Tag with friends and earn bonus points every time you do.</P>
        <Step n={1} text='Tap "Share the App" on the home screen.' />
        <Step n={2} text="Choose how you want to share — text, social media, email, or copy the link." />
        <Step n={3} text="Earn 50 bonus points — once per day." />
        <Callout>The more people in your group, the more fun the game. Share the invite code for your group to get friends playing right away.</Callout>
      </Section>

      {/* ── Tips ─────────────────────────────────────────── */}
      <Section id="tips" title="Tips for High Scores" emoji="💡">
        <Step n={1} text="Decode the Tag of the Day every single day — streaks give you bonus multipliers." />
        <Step n={2} text="Always try Can You Beat AI? after scanning — the bonus points add up fast." />
        <Step n={3} text="Target plates from states you haven't collected yet for the new-state bonus." />
        <Step n={4} text="Legendary plates are rare but worth 5× a Common plate. Learn the patterns: Latin phrases, pop culture codes, mirror tricks." />
        <Step n={5} text="Keep a group active — group challenges are a fast way to earn points on the go." />
        <Step n={6} text="Share the app daily for an extra 50 points — takes 5 seconds." />
      </Section>

      <p className="text-center text-slate-600 text-xs pb-4">iWonde Tag · Decode. Collect. Compete.</p>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────── */

function Section({ id, title, emoji, children }) {
  return (
    <div id={id} className="glass-card rounded-2xl p-5 space-y-3 scroll-mt-4">
      <h2 className="text-lg font-black text-white flex items-center gap-2">
        <span>{emoji}</span>{title}
      </h2>
      {children}
    </div>
  )
}

function SubHead({ children }) {
  return <p className="text-sm font-bold text-slate-300 pt-1">{children}</p>
}

function P({ children }) {
  return <p className="text-slate-400 text-sm leading-relaxed">{children}</p>
}

function Step({ n, text }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-black flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
    </div>
  )
}

function Callout({ children }) {
  return (
    <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl px-4 py-3">
      <p className="text-blue-300 text-sm">{children}</p>
    </div>
  )
}

function RarityRow({ tier, color, pts, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-sm font-black w-24 shrink-0 ${color}`}>{tier}</span>
      <div>
        <span className="text-brand-yellow text-xs font-bold">{pts} · </span>
        <span className="text-slate-500 text-xs">{desc}</span>
      </div>
    </div>
  )
}

function BonusRow({ label, pts }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className="text-brand-yellow text-xs font-bold">{pts}</span>
    </div>
  )
}

function RankRow({ icon, rank, pts }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg w-7 text-center">{icon}</span>
      <span className="text-white text-sm font-bold w-24">{rank}</span>
      <span className="text-slate-500 text-xs">{pts}+ pts</span>
    </div>
  )
}

function VerdictRow({ verdict, color, pts, desc }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-sm font-black w-20 shrink-0 ${color}`}>{verdict}</span>
      <div>
        <span className="text-brand-yellow text-xs font-bold">{pts} · </span>
        <span className="text-slate-500 text-xs">{desc}</span>
      </div>
    </div>
  )
}
