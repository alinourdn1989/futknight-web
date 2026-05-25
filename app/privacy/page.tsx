"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/")} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">FutKnight</span>
        <div className="w-16" />
      </nav>

      <main className="px-4 md:px-10 py-12 max-w-3xl mx-auto">
        <h1 className="text-white text-3xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: May 2026</p>

        <div className="flex flex-col gap-8 text-gray-400 leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-bold mb-3">1. Introduction</h2>
            <p>Welcome to FutKnight. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use FutKnight:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-500">
              <li><span className="text-gray-300">Account information</span> — your name and email address when you register</li>
              <li><span className="text-gray-300">Tournament data</span> — match scores, goals, team names, and player names entered by admins</li>
              <li><span className="text-gray-300">Usage data</span> — how you interact with the platform (pages visited, features used)</li>
              <li><span className="text-gray-300">Real player data</span> — optional football player profiles linked by admins via public APIs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-500">
              <li>Provide and maintain the FutKnight platform</li>
              <li>Display tournament standings, player stats, and match history</li>
              <li>Send you tournament-related notifications (if enabled)</li>
              <li>Improve and optimize our platform</li>
              <li>Respond to your support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">4. Data Storage</h2>
            <p>Your data is stored securely using <span className="text-white">Supabase</span>, a trusted cloud database provider. Data is stored in encrypted databases and protected using industry-standard security practices. We do not sell, trade, or transfer your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">5. Third-Party Services</h2>
            <p className="mb-3">FutKnight uses the following third-party services:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-500">
              <li><span className="text-gray-300">Supabase</span> — database and authentication</li>
              <li><span className="text-gray-300">API-Football</span> — real football player and match data</li>
              <li><span className="text-gray-300">football-data.org</span> — league standings and fixtures</li>
              <li><span className="text-gray-300">Vercel</span> — hosting and deployment</li>
            </ul>
            <p className="mt-3">Each service has its own privacy policy governing the data they process.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-500">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please contact us at <a href="mailto:ali.nour.dn@gmail.com" className="text-cyan-400 hover:underline">ali.nour.dn@gmail.com</a></p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">7. Cookies</h2>
            <p>FutKnight uses essential cookies only — specifically for authentication session management. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">8. Children's Privacy</h2>
            <p>FutKnight is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the date at the top of this page. Continued use of FutKnight after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-bold mb-3">10. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:ali.nour.dn@gmail.com" className="text-cyan-400 hover:underline">ali.nour.dn@gmail.com</a></p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-[#111] text-center">
          <p className="text-gray-600 text-xs">Powered by <span className="text-cyan-400 font-bold">FutKnight</span></p>
        </div>
      </main>
    </div>
  );
}
