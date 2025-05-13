{
	"translatorID": "22f0d7ab-7c7b-4c02-ba5b-aed41db25474",
	"label": "literature.lib",
	"creator": "a",
	"target": "https://literaturelib.com",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-13 04:06:53"
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
		return "m????ultiple";
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

	// عنوان
	item.title = ZU.xpathText(doc, "//h1") ||
				 ZU.xpathText(doc, "//p[contains(@class, 'text-[#ECECEC]')]") || 
				 "عنوان نامشخص";
	Zotero.debug(`📌 Title: ${item.title}`);

	// نویسنده
	let author = ZU.xpathText(doc, "//td[contains(@class, 'value') and contains(@class, '!text-right')]");
	if (author) {
		item.creators.push({
			firstName: "",
			lastName: author,
			creatorType: "author",
			fieldMode: 1
		});
		Zotero.debug(`🖊️ Author: ${author}`);
	}

	// ناشر
	item.publisher = ZU.xpathText(doc, "(//td[contains(@class, 'value')])[2]") || "";
	Zotero.debug(`🏢 Publisher: ${item.publisher}`);

	// استخراج سال چاپ با استفاده از ZU.xpath
	let year = ZU.xpathText(doc, "//*[@id='simple-tabpanel-0']/div/p/div/div[1]/div/table/tbody/tr[2]/td");
	
	// اگر سال چاپ پیدا نشد، "سال نامشخص" قرار می‌دهیم
	item.date = year ? year.trim() : "سال نامشخص";  
	Zotero.debug(`📅 Year: ${item.date}`);

	// فایل PDF
	let pdfUrl = ZU.xpathText(doc, "//a[@download]/@href");
	if (pdfUrl && !pdfUrl.startsWith("http")) {
		pdfUrl = new URL(pdfUrl, url).href;
	}
	if (pdfUrl) {
		item.attachments.push({
			title: "Full Text PDF",
			mimeType: "application/pdf",
			url: pdfUrl
		});
		Zotero.debug(`📄 PDF URL: ${pdfUrl}`);
	}

	// خلاصه
	let summary = ZU.xpathText(doc, "//*[@id='simple-tabpanel-0']//div[contains(@class,'lg:w-6/12')]//div//p//span//span");
	if (summary) {
		item.abstractNote = summary.trim();
		Zotero.debug(`📝 Summary: ${item.abstractNote}`);
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
]
/** END TEST CASES **/
