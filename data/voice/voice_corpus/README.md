# voice_corpus

Place the founder's authentic writing here as markdown files. Each file should be one published post.

## Selection criteria

- **Recent.** Last 18 months. Older posts may not reflect current voice.
- **Distinctive.** Pick the posts where the founder's voice is most obvious — the ones where readers would say "yeah, that sounds like them."
- **Technical, not aspirational.** Skip "vision" posts; keep the ones with code, benchmarks, specifics.
- **Range of lengths.** A mix of short (500w) and long (2500w+) helps the model generalize.

## Target count

4–6 posts is the sweet spot. More than 10 dilutes the signal; fewer than 3 doesn't generalize.

## Format

Plain markdown. No frontmatter required, but if present, only `title` and `date` are used.

```markdown
---
title: How we cut Postgres replication lag from 800ms to 40ms
date: 2026-03-12
---

# How we cut Postgres replication lag from 800ms to 40ms

...
```

## How Scout uses these

The `topic_scoring` skill consults `voice_profile`, which reads 2–3 random files from this directory per tick to compute `voice_fit`. The downstream Writer + Voice agents in the Timbre pipeline also pass these as `document` input to ground their drafts.

**Privacy note:** this repo is currently private. If it's made public, anything here is published with it. Don't add drafts.
