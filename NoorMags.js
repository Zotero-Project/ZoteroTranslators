{
	"translatorID": "17eff4e3-34b7-4625-b03e-acd290f08012",
	"label": "NoorMags",
	"creator": "amirhosein",
	"target": "https://www.noormags.ir",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-07 16:05:32"
}

function detectWeb(doc, url) {
	// تشخیص صفحه مقاله
	if (url.includes("/view/fa/articlepage/")) {
		return "journalArticle";
	}
	// تشخیص صفحه جستجو یا لیست
	if (url.includes("/view/fa/search") || url.includes("/view/fa/magazine")) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		processMultiple(doc, url);
	} else {
		scrapeSingle(doc, url);
	}
}

function scrapeSingle(doc, url) {
	// چون نوع آیتم معمولا مقاله است، از journalArticle استفاده می‌کنیم
	let item = new Zotero.Item("journalArticle");

	// استخراج عنوان با استفاده از سلکتور ارائه شده
	item.title = ZU.xpathText(doc, '//div[@id="title"]/span[1]');
	Zotero.debug(`📌 Title: ${item.title}`);

	// استخراج نویسندگان
	// در نورمگز چندین نویسنده ممکن است وجود داشته باشد
	let creators = ZU.xpath(doc, '//p[contains(@class, "creator-value")]/a');
	for (let creator of creators) {
		item.creators.push(ZU.cleanAuthor(creator.textContent, "author", true));
	}
	Zotero.debug(`🖊️ Creators found: ${item.creators.length}`);

	// استخراج چکیده
	item.abstractNote = ZU.xpathText(doc, '//div[@id="abstractfa"]/p[2]');
	Zotero.debug(`📝 Abstract found: ${item.abstractNote ? 'Yes' : 'No'}`);

	// استخراج کلیدواژه‌ها به عنوان تگ
	let keywords = ZU.xpath(doc, '//div[contains(@class, "keyword-list-wrapper")]//a/span');
	for (let keyword of keywords) {
		item.tags.push(keyword.textContent.trim());
	}
	Zotero.debug(`🏷️ Keywords found: ${item.tags.length}`);

	// استخراج اطلاعات نشریه
	item.publicationTitle = ZU.xpathText(doc, '//div[contains(@class, "journal-title")]/a'); // عنوان نشریه

	let issueDetails = ZU.xpathText(doc, '//div[contains(@class, "magazine-details-wrapper")]/p[1]');
	if (issueDetails) {
		// استخراج سال و دوره
		let yearMatch = issueDetails.match(/سال\s+([^\s,]+)/);
		if (yearMatch) item.volume = ZU.trimInternal(yearMatch[1]); // "سال ششم" -> "ششم"

		// استخراج شماره
		let issueMatch = issueDetails.match(/شماره\s+([\d\w]+)/);
		if (issueMatch) item.issue = issueMatch[1];

		// استخراج تاریخ (فصل و سال)
		let dateMatch = issueDetails.match(/(بهار|تابستان|پاییز|زمستان)\s+\d{4}/);
		if (dateMatch) item.date = dateMatch[0];
	}

	// استخراج صفحات
	let pagesDetails = ZU.xpathText(doc, '//div[contains(@class, "magazine-details-wrapper")]/p[2]');
	if (pagesDetails) {
		let pagesMatch = pagesDetails.match(/از\s+(\d+)\s+تا\s+(\d+)/);
		if (pagesMatch) {
			item.pages = `${pagesMatch[1]}-${pagesMatch[2]}`;
		}
	}
	
	Zotero.debug(`📰 Publication: ${item.publicationTitle}, Vol: ${item.volume}, Iss: ${item.issue}, Date: ${item.date}, Pages: ${item.pages}`);

	// ضمیمه کردن فایل PDF
	let pdfLink = ZU.xpathText(doc, '//a[@id="article-download-pdf"]/@href');
	if (pdfLink) {
		if (!pdfLink.startsWith("http")) {
			pdfLink = new URL(pdfLink, "https://www.noormags.ir").href;
		}
		item.attachments.push({
			title: "NoorMags Full Text PDF",
			url: pdfLink,
			mimeType: "application/pdf"
		});
		Zotero.debug(`📄 PDF URL: ${pdfLink}`);
	}
	
	item.url = url;
	item.libraryCatalog = "NoorMags";

	item.complete();
}

function processMultiple(doc, url) {
	Zotero.debug("🔎 Scraping multiple items page...");

	let items = {};
	// سلکتور برای پیدا کردن لینک مقالات در صفحه لیست
	let itemRows = ZU.xpath(doc, '//h2[contains(@class, "search-result-title")]/a');

	for (let row of itemRows) {
		let href = row.getAttribute('href');
		let title = row.textContent.trim();
		if (!href.startsWith('http')) {
			href = new URL(href, "https://www.noormags.ir").href;
		}
		items[href] = title;
	}

	Zotero.selectItems(items, function (selectedItems) {
		if (!selectedItems) return;
		
		let urls = Object.keys(selectedItems);
		Zotero.Utilities.processDocuments(urls, scrapeSingle);
	});
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
