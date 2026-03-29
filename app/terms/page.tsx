import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Roast My TikTok",
};

export default function TermsPage() {
  return (
    <main className="flex-1 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-black fire-text mb-2">Terms of Service</h1>
      <p className="text-zinc-500 text-sm mb-10">Last updated: March 29, 2025</p>

      <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">1. Agreement to Terms</h2>
          <p>
            By accessing or using Roast My TikTok (&quot;the Service&quot;), operated by Spiral App
            Labs, you agree to be bound by these Terms of Service. If you do not agree, do not use
            the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">2. Description of Service</h2>
          <p>
            Roast My TikTok is an AI-powered video analysis platform. You upload or link short-form
            video content, and our specialized AI agents analyze and &quot;roast&quot; your content
            — providing scores, feedback, and entertainment. The Service also includes account
            features such as roast history and usage tracking.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">3. Consent to AI Analysis</h2>
          <p>
            By uploading a video, you consent to AI analysis of your content. Your video will be
            processed by multiple AI agents that evaluate visual, audio, and contextual elements.
            Analysis results are generated algorithmically and are intended for entertainment and
            informational purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">4. User Responsibilities</h2>
          <ul className="list-disc list-inside space-y-1.5 text-zinc-400">
            <li>You must be at least 13 years old to use the Service.</li>
            <li>
              You may only upload content you own or have the right to share. Do not upload content
              that infringes on third-party intellectual property rights.
            </li>
            <li>
              You may not upload illegal, obscene, threatening, defamatory, or otherwise harmful
              content.
            </li>
            <li>
              You may not attempt to reverse-engineer, exploit, or abuse the Service or its
              underlying AI systems.
            </li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">5. Intellectual Property</h2>
          <p>
            You retain ownership of any content you upload. By using the Service, you grant Spiral
            App Labs a limited, non-exclusive license to process your content solely for the purpose
            of providing the analysis service. All other intellectual property related to the
            Service — including AI agent designs, scoring algorithms, branding, and code — remains
            the property of Spiral App Labs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">6. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. Spiral App
            Labs is not liable for any indirect, incidental, or consequential damages arising from
            your use of the Service. AI-generated roasts and scores are for entertainment only and
            should not be relied upon as professional advice. Total liability is limited to the
            amount you paid for the Service in the 12 months prior to the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">7. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the Service at any time, for
            any reason, including violation of these Terms. Upon termination, your right to use the
            Service ceases immediately. We may delete your account data in accordance with our{" "}
            <Link href="/privacy" className="text-orange-400 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">8. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Service after changes
            constitutes acceptance. We will make reasonable efforts to notify users of material
            changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">9. Contact</h2>
          <p>
            Questions about these Terms? Reach us at{" "}
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
