// ==================================================
// CONFIGURATION
// ==================================================

const API_URL = "";


// ==================================================
// GLOBAL STATE
// ==================================================

let currentCategory = "all";

let currentPage = 1;

let currentQuery = "";

let currentTime = "";


// ==================================================
// ELEMENTS
// ==================================================

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const resultsContainer =
    document.getElementById("results");

const resultsHeader =
    document.getElementById("resultsHeader");

const pagination =
    document.getElementById("pagination");

const timeFilter =
    document.getElementById("timeFilter");

const urlInput =
    document.getElementById("urlInput");

const indexButton =
    document.getElementById("indexButton");

const indexStatus =
    document.getElementById("indexStatus");

const suggestionsBox =
    document.getElementById("suggestions");

const historyContainer =
    document.getElementById("history");


// ==================================================
// SEARCH
// ==================================================

async function performSearch(
    page = 1
) {

    const query =
        searchInput.value.trim();

    if (!query) {

        resultsContainer.innerHTML = `
            <div class="empty-message">
                Please enter a search query.
            </div>
        `;

        resultsHeader.innerHTML = "";

        pagination.innerHTML = "";

        return;
    }


    currentQuery = query;

    currentPage = page;

    currentTime =
        timeFilter.value;


    resultsContainer.innerHTML = `
        <div class="loading">
            Searching...
        </div>
    `;

    resultsHeader.innerHTML = "";

    pagination.innerHTML = "";

    searchButton.disabled = true;


    try {

        let endpoint;


        // ------------------------------------------
        // MY INDEX
        // ------------------------------------------

        if (currentCategory === "local") {

            endpoint =
                `${API_URL}/my-index` +
                `?q=${encodeURIComponent(query)}`;

        }


        // ------------------------------------------
        // WEB / NEWS / IMAGES
        // ------------------------------------------

        else {

            endpoint =
                `${API_URL}/search` +
                `?q=${encodeURIComponent(query)}` +
                `&page=${page}` +
                `&category=${encodeURIComponent(currentCategory)}` +
                `&time=${encodeURIComponent(currentTime)}`;
        }


        const response =
            await fetch(endpoint);


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );
        }


        const data =
            await response.json();


        displayResults(data);


        loadHistory();


    }

    catch (error) {

        console.error(error);

        resultsContainer.innerHTML = `
            <div class="error-message">

                <h3>
                    Search failed
                </h3>

                <p>
                    Could not connect to the search server.
                </p>

                <p>
                    Make sure the FastAPI backend is running
                    on port 8000.
                </p>

            </div>
        `;

    }

    finally {

        searchButton.disabled = false;

    }
}


// ==================================================
// DISPLAY RESULTS
// ==================================================

function displayResults(data) {

    const results =
        data.results || [];


    const total =
        data.total ??
        results.length;


    // ------------------------------------------
    // RESULT COUNT
    // ------------------------------------------

    resultsHeader.innerHTML =
        `Found <strong>${total}</strong> results`;


    // ------------------------------------------
    // NO RESULTS
    // ------------------------------------------

    if (results.length === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">

                <h3>
                    No results found
                </h3>

                <p>
                    Try a different search query.
                </p>

            </div>
        `;

        pagination.innerHTML = "";

        return;
    }


    // ------------------------------------------
    // IMAGE RESULTS
    // ------------------------------------------

    if (currentCategory === "images") {

        displayImageResults(results);

        return;
    }


    // ------------------------------------------
    // NORMAL RESULTS
    // ------------------------------------------

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


    // ------------------------------------------
    // PAGINATION
    // ------------------------------------------

    createPagination(
        data
    );
}


// ==================================================
// CREATE RESULT CARD
// ==================================================

function createResultCard(
    result,
    index
) {

    const url =
        escapeHtml(result.url || "#");


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
                rel="noopener noreferrer">

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


// ==================================================
// IMAGE RESULTS
// ==================================================

function displayImageResults(
    results
) {

    const validImages =
        results.filter(
            result =>
                result.thumbnail ||
                result.img_src
        );


    if (validImages.length === 0) {

        resultsContainer.innerHTML = `

            <div class="empty-message">

                <h3>
                    No images found
                </h3>

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

            ${
                validImages
                    .map(result => {

                        const image =
                            result.thumbnail ||
                            result.img_src;

                        return `

                            <a
                                class="image-card"
                                href="${escapeHtml(result.url || "#")}"
                                target="_blank"
                                rel="noopener noreferrer">

                                <img
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(result.title || "Image")}"
                                    loading="lazy"
                                    onerror="this.style.display='none'"
                                >

                                <div class="image-card-title">

                                    ${highlightText(
                                        result.title ||
                                        "Image result"
                                    )}

                                </div>

                            </a>

                        `;

                    })
                    .join("")
            }

        </div>

    `;


    pagination.innerHTML = "";
}


// ==================================================
// PAGINATION
// ==================================================

function createPagination(
    data
) {

    const total =
        Number(data.total || 0);


    const perPage =
        20;


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
            ${currentPage <= 1 ? "disabled" : ""}>

            ← Previous

        </button>


        <span class="page-number">

            Page ${currentPage}

        </span>


        <button
            id="nextPage"
            ${currentPage >= totalPages ? "disabled" : ""}>

            Next →

        </button>

    `;


    const previous =
        document.getElementById(
            "previousPage"
        );


    const next =
        document.getElementById(
            "nextPage"
        );


    if (previous) {

        previous.addEventListener(
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
    }


    if (next) {

        next.addEventListener(
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
}


// ==================================================
// FILTER BUTTONS
// ==================================================

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


                if (searchInput.value.trim()) {

                    performSearch(1);

                }

            }
        );

    });


// ==================================================
// TIME FILTER
// ==================================================

timeFilter.addEventListener(
    "change",
    () => {

        if (searchInput.value.trim()) {

            performSearch(1);

        }

    }
);


// ==================================================
// SEARCH BUTTON
// ==================================================

searchButton.addEventListener(
    "click",
    () => {

        performSearch(1);

    }
);


// ==================================================
// ENTER KEY
// ==================================================

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


// ==================================================
// SEARCH SUGGESTIONS
// ==================================================

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
                250
            );

    }
);


// ==================================================
// LOAD SUGGESTIONS
// ==================================================

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
                            data-value="${escapeHtml(suggestion)}">

                            🔍
                            ${escapeHtml(suggestion)}

                        </div>

                    `
                )
                .join("");


        suggestionsBox
            .classList
            .remove("hidden");


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


                        suggestionsBox
                            .classList
                            .add("hidden");


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


// ==================================================
// CLOSE SUGGESTIONS
// ==================================================

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-box-wrapper"
            )
        ) {

            suggestionsBox
                .classList
                .add("hidden");

        }

    }
);


// ==================================================
// ADD WEBSITE TO INDEX
// ==================================================

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


// ==================================================
// INDEX WEBSITE
// ==================================================

async function indexWebsite() {

    const url =
        urlInput.value.trim();


    if (!url) {

        showIndexStatus(
            "Please enter a website URL.",
            false
        );

        return;
    }


    let finalUrl = url;


    if (
        !finalUrl.startsWith(
            "http://"
        ) &&
        !finalUrl.startsWith(
            "https://"
        )
    ) {

        finalUrl =
            "https://" + finalUrl;

    }


    indexButton.disabled = true;


    showIndexStatus(
        "⏳ Indexing website...",
        true
    );


    try {

        const response =
            await fetch(
                `${API_URL}/crawl?url=${encodeURIComponent(finalUrl)}`,
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
                "✅ Page indexed successfully!",
                true
            );


            urlInput.value = "";


            // Automatically switch to My Index

            currentCategory =
                "local";


            document
                .querySelectorAll(
                    ".filter-button"
                )
                .forEach(button => {

                    button.classList.remove(
                        "active"
                    );

                    if (
                        button.dataset.category ===
                        "local"
                    ) {

                        button.classList.add(
                            "active"
                        );

                    }

                });


        }

        else {

            showIndexStatus(
                "❌ " +
                (
                    data.message ||
                    "Could not index the page."
                ),
                false
            );

        }

    }

    catch (error) {

        console.error(error);

        showIndexStatus(
            "❌ Could not connect to backend.",
            false
        );

    }

    finally {

        indexButton.disabled = false;

    }
}


// ==================================================
// INDEX STATUS
// ==================================================

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


// ==================================================
// LOAD SEARCH HISTORY
// ==================================================

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
                            data-query="${escapeHtml(item.query)}">

                            🕘
                            ${escapeHtml(item.query)}

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


// ==================================================
// CATEGORY HELPER
// ==================================================

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


// ==================================================
// HIGHLIGHT SEARCH TERMS
// ==================================================

function highlightText(
    text
) {

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
            escapeHtml(word);


        if (!escaped) {

            return;
        }


        const regex =
            new RegExp(
                `(${escapeRegex(escaped)})`,
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


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(
    value
) {

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


// ==================================================
// ESCAPE REGEX
// ==================================================

function escapeRegex(
    value
) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


// ==================================================
// GET DOMAIN
// ==================================================

function getDomain(
    url
) {

    try {

        return new URL(url).hostname;

    }

    catch {

        return "";

    }
}


// ==================================================
// INITIAL LOAD
// ==================================================

loadHistory();