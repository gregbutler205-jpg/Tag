export default function Help() {
  return (
    <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-6">

      <div className="pt-2"><BackButton to="/" /></div>
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">How to Play</h1>
        <p className="text-slate-500 text-sm">Everything you need to know about iWonde Tag</p>
      </div>

      {/* Getting Started */}
      <Section title="Getting Started" emoji="🚀">
        <P>iWonde Tag is a vanity license plate spotting and decoding game. Spot plates on the road, decode their hidden meanings, earn points, and climb the leaderboard.</P>
        <P>You can play as a guest without an account, but creating a free account saves your points, streak, and state collection across devices.</P>
        <Step n={1} text="Tap Profile and choose Sign In / Create Account." />
        <Step n={2} text="Enter your email, pick a display name, and set a password." />
        <Step n={3} text="You're ready — your progress is now saved automatically." />
      </Section>

      {/* Scan a Tag */}
      <Section title="Scan a Tag" emoji="📸">
        <P>The main way to earn points. When you spot a vanity plate on the road, submit it and let the AI decode it.</P>
        <Step n={1} text='Tap "Scan a Tag" from the home screen.' />
        <Step n={2} text="Take a photo or upload one from your camera roll. The AI will automatically read the plate text using OCR." />
        <Step n={3} text="If OCR misreads the plate, type the correct text in the box." />
        <Step n={4} text="Select the state the plate is from (optional but helps with context)." />
        <Step n={5} text='Tap "Decode This Tag" and the AI will interpret the plate and assign a rarity tier.' />
        <P>Each new state you spot earns a bonus and adds to your State Collection.</P>
      </Section>

      {/* Can You Beat AI */}
      <Section title="Can You Beat AI?" emoji="🏆">
        <P>After the AI decodes a plate, you get a chance to challenge it with your own interpretation.</P>
        <Step n={1} text="Read the AI's interpretation of the plate." />
        <Step n={2} text='Type your own meaning in the "Can You Beat AI?" box.' />
        <Step n={3} text='Tap "Submit My Interpretation" — an AI judge compares yours to the official answer.' />
        <P>If your interpretation is more accurate or creative, you earn bonus challenge points on top of the base plate score.</P>
      </Section>

      {/* Tag of the Day */}
      <Section title="Tag of the Day" emoji="🏷️">
        <P>Every day a new plate is featured as the daily challenge. Everyone sees the same plate — making it a global competition.</P>
        <Step n={1} text='Tap "Tag of the Day" from the home screen.' />
        <Step n={2} text="Type what you think the plate means and tap Submit." />
        <Step n={3} text="See how close you were and earn your daily points." />
        <P>You can only submit the daily challenge once per day. Coming back every day builds your streak — the longer your streak, the bigger your bonus multiplier.</P>
        <Callout>Miss a day and your streak resets to zero, so check in daily!</Callout>
      </Section>

      {/* Groups */}
      <Section title="Groups" emoji="👥">
        <P>Groups let you compete against friends, family, or coworkers. Anyone in the group can post a plate challenge; everyone else tries to decode it.</P>
        <SubHead>Creating a Group</SubHead>
        <Step n={1} text='Tap "Groups" in the nav bar, then tap "Create Group."' />
        <Step n={2} text="Give your group a name. A unique 6-character invite code is generated automatically." />
        <Step n={3} text="Share the code with people you want to invite." />
        <SubHead>Joining a Group</SubHead>
        <Step n={1} text='Tap "Groups," then tap "Join Group."' />
        <Step n={2} text="Enter the 6-character invite code you received." />
        <SubHead>Inside a Group</SubHead>
        <Step n={1} text='Tap "Post a Plate" to submit a plate challenge to your group.' />
        <Step n={2} text="Members type their guesses. Points are awarded based on accuracy and speed." />
        <Step n={3} text="After the reveal window closes, everyone sees the AI's official answer and the scores." />
      </Section>

      {/* State Collection */}
      <Section title="State Collection" emoji="🗺️">
        <P>Every plate you scan from a new state is added to your collection. The goal is to spot plates from all 50 states plus Washington D.C. — 51 total.</P>
        <P>Your collection shows a map of the country broken into regions. Collected states are highlighted in blue. Your completion percentage is shown at the top.</P>
        <Callout>Each new state you add for the first time earns a bonus 100 points.</Callout>
      </Section>

      {/* Points & Rarity */}
      <Section title="Points & Rarity Tiers" emoji="⭐">
        <P>Every plate is scored on a five-tier rarity system based on how clever or obscure the vanity message is.</P>
        <div className="space-y-2 mt-1">
          <RarityRow tier="Common"    color="text-slate-300"   pts="100"  desc="Straightforward phonetics — easy to decode." />
          <RarityRow tier="Uncommon"  color="text-emerald-400" pts="250"  desc="Requires a bit of thought or wordplay." />
          <RarityRow tier="Rare"      color="text-blue-400"    pts="500"  desc="Multi-step logic or number substitution." />
          <RarityRow tier="Epic"      color="text-purple-400"  pts="1000" desc="Cultural references, foreign phrases, or clever misdirection." />
          <RarityRow tier="Legendary" color="text-yellow-400"  pts="2500" desc="Elite-level wit. The best of the best." />
        </div>
        <P>Challenge bonus points are added on top if you beat the AI's interpretation.</P>
      </Section>

      {/* Rank Tiers */}
      <Section title="Rank Tiers" emoji="🎖️">
        <P>Your total points determine your rank. Ranks are displayed on your profile and next to your name on the leaderboard.</P>
        <div className="space-y-2 mt-1">
          <RankRow icon="🔰" rank="Rookie"     pts="0"      />
          <RankRow icon="👁️" rank="Spotter"    pts="500"    />
          <RankRow icon="🔍" rank="Decoder"    pts="2,000"  />
          <RankRow icon="🎯" rank="Hunter"     pts="5,000"  />
          <RankRow icon="🏆" rank="Tag Master" pts="10,000" />
          <RankRow icon="🧙" rank="Wizard"     pts="25,000" />
        </div>
      </Section>

      {/* Leaderboard */}
      <Section title="Leaderboard" emoji="📊">
        <P>See how you stack up against all players. Switch between All Time, Weekly, and Daily views.</P>
        <P>The top three players appear on a podium. Your own rank is shown below the list so you can track your progress.</P>
      </Section>

      {/* Tips */}
      <Section title="Tips for High Scores" emoji="💡">
        <Step n={1} text="Decode the Tag of the Day every single day — streaks give you bonus multipliers." />
        <Step n={2} text="Always try the Can You Beat AI? challenge after scanning — the bonus points add up fast." />
        <Step n={3} text="Target plates from states you haven't collected yet for the new-state bonus." />
        <Step n={4} text="Legendary plates are rare but worth 25x a Common plate. Learn the high-value patterns: Latin phrases, pop culture codes, mirror tricks." />
        <Step n={5} text="Keep a group active with friends — group challenges are a fast way to earn points on the go." />
      </Section>

      <p className="text-center text-slate-600 text-xs pb-4">iWonde Tag · Decode. Collect. Compete.</p>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────────── */

function Section({ title, emoji, children }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
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
        <span className="text-brand-yellow text-xs font-bold">{pts} pts · </span>
        <span className="text-slate-500 text-xs">{desc}</span>
      </div>
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
