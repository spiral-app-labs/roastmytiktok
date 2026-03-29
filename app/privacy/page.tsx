import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Roast My TikTok",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-black fire-text mb-2">Privacy Policy</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: March 29, 2025</p>

      <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Introduction</h2>
          <p>
            Spiral App Labs (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates Roast My
            TikTok. This Privacy Policy explains how we collect, use, and protect your information
            when you use our Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
            <li>
              <span className="text-zinc-300 font-medium">Video content:</span> Videos you upload
              for analysis. These are processed by our AI agents and are not stored permanently.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Account information:</span> Email
              address, display name, and authentication credentials when you create an account.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Usage data:</span> Pages visited, features
              used, roast history, scores, timestamps, and device/browser information.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Payment information:</span> If you
              purchase a paid plan, payment details are processed by our third-party payment
              provider. We do not store full credit card numbers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
            <li>To provide the AI-powered video analysis and roasting service.</li>
            <li>To maintain your account and roast history.</li>
            <li>To improve the Service, including training and refining our AI agents.</li>
            <li>To communicate with you about your account and service updates.</li>
            <li>To detect and prevent fraud or abuse.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. Data Retention</h2>
          <p>
            Uploaded videos are processed in real-time and are <strong>not stored permanently</strong>.
            Video files are deleted from our servers after analysis is complete. Analysis results
            (scores, feedback, roast text) are tied to your account and retained as long as your
            account is active. If you delete your account, all associated data will be removed within
            30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Third-Party Services</h2>
          <p>We use the following categories of third-party services:</p>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-2">
            <li>
              <span className="text-zinc-300 font-medium">Authentication providers:</span> For
              secure sign-in and account management.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">AI / LLM APIs:</span> To power our AI
              agents that analyze and roast your content. Video data sent to these APIs is processed
              according to their respective privacy policies.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Cloud hosting:</span> For serving the
              application and temporarily storing uploaded videos during analysis.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Analytics:</span> To understand how users
              interact with the Service.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your data, including
            encryption in transit (TLS) and at rest. However, no method of transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-400 mt-2">
            <li>
              <span className="text-zinc-300 font-medium">Access</span> the personal data we hold
              about you.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Delete</span> your account and all
              associated data.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Export</span> your roast history and
              account data.
            </li>
            <li>
              <span className="text-zinc-300 font-medium">Opt out</span> of non-essential
              communications.
            </li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:support@spiralapplabs.com"
              className="text-orange-400 hover:underline"
            >
              support@spiralapplabs.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for children under 13. We do not knowingly collect personal
            information from children under 13. If we learn we have collected such data, we will
            delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by posting the updated policy on this page with a new &quot;Last updated&quot;
            date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">10. Contact Us</h2>
          <p>
            For privacy-related questions or requests, contact us at{" "}
            <a
              href="mailto:support@spiralapplabs.com"
              className="text-orange-400 hover:underline"
            >
              support@spiralapplabs.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-zinc-800 text-zinc-500 text-xs">
        <Link href="/" className="hover:text-orange-400 transition-colors">
          ← Back to Roast My TikTok
        </Link>
      </div>
    </main>
  );
}
