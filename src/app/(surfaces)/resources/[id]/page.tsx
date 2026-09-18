import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceDetail } from "@/components/resources/resource-detail";
import { fetchResourceDetail, fetchResourceSummaries } from "@/lib/resources-server";

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ResourceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const resource = await fetchResourceDetail(id);
  if (!resource) {
    return {
      title: "Resource not found",
    };
  }

  return {
    title: resource.title,
    description: resource.description ?? undefined,
    alternates: {
      canonical: `/resources/${resource.id}`,
    },
  };
}

export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { id } = await params;
  const resource = await fetchResourceDetail(id);

  if (!resource) {
    notFound();
  }

  const allResources = await fetchResourceSummaries();
  const moreByCreator = allResources
    .filter((item) => item.id !== resource.id && item.user_id === resource.user_id)
    .slice(0, 3);
  const similarResources = allResources
    .filter(
      (item) =>
        item.id !== resource.id &&
        (item.category === resource.category || item.tags.some((tag) => resource.tags.includes(tag)))
    )
    .slice(0, 3);

  return (
    <ResourceDetail
      resource={resource}
      moreByCreator={moreByCreator}
      similarResources={similarResources}
    />
  );
}
