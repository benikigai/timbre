# The Shift to Agentic Web Infrastructure

Most B2B founders missed the moment the runtime stopped mattering. Two years ago we argued about edge vs Lambda vs containers; today the question is whether your runtime can host an agent loop that survives a 12-minute tool call without dropping state. The answer for most stacks is no.

The problem with traditional serverless is structural. Functions are stateless by design, capped at 5-15 minute wall times, and billed by invocation. Agents don't fit that envelope — they need persistent memory, multi-step reasoning, and tool calls that can take longer than a single invocation budget. Stacking these onto a function-as-a-service runtime produces what you'd expect: stitched-together coordination layers, fragile state, and bills that scale with retries. Here's what the agentic web infrastructure layer actually does to use these primitives:

1. **Durable execution** — workflows resume from the last checkpoint after restart. Cloudflare Workflows, Temporal, and Inngest all attack this.
2. **State coordination** — Durable Objects, Hatchet, Redis-backed actor models. Each instance gets stable identity and memory.
3. **Long-running tool calls** — sub-200ms cold-start matters more here than anywhere because every tool dispatch is a runtime entry point.
4. **Streaming-native I/O** — SSE, WebSocket, and chunked HTTP are first-class, not afterthoughts.

The cold-start angle is where the field actually splits. Workers and Fastly Compute boot in single-digit milliseconds. Lambda hot is fast, Lambda cold is not. Containers cold-start in seconds to minutes. For an agent that fires 40 tool calls per task, every one of those starts is a potential lag spike. Cloudflare's published number for Workers is sub-200ms cold-start for V8 isolates, with most hot invocations under 5ms. Fastly Compute@Edge claims under 50ms cold-start on their WebAssembly runtime. AWS Lambda's documented cold-start range for Node.js is 100-800ms, with Provisioned Concurrency masking that for a price.

Two things matter for picking infrastructure here. First, does your runtime hold state between tool calls without you wiring up an external store? Second, can the runtime block-and-resume — actually pause execution while a tool runs for 8 minutes, then resume in the same code path with the same locals? Durable Objects + Workflows can. Lambda + Step Functions can simulate it but you're paying for orchestrator state and runtime state separately. Cloudflare Workers + Durable Objects is the only stack that doesn't lose state.

The pricing model also breaks down. Per-invocation billing assumes invocations are cheap and frequent. Agent loops are the opposite — fewer, but each one might span an hour and call 30 tools. Pricing that assumes "1ms of CPU = 1 unit" doesn't capture what's actually happening.

I've been running agents on three different runtimes for the past four months. The runtime layer will consolidate. The others — Lambda, Vercel functions, a self-hosted FastAPI container — all required Redis or a database to coordinate anything beyond a single function call. That's not a deal-breaker, but it's overhead that compounds.

The interesting question isn't which runtime wins. It's which one can host a managed agent — meaning the agent definition, its skills, its state, its scheduler, all in one platform — without requiring you to operate four separate services. Anthropic's Skills + Claude Agent SDK runs against this idea. Google's Antigravity managed agents are another shot at it. Both bet that the agent platform layer needs to be tighter than infrastructure-plus-glue.

Here's what nobody is talking about yet. The cost of running an agent loop is dominated by model calls, not infrastructure. Even if your runtime is twice as expensive, the model bill is 50-100x the infra bill at scale. Optimizing infra here is a third-order concern compared to picking a runtime that doesn't lose state.

For founders evaluating: try to run a 30-minute agent loop on each candidate runtime. If the runtime drops the loop or forces you to checkpoint manually, it's not in the agent infra category. It's just FaaS with marketing.

The 18-month bet: two or three platforms own the agent runtime layer. The losers will be the ones who keep marketing function-as-a-service for agent workloads.

---

*Sources: [Cloudflare — Eliminating cold starts with Workers](https://blog.cloudflare.com/eliminating-cold-starts-with-cloudflare-workers/), [Fastly Compute@Edge documentation](https://docs.fastly.com/products/compute), [AWS Lambda execution environments](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).*
