import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-12">
        <Link href="/" className="text-sm text-zinc-500 hover:text-orange-400 transition-colors mb-8 inline-block">
          &larr; Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: March 31, 2026</p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use RoastMyTikTok:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong className="text-zinc-300">Account info:</strong> Email address and name (via Google OAuth or magic link sign-in).</li>
              <li><strong className="text-zinc-300">Waitlist email:</strong> If you submit your email and separately opt into updates, we collect your email address to send launch and product emails.</li>
              <li><strong className="text-zinc-300">Uploaded videos:</strong> Video files you upload for analysis.</li>
              <li><strong className="text-zinc-300">TikTok account data:</strong> Public profile information and video metadata when you use Account Analysis.</li>
              <li><strong className="text-zinc-300">Usage data:</strong> Roast history, scores, and interaction patterns within the app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>To process and analyze your videos using AI (requires your explicit upload consent).</li>
              <li>To send launch updates and product announcements only to people who explicitly opt in (you can unsubscribe anytime).</li>
              <li>To provide personalized recommendations and track your improvement.</li>
              <li>To maintain your roast history and account preferences.</li>
              <li>To improve the Service and develop new features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">3. Video Storage &amp; Processing</h2>
            <p className="mb-3">
              By uploading a video, you explicitly consent to AI processing of that video for analysis. Uploaded videos are stored in secure cloud storage for the duration of your session and deleted within 30 days of upload. We do not share, sell, or publicly display your uploaded videos.
            </p>
            <p>
              Video frames extracted during AI analysis are processed in real-time and not permanently stored. Analysis results (scores, written feedback) are retained in your account history until you request deletion or delete your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">4. Data Sharing</h2>
            <p className="mb-3">We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong className="text-zinc-300">AI providers:</strong> Video frames and metadata are sent to AI services (Anthropic) for analysis. This data is not retained by the AI provider for training.</li>
              <li><strong className="text-zinc-300">Infrastructure providers:</strong> We use Supabase for authentication, storage, and consent logging, and Vercel for hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">5. Data Security</h2>
            <p>
              We use industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure authentication, and access controls on our infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>Access your personal data and roast history.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Withdraw consent for AI video processing (by deleting your uploads or account).</li>
              <li>Opt out of waitlist or marketing emails at any time via the unsubscribe link or by contacting us.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@roastmytiktok.com" className="text-orange-400 hover:text-orange-300 transition-colors">
                support@roastmytiktok.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">7. Cookies</h2>
            <p>
              We use essential cookies for authentication, security, and session management. We do not currently run optional analytics cookies or third-party advertising cookies. We log acknowledgement of this notice to Supabase so we have a server-side record of the choice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">9. Contact</h2>
            <p>
              Questions about your privacy? Reach out at{' '}
              <a href="mailto:support@roastmytiktok.com" className="text-orange-400 hover:text-orange-300 transition-colors">
                support@roastmytiktok.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
