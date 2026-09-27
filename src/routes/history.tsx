// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CircleAlert, LoaderCircle, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { listAnalyses, getAnalysis } from "@/functions/history.functions";
import { AnalysisResultView } from "@/components/verilex/result-view";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — VeriLex" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [loadingList, setLoadingList] = useState(true);

  const [selected, setSelected] = useState(null);
  const [selectedError, setSelectedError] = useState("");
  const [loadingSelected, setLoadingSelected] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/history" } });
      return;
    }
    let active = true;
    setLoadingList(true);
    listAnalyses()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load your history.");
      })
      .finally(() => {
        if (active) setLoadingList(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, navigate]);

  const openAnalysis = async (id: string) => {
    setSelectedError("");
    setLoadingSelected(true);
    try {
      const row = await getAnalysis({ data: { id } });
      setSelected(row);
    } catch (err) {
      setSelectedError(err instanceof Error ? err.message : "Could not load that analysis.");
    } finally {
      setLoadingSelected(false);
    }
  };

  if (authLoading || (!user && !error)) {
    return (
      <main className="history-page">
        <div className="history-loading">
          <LoaderCircle className="spin" /> Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="history-page">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="VeriLex home">
          <span className="brand-mark">
            <Scale />
          </span>
          <span>
            VERI<span>LEX</span>
          </span>
        </Link>
        <Link to="/">
          <Button type="button" variant="outline">
            <ArrowLeft /> Back to analyzer
          </Button>
        </Link>
      </header>

      <section className="history-body">
        <h1>Your analysis history</h1>

        {error && (
          <p className="error-message">
            <CircleAlert />
            {error}
          </p>
        )}

        {loadingList ? (
          <div className="history-loading">
            <LoaderCircle className="spin" /> Loading your analyses…
          </div>
        ) : items && items.length === 0 ? (
          <p className="history-empty">
            You haven't run any analyses yet. <Link to="/">Run your first one</Link>.
          </p>
        ) : (
          <div className="history-layout">
            <ul className="history-list">
              {items?.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`history-item${selected?.id === item.id ? " active" : ""}`}
                    onClick={() => openAnalysis(item.id)}
                  >
                    <span className="history-item-date">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <strong className="history-item-question">{item.question}</strong>
                    <span className="history-item-meta">
                      {item.jurisdiction && item.jurisdiction !== "Not specified"
                        ? item.jurisdiction
                        : "Jurisdiction not specified"}
                      {typeof item.issueCount === "number"
                        ? ` · ${item.issueCount} ${item.issueCount === 1 ? "issue" : "issues"}`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="history-detail">
              {loadingSelected && (
                <div className="history-loading">
                  <LoaderCircle className="spin" /> Loading analysis…
                </div>
              )}
              {selectedError && (
                <p className="error-message">
                  <CircleAlert />
                  {selectedError}
                </p>
              )}
              {!loadingSelected && !selectedError && selected && (
                <section className="results" aria-live="polite">
                  <div className="results-header">
                    <div>
                      <p className="section-number">SAVED ANALYSIS</p>
                      <h2>{selected.question}</h2>
                      <p>{selected.summary}</p>
                    </div>
                  </div>
                  <AnalysisResultView result={selected.result} />
                </section>
              )}
              {!loadingSelected && !selectedError && !selected && (
                <p className="history-empty">
                  Select an analysis on the left to view its full report.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
