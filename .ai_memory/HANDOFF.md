---
handoff_version: 3
updated_at_jst: "2026-04-17 17:34:17 +0900"
workspace_root: "/home/tn/projects/open-lovable"
repo_present: true
branch: "main"
overall_status: in_progress
current_task: "Googleモデルを `gemini-flash-latest` / `gemini-pro-latest` 主軸へ切り替え、自動2段階クローン生成を実装する前段で停止。現行アプリは live でクローン成功済み。"
final_goal: "URLクローン時に `google/gemini-flash-latest` で高速な初回生成を行い、続けて `google/gemini-pro-latest` で高品質 refinement を自動適用する。"
recommended_model: gpt-5.4
portable: true
---

# 1. Executive Snapshot

- [CONFIRMED] 現在の `main` ブランチのワークツリーは clean。`git status --short --branch` は `## main...origin/main` のみ。
- [CONFIRMED] ローカル WebApp は起動中。`pnpm dev` / `next dev --turbopack` が動いており、`http://127.0.0.1:3000` は `200 OK`。
- [CONFIRMED] live の `GET /api/ai-models` は現在 `mode: "direct"`、`defaultModel: "google/gemini-2.5-pro"`。有効モデルは `google/gemini-2.5-pro`, `openai/gpt-4.1`, `anthropic/claude-4-sonnet`, `moonshotai/kimi-k2`。
- [CONFIRMED] `https://example.com` のクローンは end-to-end で成功。sandbox 作成、scrape、AI生成、`apply-ai-code-stream`、preview 表示まで確認済み。
- [CONFIRMED] `https://www.python.org` のクローンも end-to-end で成功。より情報量の多いサイトでも 7 files 適用と preview 表示を確認済み。
- [CONFIRMED] クローン品質改善として `CloneBrief` 構造化、Firecrawl failure → direct fetch fallback、screenshot 参照、deterministic + LLM review pass を実装済み。
- [CONFIRMED] Vercel sandbox の `invalidToken` 問題は `npx vercel env pull /tmp/open-lovable.vercel.env --yes` で `.env.local` の `VERCEL_OIDC_TOKEN` を更新して解消済み。
- [CONFIRMED] AI Gateway の `customer_verification_required` / credit-card 制限は、runtime を direct provider 優先にして回避済み。生成は live で direct Gemini に落ちて成功した。
- [CONFIRMED] 現ユーザー要求は「最高 = `gemini-pro-latest`、最速 = `gemini-flash-latest`、できれば flash で作って pro で整える」。この仕様は **まだ未実装** で、現時点では plan のみ。
- [CONFIRMED] 次の1手は、Google 2モデルを canonical catalog に入れ、URLクローン時だけ `flash-latest -> pro-latest` の自動2段階を実装すること。

# 2. Immediate Restart Actions

1. [CONFIRMED] 目的: Google 2モデルの canonical catalog と runtime 解決を実装する。 / 実行コマンド or 具体操作: `lib/ai/model-catalog.ts`, `lib/ai/model-runtime.ts`, `lib/ai/provider-manager.ts` を編集し、`google/gemini-flash-latest` と `google/gemini-pro-latest` を追加。alias-first + exact fallback 候補列を持たせる。 / 編集対象ファイル: `/home/tn/projects/open-lovable/lib/ai/model-catalog.ts`, `/home/tn/projects/open-lovable/lib/ai/model-runtime.ts`, `/home/tn/projects/open-lovable/lib/ai/provider-manager.ts` / 完了条件: `GET /api/ai-models` の default が `google/gemini-flash-latest` になり、Google 2モデルが selector の先頭に出る。
2. [CONFIRMED] 目的: URLクローン時だけ fast → quality の自動2段階生成を追加する。 / 実行コマンド or 具体操作: `app/generation/page.tsx` と `app/api/generate-ai-code-stream/route.ts` を編集し、Stage 1 に `google/gemini-flash-latest`、Stage 2 に `google/gemini-pro-latest` を送る。Stage 2 は refinement として既存 clone 結果を改善する。 / 編集対象ファイル: `/home/tn/projects/open-lovable/app/generation/page.tsx`, `/home/tn/projects/open-lovable/app/api/generate-ai-code-stream/route.ts` / 完了条件: URLクローン時に UI と backend ログで 2段階の生成が確認できる。
3. [CONFIRMED] 目的: latest alias が不安定な場合の fallback を固定する。 / 実行コマンド or 具体操作: Googleモデルの候補順を実装し、alias failure 時に preview exact ID へ落とす。fast 側は `google/gemini-3-flash-preview`、quality 側は `google/gemini-3.1-pro-preview` と `google/gemini-3-pro-preview` を候補にする。 / 編集対象ファイル: `/home/tn/projects/open-lovable/lib/ai/model-catalog.ts`, `/home/tn/projects/open-lovable/lib/ai/model-runtime.ts`, `/home/tn/projects/open-lovable/lib/ai/provider-manager.ts` / 完了条件: alias 不可でも clone flow が継続し、backend ログに fallback が出る。
4. [CONFIRMED] 目的: Google 2モデルを主役にしつつ他 provider を selector に残す UI を整える。 / 実行コマンド or 具体操作: `useAiModels()` / `/api/ai-models` 返却に priority/featured を追加し、selector 表示順を Google 2モデル優先に変更する。 / 編集対象ファイル: `/home/tn/projects/open-lovable/hooks/use-ai-models.ts`, `/home/tn/projects/open-lovable/app/api/ai-models/route.ts`, `/home/tn/projects/open-lovable/app/page.tsx`, `/home/tn/projects/open-lovable/app/generation/page.tsx`, `/home/tn/projects/open-lovable/components/app/generation/SidebarInput.tsx` / 完了条件: UI で `Gemini Flash (Latest)` と `Gemini Pro (Latest)` が先頭表示される。
5. [CONFIRMED] 目的: 実装後に live とテストで回帰を確認する。 / 実行コマンド or 具体操作: `npx tsc --noEmit && npm run test:api && npm run test:code` の後、`/api/ai-models`、`https://example.com`、`https://www.python.org` の clone を再実行する。 / 編集対象ファイル: なし（確認のみ） / 完了条件: 2段階 clone が通り、preview が崩れていない。

# 3. Goal / Scope / Current State

- [CONFIRMED] 最終ゴール: Google 2モデル (`gemini-flash-latest`, `gemini-pro-latest`) を主役にし、URLクローン時だけ自動2段階生成で品質と速度を両立させる。
- [CONFIRMED] 現在の作業対象:
  - AI model catalog / runtime resolution
  - UI selector の優先順
  - clone flow の 2段階生成
  - latest alias の fallback
- [CONFIRMED] Done:
  - 現行 WebApp は live で使える状態
  - `example.com` clone 成功
  - `python.org` clone 成功
  - `CloneBrief` による scrape 構造化
  - Firecrawl failure / timeout で direct fetch fallback
  - direct provider 優先で AI Gateway 課金制限を回避
  - screenshot 参照 + clone quality review pass
  - deterministic clone fidelity assessment
  - `npx tsc --noEmit`, `npm run test:api`, `npm run test:code` 成功
- [CONFIRMED] In Progress:
  - `gemini-flash-latest` / `gemini-pro-latest` への切替
  - 自動2段階生成の実装
- [BLOCKED] Blocked:
  - なし。コード・環境ともに現時点で作業継続可能
- [CONFIRMED] Cancelled:
  - Bun 統一は今回の主目的から外した

# 4. Decisions and Reasons

- [CONFIRMED] 判断: direct provider credential がある場合は AI Gateway より direct を優先する。理由: live で AI Gateway が `customer_verification_required` を返し、実使用の blocker だったため。影響: 現在の `GET /api/ai-models` は `mode: "direct"`。
- [CONFIRMED] 判断: Firecrawl が失敗しても clone を止めず、direct fetch fallback で本文抽出する。理由: `python.org` で `SCRAPE_TIMEOUT` が実際に発生したため。影響: `app/api/scrape-url-enhanced/route.ts` は timeout / API error / no data 時に fallback する。
- [CONFIRMED] 判断: clone 品質改善は `CloneBrief` を source of truth に寄せる。理由: raw scraped JSON を丸投げすると見た目やリンク fidelity が低かったため。影響: `app/generation/page.tsx` の normal clone prompt は `CloneBrief` 中心。
- [CONFIRMED] 判断: screenshot は clone mode で視覚参照に使う。理由:見た目重視要求に対応するため。影響: `app/api/generate-ai-code-stream/route.ts` で text + image input を送る。
- [CONFIRMED] 判断: quality review は deterministic 判定と LLM review を併用する。理由: LLM のみだと placeholder link や過圧縮を見逃すため。影響: `lib/scrape/clone-quality.ts` と correction pass を追加した。
- [CONFIRMED] 判断: 次のモデル戦略は Google 2モデル主軸、UI では Google 2択を主役 + 他 provider 維持。理由: ユーザー明示要求。
- [CONFIRMED] 判断: 2段階生成は URLクローン時のみ自動適用。理由: user preference とコストのバランス。影響: chat edit や通常 incremental edit には適用しない。
- [UNCERTAIN] 判断: `google/gemini-pro-latest` は today 時点で direct Google provider でどこまで安定か未確認。理由: docs 上の確証が弱い。影響: alias-first + exact fallback が前提。

# 5. Repo / Workspace State

- [CONFIRMED] Git 管理下: `true`
- [CONFIRMED] repo root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] `git status --short --branch`: `## main...origin/main`
- [CONFIRMED] `git diff --stat --cached`: 出力なし
- [CONFIRMED] `git diff --stat`: 出力なし
- [CONFIRMED] ワークツリー: clean
- [CONFIRMED] 背景 dev server:
  - `pnpm dev`
  - `next dev --turbopack`
  - process chain observed:
    - `1597211 pnpm dev`
    - `1597213 node .../pnpm dev`
    - `1597232 sh -c next dev --turbopack`
    - `1597233 node .../next dev --turbopack`
- [CONFIRMED] live `/api/ai-models` 応答:
  - `{"mode":"direct","defaultModel":"google/gemini-2.5-pro","models":[{"id":"google/gemini-2.5-pro","label":"Gemini 2.5 Pro","enabled":true},{"id":"openai/gpt-4.1","label":"GPT-4.1","enabled":true},{"id":"anthropic/claude-4-sonnet","label":"Claude 4 Sonnet","enabled":true},{"id":"moonshotai/kimi-k2","label":"Kimi K2","enabled":true}]}`
- [CONFIRMED] 直近の重要コマンドと結果:
  - `npx vercel env pull /tmp/open-lovable.vercel.env --yes` → success, `VERCEL_OIDC_TOKEN` 取得
  - `cp /tmp/open-lovable.vercel.env .env.local` → `.env.local` を更新して sandbox 403 を解消
  - `curl -sS -X POST http://127.0.0.1:3000/api/create-ai-sandbox-v2 -H 'Content-Type: application/json' -d '{}'` → 200 success after token refresh
  - `curl -sS -X POST http://127.0.0.1:3000/api/scrape-url-enhanced -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'` → success
  - `curl -sS -X POST http://127.0.0.1:3000/api/scrape-url-enhanced -H 'Content-Type: application/json' -d '{"url":"https://www.python.org"}'` → success
  - `npx tsc --noEmit` → success
  - `npm run test:api` → success (4 tests pass)
  - `npm run test:code` → success (9 tests pass)
- [CONFIRMED] live 実施済み検証:
  - `example.com` clone 成功
  - `python.org` clone 成功
  - `bun.sh` scrape 成功、`CloneBrief` 返却確認
- [MISSING] 未実施検証:
  - `gemini-flash-latest` / `gemini-pro-latest` 切替後の live clone
  - 自動2段階生成の live 実行

# 6. Key Literals

- [CONFIRMED] 日付: `2026-04-17 17:34:17 +0900`
- [CONFIRMED] workspace root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] 現行 canonical model IDs:
  - `google/gemini-2.5-pro`
  - `openai/gpt-4.1`
  - `anthropic/claude-4-sonnet`
  - `moonshotai/kimi-k2`
- [CONFIRMED] 次に入れる予定の canonical model IDs:
  - `google/gemini-flash-latest`
  - `google/gemini-pro-latest`
- [CONFIRMED] exact fallback 候補として plan で決めたもの:
  - fast fallback: `google/gemini-3-flash-preview`
  - quality fallback: `google/gemini-3.1-pro-preview`
  - quality secondary fallback: `google/gemini-3-pro-preview`
- [CONFIRMED] 重要 URL:
  - `http://127.0.0.1:3000`
  - `http://127.0.0.1:3000/api/ai-models`
  - `https://example.com`
  - `https://www.python.org`
  - `https://bun.sh/`
- [CONFIRMED] 成功した sandbox IDs / URLs:
  - `sbx_q6QCeBRf8pVg9R0sxSRkQqLxMBFn` -> `https://sb-2ix81rt83pi4.vercel.run`
  - `sbx_EfGr58SHtlcyX4hwIIhN2K7fEpco` -> `https://sb-74255v0icsne.vercel.run`
  - `sbx_yufyAh4ZZvoiOApVr3x1rbgo8e4w` -> `https://sb-1pg4kq0seo9t.vercel.run`
- [CONFIRMED] 重要ファイル:
  - `/home/tn/projects/open-lovable/lib/ai/model-catalog.ts`
  - `/home/tn/projects/open-lovable/lib/ai/model-runtime.ts`
  - `/home/tn/projects/open-lovable/lib/ai/provider-manager.ts`
  - `/home/tn/projects/open-lovable/app/api/ai-models/route.ts`
  - `/home/tn/projects/open-lovable/app/api/generate-ai-code-stream/route.ts`
  - `/home/tn/projects/open-lovable/app/api/analyze-edit-intent/route.ts`
  - `/home/tn/projects/open-lovable/app/api/scrape-url-enhanced/route.ts`
  - `/home/tn/projects/open-lovable/app/generation/page.tsx`
  - `/home/tn/projects/open-lovable/lib/scrape/clone-brief.ts`
  - `/home/tn/projects/open-lovable/lib/scrape/clone-quality.ts`
- [CONFIRMED] 重要コマンド:
  - `pnpm dev`
  - `curl -sS http://127.0.0.1:3000/api/ai-models`
  - `curl -sS -X POST http://127.0.0.1:3000/api/create-ai-sandbox-v2 -H 'Content-Type: application/json' -d '{}'`
  - `curl -sS -X POST http://127.0.0.1:3000/api/scrape-url-enhanced -H 'Content-Type: application/json' -d '{"url":"https://www.python.org"}'`
  - `npx vercel env pull /tmp/open-lovable.vercel.env --yes`
  - `npx tsc --noEmit`
  - `npm run test:api`
  - `npm run test:code`
- [CONFIRMED] 重要設定値:
  - `VERCEL_OIDC_TOKEN` exists in `.env.local` (exact value intentionally omitted because secret)
  - `.env` contains provider credentials including `FIRECRAWL_API_KEY`, `AI_GATEWAY_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` (exact values intentionally omitted because secrets)
- [CONFIRMED] 重要エラー文とその解消状況:
  - `Vercel sandbox authentication failed: Not authorized. Refresh VERCEL_OIDC_TOKEN or configure VERCEL_TOKEN + VERCEL_TEAM_ID + VERCEL_PROJECT_ID.` → resolved by `vercel env pull`
  - `AI Gateway requires a valid credit card on file to service requests... customer_verification_required` → resolved by direct provider preference
  - `Firecrawl API error: {"success":false,"code":"SCRAPE_TIMEOUT",...}` → resolved by direct fetch fallback
- [CONFIRMED] 重要ログ断片:
  - `[generate-ai-code-stream] Using provider: google, model: gemini-2.5-pro`
  - `[generate-ai-code-stream] AI Gateway enabled: true`
  - `POST /api/generate-ai-code-stream 200`
  - `POST /api/apply-ai-code-stream 200`
  - `Applied 5 files successfully!`
  - `Applied 7 files successfully!`
- [CONFIRMED] 重要な短い差分断片 / runtime facts:
  - direct provider precedence is active
  - `CloneBrief` is injected into normal clone prompt as `CLONE BRIEF (SOURCE OF TRUTH):`
  - deterministic + LLM review pass exists for clone fidelity

# 7. Open Issues / Missing Information

- [MISSING] `google/gemini-pro-latest` の direct Google provider での安定可用性は未確認。today 時点の docs だけでは確証が弱い。
- [MISSING] `google/gemini-flash-latest` / `google/gemini-pro-latest` を alias-first で実装した後の live clone 検証は未実施。
- [UNCERTAIN] `gemini-pro-latest` が Gateway と direct で同じ alias 名で通るかは未確認。exact fallback 前提にする必要がある。
- [UNCERTAIN] `auto-complete-components` route の不在は現在も未確認のまま。ただし successful clone の blocker ではなかった。
- [MISSING] `.playwright-mcp/` は untracked artifact。現時点では handoff 対象外だが、必要なら次セッションで cleanup 方針を決める。

# 8. Risks / Assumptions / Dependencies

- [CONFIRMED] リスク: `latest` alias は provider / mode ごとに安定性が違う可能性がある。exact fallback なしの実装は危険。
- [CONFIRMED] リスク: 自動2段階生成は clone 速度とトークン消費を増やす。
- [CONFIRMED] リスク: selector を Google 2モデル主役に変えると、既存の `selectedModel` / query param / sessionStorage 正規化を崩す可能性がある。
- [CONFIRMED] リスク: current test harness は `stripTypeScriptTypes` を使うため Node 実験機能依存。
- [CONFIRMED] 仮定: 他 provider の selector は残すが、Google 2モデルを featured / priority として先頭表示する。
- [CONFIRMED] 仮定: 自動2段階生成は **URLクローン時のみ** に限定する。
- [CONFIRMED] 外部依存:
  - Google model availability
  - Vercel sandbox auth via `VERCEL_OIDC_TOKEN`
  - Firecrawl scrape / screenshot
- [CONFIRMED] 権限待ち / 人待ち: なし。現環境でそのまま実装継続可能。

# 9. Restart Prompt

以下を新しい Codex / ChatGPT セッションの最初にそのまま貼ること。

```text
/home/tn/projects/open-lovable で作業する。まず ./.ai_memory/HANDOFF.md だけを読み、その内容だけを前提に再開してほしい。日本語で簡潔に進捗共有しながら進めること。

現在の状態:
- ワークツリーは clean
- WebApp は live で使える
- example.com と python.org の clone は成功済み
- CloneBrief / screenshot / deterministic review まで実装済み
- 次の作業は Google 2モデル化と自動2段階生成

最初にやること:
1. `lib/ai/model-catalog.ts`, `lib/ai/model-runtime.ts`, `lib/ai/provider-manager.ts` を更新し、`google/gemini-flash-latest` と `google/gemini-pro-latest` を canonical model として追加する。
2. alias-first + exact fallback を実装する。fast fallback は `google/gemini-3-flash-preview`、quality fallback は `google/gemini-3.1-pro-preview` と `google/gemini-3-pro-preview`。
3. URLクローン時だけ、`flash-latest -> pro-latest` の自動2段階生成を `app/generation/page.tsx` と `app/api/generate-ai-code-stream/route.ts` に入れる。
4. `/api/ai-models` と UI selector を Google 2モデル主役表示にする。
5. `npx tsc --noEmit && npm run test:api && npm run test:code` を通し、`example.com` と `python.org` の clone を再実行する。

守ること:
- 旧チャットは参照しない。
- 低リスクなローカル確認、型チェック、テストは確認待ちせず進める。
- 破壊的操作、外部副作用の大きい操作、commit/push の前だけ確認する。
```

# 10. Coverage Audit

- [CONFIRMED] 目的は残っているか: はい。現行 app の live 成功状態と、次の Google 2モデル実装タスクが両方残っている。
- [CONFIRMED] 次の1手は即実行可能か: はい。catalog / runtime / provider-manager の3ファイルから着手できる。
- [CONFIRMED] 決定事項は残っているか: はい。Google 2モデル主役、他 provider 維持、URLクローン時のみ自動2段階、alias-first + exact fallback を明記した。
- [CONFIRMED] 重要な具体物は残っているか: はい。live endpoint 応答、成功した sandbox IDs、重要コマンド、重要エラー、対象ファイルを残した。
- [CONFIRMED] 未解決事項は明示されたか: はい。`gemini-pro-latest` の可用性、alias fallback の未検証、`auto-complete-components` 不在、`.playwright-mcp/` の扱いを残した。
- [MISSING] 欠落: `latest` alias の today 時点での provider別厳密可用性は未確認。実装時に exact fallback 前提で進める必要がある。
