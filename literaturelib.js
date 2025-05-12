{
	"translatorID": "7fe1a017-ad35-4dc3-b0ac-be7ff196f9e2",
	"label": "literaturelib",
	"creator": "amirhosein",
	"target": "^https?://(www\\.)?literaturelib.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-30 10:37:24"
}

function detectWeb(doc, url) {
	Zotero.debug("🔍 Checking item type...");

	// اگر URL دقیقا مسیر یک کتاب باشد مثلا /books/5612
	let singleBookPattern = /^https?:\/\/[^\/]+\/books\/\d+\/?$/;
	if (singleBookPattern.test(url)) {
		Zotero.debug("📚 Single book page detected.");
		return "book";
	}

	// اگر صفحه جستجو یا آرشیو باشد
	if (url.includes("/books") || url === "https://literaturelib.com/") {
		Zotero.debug("🗂️ Multiple items page detected.");
		return "multiple";
	}

	Zotero.debug("❓ Not detected.");
	return false;
}

function doWeb(doc, url) {
  Zotero.debug("🌐 doWeb function called.");

  let type = detectWeb(doc, url);

  if (type === "book") {
	scrapeBookPage(doc, url);
  } else if (type === "multiple") {
	processMultiple(doc, url);
  }
}

function scrapeBookPage(doc, url) {
	Zotero.debug("✅ Scraping book page: " + url);

	let item = new Zotero.Item("book");

	// استخراج عنوان کتاب
	item.title = ZU.xpathText(doc, "/html/body/div/div[3]/div[1]/div[1]/div/div/p") ||
				ZU.xpathText(doc, "//p[contains(@class, 'text-[#ECECEC]')]") || 
			 	ZU.xpathText(doc, "//h1") || 
	Zotero.debug(`📌 Title: ${item.title}`);



	// استخراج نام نویسنده
	let author = ZU.xpathText(doc, "//td[contains(@class, 'value')]"); 
	if (author) {
		item.creators.push({ lastName: author, creatorType: "author" });
		Zotero.debug(`🖊️ Author: ${author}`);
	}

	// استخراج ناشر
	item.publisher = ZU.xpathText(doc, "//td[contains(@class, 'value')][2]");
	Zotero.debug(`🏢 Publisher: ${item.publisher}`);

	// استخراج لینک دانلود PDF
	let pdfUrl = ZU.xpathText(doc, "//a[@download]/@href");
	if (pdfUrl && !pdfUrl.startsWith("http")) {
		pdfUrl = "https://literaturelib.com" + pdfUrl;  // اضافه کردن آدرس اصلی به لینک PDF
	}
	if (pdfUrl) {
		item.attachments.push({ title: "Full Text PDF", mimeType: "application/pdf", url: pdfUrl });
		Zotero.debug(`📄 PDF URL: ${pdfUrl}`);
	}

	item.url = url;
	item.complete();
}
function processMultiple(doc, url) {
	Zotero.debug("🔎 Scraping multiple items page...");

	let items = {};
	let links = ZU.xpath(doc, "//a[contains(@href, '/books/') and (@title)]");

	links.forEach(link => {
		let href = link.getAttribute("href");
		if (!href) return; // اگر href نداشت، بیخیال شو

		let fullLink = href.startsWith("http") ? href : "https://literaturelib.com" + href;
		let title = link.getAttribute("title") || link.textContent.trim();

		// اطمینان از معتبر بودن title
		if (title && !items[fullLink]) {
			items[fullLink] = title.trim();
		}
	});

	if (Object.keys(items).length === 0) {
		Zotero.debug("⚠️ No items found on this page.");
		return;
	}

	Zotero.selectItems(items, function (selectedItems) {
		if (!selectedItems) return;
		
		let urls = Object.keys(selectedItems);
		Zotero.debug(`📥 Processing ${urls.length} books`);
		Zotero.Utilities.processDocuments(urls, scrapeBookPage);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://literaturelib.com/books/13362",
		"detectedItemType": false,
		"items": []
	},
	{
		"type": "web",
		"url": "https://literaturelib.com/books?find_in=%D8%B3%D9%84%D8%A7%D9%85",
		"detectedItemType": true,
		"items": []
	}
]
/** END TEST CASES **/
