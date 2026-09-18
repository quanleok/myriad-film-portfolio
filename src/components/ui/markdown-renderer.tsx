"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}

export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-invert max-w-none prose-headings:font-display prose-headings:tracking-[-0.04em] prose-p:text-sm prose-p:leading-7 prose-p:text-text-secondary prose-strong:text-text-primary prose-a:text-brand-300 prose-a:no-underline hover:prose-a:text-brand-200 prose-code:rounded prose-code:bg-white/6 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.9em] prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/30 prose-blockquote:border-l-brand-500 prose-blockquote:text-text-secondary prose-li:text-text-secondary",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (!href) return <span>{children}</span>;
            if (isVideoUrl(href)) {
              return (
                <span className="my-5 block overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/20">
                  <video src={href} controls className="w-full" />
                </span>
              );
            }

            const external = href.startsWith("http");
            if (!external) {
              return <Link href={href}>{children}</Link>;
            }

            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src ?? ""}
              alt={alt ?? ""}
              className="my-5 rounded-[1.2rem] border border-white/10 bg-black/20"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
