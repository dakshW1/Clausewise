"""Prompt templates sent to Gemma 4. Each one asks for strict JSON only."""

CATEGORIES = (
    "parties|premises|rent|deposit|refund|rent_revision|lock_in|repairs|entry|"
    "eviction|utilities|essential_services|notice|maintenance_charges|dispute_resolution|other"
)

EXTRACT = f"""You are reading a residential rent agreement from India.
Extract EVERY numbered clause, in order. Return ONLY valid JSON, no markdown, in this shape:
{{
  "title": "short document title",
  "clauses": [
    {{"id": "C1", "number": "1", "category": "{CATEGORIES}",
      "title": "2-4 word heading", "text": "original wording, verbatim",
      "simple": "one plain-English sentence a 12-year-old understands"}}
  ],
  "key_values": {{
    "rent": number|null, "deposit": number|null, "deposit_months": number|null,
    "lock_in_months": number|null, "lock_in_penalty_months": number|null,
    "tenant_notice_days": number|null, "landlord_notice_days": number|null,
    "term_months": number|null, "start_date": "YYYY-MM-DD"|null, "rent_increase_pct": number|null
  }}
}}
Rules: use null for anything not stated. Never invent clauses or numbers.
If a clause allows cutting water or electricity, use category "essential_services".
"""

FAIRNESS = """You check a rent agreement against a fixed RULEBOOK. You may ONLY cite rule ids that exist in RULES.

CLAUSES:
{clauses}

RULES:
{rules}

CHECKLIST (clauses every fair agreement should have):
{checklist}

Return ONLY valid JSON, no markdown:
{{
  "flags": [{{"clause_id": "C3", "rule_id": "R1" or null, "severity": "red|amber|green",
              "reason": "max 18 words, plain English, mention the numbers"}}],
  "missing": [{{"category": "<checklist category>", "why": "max 15 words on why it matters"}}],
  "comparisons": [{{"label": "Security deposit", "yours": 5, "benchmark": 2,
                    "unit": "months of rent", "clause_id": "C3", "rule_id": "R1"}}]
}}
Give one flag per clause. A clause that breaks a rule's benchmark is red if the rule says "against the model law",
amber if it says "unusual". A clause no rule covers is green with rule_id null.
"missing" = checklist categories not covered by any clause, or covered so vaguely they are useless.
"comparisons" = up to 4 numeric gaps between the agreement and a benchmark (numbers only, same unit).
"""

ASK = """You help a tenant understand their rent agreement. Answer the QUESTION using ONLY the CLAUSES and RULES.

CLAUSES:
{clauses}

RULES:
{rules}

QUESTION: {question}

Return ONLY valid JSON, no markdown:
{{"answer": "max 3 short sentences, simple English. Say 'Clause 9', never internal ids like C9 or R4",
  "clause_ids": ["C9"], "rule_ids": ["R4"], "confidence": "high|low"}}
If the agreement does not cover the question, say so and set confidence to "low".
"""

NEGOTIATE = """Write a short, polite WhatsApp message from the tenant to the landlord about these concerns
in their rent agreement. Propose the fair value for each one and mention the national model tenancy law in plain words.
Warm and respectful, not aggressive. Start with "Namaste ji". Never use placeholders like [Name]. Max 90 words.

CONCERNS:
{concerns}

Return ONLY valid JSON: {{"message": "..."}}
"""
