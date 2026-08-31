// ======================================================
// CONFIGURATION
// ======================================================

const API_BASE_URL =
    "https://search-engine-backend-0bba.onrender.com";

// ======================================================
// ELEMENTS
// ======================================================

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const resultsContainer =
    document.getElementById("results");

const resultsHeader =
    document.getElementById("resultsHeader");

const urlInput =
    document.getElementById("urlInput");

const indexButton =
    document.getElementById("indexButton");

const indexStatus =
    document.getElementById("indexStatus");

const historyContainer =
    document.getElementById("history");

const paginationContainer =
    document.getElementById("pagination");

const timeFilter =
    document.getElementById("timeFilter");

const filterButtons =
    document.querySelectorAll(".filter-button");

const suggestionsContainer =
    document.getElementById("suggestions");

// ======================================================
// STATE
// ======================================================

let currentCategory = "general";
let currentPage = 1;
let currentQuery = "";

// ======================================================
// CATEGORY MAPPING
// ======================================================

function getBackendCategory(category) {

    switch (category) {

        case "news":
            return "news";

        case "images":
            return "images";

        case "local":
            return "local";

        case "general":
            return "general";

        case "all":
        default:
            return "general";
    }
}

// ======================================================
// SEARCH
// ======================================================

async function performSearch(page = 1) {

    const query =
        searchInput.value.trim();

    if (!query) {

        resultsContainer.innerHTML = `
            <div class="error-message">
                Please enter something to search.
            </div>
        `;

        return;
    }

    currentQuery = query;
    currentPage = page;

    searchButton.disabled = true;
    searchButton.textContent = "Searching...";

    resultsContainer.innerHTML = `
        <div class="loading">
            Searching...
        </div>
    `;

    resultsHeader.innerHTML = "";
    paginationContainer.innerHTML = "";

    try {

        const params =
            new URLSearchParams();

        params.set("q", query);

        params.set(
            "category",
            getBackendCategory(currentCategory)
        );

        params.set(
            "pageno",
            page
        );

        params.set(
            "format",
            "json"
        );

        const timeValue =
            timeFilter.value;

        if (timeValue) {

            params.set(
                "time_range",
                timeValue
            );
        }

        const requestURL =
            `${API_BASE_URL}/search?${params.toString()}`;

        console.log(
            "SEARCH REQUEST:",
            requestURL
        );

        const response =
            await fetch(requestURL);

        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        console.log(
            "SEARCH RESPONSE:",
            data
        );

        displayResults(data);

        saveSearchHistory(query);

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        resultsContainer.innerHTML = `
            <div class="error-message">

                <h3>
                    Search failed
                </h3>

                <p>
                    ${escapeHTML(error.message)}
                </p>

                <p>
                    Please try again in a few seconds.
                </p>

            </div>
        `;

        resultsHeader.innerHTML = "";
        paginationContainer.innerHTML = "";

    } finally {

        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

// ======================================================
// DISPLAY RESULTS
// ======================================================

function displayResults(data) {

    const results =
        data.results || [];

    const category =
        data.category ||
        currentCategory;

    const total =
        Number(
            data.total ??
            results.length
        );

    resultsHeader.innerHTML = `
        Found
        <strong>${total}</strong>
        result(s) for
        "<strong>${escapeHTML(
            data.query ||
            currentQuery
        )}</strong>"
    `;

    if (results.length === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">

                <h2>
                    No results found
                </h2>

                <p>
                    Try a different search term.
                </p>

            </div>
        `;

        paginationContainer.innerHTML = "";

        return;
    }

    // ==================================================
    // IMAGE RESULTS
    // ==================================================

    if (
        category === "images" ||
        currentCategory === "images"
    ) {

        displayImageResults(results);

    } else {

        // ==================================================
        // NORMAL RESULTS
        // ==================================================

        resultsContainer.innerHTML = "";

        results.forEach(
            (result, index) => {

                const card =
                    createResultCard(
                        result,
                        index + 1
                    );

                resultsContainer.appendChild(
                    card
                );
            }
        );
    }

    createPagination(data);
}

// ======================================================
// NORMAL RESULT CARD
// ======================================================

function createResultCard(
    result,
    number
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "result-card";

    const title =
        result.title ||
        "Untitled result";

    const url =
        result.url ||
        "#";

    const content =
        result.content ||
        result.description ||
        "No description available.";

    const engine =
        result.engine ||
        "";

    const score =
        result.score !== undefined &&
        result.score !== null &&
        result.score !== ""
            ? Number(result.score)
            : null;

    let domain =
        result.domain ||
        "";

    if (!domain) {

        try {

            domain =
                new URL(url).hostname;

        } catch {

            domain = url;
        }
    }

    card.innerHTML = `

        <div class="result-number">
            Result ${number}
        </div>

        <div class="result-domain">
            ${escapeHTML(domain)}
        </div>

        <a
            class="result-title"
            href="${escapeAttribute(url)}"
            target="_blank"
            rel="noopener noreferrer"
        >
            ${escapeHTML(title)}
        </a>

        <div class="result-content">
            ${escapeHTML(content)}
        </div>

        <div class="result-meta">

            ${
                engine
                    ? `
                        <span>
                            Engine:
                            ${escapeHTML(engine)}
                        </span>
                    `
                    : ""
            }

            ${
                score !== null &&
                Number.isFinite(score)
                    ? `
                        <span class="score">
                            Score:
                            ${score.toFixed(3)}
                        </span>
                    `
                    : ""
            }

        </div>
    `;

    return card;
}

// ======================================================
// IMAGE RESULTS
// ======================================================

function displayImageResults(
    results
) {

    const grid =
        document.createElement(
            "div"
        );

    grid.className =
        "image-grid";

    let imageCount = 0;

    results.forEach(
        (result) => {

            const imageURL =
                result.img_src ||
                result.thumbnail ||
                result.image ||
                "";

            const pageURL =
                result.url ||
                imageURL ||
                "#";

            const title =
                result.title ||
                result.content ||
                "Image result";

            if (!imageURL) {
                return;
            }

            imageCount++;

            const card =
                document.createElement(
                    "a"
                );

            card.className =
                "image-card";

            card.href =
                pageURL;

            card.target =
                "_blank";

            card.rel =
                "noopener noreferrer";

            card.innerHTML = `

                <img
                    src="${escapeAttribute(
                        imageURL
                    )}"
                    alt="${escapeAttribute(
                        title
                    )}"
                    loading="lazy"
                    onerror="
                        this.parentElement.style.display='none';
                    "
                >

                <div class="image-card-title">
                    ${escapeHTML(title)}
                </div>

            `;

            grid.appendChild(
                card
            );
        }
    );

    if (imageCount === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">

                <h2>
                    No image results available
                </h2>

                <p>
                    The image search service did not
                    return usable image URLs.
                </p>

            </div>
        `;

        return;
    }

    resultsContainer.innerHTML = "";

    resultsContainer.appendChild(
        grid
    );
}

// ======================================================
// PAGINATION
// ======================================================

function createPagination(
    data
) {

    paginationContainer.innerHTML =
        "";

    const page =
        Number(
            data.page ||
            currentPage
        );

    const results =
        data.results ||
        [];

    const previousButton =
        document.createElement(
            "button"
        );

    previousButton.textContent =
        "← Previous";

    previousButton.disabled =
        page <= 1;

    previousButton.onclick =
        () => {

            if (page > 1) {

                performSearch(
                    page - 1
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        };

    const pageNumber =
        document.createElement(
            "span"
        );

    pageNumber.className =
        "page-number";

    pageNumber.textContent =
        `Page ${page}`;

    const nextButton =
        document.createElement(
            "button"
        );

    nextButton.textContent =
        "Next →";

    nextButton.disabled =
        results.length === 0;

    nextButton.onclick =
        () => {

            performSearch(
                page + 1
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        };

    paginationContainer.appendChild(
        previousButton
    );

    paginationContainer.appendChild(
        pageNumber
    );

    paginationContainer.appendChild(
        nextButton
    );
}

// ======================================================
// CATEGORY FILTERS
// ======================================================

filterButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filterButtons.forEach(
                    (btn) => {
                        btn.classList.remove(
                            "active"
                        );
                    }
                );

                button.classList.add(
                    "active"
                );

                currentCategory =
                    button.dataset.category ||
                    "general";

                currentPage = 1;

                console.log(
                    "CATEGORY:",
                    currentCategory
                );

                if (currentQuery) {

                    performSearch(1);
                }
            }
        );
    }
);

// ======================================================
// TIME FILTER
// ======================================================

timeFilter.addEventListener(
    "change",
    () => {

        currentPage = 1;

        if (currentQuery) {

            performSearch(1);
        }
    }
);

// ======================================================
// SEARCH BUTTON
// ======================================================

searchButton.addEventListener(
    "click",
    () => {
        performSearch(1);
    }
);

// ======================================================
// ENTER KEY
// ======================================================

searchInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            suggestionsContainer.classList.add(
                "hidden"
            );

            performSearch(1);
        }
    }
);

// ======================================================
// ADD WEBSITE TO MY INDEX
// ======================================================

indexButton.addEventListener(
    "click",
    addWebsite
);

urlInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            addWebsite();
        }
    }
);

async function addWebsite() {

    const url =
        urlInput.value.trim();

    if (!url) {

        showIndexStatus(
            "Please enter a website URL.",
            false
        );

        return;
    }

    try {

        new URL(url);

    } catch {

        showIndexStatus(
            "Please enter a valid URL, including https://",
            false
        );

        return;
    }

    indexButton.disabled = true;

    indexButton.textContent =
        "Adding...";

    showIndexStatus(
        "Adding website to your index...",
        true
    );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/index`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: url
                    })
                }
            );

        const data =
            await response.json();

        console.log(
            "INDEX RESPONSE:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.detail ||
                data.error ||
                "Unable to index website."
            );
        }

        showIndexStatus(
            "Website added successfully!",
            true
        );

        urlInput.value = "";

    } catch (error) {

        console.error(
            "INDEX ERROR:",
            error
        );

        showIndexStatus(
            error.message ||
            "Failed to add website.",
            false
        );

    } finally {

        indexButton.disabled = false;

        indexButton.textContent =
            "Add URL";
    }
}

// ======================================================
// INDEX STATUS
// ======================================================

function showIndexStatus(
    message,
    success
) {

    indexStatus.textContent =
        message;

    indexStatus.className =
        success
            ? "status-message status-success"
            : "status-message status-error";
}

// ======================================================
// SEARCH HISTORY
// ======================================================

function saveSearchHistory(
    query
) {

    let history = [];

    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "searchHistory"
                ) ||
                "[]"
            );

    } catch {

        history = [];
    }

    history =
        history.filter(
            (item) =>
                item !== query
        );

    history.unshift(
        query
    );

    history =
        history.slice(0, 10);

    localStorage.setItem(
        "searchHistory",
        JSON.stringify(history)
    );

    displaySearchHistory();
}

function displaySearchHistory() {

    let history = [];

    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "searchHistory"
                ) ||
                "[]"
            );

    } catch {

        history = [];
    }

    if (history.length === 0) {

        historyContainer.innerHTML = `
            <p class="muted">
                No recent searches.
            </p>
        `;

        return;
    }

    historyContainer.innerHTML =
        "";

    history.forEach(
        (query) => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "history-item";

            item.textContent =
                query;

            item.addEventListener(
                "click",
                () => {

                    searchInput.value =
                        query;

                    performSearch(1);
                }
            );

            historyContainer.appendChild(
                item
            );
        }
    );
}

// ======================================================
// SEARCH SUGGESTIONS
// ======================================================

searchInput.addEventListener(
    "input",
    () => {

        const query =
            searchInput.value.trim();

        if (!query) {

            suggestionsContainer.classList.add(
                "hidden"
            );

            return;
        }

        suggestionsContainer.innerHTML = `

            <div class="suggestion-item">

                Search for
                "${escapeHTML(query)}"

            </div>
        `;

        suggestionsContainer.classList.remove(
            "hidden"
        );

        const suggestion =
            suggestionsContainer.querySelector(
                ".suggestion-item"
            );

        suggestion.addEventListener(
            "click",
            () => {

                performSearch(1);

                suggestionsContainer.classList.add(
                    "hidden"
                );
            }
        );
    }
);

// ======================================================
// CLOSE SUGGESTIONS
// ======================================================

document.addEventListener(
    "click",
    (event) => {

        if (
            !event.target.closest(
                ".search-box-wrapper"
            )
        ) {

            suggestionsContainer.classList.add(
                "hidden"
            );
        }
    }
);

// ======================================================
// SECURITY HELPERS
// ======================================================

function escapeHTML(
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

function escapeAttribute(
    value
) {

    return escapeHTML(value);
}

// ======================================================
// INITIALIZE
// ======================================================

displaySearchHistory();

console.log(
    "My Search Engine frontend loaded."
);

console.log(
    "Backend:",
    API_BASE_URL
);