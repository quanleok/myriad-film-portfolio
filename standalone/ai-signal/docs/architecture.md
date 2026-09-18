# AI Signal Architecture

## Product Thesis

AI Signal is an AI-only signal platform with category-first navigation, leaderboard-native discovery, and structured discussion. The core job is helping users answer:

- what is best right now?
- what changed today?
- where is the best conversation happening in this category?

## Core Surfaces

- `Home`: signal board with top movers, release alerts, ranked highlights, and hot threads
- `Leaderboard`: category leaderboards with movement, rationale, and lens switching
- `Categories`: separate topic rooms with their own ranking context and discussion stream
- `Trending`: cross-category velocity view for tools, posts, and people
- `People`: voice layer for critics, builders, and operators
- `Tool detail`: release history, discussion context, strengths, weaknesses, and ranking placement

## System Model

The standalone app uses an isolated `signal` Postgres schema so it can coexist with Myriad infra while staying product-separate.

Primary entities:

- categories
- tools
- tool releases
- leaderboard entries
- leaderboard snapshots
- posts
- post comments
- post reactions
- profiles
- follows
- trend events

## Ranking Strategy

Rankings are intentionally hybrid:

- editorial weighting for quality and consistency
- community signal for relevance and momentum
- trend velocity for movement
- release/update context for freshness

This avoids both extremes: purely manual rankings that feel stale, and purely democratic rankings that get gamed.

## Product Design Principles

- category identity must be obvious
- information density is acceptable if the hierarchy is strong
- the home surface should feel alive on first load
- structured posting beats generic free-floating social content
- trend and leaderboard movement should be legible without long explanations
