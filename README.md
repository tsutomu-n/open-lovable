# Open Lovable

Build React apps from a website, a search query, or an existing brand with AI. This repository contains the local Next.js app used to scrape, clone, and iteratively edit UIs inside a sandboxed environment.

Built by the [Firecrawl](https://firecrawl.dev/?ref=open-lovable-github) team. If you want the hosted product experience, see [Lovable.dev](https://lovable.dev/).

<img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZtaHFleGRsMTNlaWNydGdianI4NGQ4dHhyZjB0d2VkcjRyeXBucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZFVLWMa6dVskQX0qu1/giphy.gif" alt="Open Lovable Demo" width="100%"/>

## What You Can Do

- Clone an existing site from a URL into a sandboxed React app.
- Search the web for inspiration, inspect candidate pages, then generate from a selected result.
- Extract brand styles from a site and generate new UI that follows those styles.
- Keep editing the generated app through the generation flow, with optional fast apply support.

## Stack

- Next.js 15 + React 19
- Firecrawl for search, scraping, screenshots, and brand extraction
- AI SDK model routing through Vercel AI Gateway or direct provider keys
- E2B or Vercel Sandbox for code execution
- Optional Morph fast apply for edit mode

## Quick Start

### 1. Install dependencies

```bash
git clone https://github.com/firecrawl/open-lovable.git
cd open-lovable
pnpm install
```

`npm install` and `yarn install` also work, but the repository is primarily set up around `pnpm`.

### 2. Create your local env file

```bash
cp .env.example .env.local
```

### 3. Configure the required services

You always need:

- `FIRECRAWL_API_KEY`

You then need one AI access path:

- `AI_GATEWAY_API_KEY` for Vercel AI Gateway, or
- one or more direct provider keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GROQ_API_KEY`

You also need one sandbox provider:

- `E2B_API_KEY` for E2B, or
- `VERCEL_OIDC_TOKEN`, or `VERCEL_TOKEN` + `VERCEL_TEAM_ID` + `VERCEL_PROJECT_ID` for Vercel Sandbox

Optional:

- `MORPH_API_KEY` to enable fast apply during edit flows

Direct provider keys take precedence over `AI_GATEWAY_API_KEY`. If `SANDBOX_PROVIDER` is omitted, the app auto-selects the first configured provider in this order:

1. `e2b`
2. `vercel`

### 4. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Reference

```env
# =================================================================
# REQUIRED
# =================================================================
FIRECRAWL_API_KEY=your_firecrawl_api_key

# =================================================================
# AI MODEL ACCESS - Choose ONE approach
# =================================================================
# Option A: Vercel AI Gateway
AI_GATEWAY_API_KEY=your_ai_gateway_api_key

# Option B: Direct provider keys
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key

# =================================================================
# SANDBOX PROVIDER - Choose ONE
# =================================================================
SANDBOX_PROVIDER=e2b
E2B_API_KEY=your_e2b_api_key

# Or use Vercel Sandbox
# SANDBOX_PROVIDER=vercel
# VERCEL_OIDC_TOKEN=auto_generated_by_vercel_env_pull
# VERCEL_TEAM_ID=your_team_id
# VERCEL_PROJECT_ID=your_project_id
# VERCEL_TOKEN=your_access_token

# =================================================================
# OPTIONAL - FAST APPLY DURING EDITS
# =================================================================
# MORPH_API_KEY=your_morphllm_api_key
```

## Minimum Working Local Config

If your goal is simply to clone a live website locally with the default recommended model:

```env
FIRECRAWL_API_KEY=your_firecrawl_api_key
GEMINI_API_KEY=your_gemini_api_key
E2B_API_KEY=your_e2b_api_key
SANDBOX_PROVIDER=e2b
```

Expected behavior:

- `GET /api/ai-models` returns `defaultModel: "google/gemini-2.5-pro"`
- the home page auto-selects `Gemini 2.5 Pro`
- entering a URL transitions to `/generation`
- sandbox creation, scraping, and generation start without extra setup

## Usage

### Clone a site from a URL

1. Open `/`
2. Enter a website URL
3. Confirm an AI model is selected
4. Click `Scrape Site`
5. Wait for sandbox creation, scraping, and code generation

### Start from a search query

1. Open `/`
2. Enter a search phrase instead of a URL
3. Click `Search`
4. Pick one of the returned results
5. The app forwards the selected page into the generation flow

### Extend an existing brand

1. Open `/`
2. Enter a website URL
3. Enable `Extend brand styles`
4. Describe what you want to build using that brand
5. Start generation to extract branding data and build against it

## AI Models

The app uses a curated model catalog and only exposes models that are usable with the current credentials.

- `google/gemini-2.5-pro`
- `openai/gpt-4.1`
- `anthropic/claude-4-sonnet`
- `moonshotai/kimi-k2`

Behavior:

- Gateway mode enables the full curated catalog through `AI_GATEWAY_API_KEY`
- Direct mode only enables models whose provider keys are configured
- If both gateway and direct keys exist, direct mode wins
- The preferred default is `google/gemini-2.5-pro`, and the app falls back to the first enabled model when that model is unavailable

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm test:api
pnpm test:code
pnpm test:all
```

## Notes

- Search, scraping, and brand extraction all depend on Firecrawl, so `FIRECRAWL_API_KEY` is required even if the rest of your stack is configured correctly.
- Generation is disabled until at least one AI model is available.
- Sandbox creation fails fast when the selected provider is configured but missing the credentials that provider requires.

## License

MIT
