import { requireLocalSeedEnvironment, newSeedPassword } from "./safety.mjs";
/**
 * Myriad Course Seeder
 *
 * Seeds mock courses with lessons directly into Supabase.
 * No video files needed — creates DB rows only (placeholders).
 *
 * Usage:  npx tsx seed/seed-courses.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

requireLocalSeedEnvironment();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Course Data ───────────────────────────────────────────────────────────────

interface CourseDefinition {
  creator: {
    display_name: string;
    username: string;
    email: string;
    password: string;
    bio: string;
  };
  course: {
    title: string;
    description: string;
    genre: string;
    tags: string[];
    pricing_model: string;
    cover_image_url: string | null;
    thumbnail_url: string | null;
  };
  lessons: {
    title: string;
    description: string;
    season_number: number;
    episode_number: number;
    lesson_notes: string | null;
    lesson_resources: { name: string; url: string; type?: string }[];
    pricing_model: string;
    is_premium: boolean;
  }[];
}

const COURSES: CourseDefinition[] = [
  {
    creator: {
      display_name: "Code Academy",
      username: "codeacademy",
      email: "codeacademy@example.test",
      password: newSeedPassword(),
      bio: "Learn to code from scratch. Full-stack web development courses for beginners to advanced developers.",
    },
    course: {
      title: "Web Development Fundamentals",
      description:
        "Master HTML, CSS, and JavaScript from zero to building your first web app. This course covers everything you need to start your web development journey — from structuring pages with HTML, styling with CSS, to adding interactivity with JavaScript.",
      genre: "documentary",
      tags: ["web-dev", "html", "css", "javascript", "beginner"],
      pricing_model: "free",
      cover_image_url: null,
      thumbnail_url: null,
    },
    lessons: [
      {
        title: "Introduction to HTML",
        description: "Learn the building blocks of the web. We'll cover HTML tags, document structure, and how browsers render pages.",
        season_number: 1,
        episode_number: 1,
        lesson_notes: "## Key Concepts\n\n- HTML stands for HyperText Markup Language\n- Every HTML page has `<html>`, `<head>`, and `<body>` tags\n- Tags can be nested inside each other\n- Use semantic tags like `<header>`, `<main>`, `<footer>` for better accessibility\n\n## Practice\nTry creating a simple page with a heading, paragraph, and an image.",
        lesson_resources: [
          { name: "MDN HTML Reference", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", type: "link" },
          { name: "Starter Template", url: "https://example.com/html-starter.zip", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "HTML Forms and Inputs",
        description: "Build interactive forms with text inputs, buttons, checkboxes, radio buttons, and dropdowns.",
        season_number: 1,
        episode_number: 2,
        lesson_notes: "## Form Elements\n\n- `<form>` wraps all form elements\n- `<input type=\"text\">` for text fields\n- `<textarea>` for multi-line text\n- `<select>` + `<option>` for dropdowns\n- `<button type=\"submit\">` to submit",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "CSS Basics — Selectors and Properties",
        description: "Style your pages with CSS. Learn selectors, the box model, colors, typography, and layout basics.",
        season_number: 1,
        episode_number: 3,
        lesson_notes: "## CSS Selectors\n\n- Element: `p { color: blue; }`\n- Class: `.highlight { background: yellow; }`\n- ID: `#header { font-size: 24px; }`\n- Descendant: `nav a { text-decoration: none; }`\n\n## Box Model\nEvery element is a box: content → padding → border → margin",
        lesson_resources: [
          { name: "CSS Cheat Sheet", url: "https://example.com/css-cheat-sheet.pdf", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Flexbox and Grid Layout",
        description: "Master modern CSS layout with Flexbox for 1D layouts and CSS Grid for 2D layouts.",
        season_number: 1,
        episode_number: 4,
        lesson_notes: "## Flexbox\n\n```css\n.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n}\n```\n\n## Grid\n\n```css\n.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}\n```",
        lesson_resources: [
          { name: "Flexbox Froggy Game", url: "https://flexboxfroggy.com", type: "link" },
          { name: "Grid Garden Game", url: "https://cssgridgarden.com", type: "link" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "JavaScript Fundamentals",
        description: "Variables, functions, conditionals, loops — the core building blocks of JavaScript programming.",
        season_number: 2,
        episode_number: 1,
        lesson_notes: "## Variables\n\n- `const` — can't reassign\n- `let` — can reassign\n- Never use `var`\n\n## Functions\n\n```js\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconst greet = (name) => `Hello, ${name}!`;\n```",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "DOM Manipulation",
        description: "Learn to dynamically update web pages using JavaScript DOM APIs.",
        season_number: 2,
        episode_number: 2,
        lesson_notes: "## Key DOM Methods\n\n- `document.querySelector('.class')` — find element\n- `element.textContent = 'new text'` — change text\n- `element.classList.add('active')` — add class\n- `element.addEventListener('click', handler)` — listen for events",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Building Your First Web App",
        description: "Put it all together! Build a todo list app from scratch using HTML, CSS, and JavaScript.",
        season_number: 2,
        episode_number: 3,
        lesson_notes: "## Project: Todo App\n\n1. HTML structure — input + button + list\n2. CSS styling — clean, modern look\n3. JS logic — add, complete, delete todos\n4. Local storage — persist across page reloads",
        lesson_resources: [
          { name: "Finished Project Code", url: "https://example.com/todo-app.zip", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
  {
    creator: {
      display_name: "Design Lab",
      username: "designlab",
      email: "designlab@example.test",
      password: newSeedPassword(),
      bio: "UI/UX design courses for aspiring designers. From Figma basics to design systems and user research.",
    },
    course: {
      title: "UI/UX Design Masterclass",
      description:
        "Learn the complete UI/UX design process — from user research and wireframing to high-fidelity prototypes in Figma. This course covers design principles, color theory, typography, component design, and building a professional portfolio.",
      genre: "documentary",
      tags: ["design", "ui-ux", "figma", "prototyping"],
      pricing_model: "mixed",
      cover_image_url: null,
      thumbnail_url: null,
    },
    lessons: [
      {
        title: "What is UX Design?",
        description: "Understand the fundamentals of user experience design and why it matters for every digital product.",
        season_number: 1,
        episode_number: 1,
        lesson_notes: "## UX vs UI\n\n- **UX** = how it works (user flows, usability, accessibility)\n- **UI** = how it looks (visual design, layout, typography)\n- Both are essential — great products need both\n\n## The Design Process\n1. Research → 2. Define → 3. Ideate → 4. Prototype → 5. Test → 6. Iterate",
        lesson_resources: [
          { name: "UX Design Reading List", url: "https://example.com/ux-reading-list.pdf", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "User Research Methods",
        description: "Learn interviews, surveys, persona creation, and journey mapping to understand your users.",
        season_number: 1,
        episode_number: 2,
        lesson_notes: "## Research Methods\n\n- **User Interviews** — 1-on-1 conversations (5-8 users)\n- **Surveys** — quantitative data at scale\n- **Personas** — fictional user archetypes\n- **Journey Maps** — visualize user experience over time",
        lesson_resources: [
          { name: "Persona Template", url: "https://example.com/persona-template.fig", type: "download" },
          { name: "Interview Script Template", url: "https://example.com/interview-script.pdf", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Wireframing and Information Architecture",
        description: "Structure your designs with wireframes, sitemaps, and user flows before adding visual polish.",
        season_number: 1,
        episode_number: 3,
        lesson_notes: "## Wireframing Tips\n\n- Start low-fidelity (pen & paper or gray boxes)\n- Focus on layout and hierarchy, not colors\n- Include all interactive elements\n- Test with users before going high-fidelity",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Figma Basics",
        description: "Get up and running with Figma — frames, components, auto-layout, and collaboration features.",
        season_number: 2,
        episode_number: 1,
        lesson_notes: "## Figma Essentials\n\n- **Frames** — containers for your designs\n- **Components** — reusable elements (buttons, cards, etc.)\n- **Auto-layout** — responsive spacing and alignment\n- **Variants** — different states of a component (hover, active, disabled)",
        lesson_resources: [
          { name: "Figma Starter File", url: "https://example.com/figma-starter.fig", type: "download" },
        ],
        pricing_model: "subscription",
        is_premium: true,
      },
      {
        title: "Color Theory and Typography",
        description: "Choose the right colors and fonts for your designs. Build a cohesive visual identity.",
        season_number: 2,
        episode_number: 2,
        lesson_notes: "## Color\n\n- Use 60-30-10 rule (primary, secondary, accent)\n- Check contrast ratios for accessibility (WCAG AA: 4.5:1)\n- Tools: Coolors.co, Adobe Color\n\n## Typography\n\n- Limit to 2 font families\n- Set a type scale (e.g., 12, 14, 16, 20, 24, 32, 48)\n- Line height: 1.5 for body text",
        lesson_resources: [],
        pricing_model: "subscription",
        is_premium: true,
      },
      {
        title: "Building a Design System",
        description: "Create a scalable design system with tokens, components, patterns, and documentation.",
        season_number: 2,
        episode_number: 3,
        lesson_notes: "## Design System Layers\n\n1. **Tokens** — colors, spacing, typography scales\n2. **Atoms** — buttons, inputs, icons\n3. **Molecules** — search bars, cards, nav items\n4. **Organisms** — headers, forms, sidebars\n5. **Templates** — page layouts\n6. **Pages** — real content in templates",
        lesson_resources: [
          { name: "Design System Checklist", url: "https://example.com/ds-checklist.pdf", type: "download" },
        ],
        pricing_model: "subscription",
        is_premium: true,
      },
    ],
  },
  {
    creator: {
      display_name: "Photo Pro",
      username: "photopro",
      email: "photopro@example.test",
      password: newSeedPassword(),
      bio: "Professional photography and videography tutorials. From camera basics to advanced editing techniques.",
    },
    course: {
      title: "Photography for Beginners",
      description:
        "Pick up your camera and start shooting like a pro. This course covers camera settings, composition rules, lighting techniques, and post-processing in Lightroom. Perfect for anyone with a camera who wants to take better photos.",
      genre: "documentary",
      tags: ["photography", "camera", "lightroom", "composition", "beginner"],
      pricing_model: "free",
      cover_image_url: null,
      thumbnail_url: null,
    },
    lessons: [
      {
        title: "Understanding Your Camera",
        description: "Aperture, shutter speed, ISO — the exposure triangle explained simply.",
        season_number: 1,
        episode_number: 1,
        lesson_notes: "## The Exposure Triangle\n\n- **Aperture (f-stop)** — controls depth of field. Lower f-number = blurrier background\n- **Shutter Speed** — controls motion blur. Faster = freeze action\n- **ISO** — sensor sensitivity. Higher = brighter but more noise\n\nThese three work together. Changing one affects the others.",
        lesson_resources: [
          { name: "Exposure Cheat Sheet", url: "https://example.com/exposure-cheat-sheet.pdf", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Composition Rules",
        description: "Rule of thirds, leading lines, framing, symmetry — make your photos more compelling.",
        season_number: 1,
        episode_number: 2,
        lesson_notes: "## Composition Rules\n\n1. **Rule of Thirds** — place subjects at intersection points\n2. **Leading Lines** — roads, fences, rivers guide the eye\n3. **Framing** — use doorways, windows, branches as frames\n4. **Symmetry** — centered compositions for impact\n5. **Negative Space** — give your subject room to breathe",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Natural Light Photography",
        description: "Work with sunlight, golden hour, overcast skies, and window light for stunning results.",
        season_number: 1,
        episode_number: 3,
        lesson_notes: "## Best Natural Light\n\n- **Golden Hour** — 1 hour after sunrise / before sunset. Warm, soft light.\n- **Blue Hour** — 30 min before sunrise / after sunset. Cool, moody.\n- **Overcast** — nature's softbox. Even, flattering light.\n- **Avoid** — harsh midday sun (hard shadows, squinting subjects)",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Introduction to Lightroom",
        description: "Import, organize, and edit your photos with Adobe Lightroom's essential tools.",
        season_number: 2,
        episode_number: 1,
        lesson_notes: "## Lightroom Workflow\n\n1. Import → 2. Cull (pick your best shots) → 3. Edit → 4. Export\n\n## Key Editing Sliders\n- Exposure, Contrast, Highlights, Shadows\n- White Balance (temperature + tint)\n- Clarity, Vibrance, Saturation\n- Tone Curve for fine control",
        lesson_resources: [
          { name: "Free Lightroom Presets", url: "https://example.com/free-presets.zip", type: "download" },
        ],
        pricing_model: "free",
        is_premium: false,
      },
      {
        title: "Portrait Photography Tips",
        description: "Posing, backgrounds, and lens selection for flattering portraits.",
        season_number: 2,
        episode_number: 2,
        lesson_notes: "## Portrait Tips\n\n- Use 50mm-85mm lens for flattering compression\n- Shoot at f/1.8 to f/2.8 for background blur\n- Eyes should always be in focus\n- Natural poses: have subject do something (walk, lean, look away)\n- Catchlights in eyes make portraits pop",
        lesson_resources: [],
        pricing_model: "free",
        is_premium: false,
      },
    ],
  },
];

// ── Seeding Logic ─────────────────────────────────────────────────────────────

async function getOrCreateCreator(creator: CourseDefinition["creator"]): Promise<string> {
  // Check if already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", creator.username)
    .maybeSingle();

  if (existing) {
    console.log(`   ✅ Creator "${creator.display_name}" already exists (${existing.id})`);
    return existing.id;
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: creator.email,
    password: creator.password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const found = users?.users?.find((u) => u.email === creator.email);
      if (found) return found.id;
    }
    throw new Error(`Auth error: ${authError.message}`);
  }

  const userId = authData.user!.id;

  // Create profile
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    display_name: creator.display_name,
    username: creator.username,
    bio: creator.bio,
    is_creator: true,
    role: "creator",
  });

  if (profileError) throw new Error(`Profile error: ${profileError.message}`);

  console.log(`   ✅ Creator "${creator.display_name}" created (${userId})`);
  return userId;
}

async function seedCourse(def: CourseDefinition) {
  console.log(`\n📚 Seeding course: ${def.course.title}`);

  // 1. Get or create creator
  const creatorId = await getOrCreateCreator(def.creator);

  // 2. Check if course already exists
  const { data: existingCourse } = await supabase
    .from("series")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("title", def.course.title)
    .eq("series_type", "course")
    .maybeSingle();

  if (existingCourse) {
    console.log(`   ⏭️  Course already exists (${existingCourse.id}), skipping`);
    return;
  }

  // 3. Create the course (series with series_type='course')
  const { data: course, error: courseError } = await supabase
    .from("series")
    .insert({
      creator_id: creatorId,
      title: def.course.title,
      description: def.course.description,
      genre: def.course.genre,
      tags: def.course.tags,
      pricing_model: def.course.pricing_model,
      series_type: "course",
      cover_image_url: def.course.cover_image_url,
      thumbnail_url: def.course.thumbnail_url,
      is_published: true,
      episode_count: def.lessons.length,
    })
    .select("id")
    .single();

  if (courseError) throw new Error(`Course error: ${courseError.message}`);
  console.log(`   ✅ Course created (${course.id})`);

  // 4. Create lessons
  for (const lesson of def.lessons) {
    const { error: lessonError } = await supabase.from("videos").insert({
      creator_id: creatorId,
      series_id: course.id,
      title: lesson.title,
      description: lesson.description,
      genre: def.course.genre,
      content_type: "episode",
      media_type: "course_lesson",
      season_number: lesson.season_number,
      episode_number: lesson.episode_number,
      lesson_notes: lesson.lesson_notes,
      lesson_resources: lesson.lesson_resources,
      pricing_model: lesson.pricing_model,
      is_premium: lesson.is_premium,
      price_cents: lesson.is_premium ? 0 : null,
      is_published: true,
      published_at: new Date().toISOString(),
      is_processed: true,
      tags: def.course.tags,
    });

    if (lessonError) {
      console.error(`   ❌ Lesson "${lesson.title}": ${lessonError.message}`);
    } else {
      console.log(`   ✅ Lesson ${lesson.season_number}.${lesson.episode_number}: ${lesson.title}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("📚 Myriad Course Seeder");
  console.log("========================\n");

  for (const courseDef of COURSES) {
    await seedCourse(courseDef);
  }

  console.log("\n========================");
  console.log("🎉 Course seeding complete!");
  console.log(`   ${COURSES.length} courses with ${COURSES.reduce((sum, c) => sum + c.lessons.length, 0)} total lessons`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
