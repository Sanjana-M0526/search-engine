// ======================================================
// MY SEARCH ENGINE - COMPLETE FRONTEND SCRIPT
// ======================================================

// ======================================================
// CONFIGURATION
// ======================================================

// Your Render backend
const API_BASE_URL =
    window.API_BASE_URL ||
    "https://search-engine-backend-0bba.onrender.com";


// ======================================================
// DOM ELEMENTS
// ======================================================

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const resultsContainer =
    document.getElementById("resultsContainer");

const resultsHeader =
    document.getElementById("resultsHeader");

const paginationContainer =
    document.getElementById("paginationContainer");

const timeFilter =
    document.getElementById("timeFilter");

const historyContainer =
    document.getElementById("historyContainer");


// Add URL elements
const websiteInput =
    document.getElementById("websiteInput") ||
    document.getElementById("urlInput") ||
    document.querySelector(
        'input[placeholder*="website URL"]'
    );

const addUrlButton =
    document.getElementById("addUrlButton") ||
    document.getElementById("addURLButton") ||
    document.querySelector(
        'button[data-action="add-url"]'
    );


// ======================================================
// STATE
// ======================================================

let currentQuery = "";

let currentPage = 1;

let currentCategory = "all";


// ======================================================
// INITIALIZATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupFilterButtons();

        setupSearchEvents();

        setupAddUrl();

        displaySearchHistory();

    }
);


// ======================================================
// SEARCH EVENTS
// ======================================================

function setupSearchEvents() {

    if (searchButton) {

        searchButton.addEventListener(
            "click",
            function () {

                performSearch(1);

            }
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    performSearch(1);

                }

            }
        );

    }


    if (timeFilter) {

        timeFilter.addEventListener(
            "change",
            function () {

                if (currentQuery) {

                    performSearch(1);

                }

            }
        );

    }

}


// ======================================================
// FILTER BUTTONS
// ======================================================

function setupFilterButtons() {

    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(
        function (button) {

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            let category = null;


            if (text === "all") {

                category = "all";

            }

            else if (text === "web") {

                category = "web";

            }

            else if (text === "news") {

                category = "news";

            }

            else if (text === "images") {

                category = "images";

            }

            else if (
                text === "my index" ||
                text === "my-index"
            ) {

                category = "my-index";

            }


            if (!category) {

                return;

            }


            button.dataset.category =
                category;


            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    setActiveFilter(
                        category,
                        button
                    );


                    if (currentQuery) {

                        performSearch(1);

                    }

                }
            );

        }
    );


    // Set All as default
    const allButton =
        Array.from(buttons).find(
            function (button) {

                return (
                    button.textContent
                        .trim()
                        .toLowerCase() === "all"
                );

            }
        );


    if (allButton) {

        setActiveFilter(
            "all",
            allButton
        );

    }

}


// ======================================================
// SET ACTIVE FILTER
// ======================================================

function setActiveFilter(
    category,
    clickedButton
) {

    currentCategory =
        category;


    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(
        function (button) {

            if (
                button.dataset &&
                button.dataset.category
            ) {

                button.classList.remove(
                    "active-filter"
                );

            }

        }
    );


    if (clickedButton) {

        clickedButton.classList.add(
            "active-filter"
        );

    }

}


// ======================================================
// PERFORM SEARCH
// ======================================================

async function performSearch(
    page = 1
) {

    if (!searchInput) {

        return;

    }


    const query =
        searchInput.value.trim();


    if (!query) {

        resultsContainer.innerHTML = `
            <div class="error-message">
                <h3>Please enter a search term</h3>
                <p>
                    Enter something in the search box
                    and try again.
                </p>
            </div>
        `;

        resultsHeader.innerHTML = "";

        paginationContainer.innerHTML = "";

        return;

    }


    currentQuery =
        query;

    currentPage =
        page;


    // Disable search button
    if (searchButton) {

        searchButton.disabled =
            true;

        searchButton.textContent =
            "Searching...";

    }


    // Loading state
    resultsContainer.innerHTML = `
        <div class="loading-container">

            <div class="loading-spinner"></div>

            <div class="loading">
                Searching...
            </div>

        </div>
    `;


    resultsHeader.innerHTML =
        "";

    paginationContainer.innerHTML =
        "";


    try {

        const params =
            new URLSearchParams();


        params.set(
            "q",
            query
        );


        params.set(
            "format",
            "json"
        );


        params.set(
            "pageno",
            String(page)
        );


        params.set(
            "category",
            currentCategory
        );


        // Time filter
        if (
            timeFilter &&
            timeFilter.value
        ) {

            params.set(
                "time",
                timeFilter.value
            );

        }


        const url =
            `${API_BASE_URL}/search?${params.toString()}`;


        console.log(
            "Searching:",
            url
        );


        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Search response:",
            data
        );


        displayResults(
            data
        );


        saveSearchHistory(
            query
        );


        displaySearchHistory();


    }

    catch (error) {

        console.error(
            "Search error:",
            error
        );


        resultsContainer.innerHTML = `
            <div class="error-message">

                <div class="error-icon">
                    ⚠️
                </div>

                <h3>
                    Search failed
                </h3>

                <p>
                    Unable to connect to the
                    search backend.
                </p>

                <p class="small-text">
                    Please try again in a few seconds.
                </p>

            </div>
        `;


        resultsHeader.innerHTML =
            "";

        paginationContainer.innerHTML =
            "";

    }

    finally {

        if (searchButton) {

            searchButton.disabled =
                false;

            searchButton.textContent =
                "Search";

        }

    }

}


// ======================================================
// DISPLAY RESULTS
// ======================================================

function displayResults(
    data
) {

    const results =
        Array.isArray(data.results)
            ? data.results
            : [];


    // --------------------------------------------------
    // NO RESULTS
    // --------------------------------------------------

    if (
        results.length === 0
    ) {

        resultsHeader.innerHTML =
            data.query ||
            currentQuery
                ? `
                    Found 0 result(s)
                    for
                    "<strong>${escapeHTML(
                        data.query ||
                        currentQuery
                    )}</strong>"
                `
                : "";


        resultsContainer.innerHTML = `
            <div class="empty-message">

                <div class="empty-icon">
                    🔍
                </div>

                <h2>
                    No results found
                </h2>

                <p>
                    Try a different search term.
                </p>

            </div>
        `;


        paginationContainer.innerHTML =
            "";


        return;

    }


    // --------------------------------------------------
    // RESULTS HEADER
    // --------------------------------------------------

    const total =
        Number(data.total) ||
        results.length;


    resultsHeader.innerHTML = `
        Found
        <strong>${escapeHTML(
            String(total)
        )}</strong>
        result(s) for
        "<strong>${escapeHTML(
            data.query ||
            currentQuery
        )}</strong>"
    `;


    // --------------------------------------------------
    // CLEAR OLD RESULTS
    // --------------------------------------------------

    resultsContainer.innerHTML =
        "";


    // --------------------------------------------------
    // IMAGE RESULTS
    // --------------------------------------------------

    if (
        currentCategory ===
        "images"
    ) {

        displayImageResults(
            results
        );

    }

    // --------------------------------------------------
    // NORMAL RESULTS
    // --------------------------------------------------

    else {

        results.forEach(
            function (result, index) {

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


    // --------------------------------------------------
    // PAGINATION
    // --------------------------------------------------

    createPagination(
        data
    );

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
        "image-results-grid";


    results.forEach(
        function (
            result,
            index
        ) {

            const card =
                createImageCard(
                    result,
                    index + 1
                );


            grid.appendChild(
                card
            );

        }
    );


    resultsContainer.appendChild(
        grid
    );

}


// ======================================================
// CREATE IMAGE CARD
// ======================================================

function createImageCard(
    result,
    number
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "image-result-card";


    const title =
        result.title ||
        result.name ||
        "Image result";


    const pageUrl =
        result.url ||
        result.source ||
        result.link ||
        "#";


    /*
     * Different image APIs use different
     * property names.
     */

    const imageUrl =
        result.thumbnail ||
        result.thumbnail_url ||
        result.image ||
        result.image_url ||
        result.img ||
        result.preview ||
        result.preview_url ||
        result.media_url ||
        result.content_url ||
        "";


    const domain =
        getDomain(
            pageUrl
        );


    card.innerHTML = `
        <a
            href="${escapeAttribute(
                pageUrl
            )}"
            target="_blank"
            rel="noopener noreferrer"
            class="image-link"
        >

            ${
                imageUrl
                    ? `
                        <img
                            src="${escapeAttribute(
                                imageUrl
                            )}"
                            alt="${escapeAttribute(
                                title
                            )}"
                            class="result-image"
                            loading="lazy"
                            onerror="
                                this.style.display='none';
                                this.nextElementSibling.style.display='flex';
                            "
                        >

                        <div
                            class="image-placeholder"
                            style="display:none;"
                        >
                            🖼️
                        </div>
                    `
                    : `
                        <div class="image-placeholder">
                            🖼️
                        </div>
                    `
            }

        </a>

        <div class="image-result-info">

            <div class="image-result-number">
                Result ${number}
            </div>

            <div class="image-result-title">
                ${escapeHTML(
                    title
                )}
            </div>

            <div class="image-result-domain">
                ${escapeHTML(
                    domain
                )}
            </div>

        </div>
    `;


    return card;

}


// ======================================================
// CREATE NORMAL RESULT CARD
// ======================================================

function createResultCard(
    result,
    number
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "result-card";


    const title =
        result.title ||
        "Untitled result";


    const url =
        result.url ||
        result.link ||
        "#";


    const content =
        result.content ||
        result.description ||
        result.snippet ||
        "No description available.";


    const engine =
        result.engine ||
        "";


    const score =
        result.score !== undefined &&
        result.score !== null
            ? result.score
            : "";


    const domain =
        getDomain(
            url
        );


    // Optional date
    const date =
        result.date ||
        result.published ||
        result.published_at ||
        result.timestamp ||
        "";


    card.innerHTML = `

        <div class="result-number">
            Result ${number}
        </div>


        <div class="result-domain">
            ${escapeHTML(
                domain
            )}
        </div>


        <a
            class="result-title"
            href="${escapeAttribute(
                url
            )}"
            target="_blank"
            rel="noopener noreferrer"
        >
            ${escapeHTML(
                title
            )}
        </a>


        <div class="result-content">
            ${escapeHTML(
                content
            )}
        </div>


        <div class="result-meta">

            ${
                engine
                    ? `
                        <span>
                            Engine:
                            ${escapeHTML(
                                engine
                            )}
                        </span>
                    `
                    : ""
            }


            ${
                date
                    ? `
                        <span>
                            ${escapeHTML(
                                String(date)
                            )}
                        </span>
                    `
                    : ""
            }


            ${
                score !== ""
                    ? `
                        <span class="score">
                            Score:
                            ${escapeHTML(
                                String(score)
                            )}
                        </span>
                    `
                    : ""
            }

        </div>

    `;


    return card;

}


// ======================================================
// PAGINATION
// ======================================================

function createPagination(
    data
) {

    paginationContainer.innerHTML =
        "";


    const currentPageNumber =
        Number(data.page) ||
        currentPage;


    const results =
        Array.isArray(data.results)
            ? data.results
            : [];


    const total =
        Number(data.total) ||
        0;


    /*
     * Default page size appears to be
     * around 20 results in your backend.
     */

    const pageSize =
        Number(
            data.per_page ||
            data.page_size ||
            data.limit ||
            20
        );


    const hasNextPage =
        data.has_next !== undefined
            ? Boolean(data.has_next)
            : results.length >= pageSize;


    const hasPreviousPage =
        currentPageNumber > 1;


    if (
        !hasPreviousPage &&
        !hasNextPage
    ) {

        return;

    }


    const pagination =
        document.createElement(
            "div"
        );


    pagination.className =
        "pagination";


    // Previous
    const previousButton =
        document.createElement(
            "button"
        );


    previousButton.className =
        "pagination-button";


    previousButton.textContent =
        "← Previous";


    previousButton.disabled =
        !hasPreviousPage;


    previousButton.addEventListener(
        "click",
        function () {

            if (
                currentPageNumber > 1
            ) {

                performSearch(
                    currentPageNumber - 1
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }

        }
    );


    // Page number
    const pageNumber =
        document.createElement(
            "span"
        );


    pageNumber.className =
        "page-number";


    pageNumber.textContent =
        `Page ${currentPageNumber}`;


    // Next
    const nextButton =
        document.createElement(
            "button"
        );


    nextButton.className =
        "pagination-button";


    nextButton.textContent =
        "Next →";


    nextButton.disabled =
        !hasNextPage;


    nextButton.addEventListener(
        "click",
        function () {

            performSearch(
                currentPageNumber + 1
            );


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }
    );


    pagination.appendChild(
        previousButton
    );


    pagination.appendChild(
        pageNumber
    );


    pagination.appendChild(
        nextButton
    );


    paginationContainer.appendChild(
        pagination
    );

}


// ======================================================
// ADD WEBSITE TO MY INDEX
// ======================================================

function setupAddUrl() {

    if (
        !websiteInput ||
        !addUrlButton
    ) {

        console.log(
            "Add URL elements not found."
        );

        return;

    }


    addUrlButton.addEventListener(
        "click",
        addWebsite
    );


    websiteInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                event.preventDefault();

                addWebsite();

            }

        }
    );

}


// ======================================================
// ADD WEBSITE
// ======================================================

async function addWebsite() {

    const url =
        websiteInput.value.trim();


    if (!url) {

        showTemporaryMessage(
            "Please enter a website URL.",
            "error"
        );

        return;

    }


    let validUrl;


    try {

        validUrl =
            new URL(
                url.startsWith("http")
                    ? url
                    : `https://${url}`
            );

    }

    catch {

        showTemporaryMessage(
            "Please enter a valid URL.",
            "error"
        );

        return;

    }


    const finalUrl =
        validUrl.href;


    const originalText =
        addUrlButton.textContent;


    addUrlButton.disabled =
        true;


    addUrlButton.textContent =
        "Adding...";


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/index`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({
                        url: finalUrl
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Index response:",
            data
        );


        websiteInput.value =
            "";


        showTemporaryMessage(
            "Website added to My Index successfully.",
            "success"
        );


        // If currently viewing My Index,
        // refresh it.
        if (
            currentCategory ===
            "my-index" &&
            currentQuery
        ) {

            performSearch(1);

        }

    }

    catch (error) {

        console.error(
            "Add URL error:",
            error
        );


        showTemporaryMessage(
            "Unable to add this website. Please try again.",
            "error"
        );

    }

    finally {

        addUrlButton.disabled =
            false;

        addUrlButton.textContent =
            originalText;

    }

}


// ======================================================
// TEMPORARY MESSAGE
// ======================================================

function showTemporaryMessage(
    message,
    type
) {

    const existing =
        document.querySelector(
            ".temporary-message"
        );


    if (existing) {

        existing.remove();

    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        `temporary-message ${type}`;


    element.textContent =
        message;


    document.body.appendChild(
        element
    );


    setTimeout(
        function () {

            element.classList.add(
                "hide"
            );


            setTimeout(
                function () {

                    element.remove();

                },
                300
            );

        },
        3000
    );

}


// ======================================================
// SEARCH HISTORY
// ======================================================

function saveSearchHistory(
    query
) {

    if (!query) {

        return;

    }


    let history = [];


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "searchHistory"
                ) ||
                "[]"
            );

    }

    catch {

        history = [];

    }


    history =
        history.filter(
            function (item) {

                return (
                    item !== query
                );

            }
        );


    history.unshift(
        query
    );


    history =
        history.slice(
            0,
            10
        );


    localStorage.setItem(
        "searchHistory",
        JSON.stringify(
            history
        )
    );

}


// ======================================================
// DISPLAY SEARCH HISTORY
// ======================================================

function displaySearchHistory() {

    if (!historyContainer) {

        return;

    }


    let history = [];


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "searchHistory"
                ) ||
                "[]"
            );

    }

    catch {

        history = [];

    }


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
        "";


    history.forEach(
        function (query) {

            const item =
                document.createElement(
                    "button"
                );


            item.className =
                "history-item";


            item.textContent =
                query;


            item.addEventListener(
                "click",
                function () {

                    searchInput.value =
                        query;


                    performSearch(
                        1
                    );

                }
            );


            historyContainer.appendChild(
                item
            );

        }
    );

}


// ======================================================
// CLEAR SEARCH HISTORY
// ======================================================

function clearSearchHistory() {

    localStorage.removeItem(
        "searchHistory"
    );


    displaySearchHistory();

}


// Make available to HTML if needed
window.clearSearchHistory =
    clearSearchHistory;


// ======================================================
// HELPERS
// ======================================================

function getDomain(
    url
) {

    if (
        !url ||
        url === "#"
    ) {

        return "";

    }


    try {

        return new URL(
            url
        ).hostname;

    }

    catch {

        return url;

    }

}


// ======================================================
// HTML ESCAPING
// ======================================================

function escapeHTML(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ======================================================
// ATTRIBUTE ESCAPING
// ======================================================

function escapeAttribute(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#39;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );

}


// ======================================================
// PAGE LOAD
// ======================================================

console.log(
    "My Search Engine frontend loaded."
);

console.log(
    "API:",
    API_BASE_URL
);