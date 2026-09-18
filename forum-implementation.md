# Forum — Implementation Instructions

## Overview

Add a community forum to Myriad Spring. Simple threaded posts with categories, markdown content, image/video uploads, and nested comments. Same markdown editor and renderer as Tutorials — reuse those components, don't rebuild.

Route: `/forum`

---

## Database

Run these migrations in Supabase SQL editor:

```sql
-- Forum posts
create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  body_markdown text not null,
  category text default 'general',
  tags text[] default '{}',
  like_count integer default 0,
  comment_count integer default 0,
  view_count integer default 0,
  is_pinned boolean default false,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_forum_posts_category on forum_posts(category);
create index idx_forum_posts_user on forum_posts(user_id);
create index idx_forum_posts_created on forum_posts(created_at desc);

-- Forum comments (threaded — one level of replies via parent_id)
create table forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references forum_comments(id) on delete cascade,
  body_markdown text not null,
  like_count integer default 0,
  created_at timestamptz default now()
);

create index idx_forum_comments_post on forum_comments(post_id);
create index idx_forum_comments_parent on forum_comments(parent_id);

-- Forum post likes
create table forum_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references forum_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

-- Forum comment likes
create table forum_comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references forum_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- RLS policies
alter table forum_posts enable row level security;
alter table forum_comments enable row level security;
alter table forum_post_likes enable row level security;
alter table forum_comment_likes enable row level security;

-- Anyone can read published posts
create policy "Public can view published forum posts"
  on forum_posts for select using (is_published = true);

-- Authenticated users can create posts
create policy "Auth users can create forum posts"
  on forum_posts for insert with check (auth.uid() = user_id);

-- Owners can update their posts
create policy "Users can update own forum posts"
  on forum_posts for update using (auth.uid() = user_id);

-- Owners can delete their posts
create policy "Users can delete own forum posts"
  on forum_posts for delete using (auth.uid() = user_id);

-- Anyone can read comments
create policy "Public can view forum comments"
  on forum_comments for select using (true);

-- Authenticated users can comment
create policy "Auth users can create forum comments"
  on forum_comments for insert with check (auth.uid() = user_id);

-- Owners can delete their comments
create policy "Users can delete own forum comments"
  on forum_comments for delete using (auth.uid() = user_id);

-- Like policies
create policy "Public can view forum post likes"
  on forum_post_likes for select using (true);

create policy "Auth users can like forum posts"
  on forum_post_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike forum posts"
  on forum_post_likes for delete using (auth.uid() = user_id);

create policy "Public can view forum comment likes"
  on forum_comment_likes for select using (true);

create policy "Auth users can like forum comments"
  on forum_comment_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike forum comments"
  on forum_comment_likes for delete using (auth.uid() = user_id);
```

---

## Categories

Hardcode these for now (can move to a table later if needed):

```typescript
export const FORUM_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "feedback", label: "Feedback" },
  { value: "help", label: "Help" },
  { value: "workflow", label: "Workflow" },
  { value: "off_topic", label: "Off-topic" },
  { value: "announcements", label: "Announcements" },
] as const;
```

"Announcements" should only be creatable by admin users.

---

## File Structure

```
src/
  app/
    (viewer)/
      forum/
        page.tsx                        → browse page (server component)
        new/
          page.tsx                      → create new post
        [id]/
          page.tsx                      → post detail page
  components/
    forum/
      forum-post-list.tsx               → list of post cards
      forum-post-card.tsx               → individual post row
      forum-sidebar.tsx                 → category filter sidebar
      forum-detail.tsx                  → full post view
      forum-comments.tsx                → threaded comment list
      forum-comment.tsx                 → single comment with reply button
      forum-comment-form.tsx            → comment input form
      forum-post-editor.tsx             → create/edit post form
  lib/
    forum.ts                            → types, helpers, fetch functions
  app/
    api/
      forum/
        route.ts                        → GET (list) + POST (create)
        [id]/
          route.ts                      → GET (detail) + PATCH (update) + DELETE
          like/
            route.ts                    → POST (toggle like)
          comments/
            route.ts                    → GET (list) + POST (create)
            [commentId]/
              like/
                route.ts               → POST (toggle comment like)
```

---

## Browse Page (`/forum`)

### Layout
Left sidebar (category filters) + main list. Same sidebar pattern as Resources and Toolkit.

### Sidebar
- Category list with counts per category
- "All" selected by default
- Sort options: Latest (default), Popular (most comments), Most liked

### Post list
List view — NOT grid. Each post is a horizontal row:

```
┌─────────────────────────────────────────────────────────────┐
│  📌 Welcome to the Myriad Spring Community                  │
│  @admin · Announcements · pinned · 45 replies · 2w ago      │
├─────────────────────────────────────────────────────────────┤
│  Best settings for action scenes in Seedance 2?             │
│  @dricus · Help · 12 replies · 3h ago                       │
├─────────────────────────────────────────────────────────────┤
│  My first AI short — would love feedback                    │
│  @maya · Feedback · 8 replies · 5h ago                      │
├─────────────────────────────────────────────────────────────┤
│  Kling 2.2 dropped — first impressions                      │
│  @sean · General · 23 replies · 8h ago                      │
└─────────────────────────────────────────────────────────────┘
```

Each row shows:
- Post title (link to detail page)
- Author avatar (small, 20px) + username
- Category pill
- Reply count
- Time ago (relative)
- Pinned indicator (if is_pinned = true, always at top)
- Like count (small, secondary)

Pinned posts always appear first regardless of sort.

"New post" button in top-right of the main area. Requires auth.

### Pagination
Infinite scroll or "Load more" button. Offset-based. 20 posts per page.

---

## Post Detail Page (`/forum/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Forum                                            │
│                                                             │
│  Best settings for action scenes in Seedance 2?             │
│                                                             │
│  @dricus · Help · 3 hours ago · 👁 234                      │
│  [♥ Like (18)]  [Share]                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  (markdown body rendered here — same renderer as tutorials) │
│                                                             │
│  I've been trying to get clean action scenes in Seedance    │
│  but they keep coming out jittery. Here's what I've tried:  │
│                                                             │
│  ```                                                         │
│  Two warriors clash swords, fast motion, dynamic camera...  │
│  ```                                                         │
│                                                             │
│  [screenshot of bad result]                                  │
│                                                             │
│  Any tips? Should I slow down the camera movement?           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  12 replies                                                  │
│                                                             │
│  @jake · 2h ago                                ♥ 7          │
│  The trick is to never combine fast camera + fast action.    │
│  Keep the camera slow or static, let the action be fast.     │
│                                                             │
│    @maya · 1h ago (reply)                      ♥ 3          │
│    This. Also add "steady tracking shot" to force the        │
│    camera to stay smooth.                                    │
│                                                             │
│    @dricus · 45m ago (reply)                   ♥ 1          │
│    That worked! Thanks both.                                 │
│                                                             │
│  @sean · 1h ago                                ♥ 4          │
│  Also try splitting your action into 5s clips instead of     │
│  15s. Shorter duration = cleaner motion.                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Write a reply...]                              [Post]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Post content
- Title (h1)
- Author avatar + username + category pill + time ago + view count
- Like button with count
- Body rendered as markdown (use the same markdown renderer component from Tutorials — `react-markdown` + `remark-gfm` + code block copy button + image rendering)
- Increment `view_count` on page load (debounced, one per user per session)

### Comments
- Flat list of top-level comments (parent_id = null)
- Each comment has a "Reply" button
- Clicking Reply shows a reply form inline below that comment
- Replies (parent_id = comment_id) render indented below their parent
- Only ONE level of nesting — replies to replies don't nest further, they just appear in the same indented block
- Each comment shows: author avatar + username, time ago, markdown body (rendered), like button with count
- Reply form: small textarea + Post button

### Comment form at bottom
- Textarea with same markdown support (but simpler — no toolbar needed, just raw markdown)
- Post button
- Auth required — show "Sign in to comment" if not logged in

---

## Create Post Page (`/forum/new`)

Auth required. Simple form:

```
┌─────────────────────────────────────────────────────────────┐
│  New Forum Post                                [Post]       │
│                                                             │
│  Title *                                                     │
│  [                                                       ]   │
│                                                             │
│  Category *                                                  │
│  [General ▼]                                                 │
│                                                             │
│  Tags (optional)                                             │
│  [seedance] [action] [+ add tag]                             │
│                                                             │
│  Body *                                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [B] [I] [Link] [Image] [Video] [Code]               │   │
│  │                                                      │   │
│  │  (markdown editor — same component as Tutorials)     │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Reuse the markdown editor component from Tutorials. Same toolbar, same image upload to Bunny CDN, same video upload, same code block insertion.

Tags: freeform text input. Press Enter or comma to add a tag. Click X to remove.

---

## API Routes

### GET `/api/forum`

List posts with filters and pagination.

Query params:
- `category` — filter by category
- `tag` — filter by tag
- `sort` — "latest" (default, created_at desc), "popular" (comment_count desc), "liked" (like_count desc)
- `q` — search title and body
- `offset` — pagination offset (default 0)
- `limit` — page size (default 20)

Response:
```json
{
  "posts": [
    {
      "id": "uuid",
      "title": "Best settings for action scenes?",
      "category": "help",
      "tags": ["seedance", "action"],
      "user": {
        "id": "uuid",
        "username": "dricus",
        "avatar_url": "..."
      },
      "like_count": 18,
      "comment_count": 12,
      "view_count": 234,
      "is_pinned": false,
      "created_at": "2026-04-05T..."
    }
  ],
  "total": 214,
  "hasMore": true
}
```

Join on `profiles` table to get username and avatar_url. Same pattern as other list endpoints on the platform.

### POST `/api/forum`

Create a new post. Auth required.

Request body:
```json
{
  "title": "Best settings for action scenes?",
  "body_markdown": "I've been trying to get clean action...",
  "category": "help",
  "tags": ["seedance", "action"]
}
```

Validate: title required, body required, category must be valid. If category is "announcements", check if user is admin.

### GET `/api/forum/[id]`

Get full post with author profile. Increment view_count.

Response:
```json
{
  "post": {
    "id": "uuid",
    "title": "...",
    "body_markdown": "...",
    "category": "help",
    "tags": ["seedance", "action"],
    "user": { "id": "...", "username": "dricus", "avatar_url": "..." },
    "like_count": 18,
    "comment_count": 12,
    "view_count": 235,
    "is_pinned": false,
    "is_liked": true,
    "created_at": "..."
  }
}
```

`is_liked` — check if the current authenticated user has liked this post. If not authenticated, always false.

### PATCH `/api/forum/[id]`

Update post. Owner only.

Body: `{ title?, body_markdown?, category?, tags? }`

### DELETE `/api/forum/[id]`

Delete post. Owner only. Cascades to comments and likes.

### POST `/api/forum/[id]/like`

Toggle like. Auth required. If already liked, unlike (delete the like row). If not liked, like (insert). Return new like_count.

Also update `forum_posts.like_count` (increment or decrement).

### GET `/api/forum/[id]/comments`

List comments for a post. Return threaded structure.

Response:
```json
{
  "comments": [
    {
      "id": "uuid",
      "body_markdown": "The trick is to never combine...",
      "user": { "id": "...", "username": "jake", "avatar_url": "..." },
      "like_count": 7,
      "is_liked": false,
      "created_at": "...",
      "parent_id": null,
      "replies": [
        {
          "id": "uuid",
          "body_markdown": "This. Also add steady tracking...",
          "user": { "username": "maya", "avatar_url": "..." },
          "like_count": 3,
          "is_liked": false,
          "created_at": "...",
          "parent_id": "parent-uuid"
        }
      ]
    }
  ]
}
```

Fetch all comments for the post. Group replies under their parent in application code:
1. Query all comments for the post ordered by created_at asc
2. Separate into top-level (parent_id = null) and replies (parent_id != null)
3. Attach replies to their parent comment as a `replies` array
4. Return the nested structure

### POST `/api/forum/[id]/comments`

Create a comment. Auth required.

Body:
```json
{
  "body_markdown": "The trick is to never combine fast camera...",
  "parent_id": null
}
```

If `parent_id` is provided, it's a reply. If null, it's a top-level comment.

After inserting, increment `forum_posts.comment_count`.

### POST `/api/forum/[id]/comments/[commentId]/like`

Toggle comment like. Same pattern as post likes.

---

## Nav Integration

Add Forum to the main nav:

```
Projects → Watch → Launchpad → Resources → Forum → Forge
```

Or if too many tabs, group community features:

```
Projects → Watch → Launchpad → Community → Forge
                                    ↓
                              [Resources]
                              [Forum]
                              [Tutorials]
```

Up to you which approach — either works. The flat nav is simpler to implement.

---

## Shared Components

Reuse from Tutorials — do NOT rebuild these:

1. **Markdown editor** — same toolbar (bold, italic, link, image upload, video upload, code block), same Bunny CDN upload flow
2. **Markdown renderer** — same `react-markdown` setup with `remark-gfm`, code block copy button, image rendering, video rendering
3. **Comment component** — if Tutorials already has comments, reuse the same comment UI. If not, build it once for Forum and reuse for Tutorials and Resources.

---

## Types

```typescript
// src/lib/forum.ts

export interface ForumPost {
  id: string;
  title: string;
  body_markdown: string;
  category: string;
  tags: string[];
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumComment {
  id: string;
  body_markdown: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  like_count: number;
  is_liked: boolean;
  parent_id: string | null;
  replies: ForumComment[];
  created_at: string;
}

export const FORUM_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "feedback", label: "Feedback" },
  { value: "help", label: "Help" },
  { value: "workflow", label: "Workflow" },
  { value: "off_topic", label: "Off-topic" },
  { value: "announcements", label: "Announcements" },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]["value"];
```

---

## Build Order

1. Database migrations (run SQL above)
2. Types and helpers in `src/lib/forum.ts`
3. API: GET `/api/forum` — list posts with filters
4. API: POST `/api/forum` — create post
5. Browse page: sidebar + post list
6. Create post page: reuse markdown editor from Tutorials
7. API: GET `/api/forum/[id]` — post detail
8. Detail page: render post + markdown body
9. API: GET + POST `/api/forum/[id]/comments` — threaded comments
10. Comment list + comment form on detail page
11. API: POST `/api/forum/[id]/like` — like toggle
12. Like button on posts and comments
13. Search (add `q` param to list endpoint, search title + body)
14. View count increment on detail page load
15. Pin functionality (admin only, is_pinned flag)
16. Nav integration — add Forum tab

---

## Seed Posts

After deploying, create these posts manually to seed the forum:

1. **"Welcome to the Myriad Spring Community"** — pinned, Announcements. Introduce the forum, set expectations, link to other sections.
2. **"What are you working on?"** — General. Open thread for people to share their current projects.
3. **"Share your Seedance 2 workflow"** — Workflow. Get people sharing their pipelines.
4. **"Favorite tools and resources?"** — General. Discussion starter about what tools people use.
5. **"Feedback request template"** — Feedback. A model post showing how to ask for feedback (include a clip, describe what you're going for, ask specific questions).
