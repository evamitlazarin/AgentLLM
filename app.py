"""
Paper Word Cloud - Backend
Scans a folder of PDF papers, extracts each abstract, and returns word
frequencies for the frontend to render as a word cloud graph.

Run:
    pip install -r requirements.txt
    python app.py
"""
import os
import re
import io
from collections import Counter
from flask import Flask, request, jsonify
from flask_cors import CORS
from pypdf import PdfReader

app = Flask(__name__)
CORS(app)

# Common English stop words to drop from the cloud.
STOP_WORDS = set("""
a about above after again against all am an and any are aren't as at be because been
before being below between both but by can't cannot could couldn't did didn't do does
doesn't doing don't down during each few for from further had hadn't has hasn't have
haven't having he he'd he'll he's her here here's hers herself him himself his how how's
i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my
myself no nor not of off on once only or other ought our ours ourselves out over own same
shan't she she'd she'll she's should shouldn't so some such than that that's the their
theirs them themselves then there there's these they they'd they'll they're they've this
those through to too under until up very was wasn't we we'd we'll we're we've were weren't
what what's when when's where where's which while who who's whom why why's with won't would
wouldn't you you'd you'll you're you've your yours yourself yourselves also using used use
based results result method methods paper study propose proposed approach show shows shown
two three one new model models data
""".split())


def extract_abstract(text):
    """Pull the abstract from raw PDF text using common heading patterns."""
    norm = re.sub(r"\s+", " ", text)
    # Match "Abstract ... <next section heading>"
    m = re.search(
        r"abstract[\s:.\-]*(.+?)(?:\b(?:1\.?\s*)?introduction\b|"
        r"\bkeywords?\b|\bindex terms\b|\bI\.\s)",
        norm,
        flags=re.IGNORECASE,
    )
    if m and len(m.group(1).strip()) > 40:
        return m.group(1).strip()
    # Fallback: first ~1500 chars after the title area.
    return norm[:1500].strip()


def tokenize(text):
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]{2,}", text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 2]


@app.route("/api/scan", methods=["POST"])
def scan():
    """Scan a server-side folder path for PDFs."""
    data = request.get_json(force=True)
    folder = data.get("folder", "")
    if not folder or not os.path.isdir(folder):
        return jsonify({"error": f"Folder not found: {folder}"}), 400

    return jsonify(_process_files(_read_folder(folder)))


@app.route("/api/upload", methods=["POST"])
def upload():
    """Process PDFs uploaded directly from the browser."""
    papers = []
    for f in request.files.getlist("files"):
        if not f.filename.lower().endswith(".pdf"):
            continue
        try:
            reader = PdfReader(io.BytesIO(f.read()))
            text = "\n".join(p.extract_text() or "" for p in reader.pages[:3])
            papers.append((f.filename, text))
        except Exception as e:
            papers.append((f.filename, f"__ERROR__{e}"))
    return jsonify(_process_files(papers))


def _read_folder(folder):
    papers = []
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith(".pdf"):
            continue
        path = os.path.join(folder, name)
        try:
            reader = PdfReader(path)
            text = "\n".join(p.extract_text() or "" for p in reader.pages[:3])
            papers.append((name, text))
        except Exception as e:
            papers.append((name, f"__ERROR__{e}"))
    return papers


def _process_files(papers):
    counter = Counter()
    out_papers = []
    for name, text in papers:
        if text.startswith("__ERROR__"):
            out_papers.append({"name": name, "error": text[9:], "abstract": ""})
            continue
        abstract = extract_abstract(text)
        counter.update(tokenize(abstract))
        out_papers.append({
            "name": name,
            "abstract": abstract[:600] + ("…" if len(abstract) > 600 else ""),
        })

    top = counter.most_common(80)
    words = [{"text": w, "value": c} for w, c in top]
    return {
        "papers": out_papers,
        "words": words,
        "total_papers": len([p for p in out_papers if not p.get("error")]),
        "unique_words": len(counter),
    }


if __name__ == "__main__":
    app.run(port=5000, debug=True)
