{
	"translatorID": "58cc53cd-c754-4639-ae6e-d5ef284fee6d",
	"label": "ketab.cafe",
	"creator": "nahad mt",
	"target": "https://ketab.cafe/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-13 11:21:42"
}

function detectWeb(doc, url) {
    Zotero.debug("Checking item type for URL: " + url);

    // جلوگیری از تشخیص در صفحه اصلی
    if (url === "https://ketab.cafe/" || url === "https://ketab.cafe") {
        Zotero.debug("Homepage detected, skipping detection");
        return false;
    }

    // تشخیص صفحات کتاب
    if (/^https?:\/\/ketab\.cafe\/[^\/]+\/$/.test(url) && !url.includes("/library/") && !url.includes("/tag/") && !url.includes("/search/")) {
        let title = ZU.xpathText(doc, "//h1/a/@title | //h1/text()");
        if (title) {
            Zotero.debug("Detected book page");
            return "book";
        }
    }

    Zotero.debug("No item type detected");
    return false;
}

function doWeb(doc, url) {
    Zotero.debug("doWeb called for URL: " + url);
    let type = detectWeb(doc, url);
    if (type === "book") {
        scrapeBook(doc, url);
    }
}

function splitName(name) {
    let parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: "", lastName: parts[0] };
    }
    return {
        firstName: parts.slice(0, -1).join(" "),
        lastName: parts[parts.length - 1]
    };
}

/**
 * تابع اصلاح‌شده برای استخراج اطلاعات کتاب
 */
function scrapeBook(doc, url) {
    Zotero.debug("Scraping book page: " + url);
    let item = new Zotero.Item("book");

    // استخراج هوشمند عنوان و نویسنده
    let rawTitleString = ZU.xpathText(doc, "//h1/a/@title | //h1/text()");
    if (rawTitleString) {
        rawTitleString = rawTitleString.trim();
        let titleBlock = rawTitleString;
        let authorString = "";

        // 1. بررسی وجود نویسنده بعد از "|"
        if (titleBlock.includes("|")) {
            let parts = titleBlock.split("|");
            titleBlock = parts[0].trim();
            authorString = parts[1].trim();
        }

        // 2. استخراج عنوان از داخل گیومه‌ها (فارسی و انگلیسی)
        const quoteMatch = titleBlock.match(/[”"“]([^”"“]+)[”"“]/);
        if (quoteMatch && quoteMatch[1]) {
            item.title = quoteMatch[1].trim();
        } else {
            // 3. اگر گیومه‌ای نبود، عنوان را پاکسازی کن
            item.title = titleBlock
                .replace(/^(دانلود PDF|دانلود کتاب|دانلود رمان)\s+/i, "")
                .trim();
        }
        Zotero.debug("Title: " + item.title);

        // افزودن نویسنده در صورت وجود
        if (authorString) {
            item.creators.push({
                ...splitName(authorString),
                creatorType: "author"
            });
        }
    } else {
        item.title = "عنوان نامشخص";
    }
    


    // فایل PDF
    let pdfLinks = doc.querySelectorAll("a[href$='.pdf'], a[href*='download']");
    let pdfURL = null;
    for (let link of pdfLinks) {
        if (link.href.includes(".pdf")) {
            pdfURL = new URL(link.href, url).href;
            break;
        }
    }
    if (pdfURL) {
        item.attachments.push({
            title: "Full Text PDF",
            mimeType: "application/pdf",
            url: pdfURL,
            snapshot: true
        });
        Zotero.debug("PDF: " + pdfURL);
    }

    // تگ‌ها
    let tagContainer = doc.querySelector("div.post-page-asli > div > div");
    if (tagContainer) {
        let tagLinks = tagContainer.querySelectorAll("a");
        const tagBlacklist = ["دانلود", "کتاب", item.title];
        tagLinks.forEach(link => {
            let tag = link.textContent.trim();
            if (tag && !tagBlacklist.includes(tag) && !tag.includes(item.title)) {
                item.tags.push(tag);
            }
        });
    }
    Zotero.debug("Tags: " + JSON.stringify(item.tags));
    
    // اطلاعات پایه
    item.language = "fa";
    item.url = url;
    item.libraryCatalog = "کافه کتاب";

    Zotero.debug("Item ready: " + JSON.stringify(item));
    item.complete();
}
