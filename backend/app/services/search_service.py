import urllib.parse
import re
import html
import httpx
from typing import List, Dict, Any, Optional

class SearchService:
    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, str]]:
        """
        Search the live internet via DuckDuckGo without requiring external API keys.
        """
        query = query.strip()
        if not query:
            return []

        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                r = await client.post(url, headers=headers, data={"q": query})
                if r.status_code != 200:
                    return []

                raw_html = r.text
                results = []

                # Find result blocks
                links = re.findall(r'<a[^>]+class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', raw_html)
                titles = re.findall(r'<h2 class="result__title">[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', raw_html)
                snippets = re.findall(r'<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)</a>', raw_html)

                count = min(len(titles), len(snippets), max_results)
                for idx in range(count):
                    raw_url, title_raw = titles[idx]
                    snippet_raw = snippets[idx]

                    title = re.sub(r"<[^>]+>", "", title_raw).strip()
                    snippet = re.sub(r"<[^>]+>", "", snippet_raw).strip()

                    # Unquote DuckDuckGo tracking URL
                    if "uddg=" in raw_url:
                        parsed_u = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query).get("uddg", [""])[0]
                        link = urllib.parse.unquote(parsed_u) if parsed_u else raw_url
                    else:
                        link = raw_url

                    if title and snippet:
                        results.append({
                            "title": html.unescape(title),
                            "snippet": html.unescape(snippet),
                            "url": link
                        })

                # Fallback if specific classes differed
                if not results:
                    general_links = re.findall(r'<a[^>]+class="[^"]*result[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)</a>', raw_html)
                    for raw_url, t_raw in general_links[:max_results]:
                        t_clean = re.sub(r"<[^>]+>", "", t_raw).strip()
                        if t_clean and not t_clean.startswith("http"):
                            results.append({
                                "title": html.unescape(t_clean),
                                "snippet": "",
                                "url": raw_url
                            })

                return results
        except Exception:
            return []


search_service = SearchService()
