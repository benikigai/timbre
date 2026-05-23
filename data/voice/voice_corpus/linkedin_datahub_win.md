---
source: linkedin.com/posts/benjaminshyong_won-first-place-at-the-datahub-hackathon-activity-7448613286478114816
type: long_form_post
date: 2026-04-11
---

# Won first place at the DataHub Hackathon in SF tonight

Data has become my biggest obsession lately both in the production systems I run across my short-term rental portfolio and in the software I'm building. An agent's capability is rooted in the power of its data. Proper schema. Verified. Validated. Accurate.

Elias, my personal OpenClaw agent, has been teaching me how fragile long-horizon memory and recall really are when data moves across disparate systems and databases.

The problem I brought into this hackathon was one I'd been stuck on for weeks. Elias had been telling guests that one of my properties had a hot tub. It doesn't. And I couldn't find where the hallucination came from. It had propagated across every layer of his memory — LanceDB, Postgres, Qdrant, Gemini 2 multimodal embeddings — and I had no source of truth, no traceability, no way to root-cause it, prevent it, or wipe it clean.

A critical data lineage problem, and I didn't have the key to solve it until I started learning DataHub.

## What DataHub gave me

A Metadata catalog where every table, column, dashboard, and quality assertion is a first-class entity with a unique URN. A lineage graph you can walk upstream and downstream links across every data propagation. Assertions as first-class metadata. Quality checks stored next to the data they check, queryable the same way. Python SDK for writes. And a GraphQL API for reads.

## What I built on top of it

Data-OnCall, a 4-agent incident response team.

- **Coordinator** (Kimi-K2-Thinking) — long-horizon planner with visible reasoning traces
- **Detective** (Llama 3.1 8B + LoRA) — lineage tracer via NL→GraphQL
- **Reality-Checker** (same fine-tune, different system prompt)
- **Fixer** (MiniMax-M2.5) — writes the postmortem back to the catalog via Python SDK

When paged with a natural language incident, the agents identify affected dataset, trace lineage, diff quality assertions across two parallel DataHub instances, and write the postmortem back to the catalog as annotations visible in the live UI.

End-to-end in 54.8 seconds at ~2 cents per run. Found three planted bugs by exact row count: 5,632 truncated seller IDs, 7,955 deleted customers, 988 NULL categories.

## What I'm most proud of

I fine-tuned my first LLM model. Llama 3.1 8B with a LoRA on 300 synthetic NL→GraphQL pairs targeting narrow DataHub query patterns. Validation loss dropped 34% over 3 epochs, monotonic, no overfitting.

I went in wanting to learn a tool. I came out with a system that points directly at the problem I've been losing sleep over in my own stack.

Solve your own problem — it's almost always someone else's problem too.

Thanks to DataHub, Nebius, and Entrepreneurs First SF for the venue, the challenge, and the judging. And to everyone who came up after to talk shop and nerd out on data and your own OpenClaw builds, that was the best part!!
