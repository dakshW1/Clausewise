# Clausewise

Clausewise reads a rent agreement from a photo, checks every clause against a rulebook based on the Model Tenancy Act, 2021, and explains it by voice in Indian languages. Every answer cites the clause and the rule behind it.

- **Gemma 4** reads the document image, checks fairness and answers questions.
- **Sarvam AI** handles speech-to-text, translation and text-to-speech.
- **rules.json** keeps answers grounded: the backend drops any rule id the model cites that is not in the file.

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
| None | Demo mode: cached analysis of the sample agreement, browser speech recognition (Chrome) and browser voices |
| `GEMINI_API_KEY` | Live Gemma 4 analysis of uploaded photos; results cached in `backend/cache/` by image hash |
| `SARVAM_API_KEY` | Sarvam speech-to-text with language detection, translation and Bulbul voice |

Check the exact Gemma 4 model id in Google AI Studio and set `GEMMA_MODEL` in `.env`.

## Demo script

1. Click **Try sample**. The scan shows Reader → Law Checker → Gap Finder → Verifier.
2. The scales tip toward the landlord; score 41/100.
3. Ask in Hindi: "क्या मकान मालिक बिना नोटिस के निकाल सकता है?" The answer is spoken, and Clause 9 + Rule R4 light up.
4. Click **Negotiate for me**, then **Send on WhatsApp**.

Clausewise explains documents; it is not legal advice. Free legal aid: NALSA helpline 15100.
