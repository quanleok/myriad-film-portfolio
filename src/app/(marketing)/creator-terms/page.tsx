export const metadata = {
  title: "Creator Terms — Myriad Spring",
  description: "Terms and conditions for creators using the connected Myriad film-project system.",
};

export default function CreatorTermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mt-4 text-4xl font-bold text-text-primary">Creator Terms</h1>
      <p className="mt-3 text-sm text-text-tertiary">Version 1.0 — Effective: March 2026</p>

      <div className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6 text-sm leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-lg font-semibold text-text-primary">1. Overview</h2>
          <p className="mt-2">
            These Creator Terms (&quot;Terms&quot;) govern your use of the connected Myriad film-project system (&quot;the Platform&quot;) as a creator. By submitting a project for review, you agree to these Terms in addition to the general Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">2. Project Submissions</h2>
          <p className="mt-2">
            All projects are subject to community guidelines. Myriad reserves the right to remove projects that violate guidelines.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">3. Preorder &amp; Greenlight</h2>
          <p className="mt-2">
            Projects collect preorders during a campaign period (21–180 days). If the project reaches 100% of its unlock target, it is automatically greenlit. If it reaches 50–99% at the deadline, you have 48 hours to manually greenlight. Below 50%, the project fails and all preorders are automatically refunded. Campaigns and production windows can be extended by paying a renewal fee.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">4. Payouts &amp; Platform Fee</h2>
          <p className="mt-2">
            Myriad charges a 20% standard platform fee on transactions unless a creator is enrolled in a separate promotional fee program. Standard creators receive 80% of preorder and post-release purchase revenue.
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>New creators</strong> (0 delivered projects): Funds become available after you deliver your film.</li>
            <li><strong>Proven creators</strong> (1+ delivered projects): 70% of funds available at greenlight, remaining 30% available after delivery.</li>
          </ul>
          <p className="mt-2">
            Minimum withdrawal amount is $50. Payouts are processed via Stripe Connect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">5. Delivery Obligations</h2>
          <p className="mt-2">
            Once greenlit, you commit to delivering a completed film within your chosen production window (21–180 days). Production windows can be extended by paying a renewal fee. You must deliver a film that reasonably matches the project description, teaser, and concept materials presented during the preorder campaign.
          </p>
          <p className="mt-2">
            A 14-day grace period applies after the delivery deadline. Failure to deliver may result in strikes on your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">6. Strikes &amp; Accountability</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><strong>1 strike</strong>: Warning issued.</li>
            <li><strong>2 strikes</strong>: Account placed under review.</li>
            <li><strong>3 strikes</strong>: Account suspended — launch privileges revoked.</li>
          </ul>
          <p className="mt-2">
            Strikes may be issued for failure to deliver, misleading project descriptions, rights violations, or abuse of the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">7. Rights &amp; Intellectual Property</h2>
          <p className="mt-2">
            You retain full ownership of your creative work. By publishing on Myriad, you grant the Platform a non-exclusive license to display, distribute, and promote your project page and delivered film to users. You represent and warrant that you hold all necessary rights to the content you upload, including visuals, music, voice, likeness, script, and story elements.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">8. Refunds &amp; Cancellations</h2>
          <p className="mt-2">
            Viewers may cancel their preorder while a project is in the &quot;unlocking&quot; phase. If a project fails to greenlight or is cancelled before greenlight, all preorders are automatically refunded in full. Once a project is greenlit, preorders cannot be cancelled.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">9. Modifications</h2>
          <p className="mt-2">
            Myriad may update these Creator Terms at any time. We will notify creators of material changes via email. Continued use of the Platform after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary">10. Contact</h2>
          <p className="mt-2">
            Questions about these terms? Reach us at{" "}
            <a href="mailto:support@myriadspring.com" className="text-brand-600 hover:underline">
              support@myriadspring.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
