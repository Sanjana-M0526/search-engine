import os
from pathlib import Path
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# ============================================================
# IMPORTS
# ============================================================

try:
    from .crawler import crawl_page
    from .database import (
        initialize_database,
        search_documents,
        count_documents,
    )
except ImportError:
    from crawler import crawl_page
    from database import (
        initialize_database,
        search_documents,
        count_documents,
    )


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="My Search Engine API",
    version="2.0.0",
)


# ============================================================
# CORS
# ============================================================

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://my-search-engine-1-od9a.onrender.com"
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# DATABASE
# ============================================================

initialize_database()


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

FRONTEND_DIR = BASE_DIR.parent / "frontend"

INDEX_FILE = FRONTEND_DIR / "index.html"


# ============================================================
# SEARCHXNG SERVER
# ============================================================

SEARCH_SERVER_URL = os.getenv(
    "SEARCH_SERVER_URL",
    "https://search-engine-1a2i.onrender.com"
).rstrip("/")


# Remove /search if user accidentally included it.
if SEARCH_SERVER_URL.endswith("/search"):
    SEARCH_SERVER_URL = SEARCH_SERVER_URL[:-7]


SEARCH_ENDPOINT = (
    f"{SEARCH_SERVER_URL}/search"
)


# ============================================================
# SEARCH HISTORY
# ============================================================

search_history = []


# ============================================================
# FRONTEND
# ============================================================

if FRONTEND_DIR.exists():

    app.mount(
        "/static",
        StaticFiles(
            directory=str(FRONTEND_DIR)
        ),
        name="static",
    )


@app.get("/")
async def home():

    if INDEX_FILE.exists():

        return FileResponse(
            str(INDEX_FILE)
        )

    return {
        "message": "My Search Engine API is running",

        "endpoints": [
            "/search",
            "/suggestions",
            "/history",
            "/index",
            "/crawl",
            "/my-index",
            "/health",
            "/api",
        ],
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():

    return {
        "status": "ok",
        "service": "My Search Engine",
        "documents": count_documents(),
        "search_server": SEARCH_ENDPOINT,
    }


# ============================================================
# SEARCH
# ============================================================

@app.get("/search")
async def search(
    q: str,
    page: int = 1,
    category: str = "all",
    time: str = "",
):

    q = q.strip()

    page = max(
        1,
        page
    )


    if not q:

        return {
            "query": "",
            "results": [],
            "total": 0,
            "page": page,
            "category": category,
            "time": time,
        }


    # ========================================================
    # HISTORY
    # ========================================================

    if q not in search_history:

        search_history.insert(
            0,
            q
        )


    search_history[:] = \
        search_history[:10]


    # ========================================================
    # MY INDEX
    # ========================================================

    if category in [
        "local",
        "my-index"
    ]:

        try:

            local_results = search_documents(q)

        except Exception as error:

            return {
                "query": q,
                "results": [],
                "total": 0,
                "page": page,
                "category": category,
                "time": time,
                "error": "My Index search failed",
                "details": str(error),
            }


        formatted = []


        for result in local_results:

            url =result.get(
                    "url",
                    ""
                )


            formatted.append(
                {
                    "url": url,

                    "title":
                        result.get(
                            "title"
                        )
                        or "Untitled",

                    "content":
                        result.get(
                            "content"
                        )
                        or "No description available.",

                    "engine":
                        "my index",

                    "category":
                        "local",

                    "score":
                        result.get(
                            "score",
                            0
                        ),

                    "domain":
                        urlparse(
                            url
                        ).netloc,
                }
            )


        return {
            "query": q,

            "results":
                formatted,

            "total":
                len(formatted),

            "page":
                page,

            "category":
                category,

            "time":
                time,

            "has_next":
                False,
        }


    # ========================================================
    # SEARXNG CATEGORY
    # ========================================================

    if category == "news":

        searx_category = "news"

    elif category == "images":

        searx_category = "images"

    else:

        # BOTH "all" AND "web"
        # become general web search.

        searx_category = "general"


    # ========================================================
    # SEARCH PARAMETERS
    # ========================================================

    search_params = {

        "q": q,

        "format": "json",

        "pageno": page,

        "categories":
            searx_category,

    }


    # ========================================================
    # TIME RANGE
    # ========================================================

    valid_time_ranges = [
        "hour",
        "day",
        "week",
        "month",
        "year",
    ]


    if time in valid_time_ranges:

        search_params[
            "time_range"
        ] = time


    # ========================================================
    # CALL SEARXNG
    # ========================================================

    try:

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=15.0,
                read=45.0,
                write=15.0,
                pool=15.0,
            ),
            follow_redirects=True,
        ) as client:

            response = await client.get(
                SEARCH_ENDPOINT,

                params=search_params,

                headers={
                    "User-Agent":
                        "Mozilla/5.0 "
                        "(compatible; MySearchEngine/2.0)",

                    "Accept":
                        "application/json",
                },
            )


        # ====================================================
        # JSON SUCCESS
        # ====================================================

        content_type = (
            response.headers
            .get("content-type", "")
            .lower()
        )


        if response.status_code == 200:

            if (
                "application/json"
                in content_type
            ):

                data = response.json()

            else:

                # Try JSON anyway.
                try:

                    data = response.json()

                except Exception:

                    # JSON disabled?
                    # Fall back to HTML.

                    return await search_searxng_html(
                        q=q,
                        page=page,
                        category=category,
                        time=time,
                    )


        else:

            # Some SearXNG installations
            # reject JSON format.
            #
            # Try HTML fallback.

            return await search_searxng_html(
                q=q,
                page=page,
                category=category,
                time=time,
            )


    except Exception as error:

        print(
            "SearXNG JSON request failed:",
            repr(error)
        )


        # ====================================================
        # HTML FALLBACK
        # ====================================================

        try:

            return await search_searxng_html(
                q=q,
                page=page,
                category=category,
                time=time,
            )

        except Exception as html_error:

            return {
                "query": q,
                "results": [],
                "total": 0,
                "page": page,
                "category": category,
                "time": time,
                "error":
                    "Unable to connect to SearXNG",
                "details":
                    f"JSON error: {error}; "
                    f"HTML error: {html_error}",
            }


    # ========================================================
    # NORMALIZE JSON RESULTS
    # ========================================================

    raw_results = data.get(
        "results",
        []
    )


    results = []

    seen_urls = set()


    for result in raw_results:

        url = (
            result.get("url")
            or result.get("link")
            or ""
        )


        if not url:
            continue


        if url in seen_urls:
            continue


        seen_urls.add(url)


        title = (
            result.get("title")
            or result.get("name")
            or "Untitled"
        )


        content = (
            result.get("content")
            or result.get("description")
            or result.get("snippet")
            or "No description available."
        )


        domain = urlparse(
            url
        ).netloc


        results.append(
            {
                "url": url,

                "title": title,

                "content": content,

                "engine":
                    result.get(
                        "engine",
                        "SearXNG"
                    ),

                "category":
                    result.get(
                        "category",
                        category
                    ),

                "score":
                    result.get(
                        "score",
                        0
                    ),

                "domain":
                    domain,

                # Images
                "thumbnail":
                    result.get(
                        "thumbnail",
                        ""
                    ),

                "img_src":
                    result.get(
                        "img_src",
                        ""
                    ),

                "image":
                    result.get(
                        "image",
                        ""
                    ),

                "source":
                    result.get(
                        "source",
                        ""
                    ),

                # Date
                "date":
                    result.get(
                        "publishedDate"
                    )
                    or result.get(
                        "published"
                    )
                    or result.get(
                        "date"
                    ),
            }
        )


    # ========================================================
    # TOTAL
    # ========================================================

    total = (
        data.get(
            "number_of_results"
        )
        or len(results)
    )


    # ========================================================
    # HAS NEXT
    # ========================================================

    has_next = (
        len(results) > 0
    )


    return {
        "query": q,

        "results": results,

        "total": total,

        "page": page,

        "category": category,

        "time": time,

        "has_next": has_next,

        "search_server":
            SEARCH_ENDPOINT,
    }


# ============================================================
# SEARXNG HTML FALLBACK
# ============================================================

async def search_searxng_html(
    q: str,
    page: int,
    category: str,
    time: str,
):

    if category == "news":

        searx_category = "news"

    elif category == "images":

        searx_category = "images"

    else:

        searx_category = "general"


    params = {

        "q": q,

        "pageno": page,

        "categories":
            searx_category,

    }


    valid_time_ranges = [
        "hour",
        "day",
        "week",
        "month",
        "year",
    ]


    if time in valid_time_ranges:

        params[
            "time_range"
        ] = time


    async with httpx.AsyncClient(
        timeout=45.0,
        follow_redirects=True,
    ) as client:

        response = await client.get(
            SEARCH_ENDPOINT,

            params=params,

            headers={
                "User-Agent":
                    "Mozilla/5.0 "
                    "(compatible; MySearchEngine/2.0)",

                "Accept":
                    "text/html,application/xhtml+xml",
            },
        )


    response.raise_for_status()


    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )


    results = []

    seen_urls = set()


    # ========================================================
    # NORMAL SEARXNG RESULTS
    # ========================================================

    articles =soup.select(
            "article.result"
        )


    if not articles:

        articles =soup.select(
                ".result"
            )


    for article in articles:

        link = (
            article.select_one(
                "h3 a"
            )
            or article.select_one(
                "a.result_header"
            )
            or article.select_one(
                "a"
            )
        )


        if not link:
            continue


        url =link.get(
                "href",
                ""
            )


        if not url:
            continue


        if url.startswith("/"):

            continue


        if url in seen_urls:
            continue


        seen_urls.add(url)


        title =link.get_text(
                " ",
                strip=True
            )


        content_element =article.select_one(
                ".content"
            )


        if not content_element:

            content_element =article.select_one(
                    ".result-content"
                )


        content =content_element.get_text(
                " ",
                strip=True
            ) if content_element else ""


        domain =urlparse(
                url
            ).netloc


        results.append(
            {
                "url": url,

                "title":
                    title
                    or "Untitled",

                "content":
                    content
                    or "No description available.",

                "engine":
                    "SearXNG",

                "category":
                    category,

                "score":
                    0,

                "domain":
                    domain,

                "thumbnail":
                    "",

                "img_src":
                    "",
            }
        )


    return {
        "query": q,

        "results": results,

        "total":
            len(results),

        "page":
            page,

        "category":
            category,

        "time":
            time,

        "has_next":
            len(results) > 0,

        "mode":
            "html-fallback",

        "search_server":
            SEARCH_ENDPOINT,
    }


# ============================================================
# SUGGESTIONS
# ============================================================

@app.get("/suggestions")
async def suggestions(q: str):

    q = q.strip()


    if not q:

        return {
            "suggestions": []
        }


    values = []


    for item in search_history:

        if q.lower() in item.lower():

            if item not in values:

                values.append(item)


    return {
        "suggestions":
            values[:5]
    }


# ============================================================
# HISTORY
# ============================================================

@app.get("/history")
async def history():

    return {
        "history": [
            {
                "query": item
            }

            for item in search_history
        ]
    }


# ============================================================
# INDEX REQUEST
# ============================================================

class IndexRequest(BaseModel):

    url: str


# ============================================================
# INDEX WEBSITE
# ============================================================

@app.post("/index")
async def index_page(
    request: IndexRequest
):

    try:

        result =crawl_page(
                request.url
            )


        return {
            "success": True,

            "message":
                "Page indexed successfully",

            "data":
                result,
        }


    except Exception as error:

        raise HTTPException(
            status_code=400,

            detail=str(error),
        )


# ============================================================
# MY INDEX
# ============================================================

@app.get("/my-index")
async def my_index_search(
    q: str
):

    results =search_documents(q)


    formatted_results = []


    for result in results:

        formatted_results.append(
            {
                "url":
                    result.get(
                        "url",
                        ""
                    ),

                "title":
                    result.get(
                        "title",
                        "Untitled"
                    ),

                "content":
                    result.get(
                        "content",
                        ""
                    ),

                "engine":
                    "my index",

                "category":
                    "local",

                "score":
                    result.get(
                        "score",
                        0
                    ),
            }
        )


    return {
        "query":
            q,

        "total":
            len(formatted_results),

        "results":
            formatted_results,

        "page":
            1,

        "has_next":
            False,
    }


# ============================================================
# CRAWL
# ============================================================

@app.post("/crawl")
async def crawl(url: str):

    try:

        result =crawl_page(url)


        return {
            "success": True,

            "message":
                "Page indexed successfully",

            "data":
                result,
        }


    except Exception as error:

        return {
            "success": False,

            "message":
                str(error),
        }


# ============================================================
# API INFO
# ============================================================

@app.get("/api")
async def api_info():

    return {

        "name":
            "My Search Engine",

        "version":
            "2.0.0",

        "status":
            "running",

        "documents":
            count_documents(),

        "search_server":
            SEARCH_ENDPOINT,

    }