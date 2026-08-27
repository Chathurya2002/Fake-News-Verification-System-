import urllib.request
import xml.etree.ElementTree as ET
import html
import re
import json
from sqlalchemy.orm import Session
from app.core.models import User, NewsSubmission, Prediction, ModelVersion
from app.ml.inference import predict_news
from app.services.fact_verification_service import verify_claim
from app.services.credibility_scoring_service import check_source_credibility

RSS_FEEDS = [
    {
        "source_name": "Ada Derana English",
        "url": "http://www.adaderana.lk/rss.php",
        "category": "Sri Lanka / World",
        "default_lang": "en"
    },
    {
        "source_name": "Ada Derana Sinhala",
        "url": "http://sinhala.adaderana.lk/rss.php",
        "category": "Sri Lanka (Sinhala)",
        "default_lang": "si"
    },
    {
        "source_name": "BBC News Asia",
        "url": "http://feeds.bbci.co.uk/news/world/asia/rss.xml",
        "category": "International Asia",
        "default_lang": "en"
    },
    {
        "source_name": "Al Jazeera News",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "category": "Global Breaking News",
        "default_lang": "en"
    }
]

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    clean_text = re.sub(r"<.*?>", "", raw_html)
    clean_text = html.unescape(clean_text).strip()
    return clean_text

def extract_image_url(item: ET.Element, feed_source: str) -> str:
    # 1. Check media:thumbnail
    for elem in item.findall("{http://search.yahoo.com/mrss/}thumbnail"):
        url = elem.attrib.get("url")
        if url:
            return url

    # 2. Check media:content
    for elem in item.findall("{http://search.yahoo.com/mrss/}content"):
        url = elem.attrib.get("url")
        if url:
            return url

    # 3. Check enclosure
    for elem in item.findall("enclosure"):
        url = elem.attrib.get("url")
        if url and ("image" in elem.attrib.get("type", "") or url.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))):
            return url

    # 4. Check description for img tag
    desc_el = item.find("description")
    if desc_el is not None and desc_el.text:
        match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc_el.text)
        if match:
            return match.group(1)

    # 5. High-quality topic/source imagery fallback
    if "Derana" in feed_source:
        return "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=600&auto=format&fit=crop&q=80"
    elif "BBC" in feed_source:
        return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80"
    elif "Al Jazeera" in feed_source:
        return "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&auto=format&fit=crop&q=80"
    
    return "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&auto=format&fit=crop&q=80"

def fetch_and_sync_live_news(db: Session, max_items_per_feed: int = 5) -> dict:
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = int(admin.id) if admin else 1

    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    model_id = int(active_model.id) if active_model else 1

    new_articles_count = 0
    errors = []

    for feed in RSS_FEEDS:
        try:
            req = urllib.request.Request(
                feed["url"],
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=7) as response:
                xml_content = response.read()
                root = ET.fromstring(xml_content)
                items = root.findall(".//item")

                count_from_feed = 0
                for item in items:
                    if count_from_feed >= max_items_per_feed:
                        break

                    title_el = item.find("title")
                    desc_el = item.find("description")
                    link_el = item.find("link")

                    title = clean_html(title_el.text if title_el is not None and title_el.text else "")
                    desc = clean_html(desc_el.text if desc_el is not None and desc_el.text else "")
                    link = link_el.text.strip() if link_el is not None and link_el.text else None
                    img_url = extract_image_url(item, feed["source_name"])

                    if not title or len(title) < 10:
                        continue

                    # Full text claim for analysis
                    full_content = f"{title}. {desc}" if desc and desc != title else title
                    if len(full_content) > 600:
                        full_content = full_content[:600]

                    # Check if already exists in DB to prevent duplicates
                    existing = db.query(NewsSubmission).filter(
                        (NewsSubmission.input_text == full_content) |
                        (NewsSubmission.source_url == link if link else False)
                    ).first()

                    if existing:
                        # Update image if missing
                        if not existing.media_path and img_url:
                            existing.media_path = img_url
                            db.commit()
                        continue

                    # Language detection hint
                    is_sinhala = bool(re.search(r"[\u0d80-\u0dff]", full_content))
                    lang = "si" if is_sinhala else "en"

                    # Run ML prediction on the live news
                    res = predict_news(full_content)

                    # Create Submission
                    sub = NewsSubmission(
                        user_id=admin_id,
                        input_text=full_content,
                        source_url=link,
                        source_type="url" if link else "text",
                        media_path=img_url,
                        media_type="image",
                        language=lang
                    )
                    db.add(sub)
                    db.commit()
                    db.refresh(sub)

                    # Fact verification & source credibility
                    fc = verify_claim(full_content, db)
                    sc = check_source_credibility(link, full_content, db)

                    # Store Prediction
                    pred = Prediction(
                        submission_id=sub.id,
                        model_version_id=model_id,
                        predicted_label=res.label,
                        confidence_score=res.confidence_score,
                        fake_probability=res.fake_probability,
                        real_probability=res.real_probability,
                        explanation=res.explanation,
                        word_importances=json.dumps(res.word_importances) if res.word_importances else None,
                        fact_check_results=json.dumps(fc) if fc else None,
                        source_credibility_results=json.dumps(sc) if sc else None,
                        processing_time_ms=res.processing_time_ms
                    )
                    db.add(pred)
                    db.commit()

                    new_articles_count += 1
                    count_from_feed += 1

        except Exception as e:
            errors.append(f"{feed['source_name']}: {str(e)}")

    return {
        "status": "success",
        "new_articles_synced": new_articles_count,
        "errors": errors
    }
