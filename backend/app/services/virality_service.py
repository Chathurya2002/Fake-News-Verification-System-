import re

SENSATIONAL_KEYWORDS_EN = [
    (r"\b(shocking|unbelievable|miracle|secret|exposed|leaked|warning|urgent|breaking|alert|must share|share before|pass this on|forward to all|do not drink|do not eat|cure for cancer|conspiracy|scam|arrested|banned|shortage)\b", 20, "Sensational / Urgency keywords detected"),
    (r"\b(dead|died|killed|attack|shutdown|collapse|emergency)\b", 15, "Panic / High-anxiety topic trigger"),
    (r"(whatsapp|facebook|tiktok|telegram|viber|twitter|instagram)", 10, "Social network forward / share markers")
]

SENSATIONAL_KEYWORDS_SI = [
    (r"(හදිසි නිවේදනය|හදිසි|නොබලා ඉන්න එපා|හැමෝටම ෂෙයා කරන්න|හැමෝටම share|වහාම|අනාවරණය|රහස|අවවාදයයි|දැන්ම බලන්න|අනිවාර්යයෙන්|සැඟවූ|හොර රහසේ)", 25, "සිංහල හදිසි ඇඟවීම් සහ Viral Call-to-action වචන හඳුනාගැනුණි"),
    (r"(තහනම්|මියයයි|හදිසි අනතුර|ප්‍රහාරය|වැටලීම|අත්අඩංගුවට|ඉන්ධන අර්බුදය|විදුලිය විසන්ධි|හිඟයක්)", 15, "භීතිය / කලබල ඇතිකරන තේමාවක් හඳුනාගැනුණි")
]

def assess_virality_risk(content: str, label: str, confidence_score: float, input_type: str = "text") -> dict:
    score = 15  # Base score
    factors = []

    # 1. Check English sensational patterns (case insensitive)
    for pattern, weight, reason in SENSATIONAL_KEYWORDS_EN:
        if re.search(pattern, content, re.IGNORECASE):
            score += weight
            if reason not in factors:
                factors.append(reason)

    # 2. Check Sinhala sensational patterns
    for pattern, weight, reason in SENSATIONAL_KEYWORDS_SI:
        if re.search(pattern, content):
            score += weight
            if reason not in factors:
                factors.append(reason)

    # 3. Check emotional exclamation / ALL-CAPS (case sensitive)
    if re.search(r"(!{2,}|\?{2,})", content) or re.search(r"\b[A-Z]{4,}\b", content):
        score += 15
        factors.append("Emotional punctuation / ALL-CAPS urgency emphasis")

    # 4. Input type bonus
    if input_type in ["social", "url"]:
        score += 15
        factors.append("Spread via digital / social media channels")

    # 5. High fake confidence bonus
    if label == "fake":
        if confidence_score >= 0.75:
            score += 25
            factors.append("High-confidence fake claim with deceptive potential")
        elif confidence_score >= 0.50:
            score += 15
            factors.append("Potential misinformation framing")
    else:
        score = max(5, score - 15)

    # Clamp score between 5 and 98
    score = max(5, min(98, score))

    if score >= 65:
        level = "high"
        recommendation = "High risk of rapid viral misinformation spread across WhatsApp & Social Media. Prioritize fact-check alerts."
    elif score >= 35:
        level = "medium"
        recommendation = "Moderate virality potential. Monitor engagement and verify supporting claims."
    else:
        level = "low"
        recommendation = "Low virality risk. Content follows standard reporting or low-urgency format."

    return {
        "virality_risk_level": level,
        "virality_score": score,
        "risk_factors": factors if factors else ["Standard organic distribution pattern"],
        "recommendation": recommendation
    }
