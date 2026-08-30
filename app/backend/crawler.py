import requests
import time

from bs4 import BeautifulSoup

from urllib.parse import (
    urljoin,
    urlparse,
    urlunparse
)

from urllib.robotparser import RobotFileParser

from database import add_document


# ==================================================
# SETTINGS
# ==================================================

MAX_PAGES = 10

REQUEST_TIMEOUT = 10

CRAWL_DELAY = 0.5

USER_AGENT = (
    "MySearchEngineBot/1.0 "
    "(Educational Search Engine Project)"
)


# ==================================================
# URL NORMALIZATION
# ==================================================

def normalize_url(url):

    try:

        parsed = urlparse(url)

        # Only HTTP/HTTPS

        if parsed.scheme not in (
            "http",
            "https"
        ):

            return None


        # Remove fragment

        normalized = urlunparse((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or "/",
            "",
            parsed.query,
            ""
        ))


        return normalized.rstrip("/")


    except Exception:

        return None


# ==================================================
# CHECK VALID URL
# ==================================================

def is_valid_url(url):

    try:

        parsed = urlparse(url)

        return (
            parsed.scheme in (
                "http",
                "https"
            )
            and bool(parsed.netloc)
        )

    except Exception:

        return False


# ==================================================
# ROBOTS.TXT
# ==================================================

def get_robot_parser(start_url):

    parsed = urlparse(start_url)

    robots_url = (
        f"{parsed.scheme}://"
        f"{parsed.netloc}/robots.txt"
    )


    robot_parser = RobotFileParser()

    robot_parser.set_url(
        robots_url
    )


    try:

        robot_parser.read()

        print(
            f"robots.txt loaded: "
            f"{robots_url}"
        )

        return robot_parser


    except Exception as error:

        print(
            f"Could not read robots.txt: "
            f"{error}"
        )

        return None


# ==================================================
# CHECK ROBOTS PERMISSION
# ==================================================

def allowed_by_robots(
    robot_parser,
    url
):

    if robot_parser is None:

        return True


    try:

        return robot_parser.can_fetch(
            USER_AGENT,
            url
        )

    except Exception:

        return True


# ==================================================
# FETCH PAGE
# ==================================================

def fetch_page(url):

    try:

        headers = {

            "User-Agent":
                USER_AGENT,

            "Accept":
                "text/html,application/xhtml+xml"

        }


        response = requests.get(

            url,

            headers=headers,

            timeout=REQUEST_TIMEOUT

        )


        response.raise_for_status()


        # Only process HTML

        content_type = (
            response.headers
            .get(
                "Content-Type",
                ""
            )
            .lower()
        )


        if (
            "text/html"
            not in content_type
        ):

            print(
                f"Skipping non-HTML: "
                f"{url}"
            )

            return None


        return response.text


    except Exception as error:

        print(
            f"Failed to fetch "
            f"{url}: {error}"
        )

        return None


# ==================================================
# EXTRACT PAGE DATA
# ==================================================

def extract_page_data(
    url,
    html
):

    soup = BeautifulSoup(
        html,
        "html.parser"
    )


    # --------------------------------------------------
    # REMOVE UNNECESSARY ELEMENTS
    # --------------------------------------------------

    for element in soup([
        "script",
        "style",
        "noscript",
        "nav",
        "footer",
        "header"
    ]):

        element.decompose()


    # --------------------------------------------------
    # TITLE
    # --------------------------------------------------

    if soup.title:

        title = soup.title.get_text(
            " ",
            strip=True
        )

    else:

        title = url


    # --------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------

    description = ""

    meta_description = soup.find(
        "meta",
        attrs={
            "name": "description"
        }
    )


    if meta_description:

        description = (
            meta_description
            .get(
                "content",
                ""
            )
            .strip()
        )


    # --------------------------------------------------
    # CONTENT
    # --------------------------------------------------

    content = soup.get_text(
        " ",
        strip=True
    )


    content = " ".join(
        content.split()
    )


    # Prevent extremely large documents

    content = content[:20000]


    # --------------------------------------------------
    # KEYWORDS
    # --------------------------------------------------

    keywords = ""

    meta_keywords = soup.find(
        "meta",
        attrs={
            "name": "keywords"
        }
    )


    if meta_keywords:

        keywords = (
            meta_keywords
            .get(
                "content",
                ""
            )
            .strip()
        )


    # --------------------------------------------------
    # ADD DESCRIPTION TO CONTENT
    # --------------------------------------------------

    if description:

        content = (
            description
            + " "
            + content
        )


    return {

        "url": url,

        "title": title,

        "content": content,

        "keywords": keywords

    }


# ==================================================
# EXTRACT LINKS
# ==================================================

def extract_links(
    base_url,
    html
):

    soup = BeautifulSoup(
        html,
        "html.parser"
    )


    links = set()


    base_domain = urlparse(
        base_url
    ).netloc.lower()


    for anchor in soup.find_all(
        "a",
        href=True
    ):

        href = anchor.get(
            "href"
        )


        if not href:

            continue


        # Convert relative URL

        full_url = urljoin(
            base_url,
            href
        )


        # Normalize

        clean_url = normalize_url(
            full_url
        )


        if not clean_url:

            continue


        parsed = urlparse(
            clean_url
        )


        # --------------------------------------------------
        # SAME DOMAIN ONLY
        # --------------------------------------------------

        if (
            parsed.netloc.lower()
            != base_domain
        ):

            continue


        # --------------------------------------------------
        # IGNORE FILE TYPES
        # --------------------------------------------------

        ignored_extensions = (

            ".pdf",
            ".zip",
            ".rar",
            ".exe",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".svg",
            ".mp3",
            ".mp4",
            ".avi",
            ".mov",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx"

        )


        if parsed.path.lower().endswith(
            ignored_extensions
        ):

            continue


        links.add(
            clean_url
        )


    return links


# ==================================================
# CRAWL WEBSITE
# ==================================================

def crawl_website(
    start_url,
    max_pages=MAX_PAGES
):

    # --------------------------------------------------
    # NORMALIZE START URL
    # --------------------------------------------------

    start_url = normalize_url(
        start_url
    )


    if not start_url:

        return {

            "success": False,

            "message":
                "Invalid URL.",

            "pages_crawled": 0,

            "pages_indexed": 0,

            "pages_failed": 0,

            "indexed_pages": []

        }


    # --------------------------------------------------
    # LIMIT MAX PAGES
    # --------------------------------------------------

    max_pages = max(
        1,
        min(
            int(max_pages),
            50
        )
    )


    # --------------------------------------------------
    # ROBOTS.TXT
    # --------------------------------------------------

    robot_parser = get_robot_parser(
        start_url
    )


    # --------------------------------------------------
    # QUEUE / VISITED
    # --------------------------------------------------

    queue = [
        start_url
    ]

    visited = set()

    indexed_pages = []

    failed_pages = []

    skipped_pages = []


    # ==================================================
    # CRAWLING LOOP
    # ==================================================

    while queue and len(visited) < max_pages:

        current_url = queue.pop(0)


        # --------------------------------------------------
        # NORMALIZE AGAIN
        # --------------------------------------------------

        current_url = normalize_url(
            current_url
        )


        if not current_url:

            continue


        # --------------------------------------------------
        # DUPLICATE CHECK
        # --------------------------------------------------

        if current_url in visited:

            continue


        # --------------------------------------------------
        # ROBOTS CHECK
        # --------------------------------------------------

        if not allowed_by_robots(
            robot_parser,
            current_url
        ):

            print(
                f"Blocked by robots.txt: "
                f"{current_url}"
            )

            skipped_pages.append(
                current_url
            )

            continue


        # --------------------------------------------------
        # MARK VISITED
        # --------------------------------------------------

        visited.add(
            current_url
        )


        print(
            ""
        )

        print(
            "================================"
        )

        print(
            f"Crawling "
            f"[{len(visited)}/{max_pages}]"
        )

        print(
            current_url
        )

        print(
            "================================"
        )


        # --------------------------------------------------
        # FETCH
        # --------------------------------------------------

        html = fetch_page(
            current_url
        )


        if not html:

            failed_pages.append(
                current_url
            )

            continue


        # --------------------------------------------------
        # EXTRACT PAGE DATA
        # --------------------------------------------------

        try:

            page_data = extract_page_data(

                current_url,

                html

            )


        except Exception as error:

            print(
                f"Extraction error: "
                f"{error}"
            )

            failed_pages.append(
                current_url
            )

            continue


        # --------------------------------------------------
        # SAVE TO DATABASE
        # --------------------------------------------------

        try:

            add_document(

                page_data["url"],

                page_data["title"],

                page_data["content"],

                page_data["keywords"]

            )


            indexed_pages.append(
                page_data
            )


            print(
                "Indexed successfully:"
            )

            print(
                page_data["title"]
            )


        except Exception as error:

            print(
                f"Database error: "
                f"{error}"
            )

            failed_pages.append(
                current_url
            )


        # --------------------------------------------------
        # FIND MORE LINKS
        # --------------------------------------------------

        try:

            links = extract_links(

                current_url,

                html

            )


            for link in links:

                if link in visited:

                    continue


                if link in queue:

                    continue


                queue.append(
                    link
                )


        except Exception as error:

            print(
                f"Link extraction error: "
                f"{error}"
            )


        # --------------------------------------------------
        # CRAWL DELAY
        # --------------------------------------------------

        time.sleep(
            CRAWL_DELAY
        )


    # ==================================================
    # FINAL RESULT
    # ==================================================

    print(
        ""
    )

    print(
        "================================"
    )

    print(
        "CRAWL COMPLETE"
    )

    print(
        "================================"
    )

    print(
        f"Pages crawled: "
        f"{len(visited)}"
    )

    print(
        f"Pages indexed: "
        f"{len(indexed_pages)}"
    )

    print(
        f"Pages failed: "
        f"{len(failed_pages)}"
    )

    print(
        f"Pages skipped: "
        f"{len(skipped_pages)}"
    )


    return {

        "success": True,

        "start_url": start_url,

        "pages_crawled":
            len(visited),

        "pages_indexed":
            len(indexed_pages),

        "pages_failed":
            len(failed_pages),

        "pages_skipped":
            len(skipped_pages),

        "indexed_pages": [

            {

                "url":
                    page["url"],

                "title":
                    page["title"]

            }

            for page in indexed_pages

        ],

        "failed_pages":
            failed_pages,

        "skipped_pages":
            skipped_pages

    }


# ==================================================
# SINGLE PAGE CRAWLER
# ==================================================

def crawl_page(url):

    result = crawl_website(

        url,

        max_pages=1

    )


    if result.get(
        "indexed_pages"
    ):

        page = result[
            "indexed_pages"
        ][0]


        return {

            "success": True,

            "url":
                page["url"],

            "title":
                page["title"]

        }


    return {

        "success": False,

        "url": url,

        "title": "",

        "message":
            "Page could not be indexed."

    }