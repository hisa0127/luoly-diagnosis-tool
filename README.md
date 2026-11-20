# Webサイト表示速度 診断ツール

URLを入力するだけで、Webサイトの表示速度と Core Web Vitals を無料で診断できるツールです。
名古屋のフリーランスWeb制作「[L'uoly Web](https://luolyweb.com/)」の個人開発プロジェクトです。

**公開中:** https://tool.luolyweb.com/

## できること

- スマホ / PC を切り替えて診断
- パフォーマンススコアをドーナツグラフで表示
- Core Web Vitals（LCP / CLS、参考値として TBT）の合否を3段階で判定
- PageSpeed Insights の改善提案を、専門用語を噛み砕いた日本語で表示
- 診断結果からそのまま無料相談へ進める導線

## 技術スタック

- Next.js 15（App Router）/ TypeScript / React 19
- PageSpeed Insights API（API Routes 経由でサーバー側から呼び出し）
- デプロイ: Vercel

## 工夫した点

- APIキーはサーバー側（環境変数）でのみ保持し、クライアントに露出させない
- 簡易レート制限（同一IPから10分に10回まで）を実装
- PSI の共有クォータ超過（HTTP 429）時は、混雑メッセージを表示して graceful に劣化
- ラボデータに INP が含まれないため、INP の代わりに TBT を「参考値」として明示して表示

## ローカルで動かす

```bash
npm install
cp .env.example .env.local
# .env.local の PAGESPEED_API_KEY に Google Cloud Console で取得したキーを設定
npm run dev
```

APIキーは [Google Cloud Console](https://console.cloud.google.com/) で PageSpeed Insights API を有効化すると無料で取得できます（未設定でも共有クォータで動作しますが、1日の上限に達しやすくなります）。

## 構成

- `app/page.tsx` — 診断フォーム、スコア表示、改善提案のUI
- `app/api/diagnose/route.ts` — PSI API の呼び出し、指標の正規化、改善提案の日本語マッピング、レート制限
- `SPEC.md` — 仕様メモ
