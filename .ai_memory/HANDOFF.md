---
handoff_version: 3
updated_at_jst: "2026-04-16 18:18:23 +0900"
workspace_root: "/home/tn/projects/open-lovable"
repo_present: true
branch: "main"
overall_status: in_progress
current_task: "AIモデル解決系の全面整理を実装済み。最終差分確認、runtime 手動確認、未解決事項整理が残り。"
final_goal: "AI Gateway / direct provider の両方で動く canonical AI model catalog を導入し、UI・API・README・create-open-lovable テンプレートを整合させる。"
recommended_model: gpt-5.4
portable: true
---

# 1. Executive Snapshot

- [CONFIRMED] `google/gemini-3-pro-preview` で 404 になっていた原因は、AI Gateway 有効時でも Google SDK 経由で `/models/...:streamGenerateContent` 形式へ誤ルーティングしていたことだった。
- [CONFIRMED] canonical model catalog を新設し、`lib/ai/model-catalog.ts`, `lib/ai/model-runtime.ts`, `lib/ai/provider-manager.ts` を中心に `gateway` / `direct` の runtime 判定を一本化した。
- [CONFIRMED] 新規 route `app/api/ai-models/route.ts` と hook `hooks/use-ai-models.ts` を追加し、`app/page.tsx`, `app/generation/page.tsx`, `components/app/generation/SidebarInput.tsx` の model selector を動的化した。
- [CONFIRMED] 既定 model は `google/gemini-2.5-pro` に変更済み。legacy alias として `google/gemini-3-pro-preview`, `anthropic/claude-sonnet-4-20250514`, `moonshotai/kimi-k2-instruct-0905` を canonical ID へ正規化する。
- [CONFIRMED] `app/api/generate-ai-code-stream/route.ts` と `app/api/analyze-edit-intent/route.ts` は、無効 model を `400` + `errorCode: AI_MODEL_UNAVAILABLE` + `fallbackModel` で返すように変更済み。
- [CONFIRMED] `README.md` と `packages/create-open-lovable/*` の `.env.example` / prompts / installer は `AI_GATEWAY_API_KEY` 前提を含む形に更新済み。
- [CONFIRMED] 実施済み検証は `npx tsc --noEmit`, `npm run test:api`, `npm run test:code`。すべて成功した。
- [UNCERTAIN] 実際の API key を使った live 実行検証は未実施。`/api/ai-models` と UI selector の runtime 動作、`generate-ai-code-stream` の実呼び出しはまだ確認していない。
- [UNCERTAIN] ルート `.env.example` の削除と `bun.lock` の 1 行差分は、このセッションで作っていない。意図的な既存変更かは未確認。
- [CONFIRMED] 次の1手は、差分のスコープ確認と未確認事項の切り分けを最初に行い、続いて live の軽い smoke test に進むこと。

# 2. Immediate Restart Actions

1. [CONFIRMED] 目的: いま残っている差分が「意図した変更」だけか確認し、`D .env.example` と `M bun.lock` を扱う方針を決める。 / 実行コマンド: `git status --short --branch && git diff --stat && git diff -- README.md app/api/ai-models/route.ts app/api/analyze-edit-intent/route.ts app/api/apply-ai-code/route.ts app/api/generate-ai-code-stream/route.ts app/generation/page.tsx app/page.tsx components/app/generation/SidebarInput.tsx config/app.config.ts hooks/use-ai-models.ts lib/ai/model-catalog.ts lib/ai/model-runtime.ts lib/ai/provider-manager.ts package.json packages/create-open-lovable/lib/installer.js packages/create-open-lovable/lib/prompts.js packages/create-open-lovable/templates/e2b/.env.example packages/create-open-lovable/templates/vercel/.env.example tests` / 編集対象ファイル: なし（確認のみ）。必要なら `README.md`, `package.json`, `lib/ai/*`, `app/page.tsx`, `app/generation/page.tsx`, `components/app/generation/SidebarInput.tsx`, `packages/create-open-lovable/*` / 完了条件: 残差分のスコープを説明でき、`.env.example` 削除と `bun.lock` の扱いを決められる。
2. [CONFIRMED] 目的: runtime の model catalog と selector が期待どおり動くかを最小の smoke test で確認する。 / 実行コマンド: `npm run dev` を起動し、`http://localhost:3000/api/ai-models` を確認、続いて `/` と `/generation` の model selector を確認する。 / 編集対象ファイル: 原則なし。必要なら `app/api/ai-models/route.ts`, `hooks/use-ai-models.ts`, `app/page.tsx`, `app/generation/page.tsx`, `components/app/generation/SidebarInput.tsx` / 完了条件: `defaultModel`, `enabled`, `disabledReason` が期待どおり返り、selector が stale model を正規化して無効環境では送信を止める。
3. [BLOCKED] 目的: `generate-ai-code-stream` の live 実行を確認する。 / 実行コマンド: 環境に応じて `AI_GATEWAY_API_KEY=... npm run dev` または provider key を設定して UI から 1 回生成を実行する。 / 編集対象ファイル: 原則なし。必要なら `app/api/generate-ai-code-stream/route.ts`, `lib/ai/provider-manager.ts`, `lib/ai/model-runtime.ts` / 完了条件: 旧 `google/gemini-3-pro-preview` の誤ルーティングを再現せず、実際に stream 開始できる。
4. [CONFIRMED] 目的: `app/api/apply-ai-code/route.ts` が叩く `auto-complete-components` route の欠落を扱うか決める。 / 実行コマンド: `rg -n "auto-complete-components" app -S && find app/api -maxdepth 2 -type f | sort | rg "auto-complete-components" -n -S` / 編集対象ファイル: 必要なら `app/api/apply-ai-code/route.ts` / 完了条件: 欠落 route を別タスク化するか、今回の変更範囲に含めるか判断できる。
5. [CONFIRMED] 目的: 手動確認まで済んだら変更をまとめる準備をする。 / 実行コマンド: `npx tsc --noEmit && npm run test:api && npm run test:code` を再実行し、必要なら `git diff --stat` を再確認する。 / 編集対象ファイル: なし（確認のみ） / 完了条件: 最終確認結果を説明でき、commit / PR 準備に進める。

# 3. Goal / Scope / Current State

- [CONFIRMED] 最終ゴール: canonical AI model catalog を導入し、`AI_GATEWAY_API_KEY` と direct provider keys のどちらでも UI / API / docs / template が同じ前提で動く状態にする。
- [CONFIRMED] 現在の作業対象: model catalog, runtime availability 判定, provider resolver, `/api/ai-models`, home/generation/sidebar selector, stale model 正規化, docs/template 更新,最小テスト。
- [CONFIRMED] Done:
  - `lib/ai/model-catalog.ts` を追加し、canonical ID と legacy alias を定義した。
  - `lib/ai/model-runtime.ts` を追加し、`gateway` / `direct` mode 判定と enabled/disabled catalog 返却を実装した。
  - `lib/ai/provider-manager.ts` を catalog 前提へ更新した。
  - `app/api/ai-models/route.ts` を追加した。
  - `app/api/generate-ai-code-stream/route.ts` と `app/api/analyze-edit-intent/route.ts` に `AI_MODEL_UNAVAILABLE` の 400 応答を実装した。
  - `app/page.tsx`, `app/generation/page.tsx`, `components/app/generation/SidebarInput.tsx` を dynamic model selector + stale model 正規化に更新した。
  - `README.md` と `packages/create-open-lovable/*` を `AI_GATEWAY_API_KEY` 前提込みで更新した。
  - `tests/register-ts-hooks.mjs`, `tests/api-endpoints.test.js`, `tests/code-execution.test.js` を追加し、`package.json` の test script を更新した。
- [CONFIRMED] In Progress:
  - live の smoke test は未実施。
  - `.env.example` 削除と `bun.lock` 差分の扱いは未確定。
  - `auto-complete-components` route 不在の扱いは未決定。
- [BLOCKED] Blocked:
  - 実 API key の有無が不明なため、live の stream 開始確認は未着手。
- [CONFIRMED] Cancelled:
  - なし。

# 4. Decisions and Reasons

- [CONFIRMED] 判断: canonical model ID を UI / query / sessionStorage / API input の唯一の表現にした。理由: provider 固有 ID と preview / snapshot 名が混在すると stale 値と runtime 解決がズレるため。影響: 実行時の provider 固有 model 変換は `lib/ai/provider-manager.ts` と `lib/ai/model-runtime.ts` に閉じ込めた。
- [CONFIRMED] 判断: 既定 model を `google/gemini-2.5-pro` にした。理由: `google/gemini-3-pro-preview` が壊れており、preview 名を default にし続けるのは unsafe だったため。影響: stale query / sessionStorage は `google/gemini-2.5-pro` へ正規化される。
- [CONFIRMED] 判断: model catalog は「半固定 + 検証」にした。理由: 完全動的 catalog は導入コストが高く、今必要なのは安定した curated list と availability 判定だったため。影響: catalog 変更はコード更新が必要だが、無効環境では selector が送信前に止まる。
- [CONFIRMED] 判断: unknown model は silent remap しない。理由: 旧 `openai/gpt-oss-20b` を別モデルへ勝手に寄せると意味変換になるため。影響: legacy alias は明示したものだけ canonical へ正規化し、それ以外は `AI_MODEL_UNAVAILABLE` にする。
- [CONFIRMED] 判断: `generate-ai-code-stream` の Groq service error fallback は「catalog 上の enabled な別 model」へ切り替える。理由: `openai/gpt-4.1` 固定 fallback だと direct mode で OpenAI key が無い環境を壊すため。影響: fallback は環境依存になるが、少なくとも enabled model の範囲に限定される。
- [CONFIRMED] 判断: テストは `node --test` + `tests/register-ts-hooks.mjs` にした。理由: repo に既存 test infra がなく、依存追加を避けながら `.ts` の小さい unit test を回す必要があったため。影響: テスト実行時に `ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time` が出る。
- [CONFIRMED] 判断: `app/api/apply-ai-code/route.ts` の補助生成 model は `anthropic/claude-4-sonnet` に合わせた。理由: catalog と合わない固定 `claude-sonnet-4-20250514` を表で持ち続けないため。影響: canonical ID を route 間で統一した。

# 5. Repo / Workspace State

- [CONFIRMED] Git 管理下: `true`
- [CONFIRMED] repo root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] `git status --short --branch`:
  - `## main...origin/main`
  - ` D .env.example`
  - ` M README.md`
  - ` M app/api/analyze-edit-intent/route.ts`
  - ` M app/api/apply-ai-code/route.ts`
  - ` M app/api/generate-ai-code-stream/route.ts`
  - ` M app/generation/page.tsx`
  - ` M app/page.tsx`
  - ` M bun.lock`
  - ` M components/app/generation/SidebarInput.tsx`
  - ` M config/app.config.ts`
  - ` M lib/ai/provider-manager.ts`
  - ` M package.json`
  - ` M packages/create-open-lovable/lib/installer.js`
  - ` M packages/create-open-lovable/lib/prompts.js`
  - ` M packages/create-open-lovable/templates/e2b/.env.example`
  - ` M packages/create-open-lovable/templates/vercel/.env.example`
  - `?? app/api/ai-models/`
  - `?? hooks/use-ai-models.ts`
  - `?? lib/ai/model-catalog.ts`
  - `?? lib/ai/model-runtime.ts`
  - `?? tests/`
- [CONFIRMED] `git diff --stat --cached`: 出力なし。staged 変更なし。
- [CONFIRMED] `git diff --stat`:
  - `.env.example | 46 ------`
  - `README.md | 23 ++-`
  - `app/api/analyze-edit-intent/route.ts | 84 +++++------`
  - `app/api/apply-ai-code/route.ts | 4 +-`
  - `app/api/generate-ai-code-stream/route.ts | 150 +++++++------------`
  - `app/generation/page.tsx | 162 +++++++++++++++++----`
  - `app/page.tsx | 47 ++++--`
  - `bun.lock | 1 +`
  - `components/app/generation/SidebarInput.tsx | 48 ++++--`
  - `config/app.config.ts | 31 +---`
  - `lib/ai/provider-manager.ts | 131 +++++++++--------`
  - `package.json | 6 +-`
  - `packages/create-open-lovable/lib/installer.js | 14 +-`
  - `packages/create-open-lovable/lib/prompts.js | 10 +-`
  - `packages/create-open-lovable/templates/e2b/.env.example | 7 +-`
  - `packages/create-open-lovable/templates/vercel/.env.example | 7 +-`
  - `16 files changed, 416 insertions(+), 355 deletions(-)`
- [CONFIRMED] このセッションで重要だったコマンドと結果:
  - `npx tsc --noEmit` → 成功。
  - `npm run test:api` → 成功。3 tests pass。
  - `npm run test:code` → 成功。4 tests pass。
  - `rg -n "auto-complete-components" app -S` → `app/api/apply-ai-code/route.ts:730` のみヒット。
  - `find app/api -maxdepth 2 -type f | sort | rg "auto-complete-components" -n -S` → 出力なし。
- [CONFIRMED] 実施済み検証:
  - static type check
  - catalog/runtime の unit test
  - legacy alias 正規化 test
  - direct/gateway resolution test
- [MISSING] 未実施検証:
  - `npm run dev` 下での `/api/ai-models` live 応答確認
  - home / generation UI selector の手動確認
  - 実際の `generate-ai-code-stream` の live stream 開始確認
  - 既存の `apply-ai-code` フローで `auto-complete-components` が必要になったときの runtime 確認

# 6. Key Literals

- [CONFIRMED] 日付: `2026-04-16 18:18:23 +0900`
- [CONFIRMED] workspace root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] 新規追加ファイル:
  - `app/api/ai-models/route.ts`
  - `hooks/use-ai-models.ts`
  - `lib/ai/model-catalog.ts`
  - `lib/ai/model-runtime.ts`
  - `tests/register-ts-hooks.mjs`
  - `tests/api-endpoints.test.js`
  - `tests/code-execution.test.js`
- [CONFIRMED] 主要編集ファイル:
  - `lib/ai/provider-manager.ts`
  - `app/api/generate-ai-code-stream/route.ts`
  - `app/api/analyze-edit-intent/route.ts`
  - `app/page.tsx`
  - `app/generation/page.tsx`
  - `components/app/generation/SidebarInput.tsx`
  - `README.md`
  - `package.json`
  - `packages/create-open-lovable/lib/prompts.js`
  - `packages/create-open-lovable/lib/installer.js`
- [CONFIRMED] canonical model IDs:
  - `google/gemini-2.5-pro`
  - `openai/gpt-4.1`
  - `anthropic/claude-4-sonnet`
  - `moonshotai/kimi-k2`
- [CONFIRMED] legacy aliases:
  - `google/gemini-3-pro-preview` → `google/gemini-2.5-pro`
  - `anthropic/claude-sonnet-4-20250514` → `anthropic/claude-4-sonnet`
  - `claude-sonnet-4-20250514` → `anthropic/claude-4-sonnet`
  - `moonshotai/kimi-k2-instruct-0905` → `moonshotai/kimi-k2`
- [CONFIRMED] env keys:
  - `AI_GATEWAY_API_KEY`
  - `GEMINI_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GROQ_API_KEY`
- [CONFIRMED] 重要コマンド:
  - `pwd`
  - `git rev-parse --show-toplevel`
  - `git branch --show-current`
  - `git status --short --branch`
  - `git diff --stat --cached`
  - `git diff --stat`
  - `npx tsc --noEmit`
  - `npm run test:api`
  - `npm run test:code`
  - `rg -n "auto-complete-components" app -S`
- [CONFIRMED] テスト script:
  - `"test:api": "node --import ./tests/register-ts-hooks.mjs --test tests/api-endpoints.test.js"`
  - `"test:code": "node --import ./tests/register-ts-hooks.mjs --test tests/code-execution.test.js"`
- [CONFIRMED] 重要 error 文:
  - `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/tn/projects/open-lovable/lib/ai/model-catalog' imported from /home/tn/projects/open-lovable/lib/ai/model-runtime.ts`
  - `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled.`
  - `ExperimentalWarning: stripTypeScriptTypes is an experimental feature and might change at any time`
- [CONFIRMED] 重要ログ断片:
  - `[generate-ai-code-stream] AI Gateway enabled: true`
  - `errorCode: 'AI_MODEL_UNAVAILABLE'`
  - `fallbackModel: catalog.defaultModel`
- [CONFIRMED] 重要な短い差分断片:
  - `defaultModel: 'google/gemini-2.5-pro'` は `config/app.config.ts` から削除し、runtime catalog 側へ移した。
  - `model: 'claude-sonnet-4-20250514'` は `model: 'anthropic/claude-4-sonnet'` に変更した。
  - `/api/ai-models` 追加により selector は `appConfig.ai.availableModels` 直参照をやめた。

# 7. Open Issues / Missing Information

- [MISSING] `AI_GATEWAY_API_KEY` または direct provider key がこの環境で使えるか不明。live の stream 実行はまだ確認していない。
- [UNCERTAIN] ルート `.env.example` の削除 `D .env.example` は意図的な既存変更か不明。今回の model 変更では触っていない。
- [UNCERTAIN] `bun.lock` の `M bun.lock` は今回の変更に必要だったか不明。diff は 1 行のみだが、中身の意図確認が未実施。
- [CONFIRMED] `app/api/apply-ai-code/route.ts:730` は `${request.nextUrl.origin}/api/auto-complete-components` を叩くが、`find app/api -maxdepth 2 -type f | sort | rg "auto-complete-components" -n -S` は出力なし。route 不在が runtime 問題になる可能性がある。
- [MISSING] ユーザーが experimental な `tests/register-ts-hooks.mjs` ベースの test 継続を許容するか不明。
- [BLOCKED] 実 browser smoke test は API key / 実行環境が必要。これが無いと `/api/ai-models` と streaming の live 確認は止まる。

# 8. Risks / Assumptions / Dependencies

- [CONFIRMED] リスク: curated model catalog はコード固定なので、provider 側の model 名変更に追従しないと stale になる。
- [CONFIRMED] リスク: `tests/register-ts-hooks.mjs` は `stripTypeScriptTypes` を使うため Node 実験機能依存。
- [CONFIRMED] リスク: `app/generation/page.tsx` は model 正規化・sessionStorage・query 同期ロジックが増えており、manual UI 確認なしで出すと細かい state race を見落とす可能性がある。
- [CONFIRMED] 仮定: canonical ID は `google/gemini-2.5-pro`, `openai/gpt-4.1`, `anthropic/claude-4-sonnet`, `moonshotai/kimi-k2` を使い続ける前提。
- [CONFIRMED] 仮定: `AI_GATEWAY_API_KEY` があるときは provider SDK の baseURL 差し替えではなく `@ai-sdk/gateway` を使う。
- [MISSING] 外部依存: 実 API key、Vercel AI Gateway の対象 model 可用性、各 provider の model 名の継続性。
- [UNCERTAIN] 人待ち / 権限待ち: なし。ただし live 検証には key が必要。

# 9. Restart Prompt

以下をそのまま新しいセッションの最初の依頼文として使うこと。

```text
/home/tn/projects/open-lovable で作業する。まず ./.ai_memory/HANDOFF.md だけを読み、その内容だけを前提に再開してほしい。日本語で簡潔に進捗共有しながら進めること。

最初にやること:
1. git status と git diff を確認して、今回の model-catalog 系変更のスコープを説明する。
2. ルート .env.example の削除と bun.lock の差分が意図したものか切り分ける。
3. その後、低リスクな確認は待たずに進めてよい。具体的には /api/ai-models と UI selector の整合確認、必要なら軽い修正まで進める。

守ること:
- 旧チャットは参照しない。
- 破壊的操作はしない。
- 外部副作用がある操作、live API を叩く操作、commit/push の前だけ確認する。
- 低リスクなローカル確認、静的修正、型チェック、既存 test 実行は確認待ちせず着手する。
```

# 10. Coverage Audit

- [CONFIRMED] 目的は残っているか: はい。AI model catalog / runtime / UI / docs の整合を維持したまま再開できる。
- [CONFIRMED] 次の1手は即実行可能か: はい。`git status --short --branch && git diff --stat && git diff -- ...` でそのまま着手できる。
- [CONFIRMED] 決定事項は残っているか: はい。canonical ID、default model、gateway/direct 方針、test 方針を明記した。
- [CONFIRMED] 重要な具体物は残っているか: はい。ファイルパス、コマンド、設定値、エラー文、diff 要約を残した。
- [CONFIRMED] 未解決事項は明示されたか: はい。API key 不明、`.env.example` 削除、`bun.lock`、`auto-complete-components` route 不在を明記した。
- [MISSING] 欠落: live 実行結果は存在しないため記載できない。必要なら次セッションで API key 前提の smoke test を追加実施する。
