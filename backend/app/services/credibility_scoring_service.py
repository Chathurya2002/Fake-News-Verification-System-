from urllib.parse import urlparse
from sqlalchemy.orm import Session
from app.core.models import SourceCredibility

def check_source_credibility(source_url: str | None, input_text: str, db: Session) -> dict:
    if source_url:
        try:
            parsed_url = urlparse(source_url)
            domain = parsed_url.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            
            # Lookup exact domain
            sc = db.query(SourceCredibility).filter(SourceCredibility.domain == domain).first()
            if sc:
                return {
                    "source_name": sc.source_name,
                    "domain": domain,
                    "credibility_score": int(sc.credibility_score),
                    "category": sc.category,
                    "notes": sc.notes,
                    "status": "known"
                }
            
            # Check parent domain (e.g. news.dailymirror.lk -> dailymirror.lk)
            parts = domain.split(".")
            if len(parts) > 2:
                parent_domain = ".".join(parts[-2:])
                sc = db.query(SourceCredibility).filter(SourceCredibility.domain == parent_domain).first()
                if sc:
                    return {
                        "source_name": sc.source_name,
                        "domain": parent_domain,
                        "credibility_score": int(sc.credibility_score),
                        "category": sc.category,
                        "notes": sc.notes,
                        "status": "known"
                    }
            
            # Source not in database
            return {
                "source_name": domain,
                "domain": domain,
                "credibility_score": 50,
                "category": "unknown",
                "notes": "This source domain is not yet verified in our database. Rely on content heuristics.",
                "status": "unknown"
            }
        except Exception as e:
            print(f"Error parsing source URL: {e}")

    # Fallback to scanning text for mentions of known source names
    sources = db.query(SourceCredibility).all()
    for sc in sources:
        # Avoid matching short, generic names as false positives
        if len(sc.source_name) > 3 and sc.source_name.lower() in input_text.lower():
            return {
                "source_name": sc.source_name,
                "domain": sc.domain,
                "credibility_score": int(sc.credibility_score),
                "category": sc.category,
                "notes": f"Source mention detected in text: '{sc.source_name}'.",
                "status": "mentioned"
            }

    return {
        "source_name": "N/A",
        "domain": "N/A",
        "credibility_score": 0,
        "category": "not_applicable",
        "notes": "No source link was provided and no registered news organization was mentioned in the content.",
        "status": "not_applicable"
    }
