// =============================================================================
// Project Composer — All UI Copy, Tooltips, Placeholders, and Help Text
// =============================================================================
//
// Usage: import { COMPOSER_COPY } from "@/lib/constants/composer-copy"
//
// This file contains every string shown in the project composer.
// Edit copy here — never hardcode strings in the composer component.
// =============================================================================

// ---------------------------------------------------------------------------
// Top-level page
// ---------------------------------------------------------------------------

export const COMPOSER_PAGE = {
  title: "Create a Project",
  subtitle: "Build the page your audience will fall in love with before your film exists.",
  editTitle: "Edit Project",
  autosaveIndicator: "Draft saved",
  autosaveError: "Couldn't save — retrying...",
  exitDraftPrompt: "Your progress is saved as a draft. You can come back anytime.",
} as const;

// ---------------------------------------------------------------------------
// Section headers and descriptions
// ---------------------------------------------------------------------------

export const SECTIONS = {
  basics: {
    title: "Basics",
    description: "The first things people see. Make them count.",
  },
  teaser: {
    title: "Teaser",
    description: "Upload a short video that sells the concept. This plays at the top of your project page and in the explore feed.",
  },
  characters: {
    title: "Characters",
    description: "Introduce the cast. 3 to 5 characters let viewers connect before the film is made.",
  },
  concept: {
    title: "Concept & World",
    description: "Show the world you're building. Scene art, environments, mood boards — anything that makes viewers feel like they're already inside the story.",
  },
  story: {
    title: "Story",
    description: "A short summary of what happens. Don't spoil the ending — give enough to hook, not enough to satisfy.",
  },
  preorderSetup: {
    title: "Preorder Setup",
    description: "Set your price, unlock target, and timeline. Once your project hits the target, it unlocks and production begins.",
  },
  previewLaunch: {
    title: "Preview & Launch",
    description: "Review everything, accept the terms, and launch your campaign. Your project goes live immediately.",
  },
} as const;

// ---------------------------------------------------------------------------
// Field labels, placeholders, tooltips, and helper text
// ---------------------------------------------------------------------------

export const FIELDS = {
  // -- Basics --
  title: {
    label: "Title",
    placeholder: "e.g. The Last Signal",
    tooltip: "The name of your project. Keep it short, memorable, and easy to search.",
    helper: "Max 100 characters.",
    maxLength: 100,
  },
  hook: {
    label: "Hook",
    placeholder: "e.g. A deep-space crew receives a signal that shouldn't exist.",
    tooltip: "One sentence that makes someone stop scrolling. This shows in the explore feed and project cards.",
    helper: "One line. Max 150 characters. No period needed.",
    maxLength: 150,
  },
  slug: {
    label: "Project URL",
    placeholder: "the-last-signal",
    tooltip: "The URL-friendly name for your project page. Letters, numbers, and dashes only.",
    helper: "myriadspring.com/project/",
    maxLength: 60,
  },
  genre: {
    label: "Genre",
    placeholder: "Select a genre",
    tooltip: "Pick the primary genre. This drives discovery — viewers filter by genre in browse.",
  },
  format: {
    label: "Format",
    placeholder: "Select a format",
    tooltip: "What are you making? This sets viewer expectations for length and scope.",
  },
  tone: {
    label: "Tone",
    placeholder: "Select a tone",
    tooltip: "The emotional register of your film. Helps viewers find projects that match their mood.",
  },
  runtimeMinutes: {
    label: "Estimated Runtime",
    placeholder: "e.g. 12",
    tooltip: "Your best estimate in minutes. You can update this during production.",
    helper: "In minutes. Shorts: 3-15. Features: 60+.",
    suffix: "min",
  },

  // -- Teaser --
  teaserUpload: {
    label: "Teaser Video",
    tooltip: "30-90 seconds works best. This is the first thing viewers see — hook them fast.",
    helper: "MP4 or WebM. Max 500MB. 16:9 recommended.",
    dragPrompt: "Drag and drop your teaser or click to browse",
    uploading: "Uploading teaser...",
    processing: "Processing — this may take a minute",
    replaceButton: "Replace teaser",
  },
  teaserThumbnail: {
    label: "Cover Frame",
    tooltip: "The thumbnail shown before the teaser plays. If you skip this, we'll grab a frame from your video.",
    helper: "JPG or PNG. 16:9. Min 1280x720.",
    dragPrompt: "Upload a cover image or we'll use a frame from your teaser",
  },

  // -- Characters --
  characterCard: {
    label: "Character",
    addButton: "Add Character",
    removeButton: "Remove",
    nameLabel: "Name",
    namePlaceholder: "e.g. Captain Voss",
    descriptionLabel: "Description",
    descriptionPlaceholder: "e.g. A retired pilot who can't let go of the last mission.",
    mediaLabel: "Character Image or Clip",
    mediaHelper: "JPG, PNG, or short MP4. Square or portrait works best.",
    mediaDragPrompt: "Upload character visual",
    tooltip: "Give each character a face and a line that makes viewers care. 3-5 cards recommended.",
    minCards: 3,
    maxCards: 5,
    emptyState: "No characters yet. Add at least 3 to help viewers connect with your story.",
    minWarning: "We recommend at least 3 characters. Projects with strong characters get more preorders.",
  },

  // -- Concept & World --
  conceptCard: {
    label: "Concept Card",
    addButton: "Add Card",
    removeButton: "Remove",
    captionLabel: "Caption",
    captionPlaceholder: "e.g. The bridge of the Meridian — where every decision echoes.",
    mediaLabel: "Scene Art or Clip",
    mediaHelper: "JPG, PNG, or short MP4. Landscape recommended.",
    mediaDragPrompt: "Upload concept art or scene clip",
    tooltip: "World-building material — environments, props, mood frames, short clips. Show the atmosphere.",
    minCards: 3,
    maxCards: 5,
    emptyState: "No concept cards yet. Add at least 3 to immerse viewers in your world.",
    minWarning: "We recommend at least 3 concept cards. Visual world-building drives preorders.",
  },

  // -- Story --
  synopsis: {
    label: "Synopsis",
    placeholder: "Write a short summary of the story. Set up the world, the conflict, and the stakes — but don't give away the ending.",
    tooltip: "2-4 paragraphs. Enough to hook, not enough to satisfy. Think movie trailer, not Wikipedia plot summary.",
    helper: "Max 2000 characters.",
    maxLength: 2000,
  },
  inspirationLine: {
    label: "Inspiration Line",
    placeholder: "e.g. What if Blade Runner met Studio Ghibli in a world that forgot how to dream?",
    tooltip: "One sentence about what inspired this project or what it feels like. This is your chance to be personal.",
    helper: "Optional. Max 200 characters.",
    maxLength: 200,
  },

  // -- Preorder Setup --
  preorderPrice: {
    label: "Preorder Price",
    placeholder: "5.00",
    tooltip: "What each viewer pays to preorder your film. If the project doesn't unlock, they're refunded automatically.",
    helper: "$3.00 to $15.00. Most successful projects price between $5 and $8.",
    prefix: "$",
  },
  unlockTarget: {
    label: "Unlock Target",
    placeholder: "e.g. 200",
    tooltip: "How many preorders you need before your project unlocks and production begins. Pick a number you're confident you can reach.",
    helper: "50 to 2,000 preorders. Start lower — you can always exceed it.",
  },
  campaignDuration: {
    label: "Campaign Length",
    tooltip: "How long your project is open for preorders before the deadline. Shorter campaigns create urgency, longer ones give more time to build an audience.",
    helper: "21–180 days. Can be extended by paying a renewal fee.",
  },
  productionWindow: {
    label: "Production Window",
    tooltip: "How long you need after unlocking to deliver the final film. Be realistic — missing your deadline affects your creator trust score.",
    helper: "21–180 days. Can be extended by paying a renewal fee. Your estimated delivery date is calculated from the day the project unlocks.",
  },

  // -- Preview & Launch --
  rightsAttestation: {
    label: "Rights & Ownership",
    checkboxLabel: "I confirm that I own or control the rights to all materials in this project",
    fullText: "By checking this box, you confirm that you own or have obtained the necessary rights to all visuals, music, voice, likeness, scripts, and story elements used in this project. You confirm that your project does not contain unauthorized copyrighted franchise material, deceptive real-person deepfakes, or illegal content.",
    tooltip: "You must have the right to commercialize everything in your project. AI-generated content is fine as long as you have the rights to the inputs and outputs.",
  },
  creatorTerms: {
    label: "Creator Terms",
    checkboxLabel: "I accept the Myriad Spring Creator Terms",
    linkText: "Read the full Creator Terms",
    linkHref: "/terms/creator",
    tooltip: "The Creator Terms explain when your funds become available and what you need to deliver.",
  },
  submitButton: {
    label: "Launch Campaign",
    submitting: "Launching...",
    tooltip: "Your project will go live immediately and viewers can start preordering.",
  },
} as const;

// ---------------------------------------------------------------------------
// Preorder setup — earnings calculator copy
// ---------------------------------------------------------------------------

export const EARNINGS_CALCULATOR = {
  title: "Earnings Estimate",
  description: "Here's what you'd earn if your project unlocks.",
  grossLabel: "Gross preorder revenue",
  platformFeeLabel: "Platform fee (20%)",
  yourShareLabel: "Your share (80%)",
  release1Label: "Release 1 — On unlock (30%)",
  release2Label: "Release 2 — Progress proof approved (30%)",
  release3Label: "Release 3 — Film delivered (40%)",
  footnote: "If your project doesn't unlock, all preorders are refunded automatically. New creators withdraw after delivery. Proven creators may have part of their funds available earlier.",
  formula: (price: number, target: number) => {
    const gross = price * target;
    const platformFee = Math.round(gross * 0.2);
    const creatorShare = gross - platformFee;
    return {
      gross,
      platformFee,
      creatorShare,
      release1: Math.round(creatorShare * 0.3),
      release2: Math.round(creatorShare * 0.3),
      release3: Math.round(creatorShare * 0.4),
    };
  },
} as const;

// ---------------------------------------------------------------------------
// Validation error messages
// ---------------------------------------------------------------------------

export const VALIDATION = {
  // Basics
  titleRequired: "Your project needs a title.",
  titleTooLong: "Title must be 100 characters or less.",
  hookRequired: "Add a one-line hook. It shows in the feed and project cards.",
  hookTooLong: "Hook must be 150 characters or less.",
  slugRequired: "Set a URL for your project page.",
  slugInvalid: "URL can only contain lowercase letters, numbers, and dashes.",
  slugTaken: "This URL is already taken. Try another.",
  slugTooLong: "URL must be 60 characters or less.",
  genreRequired: "Pick a genre so viewers can find your project.",
  formatRequired: "Select a format so viewers know what to expect.",
  toneRequired: "Choose a tone.",
  runtimeRequired: "Estimate how long the final film will be.",
  runtimeInvalid: "Runtime must be between 1 and 300 minutes.",

  // Teaser
  teaserRequired: "Upload a teaser video. This is the first thing viewers see.",
  teaserTooLarge: "Teaser must be under 500MB.",
  teaserInvalidFormat: "Upload an MP4 or WebM file.",

  // Characters
  charactersTooFew: "Add at least 3 character cards.",
  charactersTooMany: "Maximum 5 character cards.",
  characterNameRequired: "Each character needs a name.",
  characterNameTooLong: "Character name must be 80 characters or less.",
  characterDescriptionTooLong: "Character description must be 300 characters or less.",
  characterMediaRequired: "Upload an image or clip for this character.",

  // Concept
  conceptTooFew: "Add at least 3 concept cards.",
  conceptTooMany: "Maximum 5 concept cards.",
  conceptCaptionTooLong: "Caption must be 200 characters or less.",
  conceptMediaRequired: "Upload an image or clip for this card.",

  // Story
  synopsisRequired: "Write a short synopsis. Viewers need to know what they're preordering.",
  synopsisTooLong: "Synopsis must be 2,000 characters or less.",
  inspirationTooLong: "Inspiration line must be 200 characters or less.",

  // Preorder setup
  priceRequired: "Set a preorder price.",
  priceTooLow: "Minimum preorder price is $3.00.",
  priceTooHigh: "Maximum preorder price is $15.00.",
  priceInvalid: "Enter a valid dollar amount.",
  targetRequired: "Set an unlock target.",
  targetTooLow: "Minimum unlock target is 50 preorders.",
  targetTooHigh: "Maximum unlock target is 2,000 preorders.",
  targetInvalid: "Enter a whole number.",
  campaignDurationRequired: "Choose a campaign length.",
  productionWindowRequired: "Choose a production window.",

  // Rights & terms
  rightsRequired: "You must confirm you have the rights to this material.",
  termsRequired: "You must accept the Creator Terms to launch.",

  // General
  incompleteSection: (section: string) => `Complete the "${section}" section before submitting.`,
  saveFailed: "Couldn't save your changes. Check your connection and try again.",
} as const;

// ---------------------------------------------------------------------------
// Section completion states
// ---------------------------------------------------------------------------

export const SECTION_STATUS = {
  complete: "Complete",
  incomplete: "Incomplete",
  inProgress: "In progress",
  required: "Required",
  optional: "Optional",
} as const;

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

export const EMPTY_STATES = {
  noProjects: {
    title: "No projects yet",
    description: "Create your first project and start building an audience before your film is made.",
    cta: "Create a Project",
  },
  noDrafts: {
    title: "No drafts",
    description: "All your projects have been submitted or launched.",
  },
  noPreorders: {
    title: "No preorders yet",
    description: "Preorders appear here once your project is live. Share your project to start building momentum.",
  },
  noUpdates: {
    title: "No updates posted",
    description: "Post your first update to keep your audience engaged during production.",
    cta: "Post an Update",
  },
  noDiscussion: {
    title: "No discussion yet",
    description: "Be the first to start a conversation about this project.",
  },
} as const;

// ---------------------------------------------------------------------------
// Confirmation dialogs
// ---------------------------------------------------------------------------

export const CONFIRMATIONS = {
  submitForReview: {
    title: "Launch your campaign?",
    body: "Your project will go live immediately. Viewers can start preordering right away. Some fields (price, unlock target) will be locked after launch.",
    confirm: "Launch Now",
    cancel: "Keep Editing",
  },
  cancelProject: {
    title: "Cancel this project?",
    body: "If your project has active preorders, they will be refunded automatically. This cannot be undone.",
    confirm: "Cancel Project",
    cancel: "Go Back",
  },
  deleteCard: {
    title: "Remove this card?",
    body: "This will remove the card and its media from your project.",
    confirm: "Remove",
    cancel: "Keep",
  },
  discardDraft: {
    title: "Discard unsaved changes?",
    body: "You have unsaved changes that will be lost.",
    confirm: "Discard",
    cancel: "Keep Editing",
  },
  replaceTeaser: {
    title: "Replace teaser video?",
    body: "Your current teaser will be removed and replaced with the new upload.",
    confirm: "Replace",
    cancel: "Keep Current",
  },
} as const;

// ---------------------------------------------------------------------------
// Success messages
// ---------------------------------------------------------------------------

export const SUCCESS = {
  draftSaved: "Draft saved.",
  submitted: "Your campaign is live! Share your project to start collecting preorders.",
  published: "Your project is live! Share it to start collecting preorders.",
  cardAdded: "Card added.",
  cardRemoved: "Card removed.",
  teaserUploaded: "Teaser uploaded. Processing may take a moment.",
  thumbnailUploaded: "Cover image uploaded.",
  updatePosted: "Update posted. Your preorder holders will be notified.",
  filmDelivered: "Film delivered. Entitlements are being granted to all preorder holders.",
} as const;

// ---------------------------------------------------------------------------
// Contextual tips (shown inline or as callouts)
// ---------------------------------------------------------------------------

export const TIPS = {
  basics: "Projects with clear, specific titles get 2x more clicks than generic ones.",
  hook: "Think movie tagline, not plot summary. One sentence that creates a question in the viewer's mind.",
  teaser: "The best teasers are 30-60 seconds. Show the tone, the world, and one moment that hooks — don't try to tell the whole story.",
  characters: "Name, face, one line. Viewers connect with people, not plots. Character cards are the most-viewed tab on successful projects.",
  concept: "Concept art doesn't need to be final. Work-in-progress frames that show the visual direction perform just as well as polished renders.",
  synopsis: "Set up the world, introduce the conflict, raise the stakes. Stop before the resolution. Leave them wanting more.",
  price: "Most successful projects price between $5 and $8. Lower prices drive volume. Higher prices signal premium quality.",
  target: "Set a target you're confident you can reach. You can always exceed it. Failing to unlock hurts your creator trust score.",
  campaign: "14-day campaigns convert at higher rates. 30-day campaigns reach more people. Choose based on your existing audience size.",
  production: "Be honest about your timeline. Missing your delivery window affects your trust score and may trigger viewer notifications.",
  launch: "Once launched, price and unlock target are locked. You can still edit your story, characters, and concept art.",
} as const;

// ---------------------------------------------------------------------------
// Section-level progress guidance
// ---------------------------------------------------------------------------

export const PROGRESS_GUIDANCE = {
  allComplete: "Everything looks good. Review your project below and submit when ready.",
  almostThere: (remaining: number) =>
    `${remaining} section${remaining === 1 ? "" : "s"} left to complete.`,
  justStarting: "Fill out each section to build your project page. Your progress saves automatically.",
} as const;

// ---------------------------------------------------------------------------
// Preview panel copy (sticky desktop sidebar)
// ---------------------------------------------------------------------------

export const PREVIEW_PANEL = {
  title: "Live Preview",
  description: "This is how your project page will look to viewers.",
  emptyTeaser: "Your teaser will appear here",
  emptyCharacters: "Character cards will appear here",
  emptyConcept: "Concept cards will appear here",
  emptyStory: "Your synopsis will appear here",
  preorderButtonPreview: "Preorder to Unlock",
  progressPreview: (target: number) => `0 / ${target} preorders needed`,
} as const;

// ---------------------------------------------------------------------------
// Post-submit states
// ---------------------------------------------------------------------------

export const POST_SUBMIT = {
  launched: {
    title: "You're Live!",
    description: "Your project is now visible to viewers. Share it to start collecting preorders.",
    tip: "Share to social media in the first hour for maximum visibility.",
  },
  approved: {
    title: "Approved — You're Live!",
    description: "Your project is now visible to viewers. Share it everywhere to start collecting preorders.",
    shareTip: "Projects that share to social media in the first hour get 3x more initial preorders.",
  },
  rejected: {
    title: "Changes Requested",
    description: "Our team flagged some issues with your project. Review the feedback below, make the changes, and resubmit.",
  },
} as const;

// ---------------------------------------------------------------------------
// Payout release messaging (creator dashboard)
// ---------------------------------------------------------------------------

export const PAYOUT_MESSAGES = {
  release1Available: (amount: string) => `${amount} is ready to withdraw.`,
  release2Available: (amount: string) => `${amount} is now ready to withdraw.`,
  release3Available: (amount: string) => `Final ${amount} is ready to withdraw.`,
  release1Pending: "New creators withdraw after delivery. Proven creators may have part of their funds available earlier.",
  release2Pending: "The rest of your funds become available after you deliver the film.",
  release3Pending: "Remaining funds become available after you deliver the film.",
  noPayout: "No payout available yet. New creators withdraw after delivery. Proven creators may have part of their funds available earlier.",
  withdrawButton: "Withdraw",
  withdrawing: "Processing withdrawal...",
  withdrawSuccess: (amount: string) => `${amount} withdrawal initiated. Funds typically arrive in 2-3 business days.`,
  stripeRequired: "Set up your payout account to withdraw funds.",
  stripeSetupButton: "Set Up Payouts",
} as const;

// ---------------------------------------------------------------------------
// Viewer-facing trust copy (shown on project page and checkout)
// ---------------------------------------------------------------------------

export const TRUST_COPY = {
  preorderExplainer: "If this project doesn't reach its unlock target, your preorder is refunded automatically.",
  postUnlockExplainer: "This project has unlocked. New creators can withdraw after delivery. Proven creators may have part of their funds available earlier.",
  refundPolicy: "You can cancel your preorder anytime before the project unlocks. Once unlocked, preorders are committed.",
  checkoutTrustLine: "Charged now. Refunded automatically if the project doesn't unlock.",
  deliveryEstimate: (date: string) => `Estimated delivery: ${date}`,
  backerCount: (count: number, target: number) =>
    `${count} / ${target} preorders needed`,
  backerCountUnlocked: (count: number) =>
    `${count} preorders — Unlocked`,
  daysRemaining: (days: number) =>
    days === 1 ? "1 day left" : `${days} days left`,
  campaignEnded: "Campaign ended",
  unlocked: "Unlocked — In production",
} as const;
