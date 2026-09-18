export type WalkthroughAudience = "viewer" | "creator";

export interface AudienceWalkthroughPanel {
  audience: WalkthroughAudience;
  tabLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  ctaHref: string;
  ctaLabel: string;
  steps: Array<{
    title: string;
    body: string;
  }>;
}

export interface CreatorWorkflowStep {
  audience: "creator";
  eyebrow: string;
  title: string;
  body: string;
  caption: string;
  imageSrc: string;
  imageAlt: string;
  note?: string;
}

export const AUDIENCE_WALKTHROUGH_PANELS: Record<
  WalkthroughAudience,
  AudienceWalkthroughPanel
> = {
  viewer: {
    audience: "viewer",
    tabLabel: "For Viewers",
    eyebrow: "For Viewers",
    title: "Browse what is live now, then back what should get made next.",
    body:
      "Myriad combines released films, live premieres, and upcoming project pages so viewers can move from watching into backing without switching platforms.",
    imageSrc: "/how-it-works/viewer-discovery.png",
    imageAlt:
      "Myriad browse and discovery surfaces showing released films and upcoming project cards.",
    ctaHref: "/browse",
    ctaLabel: "Browse films",
    steps: [
      {
        title: "Discover films and projects",
        body:
          "Browse released titles, teasers, and upcoming project pages in the same system.",
      },
      {
        title: "Open the right surface",
        body:
          "Watch a released film now or open the project page to inspect the teaser, hook, and current momentum.",
      },
      {
        title: "Back what should release",
        body:
          "Preorder during the campaign, then buy or watch once the film reaches premiere or release.",
      },
    ],
  },
  creator: {
    audience: "creator",
    tabLabel: "For Creators",
    eyebrow: "For Creators",
    title: "Start with the lightest honest launch path, then grow into a full release pipeline.",
    body:
      "Creators can post a teaser first, graduate into preorder or production when the audience is there, then manage delivery and payout from one dashboard.",
    imageSrc: "/how-it-works/creator-launch-modes.png",
    imageAlt:
      "Myriad creator launch mode picker showing teaser, preorder, production, release, and premiere options.",
    ctaHref: "/creators",
    ctaLabel: "See creator guide",
    steps: [
      {
        title: "Choose the right launch mode",
        body:
          "Pick teaser, preorder, direct production, release now, or schedule premiere based on what is actually ready.",
      },
      {
        title: "Upload the core assets",
        body:
          "Teasers only need the essentials. Heavier materials like characters and world-building can come later when they genuinely help.",
      },
      {
        title: "Launch, manage, and deliver",
        body:
          "Use the same platform to publish, track audience momentum, deliver the finished film, and unlock payouts.",
      },
    ],
  },
};

export const CREATOR_WORKFLOW_STEPS: CreatorWorkflowStep[] = [
  {
    audience: "creator",
    eyebrow: "Step 1",
    title: "Choose your entry point",
    body:
      "Start with the launch mode that matches reality. Teaser is the lightest start. Preorder and production are for projects that already need real audience or delivery rules.",
    caption:
      "What matters here: choose the smallest promise that still feels honest.",
    imageSrc: "/how-it-works/creator-launch-modes.png",
    imageAlt:
      "Creator launch mode picker showing teaser, preorder, production, release now, and schedule premiere.",
    note: "Fastest start",
  },
  {
    audience: "creator",
    eyebrow: "Step 2",
    title: "Upload your teaser or project assets",
    body:
      "For a teaser, the main work is title, hook, teaser clip, and launch essentials. Save the heavier world-building for later unless it actually improves the page.",
    caption:
      "What matters here: upload the teaser first and avoid padding the page with filler.",
    imageSrc: "/how-it-works/creator-teaser-upload.png",
    imageAlt:
      "Trailer teaser composer with title, hook, genre, and teaser upload fields.",
    note: "Required before teaser launch",
  },
  {
    audience: "creator",
    eyebrow: "Step 3",
    title: "Launch the page publicly",
    body:
      "Once the essentials are in place, the page becomes a real public surface where viewers can react, comment, preorder, or watch depending on the launch mode.",
    caption:
      "What matters here: the public page should make the project legible fast.",
    imageSrc: "/how-it-works/creator-public-surface.png",
    imageAlt:
      "Live Myriad project card and project discovery surface showing teaser thumbnail, momentum, and lifecycle state.",
    note: "Public surface",
  },
  {
    audience: "creator",
    eyebrow: "Step 4",
    title: "Manage momentum in the dashboard",
    body:
      "The dashboard is where you track launch state, trust status, balances, next actions, and which project needs attention now.",
    caption:
      "What matters here: treat the dashboard like the control center, not an archive.",
    imageSrc: "/how-it-works/creator-dashboard.png",
    imageAlt:
      "Creator dashboard showing status rail, projects, launch actions, and payout state.",
    note: "Control center",
  },
  {
    audience: "creator",
    eyebrow: "Step 5",
    title: "Deliver the film and unlock payout flow",
    body:
      "When the film is ready, deliver it through the project pipeline, move into premiere or release, and let the creator payout state update automatically.",
    caption:
      "What matters here: delivery and payout trust are connected, so this is where creator credibility compounds.",
    imageSrc: "/how-it-works/creator-delivery-payouts.png",
    imageAlt:
      "Creator dashboard earnings and delivery context showing available balance, held balance, and creator payout state.",
    note: "Delivery + payout",
  },
];
