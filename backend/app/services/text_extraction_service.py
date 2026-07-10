from html.parser import HTMLParser
import httpx

class SimpleTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.ignore_tags = {"script", "style", "nav", "footer", "header", "aside", "head", "iframe"}
        self.ignore_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.ignore_tags:
            self.ignore_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in self.ignore_tags:
            self.ignore_depth = max(0, self.ignore_depth - 1)

    def handle_data(self, data):
        if self.ignore_depth == 0:
            stripped = data.strip()
            if stripped:
                self.text_parts.append(stripped)

    def get_text(self):
        return " ".join(self.text_parts)

def extract_text_from_url(url: str) -> str:
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        # Using httpx to fetch the webpage content
        response = httpx.get(url, headers=headers, timeout=15.0, follow_redirects=True)
        if response.status_code != 200:
            raise ValueError(f"Failed to fetch URL. HTTP Status: {response.status_code}")
        
        parser = SimpleTextExtractor()
        parser.feed(response.text)
        extracted = parser.get_text()
        
        # Clean multiple spaces and newlines
        cleaned = " ".join(extracted.split())
        
        if not cleaned:
            # Fallback for social media sites (SPAs that don't render text in standard HTML body)
            import re
            
            title_match = re.search(r'<title[^>]*>(.*?)</title>', response.text, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else ""
            
            desc_match = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', response.text, re.IGNORECASE | re.DOTALL)
            if not desc_match:
                desc_match = re.search(r'<meta[^>]*content=["\'](.*?)["\'][^>]*name=["\']description["\']', response.text, re.IGNORECASE | re.DOTALL)
            
            desc = desc_match.group(1).strip() if desc_match else ""
            fallback = f"{title} {desc}".strip()
            
            if fallback:
                return fallback
                
            # If all fails but it's a known social url, just return the URL itself for the model to analyze or return a mock string
            if any(domain in url.lower() for domain in ['facebook.com', 'instagram.com', 'tiktok.com', 'wa.me']):
                return f"Social media link shared: {url}"
            
            raise ValueError("No readable text content extracted from the URL.")
            
        return cleaned
    except Exception as e:
        raise ValueError(f"URL extraction failed: {str(e)}")
