export const metadata = {
  title: "Terms of Service — Myriad Spring",
  description: "Terms of service for Myriad Spring and the connected Myriad film-project system.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mt-4 text-4xl font-bold text-text-primary">Terms of Service</h1>
      <p className="mt-3 text-sm text-text-tertiary">Effective: February 22, 2026</p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-text-primary">1. Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using Myriad Spring and related Myriad creator workflows (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform. We may update these terms at any time; continued use constitutes acceptance of changes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">2. Eligibility</h2>
          <p className="mt-2">
            You must be at least 13 years old to use Myriad Spring. If you are under 18, you represent that a parent or guardian has reviewed and agreed to these terms on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">3. Accounts</h2>
          <p className="mt-2">
            You are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate information during registration and keep it up to date. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">4. Creator Responsibilities</h2>
          <p className="mt-2">
            Creators are responsible for ensuring they hold all necessary rights to the content they upload, including video, audio, images, and any underlying intellectual property. Creators must comply with applicable laws and not upload content that is infringing, defamatory, obscene, or otherwise prohibited.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">5. Viewer Conduct</h2>
          <p className="mt-2">
            Viewers must not engage in harassment, hate speech, impersonation, spamming, or any conduct that disrupts the experience of other users. Violations may result in account restrictions or permanent bans.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">6. Payments and Preorders</h2>
          <p className="mt-2">
            Payments are processed through Stripe. When you preorder a project, you are charged immediately. If the project fails to reach its unlock target by the campaign deadline, your preorder is automatically refunded in full — Myriad absorbs any processing fees. Preorders may also be cancelled by the viewer while the project is still in its campaign period.
          </p>
          <p className="mt-2">
            Once a project unlocks, preorders are committed and non-refundable. If a creator misses their delivery window, viewers may request a refund. Creator payout timing depends on creator history: new creators withdraw after delivery, while proven creators may have part of their earnings available earlier and the rest after delivery. Myriad charges a platform fee on creator earnings; the remainder is paid out via Stripe Connect. All payouts are subject to Stripe&apos;s terms and applicable fees.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">7. Content Moderation</h2>
          <p className="mt-2">
            We reserve the right to review, remove, or restrict access to any content that violates these terms or applicable law. We may also take action against accounts that repeatedly violate platform policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">8. Intellectual Property</h2>
          <p className="mt-2">
            Creators retain ownership of their content. By uploading content to Myriad, you grant us a non-exclusive, worldwide license to host, display, distribute, and promote your content on the Platform. This license terminates when you remove your content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">9. Disclaimers</h2>
          <p className="mt-2">
            The Platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access or that the Platform will be error-free. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">10. Contact</h2>
          <p className="mt-2">
            For questions about these terms, contact us at support@myriadspring.com.
          </p>
        </section>
      </div>
    </div>
  );
}
