# Open Lovable

Chat with AI to build React apps instantly. An example app made by the [Firecrawl](https://firecrawl.dev/?ref=open-lovable-github) team. For a complete cloud solution, check out [Lovable.dev](https://lovable.dev/) ❤️.

<img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmZtaHFleGRsMTNlaWNydGdianI4NGQ4dHhyZjB0d2VkcjRyeXBucCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ZFVLWMa6dVskQX0qu1/giphy.gif" alt="Open Lovable Demo" width="100%"/>

## Setup

1. **Clone & Install**
```bash
git clone https://github.com/firecrawl/open-lovable.git
cd open-lovable
pnpm install  # or npm install / yarn install
```

2. **Add `.env.local`**

Fastest path for local website cloning:
- `SANDBOX_PROVIDER=e2b`
- `E2B_API_KEY`
- `FIRECRAWL_API_KEY`
- `GEMINI_API_KEY`

If `SANDBOX_PROVIDER` is omitted, the app now auto-selects the first available sandbox provider:
1. `e2b` when `E2B_API_KEY` is present
2. `vercel` when Vercel sandbox credentials are present

```env
# =================================================================
# REQUIRED
# =================================================================
FIRECRAWL_API_KEY=your_firecrawl_api_key    # https://firecrawl.dev

# =================================================================
# AI MODEL ACCESS - Choose ONE approach
# =================================================================
# Option A: Vercel AI Gateway (recommended)
AI_GATEWAY_API_KEY=your_ai_gateway_api_key  # https://vercel.com/docs/ai-gateway

# Option B: Direct provider keys
GEMINI_API_KEY=your_gemini_api_key          # https://aistudio.google.com/app/apikey
ANTHROPIC_API_KEY=your_anthropic_api_key    # https://console.anthropic.com
OPENAI_API_KEY=your_openai_api_key          # https://platform.openai.com
GROQ_API_KEY=your_groq_api_key              # https://console.groq.com

# =================================================================
# FAST APPLY (Optional - for faster edits)
# =================================================================
MORPH_API_KEY=your_morphllm_api_key    # https://morphllm.com/dashboard

# =================================================================
# SANDBOX PROVIDER - Choose ONE: E2B (recommended for local) or Vercel
# =================================================================
SANDBOX_PROVIDER=e2b  # or 'vercel'

# Option 1: E2B Sandbox (recommended for local)
E2B_API_KEY=your_e2b_api_key              # https://e2b.dev

# Option 2: Vercel Sandbox
# Choose one authentication method:

# Method A: OIDC Token (recommended for development)
# Run `vercel link` then `vercel env pull` to get VERCEL_OIDC_TOKEN automatically
VERCEL_OIDC_TOKEN=auto_generated_by_vercel_env_pull

# Method B: Personal Access Token (for production or when OIDC unavailable)
# VERCEL_TEAM_ID=team_xxxxxxxxx      # Your Vercel team ID 
# VERCEL_PROJECT_ID=prj_xxxxxxxxx    # Your Vercel project ID
# VERCEL_TOKEN=vercel_xxxxxxxxxxxx   # Personal access token from Vercel dashboard

```

3. **Run**
```bash
pnpm dev  # or npm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000)

4. **Clone a website**
```text
1. Open /
2. Enter the target website URL
3. Confirm the AI model shows "Gemini 2.5 Pro"
4. Click "Scrape Site"
5. Wait for sandbox creation, scrape, and code generation
```

## AI Models

- The app uses a curated model catalog and only shows models that are usable in the current environment.
- Recommended default model: `google/gemini-2.5-pro`
- Gateway mode enables the curated catalog through `AI_GATEWAY_API_KEY`.
- Direct mode enables only the providers whose API keys are configured.

## Minimum Working Local Config

If the goal is simply "clone an existing website locally", use this:

```env
FIRECRAWL_API_KEY=your_firecrawl_api_key
GEMINI_API_KEY=your_gemini_api_key
E2B_API_KEY=your_e2b_api_key
SANDBOX_PROVIDER=e2b
```

Expected behavior:
- `GET /api/ai-models` returns `defaultModel: "google/gemini-2.5-pro"`
- the home page shows `Gemini 2.5 Pro`
- entering a URL transitions to `/generation`
- sandbox creation, scraping, and generation all start without extra setup

## License

MIT
