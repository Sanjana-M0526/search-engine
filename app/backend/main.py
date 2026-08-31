import os
from pathlib import Path
from urllib.parse import urlparse

import httpx

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Support both:
# uvicorn backend.main:app
# and
# uvicorn main:app
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
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://my-search-engine-1-od9a.onrender.com"
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

# IMPORTANT:
# Set this in Render Environment Variables.
#
# Example:
# SEARCH_SERVER_URL=https://search-engine-1a2i.onrender.com
#
# We automatically add /search if necessary.

SEARCH_SERVER_URL = os.getenv(
    "SEARCH_SERVER_URL",
    "https://search-engine-1a2i.onrender.com",
).rstrip("/")

if not SEARCH_SERVER_URL.endswith("/search"):
    SEARCH_SERVER_URL += "/search"

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
        StaticFiles(directory=str(FRONTEND_DIR)),
        name="static",
    )


@app.get("/")
async def home():
    if INDEX_FILE.exists():
        return FileResponse(str(INDEX_FILE))

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

    if not q:
        return {
            "query": "",
            "results": [],
            "total": 0,
            "page": page,
            "category": category,
            "time": time,
        }

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    if q not in search_history:
        search_history.insert(0, q)

    search_history[:] = search_history[:10]

    # --------------------------------------------------------
    # MY INDEX
    # --------------------------------------------------------

    if category in ["local", "my-index"]:
        local_results = search_documents(q)

        formatted = []

        for result in local_results:
            url = result.get("url", "")

            formatted.append(
                {
                    "url": url,
                    "title": result.get("title") or "Untitled",
                    "content": (
                        result.get("content")
                        or "No description available."
                    ),
                    "engine": "my index",
                    "category": "local",
                    "score": result.get("score", 0),
                    "domain": urlparse(url).netloc,
                }
            )

        return {
            "query": q,
            "results": formatted,
            "total": len(formatted),
            "page": page,
            "category": category,
            "time": time,
        }

    # --------------------------------------------------------
    # SEARCHXNG PARAMETERS
    # --------------------------------------------------------

    search_params = {
        "q": q,
        "format": "json",
        "pageno": page,
    }

    if category == "news":
        search_params["categories"] = "news"

    elif category == "images":
        search_params["categories"] = "images"

    else:
        search_params["categories"] = "general"

    # --------------------------------------------------------
    # TIME FILTER
    # --------------------------------------------------------

    valid_time_ranges = [
        "hour",
        "day",
        "week",
        "month",
        "year",
    ]

    if time in valid_time_ranges:
        search_params["time_range"] = time

    # --------------------------------------------------------
    # CALL SEARCHXNG
    # --------------------------------------------------------

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(45.0)
        ) as client:

            response = await client.get(
                SEARCH_SERVER_URL,
                params=search_params,
                headers={
                    "User-Agent": "MySearchEngine/1.0",
                    "Accept": "application/json",
                },
            )

            response.raise_for_status()

            data = response.json()

    except httpx.HTTPStatusError as error:
        return {
            "query": q,
            "results": [],
            "total": 0,
            "page": page,
            "category": category,
            "time": time,
            "error": "SearchXNG returned an error",
            "details": (
                f"HTTP {error.response.status_code} "
                f"from {SEARCH_SERVER_URL}"
            ),
        }

    except Exception as error:
        return {
            "query": q,
            "results": [],
            "total": 0,
            "page": page,
            "category": category,
            "time": time,
            "error": "Unable to connect to SearchXNG",
            "details": str(error),
        }

    # --------------------------------------------------------
    # NORMALIZE RESULTS
    # --------------------------------------------------------

    raw_results = data.get("results", [])

    results = []
    seen_urls = set()

    for result in raw_results:

        url = result.get("url", "")

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
            or "No description available."
        )

        domain = urlparse(url).netloc

        results.append(
            {
                "url": url,
                "title": title,
                "content": content,
                "engine": result.get("engine", "search"),
                "category": result.get(
                    "category",
                    category,
                ),
                "score": result.get("score", 0),
                "domain": domain,
                "thumbnail": result.get(
                    "thumbnail",
                    "",
                ),
                "img_src": result.get(
                    "img_src",
                    "",
                ),
            }
        )

    total = data.get(
        "number_of_results",
        len(results),
    )

    return {
        "query": q,
        "results": results,
        "total": total,
        "page": page,
        "category": category,
        "time": time,
    }


# ============================================================
# SUGGESTIONS
# ============================================================

@app.get("/suggestions")
async def suggestions(q: str):
    q = q.strip()

    if not q:
        return {"suggestions": []}

    values = []

    for item in search_history:
        if q.lower() in item.lower():
            if item not in values:
                values.append(item)

    return {
        "suggestions": values[:5],
    }


# ============================================================
# HISTORY
# ============================================================

@app.get("/history")
async def history():
    return {
        "history": [
            {"query": item}
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
async def index_page(request: IndexRequest):

    try:
        result = crawl_page(request.url)

        return {
            "success": True,
            "message": "Page indexed successfully",
            "data": result,
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
async def my_index_search(q: str):

    results = search_documents(q)

    formatted_results = []

    for result in results:

        formatted_results.append(
            {
                "url": result["url"],
                "title": result["title"],
                "content": result["content"],
                "engine": "my index",
                "category": "local",
                "score": result["score"],
            }
        )

    return {
        "query": q,
        "total": len(formatted_results),
        "results": formatted_results,
    }


# ============================================================
# CRAWL
# ============================================================

@app.post("/crawl")
async def crawl(url: str):

    try:
        result = crawl_page(url)

        return {
            "success": True,
            "message": "Page indexed successfully",
            "data": result,
        }

    except Exception as error:

        return {
            "success": False,
            "message": str(error),
        }


# ============================================================
# API INFO
# ============================================================

@app.get("/api")
async def api_info():

    return {
        "name": "My Search Engine",
        "version": "1.0.0",
        "status": "running",
        "documents": count_documents(),
        "search_server": SEARCH_SERVER_URL,
    }