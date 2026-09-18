import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, Json | undefined>;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
  metadata,
}: CreateNotificationParams) {
  const supabase = createAdminClient();
  return supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    link: link ?? null,
    metadata: (metadata ?? null) as Json,
  });
}

export async function notifyCreatorNewSubscriber(
  creatorId: string,
  subscriberName: string
) {
  return createNotification({
    userId: creatorId,
    type: "new_subscriber",
    title: "New subscriber!",
    body: `${subscriberName} just subscribed to your channel.`,
    link: "/dashboard",
  });
}

export async function notifyCreatorNewPurchase(
  creatorId: string,
  buyerName: string,
  videoTitle: string,
  videoId: string
) {
  return createNotification({
    userId: creatorId,
    type: "new_purchase",
    title: "New sale!",
    body: `${buyerName} purchased "${videoTitle}".`,
    link: `/watch/${videoId}`,
  });
}

export async function notifyCreatorNewComment(
  creatorId: string,
  commenterName: string,
  videoTitle: string,
  videoId: string
) {
  return createNotification({
    userId: creatorId,
    type: "new_comment",
    title: "New comment",
    body: `${commenterName} commented on "${videoTitle}".`,
    link: `/watch/${videoId}`,
  });
}

export async function notifyCommentReply(
  commenterId: string,
  replierName: string,
  videoTitle: string,
  videoId: string
) {
  return createNotification({
    userId: commenterId,
    type: "comment_reply",
    title: "New reply",
    body: `${replierName} replied to your comment on "${videoTitle}".`,
    link: `/watch/${videoId}`,
  });
}

export async function notifyFollowersNewVideo(
  creatorId: string,
  creatorName: string,
  videoTitle: string,
  videoId: string
) {
  // Validate inputs to prevent abuse via admin client
  if (!creatorId || !videoId || !videoTitle) return;

  const supabase = createAdminClient();

  // Verify the creator actually exists
  const { data: creator } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", creatorId)
    .single();

  if (!creator) return;

  const { data: followers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("creator_id", creatorId)
    .limit(10000);

  if (!followers || followers.length === 0) return;

  // Sanitize creator name and video title for notification body
  const safeName = creatorName.slice(0, 100);
  const safeTitle = videoTitle.slice(0, 200);

  const notifications = followers.map((f) => ({
    user_id: f.follower_id,
    type: "new_video",
    title: "New upload",
    body: `${safeName} just uploaded "${safeTitle}".`,
    link: `/watch/${videoId}`,
    metadata: {},
  }));

  // Batch insert in chunks to avoid oversized payloads
  const BATCH_SIZE = 500;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    await supabase.from("notifications").insert(notifications.slice(i, i + BATCH_SIZE));
  }
}

export async function notifyPremiereStarting(
  videoId: string,
  videoTitle: string
) {
  const supabase = createAdminClient();

  // Notify all users who bookmarked (watchlisted) this premiere
  const { data: bookmarks } = await supabase
    .from("watchlist")
    .select("user_id")
    .eq("video_id", videoId);

  if (!bookmarks || bookmarks.length === 0) return;

  const safeTitle = videoTitle.slice(0, 200);

  const notifications = bookmarks.map((b) => ({
    user_id: b.user_id,
    type: "premiere",
    title: "Premiere starting!",
    body: `"${safeTitle}" is premiering now.`,
    link: `/watch/${videoId}`,
    metadata: {},
  }));

  // Batch insert
  const BATCH_SIZE = 500;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    await supabase
      .from("notifications")
      .insert(notifications.slice(i, i + BATCH_SIZE));
  }
}

export async function notifyCreatorNewFollower(
  creatorId: string,
  followerName: string
) {
  return createNotification({
    userId: creatorId,
    type: "new_follower",
    title: "New follower!",
    body: `${followerName} started following you.`,
    link: "/dashboard",
  });
}

// =============================================================================
// Project system notifications
// =============================================================================

/** Notify creator when someone preorders their project */
export async function notifyCreatorNewPreorder(
  creatorId: string,
  buyerName: string,
  projectTitle: string,
  projectSlug: string,
  currentCount: number,
  target: number
) {
  return createNotification({
    userId: creatorId,
    type: "new_preorder",
    title: "New preorder!",
    body: `${buyerName} preordered "${projectTitle}". ${currentCount}/${target} preorders.`,
    link: `/project/${projectSlug}`,
  });
}

/** Notify creator when their project unlocks */
export async function notifyCreatorProjectUnlocked(
  creatorId: string,
  projectTitle: string,
  preorderCount: number
) {
  return createNotification({
    userId: creatorId,
    type: "project_unlocked",
    title: "Project unlocked!",
    body: `"${projectTitle}" reached ${preorderCount} preorders. Production begins — your first payout is ready to withdraw.`,
    link: "/dashboard",
  });
}

/** Notify all preorder holders when a project unlocks */
export async function notifyBackersProjectUnlocked(
  projectId: string,
  projectTitle: string,
  projectSlug: string
) {
  const supabase = createAdminClient();

  const { data: preorders } = await supabase
    .from("project_preorders")
    .select("user_id")
    .eq("project_id", projectId)
    .in("current_status", ["active", "committed"])
    .limit(10000);

  if (!preorders || preorders.length === 0) return;

  const safeTitle = projectTitle.slice(0, 200);
  const notifications = preorders.map((p) => ({
    user_id: p.user_id,
    type: "project_unlocked",
    title: "Project unlocked!",
    body: `"${safeTitle}" has been unlocked. The creator is now in production.`,
    link: `/project/${projectSlug}`,
    metadata: {},
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    await supabase.from("notifications").insert(notifications.slice(i, i + BATCH_SIZE));
  }
}

/** Notify creator when progress proof is approved */
export async function notifyCreatorProofApproved(
  creatorId: string,
  projectTitle: string
) {
  return createNotification({
    userId: creatorId,
    type: "proof_approved",
    title: "Progress proof approved",
    body: `Your progress proof for "${projectTitle}" was approved. Your next payout is ready to withdraw.`,
    link: "/dashboard",
  });
}

/** Notify creator when progress proof is rejected */
export async function notifyCreatorProofRejected(
  creatorId: string,
  projectTitle: string,
  reason: string
) {
  return createNotification({
    userId: creatorId,
    type: "proof_rejected",
    title: "Progress proof needs revision",
    body: `Your progress proof for "${projectTitle}" was not approved: ${reason}`,
    link: "/dashboard",
  });
}

/** Notify creator of upcoming delivery deadline */
export async function notifyCreatorDeliveryReminder(
  creatorId: string,
  projectTitle: string,
  daysLeft: number
) {
  return createNotification({
    userId: creatorId,
    type: "delivery_reminder",
    title: `${daysLeft} days until delivery deadline`,
    body: `"${projectTitle}" is due in ${daysLeft} days. Upload your final film to deliver on time.`,
    link: "/dashboard",
  });
}

/** Notify all backers when film is delivered / premiere scheduled */
export async function notifyBackersFilmDelivered(
  projectId: string,
  projectTitle: string,
  projectSlug: string,
  premiereDate?: string
) {
  const supabase = createAdminClient();

  const { data: preorders } = await supabase
    .from("project_preorders")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("current_status", "committed")
    .limit(10000);

  if (!preorders || preorders.length === 0) return;

  const safeTitle = projectTitle.slice(0, 200);
  const body = premiereDate
    ? `"${safeTitle}" has been delivered! Premiere on ${premiereDate}.`
    : `"${safeTitle}" has been delivered! Watch it now.`;

  const notifications = preorders.map((p) => ({
    user_id: p.user_id,
    type: "film_delivered",
    title: "Film delivered!",
    body,
    link: `/project/${projectSlug}`,
    metadata: {},
  }));

  const BATCH_SIZE = 500;
  for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
    await supabase.from("notifications").insert(notifications.slice(i, i + BATCH_SIZE));
  }
}

/** Notify creator when their project fails to unlock */
export async function notifyCreatorFailedToUnlock(
  creatorId: string,
  projectTitle: string
) {
  return createNotification({
    userId: creatorId,
    type: "failed_to_unlock",
    title: "Campaign ended",
    body: `"${projectTitle}" did not reach its preorder target. All preorders have been refunded. You can edit and relaunch.`,
    link: "/dashboard",
  });
}

/** Notify creator when project is approved by admin */
export async function notifyCreatorProjectApproved(
  creatorId: string,
  projectTitle: string,
  projectSlug: string
) {
  return createNotification({
    userId: creatorId,
    type: "project_approved",
    title: "Project approved!",
    body: `"${projectTitle}" is now live. Share it with your audience to start collecting preorders.`,
    link: `/project/${projectSlug}`,
  });
}

/** Notify creator when project is rejected by admin */
export async function notifyCreatorProjectRejected(
  creatorId: string,
  projectTitle: string,
  reason: string
) {
  return createNotification({
    userId: creatorId,
    type: "project_rejected",
    title: "Project needs changes",
    body: `"${projectTitle}" was not approved: ${reason}`,
    link: "/dashboard",
  });
}
