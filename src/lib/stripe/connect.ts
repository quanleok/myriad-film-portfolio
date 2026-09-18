import { getStripe } from "./client";
import { getCreatorFeeRate as getFoundingAwareCreatorFeeRate } from "@/lib/founding-program-server";
import { getSiteUrl } from "@/lib/site-url";

/** Look up the platform fee rate for a creator. */
export async function getCreatorFeeRate(creatorId: string): Promise<number> {
  return getFoundingAwareCreatorFeeRate(creatorId);
}

export async function createConnectAccount(email: string) {
  const account = await getStripe().accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
}

export async function createOnboardingLink(accountId: string) {
  const appUrl = getSiteUrl();
  const defaultPath = "/settings";

  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}${defaultPath}?refresh=true`,
    return_url: `${appUrl}${defaultPath}?onboarding=complete`,
    type: "account_onboarding",
  });

  return link;
}

export async function createOnboardingLinkWithReturnPath(
  accountId: string,
  returnPath: string
) {
  const appUrl = getSiteUrl();
  const path = returnPath.startsWith("/") ? returnPath : "/settings";

  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}${path}${path.includes("?") ? "&" : "?"}refresh=true`,
    return_url: `${appUrl}${path}${path.includes("?") ? "&" : "?"}onboarding=complete`,
    type: "account_onboarding",
  });
  return link;
}

export function isStripeAccountOnboarded(account: {
  details_submitted?: boolean;
}) {
  return Boolean(account.details_submitted);
}

export async function getStripeOnboardingStatus(accountId: string) {
  const account = await getStripe().accounts.retrieve(accountId);
  return isStripeAccountOnboarded(account);
}
