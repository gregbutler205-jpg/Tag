import BackButton from '../components/BackButton'

function Section({ title, children }) {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <h2 className="text-base font-black text-white">{title}</h2>
      {children}
    </div>
  )
}

function P({ children }) {
  return <p className="text-slate-400 text-sm leading-relaxed">{children}</p>
}

function Li({ children }) {
  return (
    <li className="text-slate-400 text-sm leading-relaxed">
      {children}
    </li>
  )
}

export default function Privacy() {
  return (
    <div className="pb-nav px-4 pt-3 max-w-lg mx-auto space-y-4">
      <div className="pt-4 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-black text-white">Privacy Policy</h1>
          <p className="text-slate-500 text-xs">Effective March 26, 2026 · iWonde, LLC</p>
        </div>
      </div>

      <Section title="Overview">
        <P>iWonde Tag is operated by iWonde, LLC. This policy explains what information we collect, how we use it, and your choices. We are committed to protecting your privacy and being transparent about our practices.</P>
      </Section>

      <Section title="1. Information We Collect">
        <P><span className="text-white font-semibold">What you provide:</span></P>
        <ul className="list-disc pl-5 space-y-2">
          <Li><span className="text-white font-semibold">Username</span> — your display name. We do not collect your real name, phone number, or password.</Li>
          <Li><span className="text-white font-semibold">Email address</span> — collected at registration for account recovery only. Not visible to other players.</Li>
          <Li><span className="text-white font-semibold">Plate submissions</span> — plate text and state of origin you enter. Used to power the game and build our shared plate database.</Li>
          <Li><span className="text-white font-semibold">Photos</span> — if you upload a plate photo, we crop it tightly to the plate area and strip all EXIF metadata (including GPS location) before processing. We do not store full vehicle photos or location data from images.</Li>
          <Li><span className="text-white font-semibold">Game activity</span> — decode attempts, scores, streaks, and group participation.</Li>
        </ul>
        <P><span className="text-white font-semibold">Collected automatically:</span></P>
        <ul className="list-disc pl-5 space-y-2">
          <Li>Standard server logs (IP address, request timestamps) for security and debugging — retained 30 days.</Li>
          <Li>Anonymized usage analytics (page views, device type, general region) to improve the app.</Li>
        </ul>
        <P><span className="text-white font-semibold">What we do NOT collect:</span> real name, precise GPS location, contacts, microphone access, or cross-app tracking.</P>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc pl-5 space-y-2">
          <Li>To operate the game — decoding plates, leaderboards, groups, daily challenges, and state collection.</Li>
          <Li>To power AI decoding — plate text and state are sent to the xAI Grok API for interpretation. No usernames or personal data are included. API data is not used to train AI models.</Li>
          <Li>To moderate content — AI and community flags are used to maintain a safe environment.</Li>
          <Li>To prevent abuse — server logs and behavioral patterns are used to detect cheating and spam.</Li>
        </ul>
      </Section>

      <Section title="3. How We Share Your Information">
        <P>We do not sell, rent, or trade your information. We share limited data only with these service providers:</P>
        <ul className="list-disc pl-5 space-y-2">
          <Li><span className="text-white font-semibold">AI service providers</span> — receive plate text for interpretation. No personal data shared.</Li>
          <Li><span className="text-white font-semibold">OpenAI</span> — receives plate photos for OCR text extraction. No personal data shared.</Li>
          <Li><span className="text-white font-semibold">Supabase</span> — hosts our database.</Li>
          <Li><span className="text-white font-semibold">Render</span> — hosts our application server.</Li>
        </ul>
        <P>Your username, scores, and state collection count are visible to other players on leaderboards. Your guesses within groups are visible to group members after the reveal window closes.</P>
      </Section>

      <Section title="4. Data Retention">
        <P>We retain your account data and game activity as long as your account exists. Plate submissions are retained indefinitely as part of the shared game database. If you delete your account, submissions are disassociated from your identity but remain in the database.</P>
      </Section>

      <Section title="5. Your Rights">
        <ul className="list-disc pl-5 space-y-2">
          <Li><span className="text-white font-semibold">Delete your account</span> — email <span className="text-blue-400">support@iwonde.com</span> to request full deletion.</Li>
          <Li><span className="text-white font-semibold">Access your data</span> — email us to request a copy of what we hold.</Li>
          <Li><span className="text-white font-semibold">Correct your data</span> — change your username within the app at any time.</Li>
        </ul>
      </Section>

      <Section title="6. Children's Privacy">
        <P>iWonde Tag is a general-audience game. We do not knowingly collect personal information from children under 13 beyond a username and optional email. If you believe a child under 13 has provided additional personal information, contact us at support@iwonde.com and we will promptly delete it.</P>
      </Section>

      <Section title="7. Security">
        <P>All data is transmitted over HTTPS. We use industry-standard security practices including encrypted database storage and token-based authentication. No security system is perfect — if you discover a vulnerability, please report it to support@iwonde.com.</P>
      </Section>

      <Section title="8. Contact">
        <P>Questions about this policy? Contact us:</P>
        <P><span className="text-blue-400">support@iwonde.com</span></P>
        <P>iWonde, LLC</P>
      </Section>

      <p className="text-center text-slate-600 text-xs pb-4">iWonde Tag · tag.iwonde.com</p>
    </div>
  )
}
