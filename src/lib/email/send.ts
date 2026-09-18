import { getResend, FROM_EMAIL } from "./client";
import {
  welcomeEmail,
  newEpisodeEmail,
  purchaseConfirmationEmail,
  creatorSaleEmail,
  payoutNotificationEmail,
  preorderConfirmationEmail,
  projectUnlockedEmail,
  deliveryReminderEmail,
  progressProofApprovedEmail,
  progressProofRejectedEmail,
  failedToUnlockEmail,
  preorderRefundedEmail,
  filmDeliveredEmail,
  premiereReminderEmail,
} from "./templates";

async function send(to: string, subject: string, html: string) {
  try {
    const resend = getResend();
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}

export async function sendWelcomeEmail(to: string, displayName: string) {
  const { subject, html } = welcomeEmail(displayName);
  await send(to, subject, html);
}

export async function sendNewEpisodeEmail(
  to: string,
  creatorName: string,
  seriesTitle: string,
  episodeTitle: string,
  episodeNumber: number,
  videoId: string
) {
  const { subject, html } = newEpisodeEmail(
    creatorName,
    seriesTitle,
    episodeTitle,
    episodeNumber,
    videoId
  );
  await send(to, subject, html);
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  videoTitle: string,
  amountCents: number,
  videoId: string
) {
  const { subject, html } = purchaseConfirmationEmail(
    videoTitle,
    amountCents,
    videoId
  );
  await send(to, subject, html);
}

export async function sendCreatorSaleEmail(
  to: string,
  videoTitle: string,
  earningsCents: number
) {
  const { subject, html } = creatorSaleEmail(videoTitle, earningsCents);
  await send(to, subject, html);
}

export async function sendPayoutNotificationEmail(
  to: string,
  amountCents: number
) {
  const { subject, html } = payoutNotificationEmail(amountCents);
  await send(to, subject, html);
}

// ── Myriad Spring project emails ──

export async function sendPreorderConfirmationEmail(
  to: string,
  projectTitle: string,
  amountCents: number,
  projectSlug: string,
  unlockTarget: number,
  currentPreorders: number
) {
  const { subject, html } = preorderConfirmationEmail(
    projectTitle,
    amountCents,
    projectSlug,
    unlockTarget,
    currentPreorders
  );
  await send(to, subject, html);
}

export async function sendProjectUnlockedEmail(
  to: string,
  projectTitle: string,
  projectSlug: string,
  estimatedDelivery: string
) {
  const { subject, html } = projectUnlockedEmail(
    projectTitle,
    projectSlug,
    estimatedDelivery
  );
  await send(to, subject, html);
}

export async function sendDeliveryReminderEmail(
  to: string,
  projectTitle: string,
  projectSlug: string,
  daysRemaining: number
) {
  const { subject, html } = deliveryReminderEmail(
    projectTitle,
    projectSlug,
    daysRemaining
  );
  await send(to, subject, html);
}

export async function sendProgressProofApprovedEmail(
  to: string,
  projectTitle: string,
  payoutAmountCents: number
) {
  const { subject, html } = progressProofApprovedEmail(
    projectTitle,
    payoutAmountCents
  );
  await send(to, subject, html);
}

export async function sendProgressProofRejectedEmail(
  to: string,
  projectTitle: string,
  adminNote?: string
) {
  const { subject, html } = progressProofRejectedEmail(
    projectTitle,
    adminNote
  );
  await send(to, subject, html);
}

export async function sendFailedToUnlockEmail(
  to: string,
  projectTitle: string,
  projectSlug: string,
  preorderCount: number,
  unlockTarget: number
) {
  const { subject, html } = failedToUnlockEmail(
    projectTitle,
    projectSlug,
    preorderCount,
    unlockTarget
  );
  await send(to, subject, html);
}

export async function sendPreorderRefundedEmail(
  to: string,
  projectTitle: string,
  amountCents: number
) {
  const { subject, html } = preorderRefundedEmail(projectTitle, amountCents);
  await send(to, subject, html);
}

export async function sendFilmDeliveredEmail(
  to: string,
  projectTitle: string,
  projectSlug: string,
  videoId: string
) {
  const { subject, html } = filmDeliveredEmail(
    projectTitle,
    projectSlug,
    videoId
  );
  await send(to, subject, html);
}

export async function sendPremiereReminderEmail(
  to: string,
  projectTitle: string,
  projectSlug: string,
  premiereDate: string
) {
  const { subject, html } = premiereReminderEmail(
    projectTitle,
    projectSlug,
    premiereDate
  );
  await send(to, subject, html);
}
