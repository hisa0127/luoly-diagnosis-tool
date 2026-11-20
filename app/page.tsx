"use client";

import { useState } from "react";

type Metric = {
  id: string;
  label: string;
  display: string;
  pass: boolean | null;
};

type Result = {
  url: string;
  strategy: string;
  score: number;
  metrics: Metric[];
  suggestions: { title: string; savings: string }[];
  testedAt: string;
};

function scoreColor(score: number) {
  if (score >= 90) return "#4ade80";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

function verdict(score: number) {
  if (score >= 90) return "良好です。この速さを保ちましょう";
  if (score >= 50) return "改善の余地があります";
  return "表示速度に課題があります";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function diagnose(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "診断に失敗しました。");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "診断に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  const R = 64;
  const C = 2 * Math.PI * R;

  return (
    <main className="wrap">
      <div className="sparkle">✦</div>
      <h1>
        Webサイト表示速度
        <br />
        診断ツール
      </h1>
      <p className="lead">
        URLを入れるだけで、サイトの表示速度と
        <br />
        Core Web Vitals（Googleの評価指標）を無料で診断します。
      </p>

      <section className="panel">
        <form onSubmit={diagnose}>
          <div className="form">
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              aria-label="診断するサイトのURL"
            />
            <div className="toggle" role="group" aria-label="計測環境">
              <button
                type="button"
                className={strategy === "mobile" ? "active" : ""}
                onClick={() => setStrategy("mobile")}
              >
                スマホ
              </button>
              <button
                type="button"
                className={strategy === "desktop" ? "active" : ""}
                onClick={() => setStrategy("desktop")}
              >
                PC
              </button>
            </div>
          </div>
          <button className="submit" type="submit" disabled={loading}>
            {loading ? "診断中…" : "無料で診断する"}
          </button>
        </form>
        <p className="note">
          計測には30秒ほどかかる場合があります。計測はGoogle PageSpeed
          Insightsを利用しています。
        </p>

        {loading && (
          <div className="loading">
            <span className="star">✦</span>
            <br />
            サイトを計測しています…
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {result && (
          <div className="result">
            <div className="score-row">
              <div className="score-circle" aria-label={`スコア ${result.score}`}>
                <svg width="148" height="148" viewBox="0 0 148 148">
                  <circle
                    cx="74"
                    cy="74"
                    r={R}
                    fill="none"
                    stroke="rgba(169,209,255,.18)"
                    strokeWidth="10"
                  />
                  <circle
                    cx="74"
                    cy="74"
                    r={R}
                    fill="none"
                    stroke={scoreColor(result.score)}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C - (C * result.score) / 100}
                  />
                </svg>
                <div className="score-num">
                  <b>{result.score}</b>
                  <span>PERFORMANCE</span>
                </div>
              </div>
              <div className="score-meta">
                <p className="target">
                  {result.url}（{result.strategy === "mobile" ? "スマホ" : "PC"}で計測）
                </p>
                <p className="verdict">{verdict(result.score)}</p>
                <p className="target">
                  スコアは100点満点です。90点以上が「良好」の目安です。
                </p>
              </div>
            </div>

            <div className="metrics">
              {result.metrics.map((m) => (
                <div className="metric" key={m.id}>
                  <p className="m-label">{m.label}</p>
                  <p className="m-value">{m.display}</p>
                  {m.pass === null ? (
                    <span className="badge ref">参考値</span>
                  ) : m.pass ? (
                    <span className="badge good">良好</span>
                  ) : (
                    <span className="badge warn">要改善</span>
                  )}
                </div>
              ))}
            </div>

            {result.suggestions.length > 0 && (
              <div className="suggestions">
                <h2>改善のヒント</h2>
                <ul>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>
                      {s.title}
                      {s.savings && (
                        <>
                          <br />
                          <span className="savings">{s.savings}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="cta">
              <p>
                表示速度は、検索順位と売上に直結します。
                <br />
                改善の進め方を、無料相談でお話しできます。
              </p>
              <a href="https://luolyweb.com/#contact">改善の相談はこちら（無料）</a>
              <div className="chips">
                <span>✦ 24時間以内に返信</span>
                <span>✦ 修正は3回まで無料</span>
                <span>✦ まずは無料相談から</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer>
        制作: <a href="https://luolyweb.com/">L&apos;uoly Web（名古屋のWeb制作）</a>
        <br />
        計測データ: Google PageSpeed Insights
      </footer>
    </main>
  );
}
