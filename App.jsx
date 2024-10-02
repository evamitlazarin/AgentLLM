import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";

const API = "http://localhost:5000";

export default function App() {
  const [folder, setFolder] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef();

  async function scanFolder() {
    setError(""); setLoading(true); setData(null);
    try {
      const r = await fetch(`${API}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Scan failed");
      setData(j);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function uploadFiles(files) {
    if (!files.length) return;
    setError(""); setLoading(true); setData(null);
    const fd = new FormData();
    [...files].forEach((f) => fd.append("files", f));
    try {
      const r = await fetch(`${API}/api/upload`, { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Upload failed");
      setData(j);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={S.page}>
      <header style={S.header}>
        <h1 style={S.title}>Paper Word Cloud</h1>
        <p style={S.sub}>Extract abstracts from a folder of papers and see what they talk about.</p>
      </header>

      <div style={S.controls}>
        <div style={S.row}>
          <input
            style={S.input}
            placeholder="/path/to/papers/folder"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
          <button style={S.btn} onClick={scanFolder} disabled={loading || !folder}>
            Scan folder
          </button>
        </div>
        <div style={S.or}>or</div>
        <div>
          <button style={S.btnGhost} onClick={() => fileInput.current.click()} disabled={loading}>
            Upload PDFs from browser
          </button>
          <input
            ref={fileInput} type="file" accept=".pdf" multiple hidden
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </div>
      </div>

      {loading && <p style={S.muted}>Reading papers…</p>}
      {error && <p style={S.err}>{error}</p>}

      {data && (
        <>
          <div style={S.stats}>
            <Stat n={data.total_papers} label="papers" />
            <Stat n={data.unique_words} label="unique words" />
            <Stat n={data.words.length} label="in cloud" />
          </div>
          <WordGraph words={data.words} />
          <PaperList papers={data.papers} />
        </>
      )}
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div style={S.stat}>
      <div style={S.statN}>{n}</div>
      <div style={S.statL}>{label}</div>
    </div>
  );
}

function WordGraph({ words }) {
  const ref = useRef();
  useEffect(() => {
    if (!words?.length) return;
    const W = 760, H = 460;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    const max = d3.max(words, (d) => d.value);
    const size = d3.scaleSqrt().domain([1, max]).range([13, 56]);
    const color = d3.scaleSequential(d3.interpolateViridis).domain([0, max]);

    const nodes = words.map((d) => ({ ...d, r: size(d.value) * 0.62 }));

    const sim = d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(5))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collide", d3.forceCollide().radius((d) => d.r + 4).strength(0.9))
      .force("x", d3.forceX(W / 2).strength(0.05))
      .force("y", d3.forceY(H / 2).strength(0.05));

    const node = svg.selectAll("text").data(nodes).enter().append("text")
      .text((d) => d.text)
      .attr("font-size", (d) => size(d.value))
      .attr("font-weight", (d) => (d.value > max * 0.5 ? 700 : 500))
      .attr("fill", (d) => color(d.value))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .style("cursor", "default")
      .append("title").text((d) => `${d.text}: ${d.value}`);

    const texts = svg.selectAll("text");
    sim.on("tick", () => {
      texts
        .attr("x", (d) => (d.x = Math.max(d.r, Math.min(W - d.r, d.x))))
        .attr("y", (d) => (d.y = Math.max(d.r, Math.min(H - d.r, d.y))));
    });
    return () => sim.stop();
  }, [words]);

  return (
    <div style={S.graphWrap}>
      <svg ref={ref} style={{ width: "100%", height: "auto" }} />
    </div>
  );
}

function PaperList({ papers }) {
  return (
    <div style={S.papers}>
      <h2 style={S.h2}>Extracted abstracts</h2>
      {papers.map((p, i) => (
        <details key={i} style={S.paper}>
          <summary style={S.paperName}>
            {p.name} {p.error && <span style={S.err}>· error</span>}
          </summary>
          <p style={S.abs}>{p.error ? `Could not read: ${p.error}` : p.abstract}</p>
        </details>
      ))}
    </div>
  );
}

const S = {
  page: { maxWidth: 820, margin: "0 auto", padding: "40px 20px",
    fontFamily: "'Inter', system-ui, sans-serif", color: "#1a1a2e" },
  header: { marginBottom: 28 },
  title: { fontSize: 34, margin: 0, letterSpacing: "-0.02em" },
  sub: { color: "#6b6b80", marginTop: 6 },
  controls: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 },
  row: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "11px 14px", border: "1px solid #d7d7e0",
    borderRadius: 10, fontSize: 15, outline: "none" },
  btn: { padding: "11px 18px", background: "#2d2d6b", color: "#fff",
    border: "none", borderRadius: 10, fontSize: 15, cursor: "pointer", fontWeight: 600 },
  btnGhost: { padding: "10px 16px", background: "#fff", color: "#2d2d6b",
    border: "1px solid #2d2d6b", borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 600 },
  or: { color: "#9a9ab0", fontSize: 13, textAlign: "center" },
  muted: { color: "#6b6b80" },
  err: { color: "#c0392b", fontSize: 13 },
  stats: { display: "flex", gap: 14, margin: "8px 0 20px" },
  stat: { background: "#f4f4fb", borderRadius: 12, padding: "12px 20px", flex: 1, textAlign: "center" },
  statN: { fontSize: 26, fontWeight: 700, color: "#2d2d6b" },
  statL: { fontSize: 12, color: "#6b6b80", textTransform: "uppercase", letterSpacing: "0.05em" },
  graphWrap: { background: "#fafafe", border: "1px solid #ececf5",
    borderRadius: 16, padding: 8, marginBottom: 28 },
  papers: { marginTop: 10 },
  h2: { fontSize: 18, marginBottom: 12 },
  paper: { borderBottom: "1px solid #ececf5", padding: "10px 4px" },
  paperName: { fontWeight: 600, cursor: "pointer", fontSize: 14 },
  abs: { color: "#4a4a60", fontSize: 14, lineHeight: 1.6, marginTop: 8 },
};
