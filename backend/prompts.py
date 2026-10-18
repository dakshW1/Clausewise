"""Prompt templates sent to Gemma 4. Each one asks for strict JSON only."""

DOC_TYPES = "rent|employment|loan|freelance|general"

CATEGORIES = (
    # rent
    "parties|premises|rent|deposit|refund|rent_revision|lock_in|repairs|entry|eviction|utilities|"
    "essential_services|notice|maintenance_charges|dispute_resolution|"
    # employment
    "salary|probation|working_hours|leave|bond|non_compete|ip|termination|final_settlement|unilateral_changes|confidentiality|"
    # loan
    "loan_amount|emi|interest|fees|rate_change|prepayment|penal_charges|recovery|data_access|grievance|cooling_off|"
    # freelance and general
    "scope|payment|revisions|liability|exclusivity|late_payment|renewal|restraint|term|other"
)

EXTRACT = f"""You are reading a legal document from India. It may be a rent agreement, a job offer or employment
contract, a loan agreement, a freelance or service contract, or another contract.
Extract EVERY numbered clause, in order. Return ONLY valid JSON, no markdown, in this shape:
{{
  "doc_type": "{DOC_TYPES}",
  "title": "short descriptive title in Title Case, e.g. 'Rental Agreement: Flat 304, Bengaluru'",
  "clauses": [
    {{"id": "C1", "number": "1", "category": "{CATEGORIES}",
      "title": "2-4 word heading in Title Case", "text": "original wording, verbatim",
      "simple": "one plain-English sentence a 12-year-old understands"}}
  ],
  "key_facts": [{{"label": "Monthly rent", "value": "Rs. 18,000"}}],
  "key_values": {{
    "rent": number|null, "deposit": number|null, "deposit_months": number|null,
    "lock_in_months": number|null, "lock_in_penalty_months": number|null,
    "tenant_notice_days": number|null, "landlord_notice_days": number|null,
    "term_months": number|null, "start_date": "YYYY-MM-DD"|null, "rent_increase_pct": number|null
  }}
}}
Rules: "key_facts" = the 4 to 6 most important amounts, dates and durations, values as short strings.
"key_values" is only for rent agreements; for any other document type return an empty object {{}}.
Use null for anything not stated. Never invent clauses or numbers.
If a rent clause allows cutting water or electricity, use category "essential_services".
"""

FAIRNESS = """You check a {doc_label} from India against a fixed RULEBOOK, from the point of view of the {you}.
You may ONLY cite rule ids that exist in RULES.

CLAUSES:
{clauses}

RULES:
{rules}

CHECKLIST (clauses every fair {doc_label} should have):
{checklist}

Return ONLY valid JSON, no markdown:
{{
  "flags": [{{"clause_id": "C3", "rule_id": "<id from RULES>" or null, "severity": "red|amber|green",
              "reason": "max 18 words, plain English, mention the numbers"}}],
  "missing": [{{"category": "<checklist category>", "why": "max 15 words on why it matters"}}],
  "comparisons": [{{"label": "Short name", "yours": 5, "benchmark": 2,
                    "unit": "unit for both numbers", "clause_id": "C3", "rule_id": "<id>"}}]
}}
Give one flag per clause. A clause that breaks a rule's benchmark is red if the rule says "against the law",
"against RBI rules", "against the model law" or "against fair practice", and amber if it says "unusual".
A clause no rule covers is green with rule_id null.
"missing" = checklist categories not covered by any clause, or covered so vaguely they are useless.
"comparisons" = up to 4 numeric gaps between the document and a benchmark (numbers only, same unit).
"""

ASK = """You help a {you} understand their {doc_label}. Answer the QUESTION using ONLY the CLAUSES and RULES.

CLAUSES:
{clauses}

RULES:
{rules}

QUESTION: {question}

Return ONLY valid JSON, no markdown:
{{"answer": "max 3 short sentences, simple English. Say 'Clause 9', never internal ids like C9 or R4",
  "clause_ids": ["C9"], "rule_ids": ["<rule id>"], "confidence": "high|low"}}
If the document does not cover the question, say so and set confidence to "low".
"""

NEGOTIATE = """Write a short, polite WhatsApp message from the {you} to the {them} about these concerns
in their {doc_label}. Propose the fair value for each one and mention the relevant law or rule in plain words.
Warm and respectful, not aggressive. Start with "Namaste ji". Never use placeholders like [Name]. Max 90 words.

CONCERNS:
{concerns}

Return ONLY valid JSON: {{"message": "..."}}
"""
