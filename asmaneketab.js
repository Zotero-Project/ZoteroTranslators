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
                let key = keyEl.textContent.trim();
                let value = valueEl.textContent.trim();
                fieldMap[key] = value;
            }
        });

        item.title = fieldMap["نام کامل کتاب"];
        if (fieldMap["نویسنده"]) item.creators.push({ creatorType: "author", lastName: fieldMap["نویسنده"], fieldMode: 1 });
        if (fieldMap["مترجم"]) item.creators.push({ creatorType: "translator", lastName: fieldMap["مترجم"], fieldMode: 1 });
        if (fieldMap["محقق"]) item.creators.push({ creatorType: "contributor", lastName: fieldMap["محقق"], fieldMode: 1 });
        item.publisher = fieldMap["ناشر"];
        item.edition = fieldMap["نوبت چاپ"];
        item.numPages = fieldMap["تعداد صفحات"];
        item.ISBN = fieldMap["شابک"];

    } else {
        Zotero.debug("🟡 Information table not found. Falling back to H1 tag.");
        let h1 = doc.querySelector("#main h1.product-title");
        if (h1) {
            let h1Text = h1.textContent.trim();
            let processedText = h1Text.replace(/^کتاب\s+/, '').trim();
            let parts = processedText.split('–');

            if (parts.length >= 2) {
                item.title = parts[0].trim();
                item.creators.push({ creatorType: "author", lastName: parts[1].trim(), fieldMode: 1 });
            } else {
                item.title = processedText;
            }
        }
    }
    
    // 🏷️ بخش جدید: استخراج برچسب‌ها (تگ‌ها)
    try {
        // انتخاب تمام تگ‌های <a> داخل دسته‌بندی محصول
        let tagElements = doc.querySelectorAll("div.product_meta span.posted_in a");
        if (tagElements.length > 0) {
            Zotero.debug(`✅ Found ${tagElements.length} tags.`);
            tagElements.forEach(tagEl => {
                let tagName = tagEl.textContent.trim();
                if (tagName) {
                    item.tags.push(tagName);
                }
            });
        }
    } catch(e) {
        Zotero.debug(`❗ Error processing tags: ${e}`);
    }

    // 🖼️ بخش اصلاح‌شده: استخراج تصویر جلد
    try {
        let coverImg = doc.querySelector("img.wp-post-image");
        if (coverImg && coverImg.src) {
            item.attachments.push({
                title: "Book Cover",
                mimeType: "image/jpeg",
                url: coverImg.src,
                // این گزینه باعث دانلود کپی عکس و نمایش آن به صورت پیش‌فرض می‌شود
                snapshot: true 
            });
            Zotero.debug(`🖼️ Cover image attached: ${coverImg.src}`);
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
