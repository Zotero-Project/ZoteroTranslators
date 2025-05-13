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

function scrapeBook(doc, url) {
	Zotero.debug("Scraping book page: " + url);
	let item = new Zotero.Item("book");

	// عنوان
	let rawTitle = ZU.xpathText(doc, "//h1/a/@title | //h1/text()");
	let titleMatch = null;
	if (rawTitle) {
		// گیومه‌های فارسی یا انگلیسی
		titleMatch = rawTitle.match(/[“"]([^”"]+)[”"]/);
		if (!titleMatch) {
			// بعد از "دانلود کتاب" یا "دانلود PDF"
			titleMatch = rawTitle.match(/(?:دانلود کتاب|دانلود PDF)\s+(.+)/);
		}
	}
	let title = titleMatch?.[1]?.trim() || rawTitle?.trim() || "عنوان نامشخص";
	// حذف "دانلود PDF" یا "دانلود کتاب" از ابتدای عنوان
	item.title = title.replace(/^(دانلود PDF|دانلود کتاب)\s+/i, "").trim();
	Zotero.debug("Title: " + item.title);

	// نویسنده
	let authorName = null;
	// روش 1: از متن‌های عمومی با "نویسنده:"، "مولف:" یا "به قلم"
	let textNodes = ZU.xpath(doc, "//p[contains(text(), 'نویسنده:') or contains(text(), 'مولف:') or contains(text(), 'به قلم')]");
	for (let node of textNodes) {
		let text = node.textContent.trim();
		if (text.includes("نویسنده:")) {
			authorName = text.split("نویسنده:")[1]?.trim();
		} else if (text.includes("مولف:")) {
			authorName = text.split("مولف:")[1]?.trim();
		} else if (text.includes("به قلم")) {
			authorName = text.split("به قلم")[1]?.trim();
		}
		if (authorName) break;
	}
	// روش 2: از span با متن "مولف:"، "نویسنده:" یا "به قلم"
	if (!authorName) {
		let spans = doc.querySelectorAll("span[style], p span");
		for (let span of spans) {
			let text = span.textContent.trim();
			if (text.startsWith("مولف:") || text.includes("نویسنده:")) {
				authorName = text.replace(/مولف:|نویسنده:/, "").replace(/<br>/g, "").trim();
				break;
			} else if (text.includes("به قلم")) {
				authorName = text.split("به قلم")[1]?.trim();
				break;
			}
		}
	}
	// روش 3: جستجوی نام‌های احتمالی در متن مرتبط
	if (!authorName) {
		let contentNodes = ZU.xpath(doc, "//article//div[contains(@class, 'entry-content')]//p");
		for (let node of contentNodes) {
			let text = node.textContent.trim();
			// الگوی ساده برای شناسایی نام‌های پارسی (فامیلی + اسم)
			let nameMatch = text.match(/([آ-ی]{2,}\s+[آ-ی]{2,})/g);
			if (nameMatch) {
				authorName = nameMatch[0].trim();
				break;
			}
		}
	}
	// روش 4: از blockquote (با فیلتر دقیق‌تر)
	if (!authorName) {
		let authorNode = doc.querySelector("blockquote p span em:nth-of-type(3) span, blockquote p span[style*='font-family']");
		if (authorNode) {
			let candidate = authorNode.textContent.trim();
			if (candidate && candidate !== item.title && !candidate.includes("دانلود") && !candidate.includes(item.title)) {
				authorName = candidate;
			}
		}
	}
	if (authorName) {
		// فقط از کاما و کامای فارسی برای جداکردن نویسندگان استفاده می‌شه
		let authors = authorName.split(/,|،/).map(a => a.trim()).filter(a => a && a !== item.title && !a.includes("دانلود"));
		authors.forEach(author => {
			if (author.length > 1 && !author.match(/^\W+$/) && !author.includes("first")) {
				let { firstName, lastName } = splitName(author);
				item.creators.push({
					firstName: firstName,
					lastName: lastName,
					creatorType: "author",
					fieldMode: 0
				});
			}
		});
	}
	if (!item.creators.length) {
		item.creators.push({
			firstName: "",
			lastName: "ناشناس",
			creatorType: "author",
			fieldMode: 0
		});
	}
	Zotero.debug("Authors: " + JSON.stringify(item.creators));

	// مترجم
	let translatorText = null;
	let transNodes = ZU.xpath(doc, "//p[contains(text(), 'مترجم:') or contains(text(), 'مترجمین:')]");
	if (transNodes.length > 0) {
		translatorText = transNodes[0].textContent.split(/مترجم:|مترجمین:/)[1]?.trim();
	}
	if (translatorText) {
		let translators = translatorText.split(/,|،/).map(t => t.trim()).filter(t => t);
		translators.forEach(translator => {
			let { firstName, lastName } = splitName(translator);
			item.creators.push({
				firstName: firstName,
				lastName: lastName,
				creatorType: "translator",
				fieldMode: 0
			});
		});
	}
	Zotero.debug("Translators: " + JSON.stringify(item.creators.filter(c => c.creatorType === "translator")));

	// ناشر
	let publisherText = null;
	let pubNodes = ZU.xpath(doc, "//*[contains(text(), 'ناشر:')]");
	if (pubNodes.length > 0) {
		publisherText = pubNodes[0].textContent.split("ناشر:")[1]?.trim();
	}
	item.publisher = publisherText || "";
	Zotero.debug("Publisher: " + item.publisher);

	// تاریخ انتشار
	let dateText = null;
	let dateNodes = ZU.xpath(doc, "//*[contains(text(), 'سال انتشار:') or contains(text(), 'سال چاپ:')]");
	if (dateNodes.length > 0) {
		dateText = dateNodes[0].textContent.split(/سال انتشار:|سال چاپ:/)[1]?.trim();
	}
	item.date = dateText || "";
	Zotero.debug("Date: " + item.date);

	// تعداد صفحات
	let pagesText = null;
	let pageNodes = ZU.xpath(doc, "//*[contains(text(), 'تعداد صفحات:') or contains(text(), 'صفحه:')]");
	if (pageNodes.length > 0) {
		pagesText = pageNodes[0].textContent.split(/تعداد صفحات:|صفحه:/)[1]?.trim().replace(/[^\d]/g, "");
	}
	item.numPages = pagesText || "";
	Zotero.debug("Pages: " + item.numPages);

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
	let tagContainer = doc.querySelector("div[class*='tags'], div[role='list'], div.post-page-asli > div > div");
	if (tagContainer) {
		let tagLinks = tagContainer.querySelectorAll("a");
		const tagBlacklist = ["دانلود", "کتاب", item.title];
		tagLinks.forEach(link => {
			let tag = link.textContent.trim();
			if (tag && !tagBlacklist.includes(tag)) {
				item.tags.push(tag);
			}
		});
	}
	Zotero.debug("Tags: " + JSON.stringify(item.tags));

	// توضیحات (یادداشت‌ها)
	let description = ZU.xpathText(doc, "//article//div[contains(@class, 'entry-content')]//p[not(contains(text(), 'مولف:') or contains(text(), 'ناشر:') or contains(text(), 'دانلود'))]");
	if (description) {
		item.notes.push({ note: description.trim() });
		Zotero.debug("Description added to notes");
	}

	// اطلاعات پایه
	item.language = "fa";
	item.url = url;
	item.libraryCatalog = "کافه کتاب";

	Zotero.debug("Item ready: " + JSON.stringify(item));
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ketab.cafe/دانلود-کتاب-شهریاران-طبرستان/",
		"items": [
			{
				"itemType": "book",
				"title": "شهریاران طبرستان",
				"creators": [
					{
						"firstName": "بهمن",
						"lastName": "انصاری",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "",
				"language": "fa",
				"libraryCatalog": "کافه کتاب",
				"numPages": "",
				"publisher": "",
				"url": "https://ketab.cafe/دانلود-کتاب-شهریاران-طبرستان/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ketab.cafe/download-pdf-gospel-of-mani/",
		"items": [
			{
				"itemType": "book",
				"title": "انجیل مانی",
				"creators": [
					{
						"firstName": "",
						"lastName": "مانی",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "آرمان",
						"lastName": "بختیاری",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "سپیده",
						"lastName": "درویشی",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "1389",
				"language": "fa",
				"libraryCatalog": "کافه کتاب",
				"numPages": "112",
				"publisher": "انتشارات جامی",
				"url": "https://ketab.cafe/download-pdf-gospel-of-mani/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": ["دینی", "فلسفه"],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://ketab.cafe/download-pdf-gospel-of-mani/",
		"items": [
			{
				"itemType": "book",
				"title": "انجیل مانی",
				"creators": [
					{
						"firstName": "",
						"lastName": "مانی",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "آرمان",
						"lastName": "بختیاری",
						"creatorType": "author",
						"fieldMode": 0
					},
					{
						"firstName": "سپیده",
						"lastName": "درویشی",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "1389",
				"language": "fa",
				"libraryCatalog": "کافه کتاب",
				"numPages": "112",
				"publisher": "انتشارات جامی",
				"url": "https://ketab.cafe/download-pdf-gospel-of-mani/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [
					"دینی",
					"فلسفه"
				],
				"notes": [],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://ketab.cafe/دانلود-کتاب-شهریاران-طبرستان/",
		"items": [
			{
				"itemType": "book",
				"title": "شهریاران طبرستان",
				"creators": [
					{
						"firstName": "محمدجواد",
						"lastName": "مشکور",
						"creatorType": "author",
						"fieldMode": 0
					}
				],
				"date": "",
				"language": "fa",
				"libraryCatalog": "کافه کتاب",
				"numPages": "",
				"publisher": "",
				"url": "https://ketab.cafe/دانلود-کتاب-شهریاران-طبرستان/",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Book Cover",
						"mimeType": "image/jpeg"
					}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
