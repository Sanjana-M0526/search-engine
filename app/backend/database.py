import os
import re
import sqlite3
from pathlib import Path


# ============================================================
# DATABASE LOCATION
# ============================================================

DATA_DIR = Path(
    os.getenv("DATA_DIR", str(Path(__file__).resolve().parent))
)

DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE = DATA_DIR / "search_index.db"


# ============================================================
# CONNECTION
# ============================================================

def get_connection():

    connection = sqlite3.connect(
        str(DATABASE),
        check_same_thread=False
    )

    connection.row_factory = sqlite3.Row

    return connection


# ============================================================
# INITIALIZE DATABASE
# ============================================================

def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            url TEXT UNIQUE NOT NULL,

            title TEXT,

            content TEXT,

            keywords TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
    """)

    connection.commit()

    connection.close()


# ============================================================
# ADD DOCUMENT
# ============================================================

def add_document(
    url,
    title,
    content,
    keywords=""
):

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO documents
        (
            url,
            title,
            content,
            keywords
        )

        VALUES (?, ?, ?, ?)
    """, (
        url,
        title or "",
        content or "",
        keywords or ""
    ))

    connection.commit()

    connection.close()


# ============================================================
# SEARCH DOCUMENTS
# ============================================================

def search_documents(query):

    query = (query or "").strip()

    if not query:
        return []

    connection = get_connection()

    cursor = connection.cursor()

    words = [
        word.lower()
        for word in re.findall(r"\b[\w]+\b", query)
        if len(word) > 1
    ]

    if not words:
        connection.close()
        return []

    conditions = []

    params = []

    for word in words:

        pattern = f"%{word}%"

        conditions.append("""
            (
                LOWER(title) LIKE ?
                OR LOWER(content) LIKE ?
                OR LOWER(keywords) LIKE ?
            )
        """)

        params.extend([
            pattern,
            pattern,
            pattern
        ])

    where_clause = " OR ".join(conditions)

    cursor.execute(f"""
        SELECT
            id,
            url,
            title,
            content,
            keywords,
            created_at

        FROM documents

        WHERE {where_clause}

        ORDER BY id DESC
    """, params)

    rows = cursor.fetchall()

    results = []

    query_lower = query.lower()

    # ========================================================
    # RELEVANCE SCORING
    # ========================================================

    for row in rows:

        title = row["title"] or ""
        content = row["content"] or ""
        keywords = row["keywords"] or ""

        title_lower = title.lower()
        content_lower = content.lower()
        keywords_lower = keywords.lower()

        score = 0.0

        # Exact title
        if title_lower == query_lower:
            score += 20

        # Full query in title
        if query_lower in title_lower:
            score += 12

        # Full query in keywords
        if query_lower in keywords_lower:
            score += 8

        # Full query in content
        full_matches = len(
            re.findall(
                re.escape(query_lower),
                content_lower
            )
        )

        score += min(full_matches, 10) * 1.0

        # Individual words
        for word in words:

            if word in title_lower:
                score += 5

            if word in keywords_lower:
                score += 3

            word_matches = len(
                re.findall(
                    re.escape(word),
                    content_lower
                )
            )

            score += min(word_matches, 10) * 0.5

        # Small bonus for newer indexed documents
        score += 0.1

        results.append({

            "id": row["id"],

            "url": row["url"],

            "title": title,

            "content": content,

            "keywords": keywords,

            "score": round(score, 2),

            "created_at": row["created_at"]

        })

    # ========================================================
    # SORT
    # ========================================================

    results.sort(
        key=lambda item: item["score"],
        reverse=True
    )

    connection.close()

    return results


# ============================================================
# GET ALL DOCUMENTS
# ============================================================

def get_all_documents():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT
            id,
            url,
            title,
            content,
            keywords,
            created_at

        FROM documents

        ORDER BY id DESC
    """)

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]


# ============================================================
# COUNT DOCUMENTS
# ============================================================

def count_documents():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        SELECT COUNT(*) AS total
        FROM documents
    """)

    result = cursor.fetchone()

    connection.close()

    return result["total"]