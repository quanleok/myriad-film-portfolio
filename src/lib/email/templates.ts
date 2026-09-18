import { getSiteUrl } from "@/lib/site-url";
import { formatPrice } from "@/lib/utils";

export interface EmailTemplate {
  subject: string;
  html: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SITE_URL = getSiteUrl();

function emailLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #111;">
    <tr><td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
        <!-- Header -->
        <tr><td style="padding: 0 0 24px;">
          <a href="${SITE_URL}" style="text-decoration: none;">
            <span style="font-size: 20px; font-weight: 700; color: #7c3aed; letter-spacing: -0.5px;">Myriad Spring</span>
          </a>
        </td></tr>
        <!-- Body -->
        <tr><td style="background-color: #1a1a1a; border-radius: 12px; padding: 32px;">
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 24px 0 0; text-align: center;">
          <p style="color: #666; font-size: 12px; line-height: 1.5; margin: 0;">
            <a href="${SITE_URL}" style="color: #666; text-decoration: underline;">Myriad Spring</a> — Preorder unreleased AI films
          </p>
          <p style="color: #555; font-size: 11px; line-height: 1.5; margin: 8px 0 0;">
            <a href="mailto:support@myriadspring.com" style="color: #555; text-decoration: underline;">Contact Support</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; margin-top: 20px; padding: 14px 28px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">${label}</a>`;
}

function infoBox(content: string): string {
  return `<div style="margin: 20px 0; padding: 16px; background-color: #222; border-radius: 8px; border-left: 3px solid #7c3aed;">${content}</div>`;
}

// ── Welcome ──

export function welcomeEmail(displayName: string): EmailTemplate {
  return {
    subject: "Welcome to Myriad Spring!",
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Welcome, ${escapeHtml(displayName)}!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        You've joined the home of unreleased AI films. Discover bold new projects,
        preorder the ones you want made, and watch them come to life.
      </p>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 4px;">
        Here's how it works:
      </p>
      <ul style="color: #ccc; line-height: 1.8; margin: 8px 0 0; padding-left: 20px;">
        <li>Browse concept pages with teasers, characters, and story</li>
        <li>Preorder projects you want to see made</li>
        <li>When enough people preorder, the project unlocks and the creator makes the film</li>
        <li>You get access to watch it first</li>
      </ul>
      ${ctaButton(`${SITE_URL}/explore`, "Start Exploring")}
    `),
  };
}

// ── Legacy templates (kept for old system) ──

export function newEpisodeEmail(
  creatorName: string,
  seriesTitle: string,
  episodeTitle: string,
  episodeNumber: number,
  videoId: string
): EmailTemplate {
  return {
    subject: `${escapeHtml(creatorName)} released a new episode of ${escapeHtml(seriesTitle)}`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">New Episode Available!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        <strong>${escapeHtml(creatorName)}</strong> just released Episode ${episodeNumber} of <strong>${escapeHtml(seriesTitle)}</strong>:
      </p>
      <p style="color: #fff; font-size: 18px; font-weight: 600; margin: 0;">${escapeHtml(episodeTitle)}</p>
      ${ctaButton(`${SITE_URL}/watch/${videoId}`, "Watch Now")}
    `),
  };
}

export function purchaseConfirmationEmail(
  videoTitle: string,
  amountCents: number,
  videoId: string
): EmailTemplate {
  return {
    subject: `You unlocked "${escapeHtml(videoTitle)}"`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Purchase Confirmed!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        You've unlocked <strong>${escapeHtml(videoTitle)}</strong> for ${formatPrice(amountCents)}.
        You now have unlimited access.
      </p>
      ${ctaButton(`${SITE_URL}/watch/${videoId}`, "Watch Now")}
    `),
  };
}

export function creatorSaleEmail(
  videoTitle: string,
  earningsCents: number
): EmailTemplate {
  return {
    subject: `You earned ${formatPrice(earningsCents)} from "${escapeHtml(videoTitle)}"`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">New Sale!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Someone just purchased <strong>${escapeHtml(videoTitle)}</strong>.
      </p>
      ${infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">You earned</p>
        <p style="color: #22c55e; margin: 0; font-size: 24px; font-weight: 700;">${formatPrice(earningsCents)}</p>
      `)}
      ${ctaButton(`${SITE_URL}/dashboard`, "View Dashboard")}
    `),
  };
}

export function payoutNotificationEmail(
  amountCents: number
): EmailTemplate {
  return {
    subject: `Your payout of ${formatPrice(amountCents)} is on the way`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Payout on the Way!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        A payout of <strong>${formatPrice(amountCents)}</strong> has been initiated to your connected Stripe account.
        It typically takes 2–3 business days to arrive.
      </p>
      ${ctaButton(`${SITE_URL}/dashboard`, "View Dashboard")}
    `),
  };
}

// ── Myriad Spring project emails ──

export function preorderConfirmationEmail(
  projectTitle: string,
  amountCents: number,
  projectSlug: string,
  unlockTarget: number,
  currentPreorders: number
): EmailTemplate {
  const pct = unlockTarget > 0 ? Math.round((currentPreorders / unlockTarget) * 100) : 0;
  return {
    subject: `Preorder confirmed — ${escapeHtml(projectTitle)}`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Preorder Confirmed!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        You preordered <strong>${escapeHtml(projectTitle)}</strong> for ${formatPrice(amountCents)}.
      </p>
      ${infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">Preorder progress</p>
        <p style="color: #fff; margin: 0 0 8px; font-size: 22px; font-weight: 700;">
          ${currentPreorders} / ${unlockTarget} preorders
        </p>
        <div style="background-color: #333; border-radius: 4px; height: 6px; overflow: hidden;">
          <div style="background-color: #7c3aed; height: 6px; width: ${Math.min(pct, 100)}%; border-radius: 4px;"></div>
        </div>
      `)}
      <p style="color: #999; line-height: 1.6; font-size: 13px; margin: 16px 0 0;">
        If this project doesn't reach its unlock target, your preorder is refunded automatically.
      </p>
      ${ctaButton(`${SITE_URL}/project/${encodeURIComponent(projectSlug)}`, "View Project")}
    `),
  };
}

export function projectUnlockedEmail(
  projectTitle: string,
  projectSlug: string,
  estimatedDelivery: string
): EmailTemplate {
  return {
    subject: `${escapeHtml(projectTitle)} has been greenlit!`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Project Greenlit!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Great news — <strong>${escapeHtml(projectTitle)}</strong> hit its unlock target!
        The creator is now in production.
      </p>
      ${infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">Estimated delivery</p>
        <p style="color: #fff; margin: 0; font-size: 18px; font-weight: 600;">${escapeHtml(estimatedDelivery)}</p>
      `)}
      <p style="color: #ccc; line-height: 1.6; margin: 0;">
        We'll keep you updated as the creator posts production updates.
        When the film is ready, you'll get access to watch it on Myriad.
      </p>
      ${ctaButton(`${SITE_URL}/project/${encodeURIComponent(projectSlug)}`, "View Project")}
    `),
  };
}

export function deliveryReminderEmail(
  projectTitle: string,
  projectSlug: string,
  daysRemaining: number
): EmailTemplate {
  const isUrgent = daysRemaining <= 3;
  const headlineColor = isUrgent ? "#f59e0b" : "#fff";
  return {
    subject: `${isUrgent ? "Delivery due soon" : "Delivery reminder"}: ${escapeHtml(projectTitle)} — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`,
    html: emailLayout(`
      <h1 style="color: ${headlineColor}; font-size: 24px; margin: 0 0 16px;">
        ${isUrgent ? "Delivery Due Soon" : "Delivery Reminder"}
      </h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Your project <strong>${escapeHtml(projectTitle)}</strong> is due in
        <strong>${daysRemaining} day${daysRemaining === 1 ? "" : "s"}</strong>.
      </p>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Upload your final film and mark the project as delivered from your dashboard.
        Your backers will receive access automatically.
      </p>
      ${ctaButton(`${SITE_URL}/dashboard`, "Go to Dashboard")}
      <p style="color: #888; font-size: 12px; margin: 20px 0 0; line-height: 1.5;">
        Questions? Contact us at support@myriadspring.com
      </p>
    `),
  };
}

export function progressProofApprovedEmail(
  projectTitle: string,
  payoutAmountCents: number
): EmailTemplate {
  return {
    subject: `Progress proof approved — ${formatPrice(payoutAmountCents)} available to withdraw`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Progress Proof Approved!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Your progress proof for <strong>${escapeHtml(projectTitle)}</strong> has been approved.
      </p>
      ${infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">Available to withdraw</p>
        <p style="color: #22c55e; margin: 0; font-size: 24px; font-weight: 700;">${formatPrice(payoutAmountCents)}</p>
      `)}
      <p style="color: #ccc; line-height: 1.6; margin: 0;">
        Your final payout will be available once you deliver the completed film.
      </p>
      ${ctaButton(`${SITE_URL}/dashboard`, "Withdraw Now")}
    `),
  };
}

export function progressProofRejectedEmail(
  projectTitle: string,
  adminNote?: string
): EmailTemplate {
  return {
    subject: `Progress proof needs revision — ${escapeHtml(projectTitle)}`,
    html: emailLayout(`
      <h1 style="color: #f59e0b; font-size: 24px; margin: 0 0 16px;">Progress Proof Needs Revision</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Your progress proof for <strong>${escapeHtml(projectTitle)}</strong> was reviewed and needs revision.
      </p>
      ${adminNote ? infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">Reviewer note</p>
        <p style="color: #fff; margin: 0; line-height: 1.5;">${escapeHtml(adminNote)}</p>
      `) : ""}
      <p style="color: #ccc; line-height: 1.6; margin: 0;">
        Submit a new progress proof from your dashboard. Include real production evidence
        such as a rough cut, WIP scene, or animation test.
      </p>
      ${ctaButton(`${SITE_URL}/dashboard`, "Go to Dashboard")}
    `),
  };
}

export function failedToUnlockEmail(
  projectTitle: string,
  projectSlug: string,
  preorderCount: number,
  unlockTarget: number
): EmailTemplate {
  return {
    subject: `${escapeHtml(projectTitle)} did not reach its unlock target`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Campaign Ended</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Unfortunately, <strong>${escapeHtml(projectTitle)}</strong> did not reach its unlock target
        before the campaign deadline.
      </p>
      ${infoBox(`
        <p style="color: #ccc; margin: 0 0 4px; font-size: 13px;">Final preorder count</p>
        <p style="color: #fff; margin: 0; font-size: 20px; font-weight: 700;">
          ${preorderCount} / ${unlockTarget} preorders
        </p>
      `)}
      <p style="color: #ccc; line-height: 1.6; margin: 0;">
        All preorders have been refunded automatically. You can edit and relaunch your project.
      </p>
      ${ctaButton(`${SITE_URL}/project/${encodeURIComponent(projectSlug)}`, "View Project")}
    `),
  };
}

export function preorderRefundedEmail(
  projectTitle: string,
  amountCents: number
): EmailTemplate {
  return {
    subject: `Your preorder for "${escapeHtml(projectTitle)}" has been refunded`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Preorder Refunded</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        <strong>${escapeHtml(projectTitle)}</strong> did not reach its unlock target,
        so your preorder of ${formatPrice(amountCents)} has been refunded automatically.
      </p>
      <p style="color: #ccc; line-height: 1.6; margin: 0;">
        The refund should appear on your statement within 5–10 business days.
      </p>
      ${ctaButton(`${SITE_URL}/browse`, "Explore More Projects")}
    `),
  };
}

export function filmDeliveredEmail(
  projectTitle: string,
  projectSlug: string,
  _videoId: string
): EmailTemplate {
  return {
    subject: `${escapeHtml(projectTitle)} has been delivered — premiere coming soon!`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Film Delivered!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        Great news — <strong>${escapeHtml(projectTitle)}</strong> has been delivered by the creator!
        The premiere date will be announced soon. We'll notify you when it's time to watch.
      </p>
      ${ctaButton(`${SITE_URL}/project/${projectSlug}`, "View Project")}
      <p style="color: #888; font-size: 12px; margin: 20px 0 0; line-height: 1.5;">
        You can always find your backed projects in <a href="${SITE_URL}/library" style="color: #7c3aed; text-decoration: underline;">your library</a>.
      </p>
    `),
  };
}

export function premiereReminderEmail(
  projectTitle: string,
  projectSlug: string,
  premiereDate: string
): EmailTemplate {
  return {
    subject: `Premiere alert — ${escapeHtml(projectTitle)} premieres ${escapeHtml(premiereDate)}!`,
    html: emailLayout(`
      <h1 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Premiere Coming Up!</h1>
      <p style="color: #ccc; line-height: 1.6; margin: 0 0 12px;">
        <strong>${escapeHtml(projectTitle)}</strong> is premiering on
        <strong>${escapeHtml(premiereDate)}</strong>. Don't miss the live premiere event!
      </p>
      ${ctaButton(`${SITE_URL}/project/${encodeURIComponent(projectSlug)}`, "View Project")}
    `),
  };
}
