"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";

function flattenChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";
  if (Array.isArray(children)) {
    return children.map(flattenChildren).join("");
  }
  if (
    typeof children === "object" &&
    "props" in (children as unknown as { props?: { children?: ReactNode } })
  ) {
    return flattenChildren(
      (children as unknown as { props?: { children?: ReactNode } }).props?.children
    );
  }
  return "";
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="absolute right-2 top-2 h-8 rounded-md border border-white/10 bg-black/30 px-2.5 text-xs font-medium text-text-secondary hover:bg-black/45 hover:text-text-primary"
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src) return null;

  if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) {
    return (
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        className="my-5 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/35 shadow-[0_18px_40px_rgba(0,0,0,0.26)]"
      />
    );
  }

  return (
    <span className="my-5 block overflow-hidden rounded-2xl border border-white/10 bg-black/20 shadow-[0_18px_40px_rgba(0,0,0,0.2)]">
      <Image
        src={src}
        alt={alt ?? ""}
        width={1600}
        height={900}
        className="h-auto w-full object-cover"
        unoptimized
      />
    </span>
  );
}

export function TutorialMarkdown({
  markdown,
  className = "",
}: {
  markdown: string;
  className?: string;
}) {
  return (
    <div className={`tutorial-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em] text-text-primary first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-7 text-xl font-semibold tracking-[-0.03em] text-text-primary">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-4 text-[15px] leading-7 text-text-secondary first:mt-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-text-secondary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-text-secondary">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-5 rounded-r-2xl border-l-2 border-brand-500/70 bg-brand-500/8 px-5 py-4 text-[15px] leading-7 text-text-primary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-white/10" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("/") ? undefined : "_blank"}
              rel={href?.startsWith("/") ? undefined : "noreferrer"}
              className="font-medium text-brand-300 underline decoration-brand-500/40 underline-offset-4 transition-colors hover:text-brand-200"
            >
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === "string" ? <MarkdownImage src={src} alt={alt} /> : null,
          code: ({ className: codeClassName, children, ...props }: any) => {
            const code = flattenChildren(children).replace(/\n$/, "");
            const isInline = !codeClassName;

            if (isInline) {
              return (
                <code
                  className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[13px] text-brand-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#09100d] shadow-[0_16px_32px_rgba(0,0,0,0.26)]">
                <CopyCodeButton code={code} />
                <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-6 text-[#d8f9ec]">
                  <code className={codeClassName} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
