# AI Signal

AI Signal is a standalone category-first AI product built around three things:

- live leaderboards for models and tools
- structured category feeds for high-signal discussion
- social interaction that stays attached to the right topic

This is not a generic AI news site and not a clone of X. The product thesis is simpler: make it easy to see what matters in AI right now, by category, without the chaos of a universal feed.

## Product Shape

- Home: live signal overview, movers, major releases, hot debates
- Leaderboard: ranked models and tools by category and lens
- Categories: separate rooms for reasoning, coding, video, image, agents, and news
- Trending: fastest-rising tools, conversations, and people
- People: category-native voices, reviewers, builders, and operators

## Included In This Scaffold

- Next.js 15 standalone app shell
- full visual product shell with sample data
- product model and ranking/trending helpers
- category, leaderboard, people, and tool pages
- API route contract stubs
- Supabase schema foundation under an isolated `signal` schema
- setup docs and milestone plan

## Local Setup

```bash
cd standalone/ai-signal
npm install
npm run dev
```

The package is intentionally isolated so it can later be moved into its own repository or coexist beside Myriad as a separate product.
