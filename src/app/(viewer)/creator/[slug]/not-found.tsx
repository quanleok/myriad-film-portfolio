import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreatorNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl text-text-tertiary">@</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">Creator not found</h1>
      <p className="mt-2 max-w-md text-sm text-text-tertiary">
        This creator profile doesn&apos;t exist or may have been removed.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/browse">
          <Button>Browse content</Button>
        </Link>
      </div>
    </div>
  );
}
