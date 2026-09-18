import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SuccessPageProps {
  searchParams: Promise<{
    video_id?: string;
    creator_id?: string;
    creator_slug?: string;
    playlist_id?: string;
    type?: string;
  }>;
}

export const metadata = { title: "Payment Successful — Myriad" };

export default async function PaymentSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { video_id, creator_id, creator_slug, playlist_id, type } = await searchParams;

  const backUrl = video_id
    ? `/watch/${video_id}`
    : playlist_id
      ? `/playlists/${playlist_id}`
      : creator_slug
        ? `/creator/${creator_slug}`
        : creator_id
          ? `/creator/${creator_id}`
          : "/";

  const backLabel = video_id
    ? "Back to Video"
    : playlist_id
      ? "Back to Playlist"
      : creator_slug || creator_id
        ? "Back to Creator"
        : "Go Home";

  const description = video_id
    ? "You now have full access to this video."
    : playlist_id
      ? "You now have access to this playlist."
      : type === "tip"
        ? "Your tip has been sent. Thank you for supporting this creator!"
        : "Your subscription is now active. Enjoy all premium content from this creator.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-page-secondary p-8 text-center space-y-5 shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15">
          <svg className="h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Payment Successful!</h1>
        <p className="text-sm text-text-secondary">{description}</p>
        <div className="pt-2">
          <Link href={backUrl}>
            <Button size="lg">{backLabel}</Button>
          </Link>
        </div>
        <Link
          href="/browse"
          className="inline-block text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
