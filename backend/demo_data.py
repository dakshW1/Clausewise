"""Cached Gemma output for the sample agreement, used when no API key is set or the network fails.

The shapes match what Gemma returns, so demo results go through the same post-processing as live ones.
"""

EXTRACTION = {
    "title": "Rental Agreement: Flat 304, Lakeview Residency, Bengaluru",
    "clauses": [
        {"id": "C1", "number": "1", "category": "premises", "title": "Premises and term",
         "text": "The Landlord lets the flat No. 304, Lakeview Residency, HSR Layout, Bengaluru to the Tenant for residential use for a period of 11 months starting 1 November 2026.",
         "simple": "You rent flat 304 for 11 months, starting 1 November 2026."},
        {"id": "C2", "number": "2", "category": "rent", "title": "Monthly rent",
         "text": "The Tenant shall pay a monthly rent of Rs. 18,000 (Rupees Eighteen Thousand only) on or before the 5th day of every month.",
         "simple": "You pay Rs. 18,000 every month, by the 5th."},
        {"id": "C3", "number": "3", "category": "deposit", "title": "Security deposit",
         "text": "The Tenant shall pay an interest-free security deposit of Rs. 90,000 (Rupees Ninety Thousand only) before taking possession.",
         "simple": "You pay Rs. 90,000 upfront as a deposit, with no interest."},
        {"id": "C4", "number": "4", "category": "refund", "title": "Deposit refund",
         "text": "The deposit shall be refunded at the sole discretion of the Landlord after deducting painting, cleaning and any other charges the Landlord considers necessary.",
         "simple": "The landlord alone decides how much of your deposit you get back."},
        {"id": "C5", "number": "5", "category": "rent_revision", "title": "Rent increase",
         "text": "The Landlord may increase the rent by up to 10% at any time during the tenancy.",
         "simple": "The landlord can raise your rent by 10% whenever they want."},
        {"id": "C6", "number": "6", "category": "lock_in", "title": "Lock-in period",
         "text": "There is a lock-in period of 6 months. If the Tenant leaves before the lock-in ends, one month's rent shall be forfeited from the deposit.",
         "simple": "If you leave in the first 6 months, you lose one month's rent from your deposit."},
        {"id": "C7", "number": "7", "category": "repairs", "title": "Repairs",
         "text": "All repairs to the premises, including structural repairs, plumbing and electrical faults, shall be carried out at the Tenant's cost.",
         "simple": "You pay for every repair, even big structural ones."},
        {"id": "C8", "number": "8", "category": "entry", "title": "Inspection",
         "text": "The Landlord or his agent may enter and inspect the premises at any time without prior notice.",
         "simple": "The landlord can walk into your home at any time without telling you."},
        {"id": "C9", "number": "9", "category": "eviction", "title": "Termination by landlord",
         "text": "The Landlord may terminate this agreement for any reason by giving 15 days' notice, and the Tenant shall vacate the premises accordingly.",
         "simple": "The landlord can make you leave for any reason with just 15 days' notice."},
        {"id": "C10", "number": "10", "category": "essential_services", "title": "Utilities",
         "text": "Electricity and water charges shall be paid by the Tenant as per meter readings. The Landlord may disconnect electricity and water supply if any payment is delayed.",
         "simple": "You pay the bills; if you are late, the landlord can cut your power and water."},
        {"id": "C11", "number": "11", "category": "notice", "title": "Notice by tenant",
         "text": "The Tenant may vacate the premises by giving 2 months' written notice to the Landlord after the lock-in period.",
         "simple": "After 6 months, you can leave by giving 2 months' written notice."},
    ],
    "key_values": {
        "rent": 18000, "deposit": 90000, "deposit_months": 5,
        "lock_in_months": 6, "lock_in_penalty_months": 1,
        "tenant_notice_days": 60, "landlord_notice_days": 15,
        "term_months": 11, "start_date": "2026-11-01", "rent_increase_pct": 10,
    },
}

FAIRNESS = {
    "flags": [
        {"clause_id": "C1", "rule_id": None, "severity": "green", "reason": "Standard description of the flat and an 11-month term."},
        {"clause_id": "C2", "rule_id": None, "severity": "green", "reason": "Clear rent of Rs. 18,000 with a fixed due date."},
        {"clause_id": "C3", "rule_id": "R1", "severity": "red", "reason": "Deposit is 5 months' rent; the model law caps it at 2 months (Rs. 36,000)."},
        {"clause_id": "C4", "rule_id": "R2", "severity": "amber", "reason": "Refund is at the landlord's sole discretion, with open-ended deductions."},
        {"clause_id": "C5", "rule_id": "R3", "severity": "red", "reason": "Rent can rise 10% at any time; the model law needs 3 months' written notice."},
        {"clause_id": "C6", "rule_id": "R8", "severity": "green", "reason": "6-month lock-in and 1-month penalty are within common practice."},
        {"clause_id": "C7", "rule_id": "R7", "severity": "amber", "reason": "Tenant pays structural repairs, which are normally the landlord's job."},
        {"clause_id": "C8", "rule_id": "R6", "severity": "amber", "reason": "Entry any time without notice; the norm is 24 hours' written notice."},
        {"clause_id": "C9", "rule_id": "R4", "severity": "red", "reason": "Eviction for any reason on 15 days' notice; the model law requires the Rent Court."},
        {"clause_id": "C10", "rule_id": "R5", "severity": "red", "reason": "Allows cutting water and electricity, which the model law forbids."},
        {"clause_id": "C11", "rule_id": None, "severity": "green", "reason": "2 months' notice from the tenant is a common, fair term."},
    ],
    "missing": [
        {"category": "refund_timeline", "why": "Without a deadline, the landlord can delay returning your deposit for months."},
        {"category": "maintenance_charges", "why": "Society charges are unclear, so surprise monthly costs can appear later."},
        {"category": "dispute_resolution", "why": "Nothing says how disagreements are settled, which favours the stronger party."},
    ],
    "comparisons": [
        {"label": "Security deposit", "yours": 5, "benchmark": 2, "unit": "months of rent", "clause_id": "C3", "rule_id": "R1"},
        {"label": "Notice before rent increase", "yours": 0, "benchmark": 3, "unit": "months", "clause_id": "C5", "rule_id": "R3"},
        {"label": "Notice before landlord entry", "yours": 0, "benchmark": 24, "unit": "hours", "clause_id": "C8", "rule_id": "R6"},
    ],
}

# Keyword-matched answers for demo mode. Checked in order; first match wins.
QA = [
    {
        "keywords": ["evict", "nikaal", "nikal", "terminate", "throw", "निकाल", "बेदखल"],
        "en": "Clause 9 lets the landlord end the agreement for any reason with only 15 days' notice. Under the model tenancy law, a tenant can be evicted only through the Rent Court, on specific grounds. Ask for this clause to be removed.",
        "hi": "क्लॉज़ 9 के अनुसार मकान मालिक किसी भी कारण से सिर्फ़ 15 दिन के नोटिस पर आपको घर खाली करने को कह सकता है। मॉडल किरायेदारी कानून के अनुसार किरायेदार को केवल रेंट कोर्ट के ज़रिए, तय कारणों पर ही निकाला जा सकता है। इस क्लॉज़ को हटाने की माँग करें।",
        "clause_ids": ["C9"], "rule_ids": ["R4"], "confidence": "high",
    },
    {
        "keywords": ["leave", "early", "chhod", "chod", "jaldi", "exit", "छोड़", "जल्दी"],
        "en": "There is a 6-month lock-in (clause 6). If you leave before it ends, one month's rent, Rs. 18,000, is kept from your deposit. After 6 months you can leave with 2 months' written notice (clause 11).",
        "hi": "क्लॉज़ 6 के अनुसार 6 महीने का लॉक-इन है। अगर आप उससे पहले घर छोड़ते हैं, तो डिपॉज़िट से एक महीने का किराया, यानी 18,000 रुपये, कट जाएगा। 6 महीने के बाद आप 2 महीने का लिखित नोटिस देकर घर छोड़ सकते हैं (क्लॉज़ 11)।",
        "clause_ids": ["C6", "C11"], "rule_ids": ["R8"], "confidence": "high",
    },
    {
        "keywords": ["deposit", "security", "refund", "jama", "wapas", "डिपॉज़िट", "जमा", "वापस"],
        "en": "Your deposit is Rs. 90,000, which is 5 months' rent (clause 3). The model law caps it at 2 months, which is Rs. 36,000. Clause 4 also lets the landlord alone decide how much you get back.",
        "hi": "आपका डिपॉज़िट 90,000 रुपये है, यानी 5 महीने का किराया (क्लॉज़ 3)। मॉडल कानून के अनुसार यह ज़्यादा से ज़्यादा 2 महीने, यानी 36,000 रुपये होना चाहिए। क्लॉज़ 4 के अनुसार कितना पैसा लौटेगा, यह सिर्फ़ मकान मालिक तय करेगा।",
        "clause_ids": ["C3", "C4"], "rule_ids": ["R1", "R2"], "confidence": "high",
    },
    {
        "keywords": ["increase", "hike", "badh", "raise", "बढ़"],
        "en": "Clause 5 lets the landlord raise the rent by up to 10% at any time. The model law says rent can change only with written notice 3 months before the new rent applies.",
        "hi": "क्लॉज़ 5 के अनुसार मकान मालिक कभी भी किराया 10% तक बढ़ा सकता है। मॉडल कानून के अनुसार नया किराया लागू होने से 3 महीने पहले लिखित नोटिस देना ज़रूरी है।",
        "clause_ids": ["C5"], "rule_ids": ["R3"], "confidence": "high",
    },
    {
        "keywords": ["repair", "marammat", "fix", "plumb", "leak", "मरम्मत"],
        "en": "Clause 7 makes you pay for all repairs, including structural ones like walls and pipes. Normally the landlord pays for structural repairs and you handle small day-to-day fixes.",
        "hi": "क्लॉज़ 7 के अनुसार हर मरम्मत का खर्च आपको देना होगा, दीवार और पाइप जैसी बड़ी मरम्मत का भी। आम तौर पर बड़ी मरम्मत मकान मालिक करता है और छोटी-मोटी मरम्मत किरायेदार।",
        "clause_ids": ["C7"], "rule_ids": ["R7"], "confidence": "high",
    },
    {
        "keywords": ["enter", "inspect", "privacy", "visit", "andar", "अंदर", "निरीक्षण"],
        "en": "Clause 8 lets the landlord enter your home at any time without notice. The usual standard is at least 24 hours' written notice, at reasonable hours.",
        "hi": "क्लॉज़ 8 के अनुसार मकान मालिक बिना बताए कभी भी आपके घर में आ सकता है। सामान्य नियम यह है कि कम से कम 24 घंटे पहले लिखित सूचना दी जाए, और सही समय पर आया जाए।",
        "clause_ids": ["C8"], "rule_ids": ["R6"], "confidence": "high",
    },
    {
        "keywords": ["electric", "water", "power", "bijli", "paani", "pani", "बिजली", "पानी"],
        "en": "Clause 10 lets the landlord cut your electricity and water if a payment is late. The model law does not allow a landlord to cut essential supplies.",
        "hi": "क्लॉज़ 10 के अनुसार भुगतान में देर होने पर मकान मालिक आपकी बिजली और पानी काट सकता है। मॉडल कानून मकान मालिक को ज़रूरी सेवाएँ काटने की इजाज़त नहीं देता।",
        "clause_ids": ["C10"], "rule_ids": ["R5"], "confidence": "high",
    },
]

QA_FALLBACK = {
    "en": "I couldn't find this in your agreement. For advice on your situation, call the free legal aid helpline 15100 (NALSA).",
    "hi": "यह बात आपके एग्रीमेंट में नहीं मिली। अपनी स्थिति पर सलाह के लिए मुफ़्त कानूनी सहायता हेल्पलाइन 15100 (NALSA) पर कॉल करें।",
    "clause_ids": [], "rule_ids": [], "confidence": "low",
}

NEGOTIATE = {
    "en": "Namaste Suresh ji, thank you for the agreement, I'm happy to go ahead. I had a few small requests, in line with the national Model Tenancy Act: could we keep the deposit at 2 months (Rs. 36,000), give 3 months' notice before any rent increase, and remove the 15-day termination and supply-disconnection clauses? A refund date for the deposit would also help. Happy to discuss. Thank you! - Priya",
    "hi": "नमस्ते सुरेश जी, एग्रीमेंट के लिए धन्यवाद, मैं आगे बढ़ना चाहती हूँ। राष्ट्रीय मॉडल किरायेदारी कानून के अनुसार मेरे कुछ छोटे अनुरोध हैं: क्या डिपॉज़िट 2 महीने (36,000 रुपये) रखा जा सकता है, किराया बढ़ाने से 3 महीने पहले नोटिस दिया जा सकता है, और 15 दिन में घर खाली कराने व बिजली-पानी काटने वाले क्लॉज़ हटाए जा सकते हैं? डिपॉज़िट लौटाने की तारीख भी तय हो जाए तो अच्छा रहेगा। धन्यवाद! - प्रिया",
}

QA_RETRY = {
    "en": "Sorry, that took too long to answer. Please ask again in a moment.",
    "hi": "माफ़ कीजिए, जवाब देने में बहुत समय लग गया। कृपया थोड़ी देर में दोबारा पूछें।",
    "clause_ids": [], "rule_ids": [], "confidence": "low",
}

QA_NO_KEY = {
    "en": "Live answers for this document need a Gemini API key. The full report above still shows every flagged clause.",
    "hi": "इस दस्तावेज़ पर सवालों के लाइव जवाब के लिए Gemini API key चाहिए। ऊपर की रिपोर्ट में सभी चिह्नित क्लॉज़ दिखाए गए हैं।",
    "clause_ids": [], "rule_ids": [], "confidence": "low",
}

# The two-sided debate for the rent sample, used when Gemma isn't available.
DEBATE = {
    "debate": [
        {"clause_id": "C3",
         "advocate": "Five months' rent locks away Rs. 90,000. The model law caps a residential deposit at two months, Rs. 36,000.",
         "other_side": "Landlords in big cities often ask for more because unpaid rent and damage are hard to recover through courts.",
         "verdict": "Two months is the benchmark. A middle ground is two months plus a clear, itemised damage process."},
        {"clause_id": "C5",
         "advocate": "A 10% rise at any time makes the rent unpredictable. The model law needs three months' written notice.",
         "other_side": "Maintenance and taxes rise during the year, and the landlord wants room to keep up.",
         "verdict": "A fixed yearly increase, announced three months ahead, protects both sides."},
        {"clause_id": "C9",
         "advocate": "Eviction for any reason on 15 days' notice leaves the tenant homeless at short notice. The model law requires the Rent Court.",
         "other_side": "The landlord may need the flat back quickly for family or sale and fears a long legal process.",
         "verdict": "Termination should need listed reasons and at least two to three months' notice."},
        {"clause_id": "C10",
         "advocate": "Cutting water and electricity over a late payment is forbidden under the model law.",
         "other_side": "The landlord pays the bills upfront and wants a way to make sure they are repaid.",
         "verdict": "Late fees are fair; cutting essential supplies is not. Replace it with a late-payment charge."},
    ],
    "overall": "The agreement protects the landlord well but leaves the tenant exposed on money and security of the home. Four changes would make it balanced.",
}
