---
handoff_version: 4
updated_at_jst: "2026-04-20 10:14:00 +0900"
workspace_root: "/home/tn/projects/open-lovable"
repo_present: true
branch: "main"
overall_status: ready
current_task: "今の環境で URL からサイト複製を実際に作れる状態かを確認し、必要なら local sandbox で成立させる。"
final_goal: "外部 sandbox 認証に依存せず、ローカル環境から URL クローンを最後まで通せること。"
recommended_model: gpt-5.4
portable: true
---

# 1. Executive Snapshot

- [CONFIRMED] 現在の `main` ブランチの tracked worktree は clean。`git status --short` は空。
- [CONFIRMED] 現在の実運用前提は `local` sandbox。`.env.local` に `SANDBOX_PROVIDER=local` がある。
- [CONFIRMED] `GET /api/ai-models` は有効モデルを返し、default は `google/gemini-2.5-pro`。
- [CONFIRMED] Firecrawl scrape は live で成功する。
- [CONFIRMED] `create-ai-sandbox-v2` は `provider: "local"` で成功する。
- [CONFIRMED] local sandbox 上で `get-sandbox-files`、`apply-ai-code-stream`、Vite preview が動作する。
- [CONFIRMED] `https://example.com` で end-to-end smoke を実施し、`scrape-url-enhanced -> generate-ai-code-stream -> apply-ai-code-stream` まで通った。
- [CONFIRMED] 生成後の sandbox 内 `src/App.jsx` には `Example Domain` の複製コードが反映されることを確認した。
- [CONFIRMED] `pnpm build` は成功。
- [IMPORTANT] `.env` / `.env.local` に残っている `VERCEL_OIDC_TOKEN` は期限切れ。現時点では Vercel sandbox を使わず local sandbox を使うのが正しい。

# 2. Immediate Restart Actions

1. [CONFIRMED] 目的: アプリを再起動して URL クローンを使う。 / 実行コマンド or 具体操作: `pnpm dev` を実行し、ブラウザで `http://localhost:3000` を開いて URL を入力する。 / 編集対象ファイル: なし / 完了条件: `/generation` に遷移し、sandbox 作成と clone 開始が走る。
2. [CONFIRMED] 目的: sandbox 周りを確認する。 / 実行コマンド or 具体操作: `curl -sS -X POST http://localhost:3000/api/create-ai-sandbox-v2`。 / 編集対象ファイル: なし / 完了条件: `provider: "local"` を含む success JSON が返る。
3. [CONFIRMED] 目的: scrape 経路を確認する。 / 実行コマンド or 具体操作: `curl -sS -X POST http://localhost:3000/api/scrape-url-enhanced -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'`。 / 編集対象ファイル: なし / 完了条件: `success: true` と markdown/structured が返る。
4. [OPTIONAL] 目的: Vercel sandbox を復旧する。 / 実行コマンド or 具体操作: Vercel CLI で新しい env pull を行い、`VERCEL_OIDC_TOKEN` を更新する。 / 編集対象ファイル: `.env.local` / 完了条件: `create-ai-sandbox-v2` が `provider: "vercel"` でも通る。

# 3. Goal / Scope / Current State

- [CONFIRMED] ゴール: 今の環境で URL からサイト複製を最後まで通せること。
- [CONFIRMED] 現在の成立経路:
  - AI model catalog: OK
  - Firecrawl scrape: OK
  - sandbox creation: OK (`local`)
  - AI generation: OK
  - generated code apply: OK
  - preview serve: OK
- [CONFIRMED] 現在の推奨運用:
  - sandbox は `local`
  - AI は現行の direct provider 設定をそのまま使う
  - Vercel token 更新までは Vercel sandbox を使わない
- [CONFIRMED] 今回の tracked 変更はなし。README と handoff は現状態に合わせて更新済みの想定で、branch は clean。

# 4. Decisions and Reasons

- [CONFIRMED] 判断: 外部 sandbox 認証が怪しい間は `local` sandbox を優先する。理由: Vercel OIDC token が期限切れで 403 `invalidToken` を返していたため。
- [CONFIRMED] 判断: URL クローン可否の判断は、単なる設定確認ではなく live API 実行で行う。理由: 実際に失敗点は Vercel sandbox auth で、静的確認だけでは足りなかったため。
- [CONFIRMED] 判断: 検証対象は `example.com` を使う。理由: scrape が軽く、UI 複製の smoke に十分だから。

# 5. Repo / Workspace State

- [CONFIRMED] Git 管理下: `true`
- [CONFIRMED] repo root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] `git status --short`: 空
- [CONFIRMED] tracked worktree: clean
- [CONFIRMED] ローカル環境の重要状態:
  - `.env.local` に `SANDBOX_PROVIDER=local`
  - `.env` / `.env.local` に `VERCEL_OIDC_TOKEN` はあるが期限切れ
- [CONFIRMED] 今回の live 検証で見た代表レスポンス:
  - `/api/create-ai-sandbox-v2` -> `{"success":true,"sandboxId":"local-...","url":"http://127.0.0.1:44851","provider":"local",...}`
  - `/api/scrape-website` -> `example.com` markdown を返す
  - `/api/get-sandbox-files` -> `src/App.jsx`, `src/index.css`, `src/main.jsx` を含む manifest を返す

# 6. Key Literals

- [CONFIRMED] workspace root: `/home/tn/projects/open-lovable`
- [CONFIRMED] branch: `main`
- [CONFIRMED] 重要 URL:
  - `http://localhost:3000`
  - `http://localhost:3000/api/ai-models`
  - `http://localhost:3000/api/create-ai-sandbox-v2`
  - `http://localhost:3000/api/scrape-url-enhanced`
  - `https://example.com`
- [CONFIRMED] 重要ファイル:
  - `/home/tn/projects/open-lovable/.env.local`
  - `/home/tn/projects/open-lovable/README.md`
  - `/home/tn/projects/open-lovable/.ai_memory/HANDOFF.md`
- [CONFIRMED] 重要コマンド:
  - `pnpm dev`
  - `pnpm build`
  - `curl -sS -X POST http://localhost:3000/api/create-ai-sandbox-v2`
  - `curl -sS -X POST http://localhost:3000/api/scrape-url-enhanced -H 'Content-Type: application/json' -d '{"url":"https://example.com"}'`
- [CONFIRMED] 重要エラー:
  - `Vercel sandbox authentication failed: Not authorized ... invalidToken`

# 7. Open Issues / Missing Information

- [MISSING] Vercel sandbox を使い直すなら、Vercel CLI から新しい `VERCEL_OIDC_TOKEN` を pull し直す必要がある。
- [MISSING] `example.com` 以外の重いサイトでの local sandbox 安定性は今回未検証。
- [MISSING] local sandbox の tmp dir cleanup を永続的にどう扱うかは未整理。

# 8. Risks / Assumptions / Dependencies

- [CONFIRMED] リスク: local sandbox は外部 sandbox より本番相当性が低い。
- [CONFIRMED] リスク: Firecrawl と AI provider の外部 API 利用は前提のまま。
- [CONFIRMED] 仮定: 当面は「URL クローンできること」が優先で、Vercel sandbox 復旧は後回しでよい。

# 9. Restart Prompt

以下を新しい Codex / ChatGPT セッションの最初にそのまま貼ること。

```text
/home/tn/projects/open-lovable で作業する。まず ./.ai_memory/HANDOFF.md だけを読み、その内容だけを前提に再開してほしい。日本語で簡潔に進捗共有しながら進めること。

現状態:
- tracked worktree は clean
- URL クローンは local sandbox 前提で動く
- .env.local は SANDBOX_PROVIDER=local
- Vercel OIDC token は期限切れなので、今は Vercel sandbox を使わない

最初にやること:
1. `pnpm dev` でアプリを起動する
2. `/api/create-ai-sandbox-v2` が provider=local で通ることを確認する
3. 必要なら example.com で scrape -> generate -> apply を再実行する

守ること:
- 旧チャットは参照しない
- 低リスクなローカル確認は確認待ちせず進める
- 破壊的操作、外部副作用の大きい操作、commit/push の前だけ確認する
```

# 10. Coverage Audit

- [CONFIRMED] 現在の主目的は達成済みか: はい。URL クローンの主要経路は local sandbox で live 検証済み。
- [CONFIRMED] 次の1手は即実行可能か: はい。`pnpm dev` でそのまま再開できる。
- [CONFIRMED] 決定事項は残っているか: はい。`local` sandbox 優先、Vercel token は今は使わない。
- [MISSING] 欠落: Vercel sandbox を復旧する手順そのものは未実施。
