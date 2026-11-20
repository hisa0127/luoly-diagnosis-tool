import { NextRequest, NextResponse } from "next/server";

// 簡易レート制限（同一IPから10分間に10回まで）※サーバーレスでは
// インスタンス単位の目安。本格運用では外部ストアへの移行を検討。
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 10;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_HITS) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

// 改善提案の平易な日本語訳（よく出るものだけ。無ければPSIのタイトルを使う）
const SUGGESTION_JA: Record<string, string> = {
  "render-blocking-resources": "表示を遅らせるファイルの読み込みを後回しにする",
  "unused-css-rules": "使っていないCSSを減らして、読み込みを軽くする",
  "unused-javascript": "使っていないJavaScriptを減らして、読み込みを軽くする",
  "modern-image-formats": "画像をWebPなどの軽い形式に変える",
  "uses-optimized-images": "画像を圧縮してファイルサイズを小さくする",
  "uses-responsive-images": "画像のサイズを表示サイズに合わせる",
  "offscreen-images": "画面に映っていない画像は、後から読み込む",
  "unminified-css": "CSSを圧縮して軽くする",
  "unminified-javascript": "JavaScriptを圧縮して軽くする",
  "uses-text-compression": "ファイルを圧縮して転送する（gzip / Brotli）",
  "uses-long-cache-ttl": "画像などをブラウザに保存して、2回目以降を速くする",
  "efficient-animated-content": "重いアニメーション画像を動画形式に変える",
  "duplicated-javascript": "重複しているJavaScriptを整理する",
  "legacy-javascript": "古いブラウザ向けのコードを減らす",
  "total-byte-weight": "ページ全体のデータ量を減らす",
  "uses-rel-preconnect": "外部サーバーへの接続を早めに始める",
  "font-display": "フォントの読み込み方法を見直して、文字の表示を速くする",
  "third-party-summary": "外部サービスの読み込みが重くなっていないか見直す",
  "bootup-time": "JavaScriptの処理時間を短くする",
  "mainthread-work-breakdown": "ページ表示中の重い処理を減らす",
  "dom-size": "ページの要素数が多すぎないか見直す",
  "largest-contentful-paint-element": "一番大きな要素（画像や見出し）の表示を速くする",
  "layout-shifts": "読み込み中にレイアウトがずれないよう、画像などのサイズを先に決める",
  "unsized-images": "画像の幅と高さを先に指定して、表示のズレを防ぐ",
};

type Metric = {
  id: string;
  label: string;
  display: string;
  pass: boolean | null; // null = 参考値（合否なし）
};

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "診断が混み合っています。少し時間をおいてお試しください。" },
      { status: 429 }
    );
  }

  let body: { url?: string; strategy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  const rawUrl = (body.url ?? "").trim();
  const strategy = body.strategy === "desktop" ? "desktop" : "mobile";

  let target: URL;
  try {
    target = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    if (!/^https?:$/.test(target.protocol)) throw new Error();
  } catch {
    return NextResponse.json(
      { error: "URLの形式を確認してください（例: https://example.com）。" },
      { status: 400 }
    );
  }

  const psi = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  psi.searchParams.set("url", target.toString());
  psi.searchParams.set("strategy", strategy);
  psi.searchParams.set("category", "performance");
  psi.searchParams.set("locale", "ja");
  if (process.env.PAGESPEED_API_KEY) {
    psi.searchParams.set("key", process.env.PAGESPEED_API_KEY);
  }

  let data: any;
  try {
    const res = await fetch(psi.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
    data = await res.json();
    if (res.status === 429) {
      // APIキー未設定時の共有クォータ超過、またはキー側の上限
      return NextResponse.json(
        { error: "本日の診断が混み合っています。時間をおいてお試しください。" },
        { status: 429 }
      );
    }
    if (!res.ok) throw new Error(data?.error?.message || `PSI ${res.status}`);
  } catch (e) {
    return NextResponse.json(
      { error: "計測に失敗しました。URLが公開されているか確認して、もう一度お試しください。" },
      { status: 502 }
    );
  }

  const lh = data.lighthouseResult;
  const audits = lh?.audits ?? {};
  const score = Math.round((lh?.categories?.performance?.score ?? 0) * 100);

  const num = (id: string) =>
    typeof audits[id]?.numericValue === "number" ? audits[id].numericValue : null;
  const disp = (id: string) => audits[id]?.displayValue ?? "—";

  const metrics: Metric[] = [];
  const lcp = num("largest-contentful-paint");
  if (lcp !== null) {
    metrics.push({
      id: "lcp",
      label: "LCP（一番大きな要素が出るまで）",
      display: disp("largest-contentful-paint"),
      pass: lcp <= 2500,
    });
  }
  const inp = num("interaction-to-next-paint");
  if (inp !== null) {
    metrics.push({
      id: "inp",
      label: "INP（操作への反応の速さ）",
      display: disp("interaction-to-next-paint"),
      pass: inp <= 200,
    });
  } else {
    const tbt = num("total-blocking-time");
    if (tbt !== null) {
      metrics.push({
        id: "tbt",
        label: "応答の速さ（参考値）",
        display: disp("total-blocking-time"),
        pass: null,
      });
    }
  }
  const cls = num("cumulative-layout-shift");
  if (cls !== null) {
    metrics.push({
      id: "cls",
      label: "CLS（表示のズレの少なさ）",
      display: disp("cumulative-layout-shift"),
      pass: cls <= 0.1,
    });
  }

  const suggestions = Object.values(audits)
    .filter(
      (a: any) =>
        a?.details?.type === "opportunity" &&
        typeof a.details?.overallSavingsMs === "number" &&
        a.details.overallSavingsMs >= 100 &&
        a.score !== null &&
        a.score < 0.9
    )
    .sort(
      (a: any, b: any) =>
        (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0)
    )
    .slice(0, 5)
    .map((a: any) => ({
      title: SUGGESTION_JA[a.id] ?? a.title,
      savings: a.displayValue ?? "",
    }));

  return NextResponse.json({
    url: target.toString(),
    strategy,
    score,
    metrics,
    suggestions,
    testedAt: new Date().toISOString(),
  });
}
