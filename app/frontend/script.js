// ============================================================
// MY SEARCH ENGINE - FRONTEND
// ============================================================

// IMPORTANT:
// After deploying your FastAPI backend on Render,
// replace this URL with your BACKEND Render URL.
//
// Example:
// https://search-engine-backend.onrender.com
//
const API_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:8000"
        : "https://YOUR-BACKEND-NAME.onrender.com";


// ============================================================
// ELEMENTS
// ============================================================

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("results");
const resultsHeader = document.getElementById("resultsHeader");
const pagination = document.getElementById("pagination");
const timeFilter = document.getElementById("timeFilter");

const urlInput = document.getElementById("urlInput");
const indexButton = document.getElementById("indexButton");
const indexStatus = document.getElementById("indexStatus");

const suggestionsBox = document.getElementById("suggestions");
const historyContainer = document.getElementById("history");


// ============================================================
// STATE
// ============================================================

let currentCategory = "all";
let currentPage = 1;
let currentQuery = "";
let currentTime = "";


// ============================================================
// SEARCH
// ============================================================

async function performSearch(page = 1) {

    const query = searchInput.value.trim();

    if (!query) {
        resultsContainer.innerHTML = `
            <div class="empty-message">
                <h3>Please enter a search query.</h3>
            </div>
        `;

        resultsHeader.innerHTML = "";
        pagination.innerHTML = "";
        return;
    }

    currentQuery = query;
    currentPage = page;
    currentTime = timeFilter.value;

    resultsContainer.innerHTML = `
        <div class="loading">
            Searching...
        </div>
    `;

    resultsHeader.innerHTML = "";
    pagination.innerHTML = "";

    searchButton.disabled = true;

    try {

        let url;

        // -------------------------------
        // MY INDEX
        // -------------------------------

        if (currentCategory === "local") {

            url =
                `${API_URL}/my-index` +
                `?q=${encodeURIComponent(query)}`;

        }

        // -------------------------------
        // WEB / NEWS / IMAGES
        // -------------------------------

        else {

            url =
                `${API_URL}/search` +
                `?q=${encodeURIComponent(query)}` +
                `&page=${page}` +
                `&category=${encodeURIComponent(currentCategory)}` +
                `&time=${encodeURIComponent(currentTime)}`;
        }


        console.log("Searching:", url);


        const response = await fetch(url);


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const data = await response.json();


        if (data.error) {

            throw new Error(
                data.error
            );
        }


        displayResults(data);

        loadHistory();

    }

    catch (error) {

        console.error(
            "Search error:",
            error
        );

        resultsContainer.innerHTML = `
            <div class="error-message">

                <h3>Search failed</h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

                <p>
                    Please check that the backend is running.
                </p>

            </div>
        `;
    }

    finally {

        searchButton.disabled = false;

    }
}


// ============================================================
// DISPLAY RESULTS
// ============================================================

function displayResults(data) {

    const results =
        data.results || [];

    const total =
        Number(data.total || results.length);


    resultsHeader.innerHTML =
        `Found <strong>${total}</strong> results`;


    if (results.length === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">

                <h3>No results found</h3>

                <p>
                    Try another search query.
                </p>

            </div>
        `;

        pagination.innerHTML = "";

        return;
    }


    // IMAGE SEARCH

    if (currentCategory === "images") {

        displayImageResults(results);

        return;
    }


    // NORMAL SEARCH RESULTS

    resultsContainer.innerHTML =
        results
            .map(
                (result, index) =>
                    createResultCard(
                        result,
                        index
                    )
            )
            .join("");


    createPagination(data);
}


// ============================================================
// RESULT CARD
// ============================================================

function createResultCard(
    result,
    index
) {

    const url =
        escapeHtml(
            result.url || "#"
        );


    const title =
        highlightText(
            result.title ||
            "Untitled"
        );


    const content =
        highlightText(
            result.content ||
            "No description available."
        );


    const domain =
        escapeHtml(
            result.domain ||
            getDomain(result.url)
        );


    const engine =
        escapeHtml(
            result.engine ||
            "search"
        );


    const category =
        escapeHtml(
            result.category ||
            currentCategory
        );


    const score =
        Number(
            result.score || 0
        ).toFixed(1);


    return `

        <article class="result-card">

            <div class="result-number">
                ${index + 1}
            </div>

            <div class="result-domain">
                ${domain}
            </div>

            <a
                class="result-title"
                href="${url}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${title}
            </a>

            <div class="result-content">
                ${content}
            </div>

            <div class="result-meta">

                <span>
                    Source: ${engine}
                </span>

                <span>
                    Category: ${category}
                </span>

                <span class="score">
                    ⭐ Score: ${score}
                </span>

            </div>

        </article>

    `;
}


// ============================================================
// IMAGE RESULTS
// ============================================================

function displayImageResults(results) {

    const images =
        results.filter(
            result =>
                result.thumbnail ||
                result.img_src
        );


    if (images.length === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">

                <h3>No images found</h3>

                <p>
                    Try another image search.
                </p>

            </div>
        `;

        pagination.innerHTML = "";

        return;
    }


    resultsContainer.innerHTML = `

        <div class="image-grid">

            ${images.map(result => {

                const image =
                    result.thumbnail ||
                    result.img_src;

                return `

                    <a
                        class="image-card"
                        href="${escapeHtml(result.url || "#")}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >

                        <img
                            src="${escapeHtml(image)}"
                            alt="${escapeHtml(
                                result.title ||
                                "Image"
                            )}"
                            loading="lazy"
                            onerror="
                                this.style.display='none'
                            "
                        >

                        <div class="image-card-title">

                            ${escapeHtml(
                                result.title ||
                                "Image result"
                            )}

                        </div>

                    </a>

                `;

            }).join("")}

        </div>

    `;


    pagination.innerHTML = "";
}


// ============================================================
// PAGINATION
// ============================================================

function createPagination(data) {

    const total =
        Number(data.total || 0);

    const perPage = 20;

    const totalPages =
        Math.ceil(
            total / perPage
        );


    if (totalPages <= 1) {

        pagination.innerHTML = "";

        return;
    }


    pagination.innerHTML = `

        <button
            id="previousPage"
            ${currentPage <= 1 ? "disabled" : ""}
        >
            ← Previous
        </button>

        <span class="page-number">
            Page ${currentPage} of ${totalPages}
        </span>

        <button
            id="nextPage"
            ${currentPage >= totalPages ? "disabled" : ""}
        >
            Next →
        </button>

    `;


    document
        .getElementById("previousPage")
        ?.addEventListener(
            "click",
            () => {

                if (currentPage > 1) {

                    performSearch(
                        currentPage - 1
                    );

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            }
        );


    document
        .getElementById("nextPage")
        ?.addEventListener(
            "click",
            () => {

                if (
                    currentPage <
                    totalPages
                ) {

                    performSearch(
                        currentPage + 1
                    );

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            }
        );
}


// ============================================================
// CATEGORY FILTERS
// ============================================================

document
    .querySelectorAll(".filter-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".filter-button"
                    )
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                currentCategory =
                    button.dataset.category;


                if (
                    searchInput.value.trim()
                ) {

                    performSearch(1);

                }

            }
        );

    });


// ============================================================
// TIME FILTER
// ============================================================

timeFilter.addEventListener(
    "change",
    () => {

        if (
            searchInput.value.trim()
        ) {

            performSearch(1);

        }

    }
);


// ============================================================
// SEARCH BUTTON
// ============================================================

searchButton.addEventListener(
    "click",
    () => {

        performSearch(1);

    }
);


// ============================================================
// ENTER KEY
// ============================================================

searchInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            performSearch(1);

        }

    }
);


// ============================================================
// SUGGESTIONS
// ============================================================

let suggestionTimeout;


searchInput.addEventListener(
    "input",
    () => {

        clearTimeout(
            suggestionTimeout
        );


        const query =
            searchInput.value.trim();


        if (!query) {

            suggestionsBox.classList.add(
                "hidden"
            );

            return;
        }


        suggestionTimeout =
            setTimeout(
                () => {

                    loadSuggestions(
                        query
                    );

                },
                300
            );

    }
);


// ============================================================
// LOAD SUGGESTIONS
// ============================================================

async function loadSuggestions(
    query
) {

    try {

        const response =
            await fetch(
                `${API_URL}/suggestions?q=${encodeURIComponent(query)}`
            );


        if (!response.ok) {

            return;
        }


        const data =
            await response.json();


        const suggestions =
            data.suggestions || [];


        if (
            suggestions.length === 0
        ) {

            suggestionsBox.classList.add(
                "hidden"
            );

            return;
        }


        suggestionsBox.innerHTML =
            suggestions
                .map(
                    suggestion => `

                        <div
                            class="suggestion-item"
                            data-value="${escapeHtml(
                                suggestion
                            )}"
                        >
                            🔍
                            ${escapeHtml(
                                suggestion
                            )}
                        </div>

                    `
                )
                .join("");


        suggestionsBox.classList.remove(
            "hidden"
        );


        document
            .querySelectorAll(
                ".suggestion-item"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        searchInput.value =
                            item.dataset.value;

                        suggestionsBox.classList.add(
                            "hidden"
                        );

                        performSearch(1);

                    }
                );

            });

    }

    catch (error) {

        console.error(
            "Suggestion error:",
            error
        );

    }
}


// ============================================================
// CLOSE SUGGESTIONS
// ============================================================

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-box-wrapper"
            )
        ) {

            suggestionsBox.classList.add(
                "hidden"
            );

        }

    }
);


// ============================================================
// ADD WEBSITE TO MY INDEX
// ============================================================

indexButton.addEventListener(
    "click",
    indexWebsite
);


urlInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            indexWebsite();

        }

    }
);


async function indexWebsite() {

    let url =
        urlInput.value.trim();


    if (!url) {

        showIndexStatus(
            "Please enter a website URL.",
            false
        );

        return;
    }


    if (
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {

        url =
            "https://" + url;

    }


    indexButton.disabled = true;


    showIndexStatus(
        "⏳ Indexing website...",
        true
    );


    try {

        const response =
            await fetch(
                `${API_URL}/crawl?url=${encodeURIComponent(url)}`,
                {
                    method: "POST"
                }
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success
        ) {

            showIndexStatus(
                "✅ Website indexed successfully!",
                true
            );


            urlInput.value = "";


            currentCategory = "local";


            setActiveCategory(
                "local"
            );

        }

        else {

            showIndexStatus(
                "❌ " +
                (
                    data.message ||
                    data.detail ||
                    "Could not index website."
                ),
                false
            );

        }

    }

    catch (error) {

        console.error(
            "Indexing error:",
            error
        );


        showIndexStatus(
            "❌ Could not connect to backend.",
            false
        );

    }

    finally {

        indexButton.disabled = false;

    }
}


// ============================================================
// INDEX STATUS
// ============================================================

function showIndexStatus(
    message,
    success
) {

    indexStatus.textContent =
        message;


    indexStatus.className =
        "status-message " +
        (
            success
                ? "status-success"
                : "status-error"
        );
}


// ============================================================
// SEARCH HISTORY
// ============================================================

async function loadHistory() {

    try {

        const response =
            await fetch(
                `${API_URL}/history`
            );


        if (!response.ok) {

            return;

        }


        const data =
            await response.json();


        const history =
            data.history || [];


        if (
            history.length === 0
        ) {

            historyContainer.innerHTML = `
                <p class="muted">
                    No recent searches.
                </p>
            `;

            return;
        }


        historyContainer.innerHTML =
            history
                .map(
                    item => `

                        <div
                            class="history-item"
                            data-query="${escapeHtml(
                                item.query
                            )}"
                        >
                            🕘
                            ${escapeHtml(
                                item.query
                            )}
                        </div>

                    `
                )
                .join("");


        document
            .querySelectorAll(
                ".history-item"
            )
            .forEach(item => {

                item.addEventListener(
                    "click",
                    () => {

                        searchInput.value =
                            item.dataset.query;

                        currentCategory =
                            "all";

                        setActiveCategory(
                            "all"
                        );

                        performSearch(1);

                    }
                );

            });

    }

    catch (error) {

        console.error(
            "History error:",
            error
        );

    }
}


// ============================================================
// CATEGORY HELPER
// ============================================================

function setActiveCategory(
    category
) {

    document
        .querySelectorAll(
            ".filter-button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.category ===
                category
            );

        });
}


// ============================================================
// HIGHLIGHT SEARCH WORDS
// ============================================================

function highlightText(text) {

    const safeText =
        escapeHtml(
            String(text)
        );


    if (!currentQuery) {

        return safeText;

    }


    const words =
        currentQuery
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    let result =
        safeText;


    words.forEach(word => {

        const escaped =
            escapeRegex(
                escapeHtml(word)
            );


        if (!escaped) {

            return;

        }


        const regex =
            new RegExp(
                `(${escaped})`,
                "gi"
            );


        result =
            result.replace(
                regex,
                "<mark>$1</mark>"
            );

    });


    return result;
}


// ============================================================
// SECURITY
// ============================================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeRegex(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


// ============================================================
// DOMAIN
// ============================================================

function getDomain(url) {

    try {

        return new URL(url).hostname;

    }

    catch {

        return "";

    }

}


// ============================================================
// START
// ============================================================

loadHistory();