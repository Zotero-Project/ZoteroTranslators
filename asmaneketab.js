{
	"translatorID": "353bc937-ba9f-47b2-a42c-0124db30ae03",
	"label": "asmaneketab",
	"creator": "Mahdi",
	"target": "https://asmaneketab.ir/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-27 05:56:15"
}
function detectWeb(doc, url) {
    // اگر URL شامل /product/ باشد، یعنی صفحه کتاب تکی است
    if (url.includes("/product/")) {
        return "book";
    }
    return false;
}

function doWeb(doc, url) {
    // تابع scrapeBookPage را با توجه به نوع صفحه فراخوانی می‌کند
    if (detectWeb(doc, url) === "book") {
        scrapeBookPage(doc, url);
    }
}

function scrapeBookPage(doc, url) {
    Zotero.debug("Scraping book page for asmaneketab.ir...");

    let item = new Zotero.Item("book"); // یک آیتم جدید از نوع کتاب می‌سازد
    item.url = url; // آدرس صفحه را ذخیره می‌کند

    // 🧑‍🤝‍🧑 تابع کمکی برای پردازش و افزودن چندین پدیدآورنده
    const addCreators = (item, creatorString, creatorType) => {
        if (!creatorString) return; // اگر رشته‌ای وجود نداشت، خارج شو

        // تمام جداکننده‌های " و " را با "," جایگزین کن تا فرمت یکسان شود
        const standardizedString = creatorString.replace(/\s+و\s+/g, ',');
        const names = standardizedString.split(',');

        names.forEach(name => {
            const trimmedName = name.trim();
            if (trimmedName) { // اطمینان از اینکه نام خالی اضافه نشود
                item.creators.push({
                    creatorType: creatorType,
                    lastName: trimmedName,
                    fieldMode: 1
                });
            }
        });
    };

    // تلاش برای استخراج اطلاعات از جدول مشخصات
    let infoTable = doc.querySelector("#tab-additional_information table.shop_attributes tbody");

    if (infoTable) {
        Zotero.debug("✅ Information table found. Scraping from table.");
        let fieldMap = {};
        let rows = infoTable.querySelectorAll("tr");

        rows.forEach(row => {
            let keyEl = row.querySelector("th");
            let valueEl = row.querySelector("td p, td");
            if (keyEl && valueEl) {
                fieldMap[keyEl.textContent.trim()] = valueEl.textContent.trim();
            }
        });

        // تقسیم عنوان به عنوان اصلی و چکیده
        const fullTitle = fieldMap["نام کامل کتاب"];
        if (fullTitle) {
            const delimiterIndex = fullTitle.search(/[:-_]/);
            if (delimiterIndex !== -1) {
                item.title = fullTitle.substring(0, delimiterIndex).trim();
                item.abstractNote = fullTitle.substring(delimiterIndex + 1).trim();
            } else {
                item.title = fullTitle;
            }
        }

        // استفاده از تابع کمکی برای افزودن پدیدآورندگان
        addCreators(item, fieldMap["نویسنده"], "author");
        addCreators(item, fieldMap["مترجم"], "translator");
        addCreators(item, fieldMap["محقق"], "contributor");
        addCreators(item, fieldMap["پاورقی نویس"], "editor");
        
        item.publisher = fieldMap["ناشر"];
        item.edition = fieldMap["نوبت چاپ"];
        item.numPages = fieldMap["تعداد صفحات"];
        item.ISBN = fieldMap["شابک"];

    } else {
        Zotero.debug("🟡 Information table not found. Falling back to H1 tag.");
        let h1 = doc.querySelector("#main h1.product_title");
        if (h1) {
            let h1Text = h1.textContent.trim();
            let processedText = h1Text.replace(/^کتاب\s+/, '').trim();
            let parts = processedText.split('–');

            if (parts.length >= 2) {
                item.title = parts[0].trim();
                // استفاده از تابع کمکی برای نویسنده در حالت H1
                addCreators(item, parts[1].trim(), "author");
            } else {
                item.title = processedText;
            }
        }
    }
    
    // 🏷️ استخراج برچسب‌ها (تگ‌ها)
    try {
        let tagElements = doc.querySelectorAll("div.product_meta span.posted_in a");
        if (tagElements.length > 0) {
            tagElements.forEach(tagEl => {
                let tagName = tagEl.textContent.trim();
                if (tagName) item.tags.push(tagName);
            });
        }
    } catch(e) {
        Zotero.debug(`❗ Error processing tags: ${e}`);
    }

    // 🖼️ استخراج تصویر جلد
    try {
        let coverImg = doc.querySelector("img.wp-post-image");
        if (coverImg && coverImg.src) {
            item.attachments.push({
                title: "Book Cover",
                mimeType: "image/jpeg",
                url: coverImg.src,
                snapshot: true 
            });
        }
    } catch (e) {
        Zotero.debug(`❗ Error processing cover image: ${e}`);
    }
    
    if (!item.title) {
        Zotero.debug("❗ Could not find title. Aborting.");
        return;
    }

    item.complete();
}
