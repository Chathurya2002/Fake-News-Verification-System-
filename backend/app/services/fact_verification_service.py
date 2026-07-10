import re
from sqlalchemy.orm import Session
from app.core.models import FactCheck

# Sinhala stop words list for tokenization
SINHALA_STOPWORDS = {
    "සහ", "නම්", "එම", "මෙම", "යන", "වන", "ලැබූ", "කරන", "කරන්න", "ඇත", "මඟින්", "විසින්",
    "නොව", "සඳහා", "ගැන", "වෙත", "ලෙස", "සිට", "තවද", "වෙතින්", "වැනි", "මෙන්ම", "භාවිතා",
    "කරයි", "කරනු", "කර ඇත", "කර ඇති", "ලැබේ", "පවතී", "බව", "කළ", "නැත", "තවත්", "මෙමඟින්",
    "මගින්", "කිරීම", "සඳහන්", "පිළිබඳ", "පිළිබඳව", "පමණක්", "කළේය", "විය", "නමුත්", "සමඟ",
    "වෙති", "හේතුවෙන්", "තිබේ", "තිබූ", "ලැබී", "ඇති", "කරනවා", "නිසා", "එසේ", "නැවත"
}

ENGLISH_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "of", "in", "on", "at", 
    "to", "for", "with", "by", "about", "that", "this", "these", "those", "it", "its", "they", 
    "them", "their", "he", "him", "his", "she", "her", "we", "us", "our", "i", "you", "me", 
    "my", "your", "who", "which", "what", "where", "when", "why", "how", "has", "have", "had",
    "do", "does", "did", "to", "from", "up", "down", "in", "out", "over", "under", "again", 
    "further", "then", "once", "here", "there", "all", "any", "both", "each", "few", "more", 
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", 
    "too", "very", "s", "t", "can", "will", "just", "should", "now"
}

ALL_STOPWORDS = SINHALA_STOPWORDS.union(ENGLISH_STOPWORDS)

def tokenize_and_clean(text: str) -> set:
    if not text:
        return set()
    tokens = re.findall(r'[a-zA-Z\u0d80-\u0dff]+', text.lower())
    return {t for t in tokens if t not in ALL_STOPWORDS and len(t) > 1}

def verify_claim(text: str, db: Session) -> list[dict]:
    input_tokens = tokenize_and_clean(text)
    if not input_tokens:
        return []

    fact_checks = db.query(FactCheck).all()
    matches = []

    for fc in fact_checks:
        claim_tokens = tokenize_and_clean(fc.claim)
        if not claim_tokens:
            continue

        # Compute intersection
        intersection = input_tokens.intersection(claim_tokens)
        if not intersection:
            continue

        # Jaccard overlap score relative to the claim
        overlap_score = len(intersection) / len(claim_tokens)
        
        # Match threshold (e.g. 25% token match)
        if overlap_score >= 0.25:
            matches.append({
                "claim": fc.claim,
                "verdict": fc.verdict,
                "source_name": fc.source_name,
                "source_url": fc.source_url,
                "checked_date": fc.checked_date.isoformat() + "Z" if fc.checked_date else None,
                "similarity_score": round(overlap_score, 4)
            })

    # Sort matches by similarity score descending
    matches.sort(key=lambda x: x["similarity_score"], reverse=True)
    return matches[:3]
