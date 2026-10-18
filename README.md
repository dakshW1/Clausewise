# Clausewise

Clausewise reads a legal document from a photo or PDF, checks every clause against a rulebook for that kind of document, and explains it by voice in Indian languages. Every answer cites the clause and the rule behind it.

- **Gemma 4** works out the document type, reads every clause, checks fairness and answers questions.
- **Sarvam AI** handles speech-to-text, translation and text-to-speech.
- **Rulebooks** in `backend/rulebooks/` keep answers grounded: the backend drops any rule id the model cites that is not in the document's rulebook.

| Document | Rulebook | Sample |
| --- | --- | --- |
| Rent agreement | Model Tenancy Act, 2021 | 11-month lease, Bengaluru |
| Job offer / employment contract | Indian Contract Act, Code on Wages | Software engineer offer, Pune |
| Loan agreement | RBI fair lending and digital lending rules | ₹1.5 lakh app loan |
| Freelance / service contract | MSMED Act, Indian Contract Act, common practice | Brand design project |
| Anything else | General contract fairness | – |

Sample documents live in `backend/samples/`, each with a saved Gemma 4 analysis so the samples work without an API key.

## History and negotiation tracking

Every scan is saved as a case in a local SQLite database (`backend/data/`, not committed). For each case you can:

- mark each flagged clause as agreed, partly agreed, refused or pending, with a note
- log the other side's replies and when you sent the negotiation message
- upload the revised version: Clausewise rescans it, marks clauses that are now fair as agreed, and shows the score before and after
- set the status: reviewing, negotiating, signed or walked away

Two example cases are added on first start so the history page shows what tracking looks like.

## Privacy

- **PDFs:** digital PDFs are read as text in the browser (pdf.js), with ID numbers masked before upload; scanned PDFs are turned into page images that go through the blur step and are uploaded page by page (up to 8 pages).
- **Blur before upload:** after picking a photo, drag over private details to blur them, or let Clausewise find Aadhaar, PAN and phone numbers automatically. Text recognition for this runs in the browser (Tesseract.js); only the blurred photo is uploaded.
- **Redacted text:** Aadhaar, PAN and phone numbers are also masked in the extracted clauses, so they never reach the report, history, voice or WhatsApp messages.
- **On-device option:** Gemma 4 is open-weight, so the same pipeline can run fully offline on a phone or laptop (for example through Ollama). This demo calls Gemma 4 through Google AI Studio.

## Run it

```bash
# 1. Backend (Python 3.11+)
cd backend
python -m venv .venv
.venv/Scripts/activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # add GEMINI_API_KEY and SARVAM_API_KEY
uvicorn main:app --port 8000

# 2. Frontend
cd frontend
npm install
npm run build                     # backend now serves the app at http://127.0.0.1:8000
# or, for live reload: npm run dev  → http://localhost:5173
```

## Modes

| Keys set | What happens |
| --- | --- |
| None | Demo mode: saved analyses of the sample documents, browser speech recognition (Chrome) and browser voices |
| `GEMINI_API_KEY` | Live Gemma 4 analysis of uploaded photos; results cached in `backend/cache/` by image hash |
| `SARVAM_API_KEY` | Sarvam speech-to-text with language detection, translation and Bulbul voice |

Check the exact Gemma 4 model id in Google AI Studio and set `GEMMA_MODEL` in `.env`.

## Demo script

1. Click **Check the sample agreement** (or **Sample documents** for the others). The scan shows Reader → Law Checker → Gap Finder → Verifier.
2. The scales tip toward the landlord; score 41/100.
3. Ask in Hindi: "क्या मकान मालिक बिना नोटिस के निकाल सकता है?" The answer is spoken, and Clause 9 + Rule R4 light up.
4. Click **Negotiate for me**, then **Send on WhatsApp**.

Clausewise explains documents; it is not legal advice. Free legal aid: NALSA helpline 15100.
