import { notFound } from "next/navigation";
import { ForumDetail } from "@/components/forum/forum-detail";
import { fetchForumPostDetail, fetchForumPostSummaries } from "@/lib/forum-server";

export default async function ForumPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await fetchForumPostDetail(id);
  if (!post) {
    notFound();
  }

  const posts = await fetchForumPostSummaries();
  const similarPosts = posts
    .filter((item) => item.id !== post.id && (item.category === post.category || item.user_id === post.user_id))
    .slice(0, 3);

  return <ForumDetail post={post} similarPosts={similarPosts} />;
}
