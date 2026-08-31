// ======================================================
// MY SEARCH ENGINE - FRONTEND
// ======================================================

const API_BASE_URL =
    window.API_BASE_URL ||
    "https://search-engine-backend-0bba.onrender.com";


// ======================================================
// DOM ELEMENTS
// ======================================================

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("resultsContainer");
const resultsHeader = document.getElementById("resultsHeader");
const paginationContainer = document.getElementById("paginationContainer");
const timeFilter = document.getElementById("timeFilter");
const historyContainer = document.getElementById("historyContainer");

const websiteInput =
    document.getElementById("websiteInput") ||
    document.getElementById("urlInput") ||
    document.querySelector(
        'input[placeholder*="website URL"], input[placeholder*="Website URL"]'
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

document.addEventListener("DOMContentLoaded", () => {

    console.log("My Search Engine frontend loaded.");
    console.log("Backend:", API_BASE_URL);

    setupFilterButtons();
    setupSearchEvents();
    setupAddUrl();
    displaySearchHistory();

    checkBackend();

});


// ======================================================
// CHECK BACKEND
// ======================================================

async function checkBackend() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/health`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Backend HTTP ${response.status}`);
        }

        const data = await response.json();

        console.log("Backend health:", data);

    } catch (error) {

        console.error(
            "Backend health check failed:",
            error
        );

    }

}


// ======================================================
// SEARCH EVENTS
// ======================================================

function setupSearchEvents() {

    if (searchButton) {

        searchButton.addEventListener("click", () => {
            performSearch(1);
        });

    }


    if (searchInput) {

        searchInput.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                performSearch(1);

            }

        });

    }


    if (timeFilter) {

        timeFilter.addEventListener("change", () => {

            if (currentQuery) {
                performSearch(1);
            }

        });

    }

}


// ======================================================
// FILTER BUTTONS
// ======================================================

function setupFilterButtons() {

    const buttons = document.querySelectorAll(
        ".filter-button, [data-category]"
    );

    let allButton = null;


    buttons.forEach((button) => {

        let category =
            button.dataset.category ||
            getCategoryFromButtonText(button.textContent);


        if (!category) {
            return;
        }


        button.dataset.category = category;


        if (category === "all") {
            allButton = button;
        }


        button.addEventListener("click", (event) => {

            event.preventDefault();

            setActiveFilter(
                category,
                button
            );


            if (currentQuery) {
                performSearch(1);
            }

        });

    });


    if (allButton) {

        setActiveFilter(
            "all",
            allButton
        );

    }

}


// ======================================================
// GET CATEGORY
// ======================================================

function getCategoryFromButtonText(text) {

    const value =
        String(text || "")
            .trim()
            .toLowerCase();


    if (value === "all") {
        return "all";
    }

    if (value === "web") {
        return "web";
    }

    if (value === "news") {
        return "news";
    }

    if (value === "images" || value === "image") {
        return "images";
    }

    if (
        value === "my index" ||
        value === "my-index" ||
        value === "myindex"
    ) {
        return "my-index";
    }


    return null;

}


// ======================================================
// SET ACTIVE FILTER
// ======================================================

function setActiveFilter(
    category,
    clickedButton
) {

    currentCategory = category;


    const buttons = document.querySelectorAll(
        ".filter-button, [data-category]"
    );


    buttons.forEach((button) => {

        button.classList.remove("active");
        button.classList.remove("active-filter");

    });


    if (clickedButton) {

        clickedButton.classList.add("active");
        clickedButton.classList.add("active-filter");

    }


    console.log(
        "Current category:",
        currentCategory
    );

}


// ======================================================
// PERFORM SEARCH
// ======================================================

async function performSearch(page = 1) {

    if (!searchInput || !resultsContainer) {
        return;
    }


    const query =
        searchInput.value.trim();


    if (!query) {

        resultsContainer.innerHTML = `
            <div class="error-message">
                <h3>Please enter a search term</h3>
                <p>
                    Enter something in the search box and try again.
                </p>
            </div>
        `;

        resultsHeader.innerHTML = "";
        paginationContainer.innerHTML = "";

        return;

    }


    currentQuery = query;
    currentPage = page;


    if (searchButton) {

        searchButton.disabled = true;
        searchButton.textContent = "Searching...";

    }


    resultsContainer.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>

            <div class="loading">
                Searching...
            </div>
        </div>
    `;


    resultsHeader.innerHTML = "";
    paginationContainer.innerHTML = "";


    try {

        const params = new URLSearchParams();


        params.set("q", query);

        // IMPORTANT:
        // Backend expects "page"
        params.set("page", String(page));

        params.set(
            "category",
            currentCategory
        );


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
            "SEARCH REQUEST:",
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


        const responseText =
            await response.text();


        console.log(
            "Backend status:",
            response.status
        );


        console.log(
            "Backend response:",
            responseText
        );


        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}: ${responseText}`
            );

        }


        let data;

        try {

            data =
                JSON.parse(responseText);

        } catch {

            throw new Error(
                "Backend did not return valid JSON."
            );

        }


        console.log(
            "Parsed search data:",
            data
        );


        if (data.error) {

            console.error(
                "Search backend error:",
                data.error,
                data.details
            );

        }


        displayResults(data);


        saveSearchHistory(query);

        displaySearchHistory();


    } catch (error) {

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
                    ${escapeHTML(error.message)}
                </p>

                <p class="small-text">
                    Open the browser console (F12) for more details.
                </p>

            </div>
        `;


        resultsHeader.innerHTML = "";
        paginationContainer.innerHTML = "";


    } finally {

        if (searchButton) {

            searchButton.disabled = false;
            searchButton.textContent = "Search";

        }

    }

}


// ======================================================
// DISPLAY RESULTS
// ======================================================

function displayResults(data) {

    const results =
        Array.isArray(data.results)
            ? data.results
            : [];


    // --------------------------------------------------
    // BACKEND ERROR
    // --------------------------------------------------

    if (data.error) {

        resultsHeader.innerHTML = `
            Search error:
            <strong>
                ${escapeHTML(data.error)}
            </strong>
        `;


        resultsContainer.innerHTML = `
            <div class="error-message">

                <div class="error-icon">
                    ⚠️
                </div>

                <h3>
                    Search service error
                </h3>

                <p>
                    ${escapeHTML(
                        data.details ||
                        "The search server returned an error."
                    )}
                </p>

            </div>
        `;

        paginationContainer.innerHTML = "";

        return;

    }


    // --------------------------------------------------
    // NO RESULTS
    // --------------------------------------------------

    if (results.length === 0) {

        resultsHeader.innerHTML = `
            Found <strong>0</strong> result(s) for
            "<strong>${escapeHTML(
                data.query || currentQuery
            )}</strong>"
        `;


        resultsContainer.innerHTML = `
            <div class="empty-message">

                <div class="empty-icon">
                    🔍
                </div>

                <h2>
                    No results found
                </h2>

                <p>
                    Try another search term or check the search server.
                </p>

            </div>
        `;


        paginationContainer.innerHTML = "";

        return;

    }


    // --------------------------------------------------
    // HEADER
    // --------------------------------------------------

    const total =
        Number(data.total) ||
        results.length;


    resultsHeader.innerHTML = `
        Found
        <strong>${escapeHTML(String(total))}</strong>
        result(s) for
        "<strong>${escapeHTML(
            data.query || currentQuery
        )}</strong>"
    `;


    resultsContainer.innerHTML = "";


    // --------------------------------------------------
    // IMAGES
    // --------------------------------------------------

    if (currentCategory === "images") {

        displayImageResults(results);

    }

    // --------------------------------------------------
    // NORMAL
    // --------------------------------------------------

    else {

        results.forEach((result, index) => {

            const card =
                createResultCard(
                    result,
                    index + 1
                );

            resultsContainer.appendChild(card);

        });

    }


    createPagination(data);

}


// ======================================================
// IMAGE RESULTS
// ======================================================

function displayImageResults(results) {

    const grid =
        document.createElement("div");


    grid.className =
        "image-results-grid";


    results.forEach((result, index) => {

        const card =
            createImageCard(
                result,
                index + 1
            );


        grid.appendChild(card);

    });


    resultsContainer.appendChild(grid);

}


// ======================================================
// IMAGE CARD
// ======================================================

function createImageCard(
    result,
    number
) {

    const card =
        document.createElement("div");


    card.className =
        "image-result-card";


    const title =
        result.title ||
        result.name ||
        "Image result";


    const pageUrl =
        result.url ||
        result.link ||
        result.source ||
        "#";


    // SearXNG normally uses img_src
    const imageUrl =
        result.img_src ||
        result.thumbnail ||
        result.thumbnail_url ||
        result.image ||
        result.image_url ||
        result.preview ||
        result.preview_url ||
        result.media_url ||
        result.content_url ||
        "";


    const domain =
        getDomain(pageUrl);


    card.innerHTML = `

        <a
            href="${escapeAttribute(pageUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="image-link"
        >

            ${
                imageUrl
                    ? `
                        <img
                            src="${escapeAttribute(imageUrl)}"
                            alt="${escapeAttribute(title)}"
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
                ${escapeHTML(title)}
            </div>

            <div class="image-result-domain">
                ${escapeHTML(domain)}
            </div>

        </div>

    `;


    return card;

}


// ======================================================
// NORMAL RESULT CARD
// ======================================================

function createResultCard(
    result,
    number
) {

    const card =
        document.createElement("div");


    card.className =
        "result-card";


    const title =
        result.title ||
        result.name ||
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


    const date =
        result.date ||
        result.published ||
        result.published_at ||
        result.timestamp ||
        "";


    const domain =
        result.domain ||
        getDomain(url);


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
                date
                    ? `
                        <span>
                            ${escapeHTML(String(date))}
                        </span>
                    `
                    : ""
            }


            ${
                score !== ""
                    ? `
                        <span class="score">
                            Score:
                            ${escapeHTML(String(score))}
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

function createPagination(data) {

    paginationContainer.innerHTML = "";


    const page =
        Number(data.page) ||
        currentPage;


    const results =
        Array.isArray(data.results)
            ? data.results
            : [];


    const pageSize =
        Number(
            data.per_page ||
            data.page_size ||
            data.limit ||
            20
        );


    const total =
        Number(data.total) ||
        0;


    const hasPrevious =
        page > 1;


    let hasNext = false;


    if (
        typeof data.has_next === "boolean"
    ) {

        hasNext =
            data.has_next;

    } else if (total > 0) {

        hasNext =
            page * pageSize < total;

    } else {

        hasNext =
            results.length >= pageSize;

    }


    if (
        !hasPrevious &&
        !hasNext
    ) {

        return;

    }


    const pagination =
        document.createElement("div");


    pagination.className =
        "pagination";


    // Previous
    const previousButton =
        document.createElement("button");


    previousButton.className =
        "pagination-button";


    previousButton.textContent =
        "← Previous";


    previousButton.disabled =
        !hasPrevious;


    previousButton.addEventListener(
        "click",
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

        }
    );


    // Page
    const pageNumber =
        document.createElement("span");


    pageNumber.className =
        "page-number";


    pageNumber.textContent =
        `Page ${page}`;


    // Next
    const nextButton =
        document.createElement("button");


    nextButton.className =
        "pagination-button";


    nextButton.textContent =
        "Next →";


    nextButton.disabled =
        !hasNext;


    nextButton.addEventListener(
        "click",
        () => {

            if (hasNext) {

                performSearch(
                    page + 1
                );

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }

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
// ADD WEBSITE
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
        (event) => {

            if (event.key === "Enter") {

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
                /^https?:\/\//i.test(url)
                    ? url
                    : `https://${url}`
            );

    } catch {

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


    addUrlButton.disabled = true;
    addUrlButton.textContent = "Adding...";


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


        const responseText =
            await response.text();


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}: ${responseText}`
            );

        }


        const data =
            JSON.parse(responseText);


        console.log(
            "Index response:",
            data
        );


        websiteInput.value = "";


        showTemporaryMessage(
            "Website added to My Index successfully.",
            "success"
        );


        if (
            currentCategory === "my-index"
        ) {

            if (!currentQuery) {

                currentQuery = "*";

            }

            performSearch(1);

        }


    } catch (error) {

        console.error(
            "Add URL error:",
            error
        );


        showTemporaryMessage(
            `Unable to add website: ${error.message}`,
            "error"
        );


    } finally {

        addUrlButton.disabled = false;
        addUrlButton.textContent = originalText;

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
        document.createElement("div");


    element.className =
        `temporary-message ${type}`;


    element.textContent =
        message;


    document.body.appendChild(element);


    setTimeout(() => {

        element.classList.add("hide");


        setTimeout(() => {

            element.remove();

        }, 300);

    }, 4000);

}


// ======================================================
// SEARCH HISTORY
// ======================================================

function saveSearchHistory(query) {

    if (!query) {
        return;
    }


    let history = [];


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    "searchHistory"
                ) || "[]"
            );

    } catch {

        history = [];

    }


    history =
        history.filter(
            item => item !== query
        );


    history.unshift(query);


    history =
        history.slice(0, 10);


    localStorage.setItem(
        "searchHistory",
        JSON.stringify(history)
    );

}


// ======================================================
// DISPLAY HISTORY
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
                ) || "[]"
            );

    } catch {

        history = [];

    }


    if (!history.length) {

        historyContainer.innerHTML = `
            <p class="muted">
                No recent searches.
            </p>
        `;

        return;

    }


    historyContainer.innerHTML = "";


    history.forEach((query) => {

        const item =
            document.createElement("button");


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


        historyContainer.appendChild(item);

    });

}


// ======================================================
// CLEAR HISTORY
// ======================================================

function clearSearchHistory() {

    localStorage.removeItem(
        "searchHistory"
    );

    displaySearchHistory();

}


window.clearSearchHistory =
    clearSearchHistory;


// ======================================================
// HELPERS
// ======================================================

function getDomain(url) {

    if (
        !url ||
        url === "#"
    ) {

        return "";

    }


    try {

        return new URL(url).hostname;

    } catch {

        return url;

    }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    const div =
        document.createElement("div");


    div.textContent =
        String(value);


    return div.innerHTML;

}


// ======================================================
// ESCAPE ATTRIBUTE
// ======================================================

function escapeAttribute(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}