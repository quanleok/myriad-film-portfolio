import Link from "next/link";

export const metadata = {
  title: "Community Guidelines — Myriad Spring",
  description:
    "Community guidelines for Myriad Spring — our standards for content, conduct, and monetization across the public clip hub and connected project system.",
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mt-4 text-4xl font-bold text-text-primary">
        Community Guidelines
      </h1>
      <p className="mt-3 text-sm text-text-tertiary">
        Last updated: February 26, 2026
      </p>
      <p className="mt-4 text-text-secondary leading-relaxed">
        Myriad Spring is the public AI clip hub connected to the deeper Myriad
        film-project system. Creators can publish clips, teasers, and project
        pages; viewers can watch, share, and back the work they want to see go
        further. These guidelines exist to keep the platform safe, fair, and
        valuable for creators and viewers alike. By using Myriad Spring you agree
        to follow these rules. Accounts that violate them are subject to
        content removal, project suspension, or permanent ban — with or
        without prior notice.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-secondary">
        {/* ── 1. Content Standards ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            1. Content Standards
          </h2>

          <div>
            <h3 className="font-semibold text-text-primary">
              Illegal Content — Zero Tolerance
            </h3>
            <p className="mt-1">
              Any content that violates applicable law is strictly prohibited
              and will result in an immediate permanent ban. We will report
              violations to law enforcement where required by law.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              Prohibited Content
            </h3>
            <p className="mt-1">
              The following content is strictly prohibited and will be removed
              immediately. Uploading any of the following may result in an
              instant permanent ban:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                <strong>Sexual or pornographic content</strong> — nudity or
                sexually explicit material in any form. This is a zero
                tolerance policy.
              </li>
              <li>
                <strong>Graphic violence and gore</strong> — realistic
                depictions of extreme violence, torture, mutilation, or death.
                Stylized action in the context of storytelling (e.g. fight
                scenes in a short film) is allowed; gratuitous gore is not.
              </li>
              <li>
                <strong>Hate speech and harassment</strong> — content that
                promotes hatred, discrimination, or violence against individuals
                or groups based on race, ethnicity, religion, gender, sexual
                orientation, disability, or national origin.
              </li>
              <li>
                <strong>Dangerous activities</strong> — content that encourages
                self-harm, suicide, eating disorders, or dangerous challenges
                that could cause physical injury.
              </li>
              <li>
                <strong>Doxxing and privacy violations</strong> — sharing
                private personal information (addresses, phone numbers, financial
                data) of any individual without consent.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              Age-Appropriate Content
            </h3>
            <p className="mt-1">
              Myriad Spring is a family-friendly platform. All content should be
              suitable for a general audience (ages 13+). Mild language and
              thematic elements are acceptable; explicit or adult-only content is
              not.
            </p>
          </div>
        </section>

        {/* ── 2. AI Content Quality ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            2. AI Content Quality Standards
          </h2>
          <p>
            We celebrate AI-generated filmmaking — but we have standards. Myriad Spring
            is a curated platform, not a dumping ground for bulk-generated,
            low-effort output.
          </p>

          <div>
            <h3 className="font-semibold text-text-primary">
              What we consider low-effort
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                Projects with raw, unedited AI outputs presented as finished
                teasers — default watermarks, glitches, or artifacts
              </li>
              <li>
                Duplicate or near-duplicate projects repackaged with minor
                variations to flood the marketplace
              </li>
              <li>
                Misleading teasers, thumbnails, or descriptions that
                don&apos;t represent the actual project (clickbait)
              </li>
              <li>
                Projects created solely to collect preorder money with no
                genuine intent to deliver a finished film
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">What we encourage</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                Compelling teasers that showcase your creative vision and hook
                viewers
              </li>
              <li>
                Well-developed characters, concept art, and world-building
              </li>
              <li>
                Narrative ambition — short films, features, series pilots, and
                anthologies that push AI filmmaking forward
              </li>
              <li>
                Production updates that give backers real insight into your
                creative process
              </li>
              <li>
                Behind-the-scenes breakdowns showing the journey from concept
                to final film
              </li>
            </ul>
          </div>

          <p>
            We reserve the right to reject or remove projects that we determine
            are low-effort at our sole discretion. Repeat offenders will have
            their creator privileges suspended and may be banned.
          </p>
        </section>

        {/* ── 3. Copyright & Intellectual Property ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            3. Copyright &amp; Intellectual Property
          </h2>

          <div>
            <h3 className="font-semibold text-text-primary">Your rights</h3>
            <p className="mt-1">
              You retain ownership of content you create and upload to Myriad Spring.
              By uploading, you grant Myriad Spring a non-exclusive, worldwide license
              to host, display, distribute, and promote your content on and
              through the platform.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              Respect others&apos; rights
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                Do not upload content that infringes on someone else&apos;s
                copyright, trademark, or other intellectual property rights
              </li>
              <li>
                Do not use copyrighted music, footage, or images without proper
                authorization or a valid fair use basis
              </li>
              <li>
                Do not upload content generated by AI tools if your use violates
                the tool&apos;s terms of service
              </li>
              <li>
                Do not impersonate other creators, brands, or public figures
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">DMCA &amp; takedown process</h3>
            <p className="mt-1">
              If you believe your copyrighted work has been used on Myriad Spring
              without authorization, contact us at{" "}
              <a
                href="mailto:support@myriadspring.com"
                className="text-text-primary underline underline-offset-2 hover:text-brand-600"
              >
                support@myriadspring.com
              </a>{" "}
              with a detailed description of the original work, the infringing
              content URL, and a statement under penalty of perjury that you are
              the rights holder. We will review and respond within 48 hours.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              AI-generated content &amp; copyright
            </h3>
            <p className="mt-1">
              The legal landscape around AI-generated content and copyright is
              evolving. Creators are responsible for understanding and complying
              with applicable laws in their jurisdiction. Myriad Spring does not provide
              legal advice regarding ownership of AI-generated outputs.
            </p>
          </div>
        </section>

        {/* ── 4. Spam & Manipulation ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            4. Spam &amp; Platform Manipulation
          </h2>
          <p>
            The following activities are prohibited and may result in immediate
            account termination:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
            <li>
              <strong>Engagement manipulation</strong> — using bots, scripts, or
              paid services to artificially inflate preorder counts, likes,
              follows, or engagement metrics
            </li>
            <li>
              <strong>Spam projects</strong> — creating large quantities of
              identical, near-identical, or auto-generated projects to flood the
              marketplace
            </li>
            <li>
              <strong>Comment spam</strong> — posting repetitive, promotional, or
              irrelevant comments across multiple projects
            </li>
            <li>
              <strong>Follow/unfollow manipulation</strong> — mass following and
              unfollowing to game follower counts
            </li>
            <li>
              <strong>Multi-accounting</strong> — creating multiple accounts to
              evade bans, manipulate metrics, or circumvent platform rules
            </li>
            <li>
              <strong>Misleading metadata</strong> — using irrelevant tags,
              titles, descriptions, or thumbnails to deceive viewers or the
              discovery system
            </li>
          </ul>
        </section>

        {/* ── 5. Content Removal & Enforcement ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            5. Content Removal &amp; Enforcement
          </h2>

          <div>
            <h3 className="font-semibold text-text-primary">
              We may remove content without notice
            </h3>
            <p className="mt-1">
              Myriad Spring reserves the right to remove any content, at any time, for
              any reason, with or without prior notice. While we strive to be
              fair and transparent, certain violations — especially those
              involving prohibited content, safety risks, or legal obligations —
              require immediate action.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">Strike system</h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                <strong>First violation:</strong> Content removed + warning
                issued. You will be notified of the specific guideline violated.
              </li>
              <li>
                <strong>Second violation:</strong> Content removed + 7-day
                restriction on new project submissions. Payouts may be paused.
              </li>
              <li>
                <strong>Third violation:</strong> Permanent account ban and
                removal of all projects. Payouts permanently revoked.
              </li>
            </ul>
            <p className="mt-2">
              Severe violations (sexual content, child exploitation, terrorism,
              credible threats of violence) bypass the strike system and result
              in an immediate permanent ban.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">Appeals</h3>
            <p className="mt-1">
              If you believe your content was removed in error, you may appeal by
              emailing{" "}
              <a
                href="mailto:support@myriadspring.com"
                className="text-text-primary underline underline-offset-2 hover:text-brand-600"
              >
                support@myriadspring.com
              </a>{" "}
              within 14 days of the action. Include the content URL and your
              explanation. We will review and respond within 7 business days.
              Our decision on appeals is final.
            </p>
          </div>
        </section>

        {/* ── 6. Monetization Rules ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            6. Monetization Rules
          </h2>

          <div>
            <h3 className="font-semibold text-text-primary">
              Eligibility
            </h3>
            <p className="mt-1">
              Creators can earn money through project preorders. To monetize content you must:
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                Complete Stripe Connect onboarding with valid identity
                verification
              </li>
              <li>
                Be in good standing with zero active strikes
              </li>
              <li>
                Upload original content that you have the right to monetize
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              Platform fee
            </h3>
            <p className="mt-1">
              Myriad takes a standard 20% platform fee on preorder transactions unless a creator is enrolled in a separate promotional fee program.
              Standard creators receive the remaining 80% via Stripe unless a separate promotional fee program overrides it.
              Stripe&apos;s own processing fees apply in addition.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              What you cannot monetize
            </h3>
            <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
              <li>
                Content that violates these Community Guidelines
              </li>
              <li>
                Content you do not own or have the rights to sell
              </li>
              <li>
                Misleading or deceptive content designed to trick users into
                purchasing
              </li>
              <li>
                Bulk AI-generated content with no creative curation (see Section
                2)
              </li>
              <li>
                Re-uploads of other creators&apos; content
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">
              Project Suspension
            </h3>
            <p className="mt-1">
              Myriad may suspend individual projects or your entire creator
              account if we determine that your content or behavior violates
              these guidelines. Suspended projects cannot accept new preorders.
              Pending payouts may be withheld pending review.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-text-primary">Refunds</h3>
            <p className="mt-1">
              If a project fails to reach its unlock target by the campaign
              deadline, all preorders are automatically refunded in full. If a
              project is removed for guideline violations, all backers will be
              refunded. If a creator misses their delivery window, viewers may
              request a refund. Creators may have corresponding earnings
              deducted from their balance.
            </p>
          </div>
        </section>

        {/* ── 7. Deepfakes & Synthetic Media ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            7. Deepfakes &amp; Synthetic Media
          </h2>
          <p>
            As an AI content platform, we take the responsible use of synthetic
            media seriously:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
            <li>
              <strong>No non-consensual deepfakes</strong> — you may not create
              or upload realistic AI-generated depictions of real people without
              their explicit consent. This includes public figures.
            </li>
            <li>
              <strong>No misinformation</strong> — AI-generated content must not
              be presented as real footage of actual events. Satire and parody
              must be clearly labeled.
            </li>
            <li>
              <strong>Transparency encouraged</strong> — we encourage creators
              to disclose the AI tools and techniques used in their content.
              This builds trust and helps the community learn.
            </li>
          </ul>
        </section>

        {/* ── 8. Community Conduct ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            8. Community Conduct
          </h2>
          <p>Be respectful. This applies to discussions, premieres, and all interactions on Myriad Spring:</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
            <li>No harassment, bullying, or personal attacks</li>
            <li>No hate speech or discriminatory language</li>
            <li>No targeted campaigns against creators or viewers</li>
            <li>No sharing of private or confidential information</li>
            <li>
              No impersonation of other users, creators, or Myriad staff
            </li>
            <li>
              No soliciting personal information from other users, especially
              minors
            </li>
          </ul>
          <p className="mt-2">
            Creators are responsible for moderating discussions on their own
            projects. We provide tools to block users and delete posts.
            Persistent harassment should be reported to us.
          </p>
        </section>

        {/* ── 9. Reporting ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            9. Reporting Violations
          </h2>
          <p>
            If you see content or behavior that violates these guidelines, please
            report it:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-text-secondary">
            <li>
              <strong>Email:</strong>{" "}
              <a
                href="mailto:support@myriadspring.com"
                className="text-text-primary underline underline-offset-2 hover:text-brand-600"
              >
                support@myriadspring.com
              </a>
            </li>
            <li>
              Include the URL of the content and a description of the violation
            </li>
          </ul>
          <p className="mt-2">
            We review all reports and take appropriate action. You will not be
            penalized for making good-faith reports.
          </p>
        </section>

        {/* ── 10. Changes ── */}
        <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">
            10. Changes to These Guidelines
          </h2>
          <p>
            We may update these guidelines at any time to reflect changes in our
            platform, community needs, or legal requirements. Significant changes
            will be announced on the platform. Continued use of Myriad Spring after
            changes are posted constitutes acceptance. We encourage you to review
            these guidelines periodically.
          </p>
        </section>

        {/* Footer */}
        <div className="pt-4 text-center text-xs text-text-tertiary">
          <p>
            Questions about these guidelines? Contact us at{" "}
            <a
              href="mailto:support@myriadspring.com"
              className="text-text-primary underline underline-offset-2 hover:text-brand-600"
            >
              support@myriadspring.com
            </a>
          </p>
          <p className="mt-2">
            <Link href="/terms" className="underline underline-offset-2 hover:text-text-primary">
              Terms of Service
            </Link>
            {" · "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-text-primary">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
