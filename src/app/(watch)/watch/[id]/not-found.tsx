import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VideoNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl text-text-tertiary">&#9654;</p>
      <h1 className="mt-4 text-xl font-bold text-text-primary">Video not found</h1>
      <p className="mt-2 max-w-md text-sm text-text-tertiary">
        This video may have been removed or is no longer available.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/browse">
          <Button>Browse content</Button>
        </Link>
      </div>
    </div>
  );
}
