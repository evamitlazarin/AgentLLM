# Paper Word Cloud 
# 🍎 evamitlazarin


Extract abstracts from a folder of PDF papers and render a word-cloud graph.

## Backend (Python / Flask)

```bash
cd backend
pip install -r requirements.txt
python app.py            # runs on http://localhost:5000
```

Endpoints:
- `POST /api/scan`   `{ "folder": "/path/to/papers" }` — scans a server-side folder
- `POST /api/upload` multipart `files[]` — process PDFs uploaded from the browser

## Frontend (React)

The app lives in `frontend/src/App.jsx`. Drop it into any React project (Vite/CRA)
that has `d3` installed:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install d3
# replace src/App.jsx with the provided file
npm run dev
```

## How it works
1. Reads the first 3 pages of each PDF (where abstracts live).
2. Regex finds the text between "Abstract" and "Introduction"/"Keywords".
3. Tokenizes, drops stop words, counts the top 80 terms.
4. D3 force simulation lays out words sized & colored by frequency.

Use **Scan folder** when the PDFs sit on the same machine as the backend,
or **Upload PDFs** to send them straight from the browser.
