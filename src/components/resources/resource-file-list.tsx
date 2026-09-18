"use client";

import { ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize, resourceSupportsDownload, type ResourceDetail, type ResourceFileRecord } from "@/lib/resources";

interface ResourceFileListProps {
  resource: ResourceDetail;
  files: ResourceFileRecord[];
  onDownload: (file: ResourceFileRecord) => void;
  onDownloadAll: () => void;
}

export function ResourceFileList({
  resource,
  files,
  onDownload,
  onDownloadAll,
}: ResourceFileListProps) {
  return (
    <section className="rounded-[1.7rem] border border-white/8 bg-[rgba(12,14,20,0.9)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-tertiary">
            Files ({files.length})
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Download individual files or grab the whole pack for your local archive.
          </p>
        </div>
        <Button
          type="button"
          onClick={onDownloadAll}
          disabled={!resourceSupportsDownload(resource)}
          leftIcon={<ArrowDownToLine size={15} />}
        >
          Download all
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-black/14 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{file.file_name}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {(file.file_type ?? "file").toUpperCase()} · {formatFileSize(file.file_size_bytes)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!resourceSupportsDownload(resource)}
              onClick={() => onDownload(file)}
            >
              Download
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
