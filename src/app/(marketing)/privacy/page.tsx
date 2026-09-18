export const metadata = {
  title: "Privacy Policy — Myriad Spring",
  description: "Privacy policy for Myriad Spring and related Myriad creator workflows.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mt-4 text-4xl font-bold text-text-primary">Privacy Policy</h1>
      <p className="mt-3 text-sm text-text-tertiary">Effective: February 22, 2026</p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-text-primary">1. Data We Collect</h2>
          <p className="mt-2">
            We collect information you provide directly: account details (name, email, username, avatar), payment information processed through our payment provider, and content you upload. We also collect usage data including watch history, interactions (likes, comments, reactions), and device/browser information through standard web analytics.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">2. How We Use Your Data</h2>
          <p className="mt-2">
            Your data is used to operate the Platform, authenticate your account, process payments, personalize content recommendations, prevent fraud, enforce our terms of service, and improve the product. We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">3. Third-Party Services</h2>
          <p className="mt-2">
            Myriad Spring uses trusted third-party services for authentication, payment processing, video hosting, and application infrastructure. Each provider operates under its own privacy policy and data handling practices. We only share the minimum data necessary to deliver Platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">4. Cookies</h2>
          <p className="mt-2">
            We use essential cookies for authentication and session management. No third-party advertising cookies are used. Functional cookies may be used for preferences such as video playback settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">5. Data Retention</h2>
          <p className="mt-2">
            We retain your data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., financial records).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">6. Your Rights</h2>
          <p className="mt-2">
            You may access, update, or delete your personal information through your account settings at any time. You may request a full export of your data or permanent account deletion by contacting us. Where applicable, you have the right to object to or restrict certain processing activities.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">7. Security</h2>
          <p className="mt-2">
            We implement industry-standard security measures including encryption in transit (TLS), secure authentication, and strict access control policies on our database. However, no system is completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">8. Children&apos;s Privacy</h2>
          <p className="mt-2">
            Myriad Spring is not intended for children under 13. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal data, contact us and we will delete it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">9. Changes to This Policy</h2>
          <p className="mt-2">
            We may update this policy from time to time. Material changes will be communicated through the Platform. Continued use after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">10. Contact</h2>
          <p className="mt-2">
            For privacy-related questions or requests, contact us at support@myriadspring.com.
          </p>
        </section>
      </div>
    </div>
  );
}
