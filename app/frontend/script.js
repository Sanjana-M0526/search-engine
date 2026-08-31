// ======================================================
// CONFIGURATION
// ======================================================

const API_BASE_URL = "https://search-engine-backend-0bba.onrender.com";

// ======================================================
// ELEMENTS
// ======================================================

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("results");
const resultsHeader = document.getElementById("resultsHeader");

const urlInput = document.getElementById("urlInput");
const indexButton = document.getElementById("indexButton");
const indexStatus = document.getElementById("indexStatus");

const historyContainer = document.getElementById("history");
const paginationContainer = document.getElementById("pagination");

const timeFilter = document.getElementById("timeFilter");
const filterButtons = document.querySelectorAll(".filter-button");

const suggestionsContainer = document.getElementById("suggestions");

// ======================================================
// STATE
// ======================================================

let currentCategory = "all";
let currentPage = 1;
let currentQuery = "";

// ======================================================
// SEARCH
// ======================================================

async function performSearch(page = 1) {

    const query = searchInput.value.trim();

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

    try {

        const params = new URLSearchParams();

        params.set("q", query);
        params.set("format", "json");
        params.set("pageno", page);
        params.set("category", currentCategory);

        // Add time filter if selected
        const timeValue = timeFilter.value;

        if (timeValue) {
            params.set("time", timeValue);
        }

        const response = await fetch(
            `${API_BASE_URL}/search?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(
                `Backend returned ${response.status}`
            );
        }

        const data = await response.json();

        console.log("Search response:", data);

        displayResults(data);

        saveSearchHistory(query);

    } catch (error) {

        console.error("Search error:", error);

        resultsContainer.innerHTML = `
            <div class="error-message">
                <h3>Search failed</h3>
                <p>
                    Unable to connect to the search backend.
                </p>
                <p>
                    Please try again in a few seconds.
                </p>
            </div>
        `;

    } finally {

        searchButton.disabled = false;
        searchButton.textContent = "Search";
    }
}

// ======================================================
// DISPLAY RESULTS
// ======================================================

function displayResults(data) {

    const results = data.results || [];

    if (results.length === 0) {

        resultsContainer.innerHTML = `
            <div class="empty-message">
                <h2>No results found</h2>
                <p>
                    Try a different search term.
                </p>
            </div>
        `;

        resultsHeader.innerHTML = "";

        paginationContainer.innerHTML = "";

        return;
    }

    resultsHeader.innerHTML = `
        Found ${results.length} result(s)
        for "<strong>${escapeHTML(data.query || currentQuery)}</strong>"
    `;

    resultsContainer.innerHTML = "";

    results.forEach((result, index) => {

        const card = createResultCard(
            result,
            index + 1
        );

        resultsContainer.appendChild(card);
    });

    createPagination(data);
}

// ======================================================
// CREATE RESULT CARD
// ======================================================

function createResultCard(result, number) {

    const card = document.createElement("div");

    card.className = "result-card";

    const title =
        result.title ||
        "Untitled result";

    const url =
        result.url ||
        "#";

    const content =
        result.content ||
        "No description available.";

    const engine =
        result.engine ||
        "";

    const score =
        result.score !== undefined
            ? result.score
            : "";

    let domain = "";

    try {

        domain = new URL(url).hostname;

    } catch {

        domain = url;
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
                    ? `<span>Engine: ${escapeHTML(engine)}</span>`
                    : ""
            }

            ${
                score !== ""
                    ? `<span class="score">
                        Score: ${escapeHTML(String(score))}
                       </span>`
                    : ""
            }

        </div>
    `;

    return card;
}

// ======================================================
// PAGINATION
// ======================================================

function createPagination(data) {

    paginationContainer.innerHTML = "";

    const currentPageNumber =
        data.page || currentPage;

    const total =
        data.total || 0;

    // If only one page, don't show pagination
    if (total <= 0) {
        return;
    }

    const previousButton =
        document.createElement("button");

    previousButton.textContent = "← Previous";

    previousButton.disabled =
        currentPageNumber <= 1;

    previousButton.onclick = () => {

        if (currentPageNumber > 1) {
            performSearch(currentPageNumber - 1);
        }
    };

    const pageNumber =
        document.createElement("span");

    pageNumber.className = "page-number";

    pageNumber.textContent =
        `Page ${currentPageNumber}`;

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "Next →";

    /*
     * We allow next page if the backend returned
     * a full page of results.
     */

    const results =
        data.results || [];

    nextButton.disabled =
        results.length === 0;

    nextButton.onclick = () => {

        performSearch(currentPageNumber + 1);
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
// FILTER BUTTONS
// ======================================================

filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        currentCategory =
            button.dataset.category || "all";

        // If a search already exists, search again
        if (currentQuery) {
            performSearch(1);
        }
    });
});

// ======================================================
// TIME FILTER
// ======================================================

timeFilter.addEventListener("change", () => {

    if (currentQuery) {
        performSearch(1);
    }
});

// ======================================================
// SEARCH BUTTON
// ======================================================

searchButton.addEventListener(
    "click",
    () => performSearch(1)
);

// ======================================================
// ENTER KEY SEARCH
// ======================================================

searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            performSearch(1);
        }
    }
);

// ======================================================
// ADD WEBSITE TO INDEX
// ======================================================

indexButton.addEventListener(
    "click",
    addWebsite
);

urlInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            addWebsite();
        }
    }
);

async function addWebsite() {

    const url = urlInput.value.trim();

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
            "Please enter a valid URL.",
            false
        );

        return;
    }

    indexButton.disabled = true;
    indexButton.textContent = "Adding...";

    showIndexStatus(
        "Adding website to your index...",
        true
    );

    try {

        /*
         * Your backend crawler endpoint.
         */

        const response = await fetch(
            `${API_BASE_URL}/index`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    url: url
                })
            }
        );

        const data = await response.json();

        console.log("Index response:", data);

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
            "Indexing error:",
            error
        );

        showIndexStatus(
            error.message ||
            "Failed to add website.",
            false
        );

    } finally {

        indexButton.disabled = false;
        indexButton.textContent = "Add URL";
    }
}

// ======================================================
// INDEX STATUS
// ======================================================

function showIndexStatus(message, success) {

    indexStatus.textContent = message;

    indexStatus.className =
        success
            ? "status-message status-success"
            : "status-message status-error";
}

// ======================================================
// SEARCH HISTORY
// ======================================================

function saveSearchHistory(query) {

    let history =
        JSON.parse(
            localStorage.getItem("searchHistory") ||
            "[]"
        );

    history =
        history.filter(item => item !== query);

    history.unshift(query);

    history =
        history.slice(0, 10);

    localStorage.setItem(
        "searchHistory",
        JSON.stringify(history)
    );

    displaySearchHistory();
}

function displaySearchHistory() {

    const history =
        JSON.parse(
            localStorage.getItem("searchHistory") ||
            "[]"
        );

    if (history.length === 0) {

        historyContainer.innerHTML = `
            <p class="muted">
                No recent searches.
            </p>
        `;

        return;
    }

    historyContainer.innerHTML = "";

    history.forEach(query => {

        const item =
            document.createElement("div");

        item.className =
            "history-item";

        item.textContent = query;

        item.addEventListener(
            "click",
            () => {

                searchInput.value = query;

                performSearch(1);
            }
        );

        historyContainer.appendChild(item);
    });
}

// ======================================================
// SUGGESTIONS
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
                Search for "${escapeHTML(query)}"
            </div>
        `;

        suggestionsContainer
            .classList.remove("hidden");

        const suggestion =
            suggestionsContainer.querySelector(
                ".suggestion-item"
            );

        suggestion.addEventListener(
            "click",
            () => {

                performSearch(1);

                suggestionsContainer
                    .classList.add("hidden");
            }
        );
    }
);

// Hide suggestions when clicking elsewhere

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".search-box-wrapper"
            )
        ) {

            suggestionsContainer
                .classList.add("hidden");
        }
    }
);

// ======================================================
// SECURITY HELPERS
// ======================================================

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {

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