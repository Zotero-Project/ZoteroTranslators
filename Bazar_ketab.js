{
	"translatorID": "12345678-abcd-efgh-ijkl-9876543210mn",
	"label": "Bazar Ketab",
	"creator": "نام شما",
	"target": "^https?://bazarketab\\.ir/",
	"minVersion": "4.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-05-06 07:44:39"
}

function detectWeb(doc, url) {
	if (url.includes('/product/')) {
		return "book";
	} else if (
		url.includes('/subject/') ||
		url.includes('/publisher/') ||
		url.includes('/vendors/') ||
		url.includes('/author/')
	) {
		return "multiple";
	}
	return false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		let items = {};
		let links = doc.querySelectorAll("ketab-book div.desc > a");

		for (let link of links) {
			let href = link.href;
			let title = ZU.trimInternal(link.textContent);
			if (href && title) {
				items[href] = title;
			}
		}

		Zotero.selectItems(items, function (selectedItems) {
			if (!selectedItems) return;
			let urls = Object.keys(selectedItems);
			ZU.processDocuments(urls, scrape);
		});
	} else {
		scrape(doc, url);
	}
}


function scrape(doc, url) {
	let newItem = new Zotero.Item("book");

// عنوان
let title = doc.querySelector('ion-item:nth-child(1) ion-col:nth-child(2)')?.textContent?.trim();
if (!title) {
	title = doc.querySelector('ketab-book-detail-info h2')?.textContent?.trim();
}
newItem.title = title || "بدون عنوان";

// نویسنده‌ها
let authorLinks = doc.querySelectorAll('ion-item:nth-child(2) ion-col:nth-child(2) ion-label a');
for (let author of authorLinks) {
	let name = author.textContent.trim();
	if (name) {
		newItem.creators.push(ZU.cleanAuthor(name, "author"));
	}
}

// مترجم‌ها
let translatorContainer = doc.querySelector('ion-item:nth-child(3) ion-col:nth-child(2)');
if (translatorContainer) {
	let translators = translatorContainer.querySelectorAll('ion-label a');
	for (let translator of translators) {
		let name = translator.textContent.trim();
		if (name) {
			newItem.creators.push(ZU.cleanAuthor(name, "translator"));
		}
	}
}

// ناشر
let publisher = doc.querySelector('ion-item:nth-child(4) ion-col:nth-child(2)')?.textContent?.trim();
if (publisher) {
	newItem.publisher = publisher;
}

// دسته‌بندی موضوعی
let subject = doc.querySelector('ion-item:nth-child(5) ion-col:nth-child(2)')?.textContent?.trim();
if (subject) {
	newItem.tags.push(subject);
}

// let abstractElem = doc.querySelector("ketab-book-detail-info ion-text");
// if (abstractElem) {
// 	item.abstractNote = ZU.trimInternal(abstractElem.textContent);
// }


// let abstractNodes = doc.querySelector('ketab-book-detail-info ion-text');
// if (abstractNodes) {
// 	// برای جلوگیری از مشکلات &zwnj;، از textContent استفاده می‌کنیم
// 	item.abstractNode = abstractNodes.textContent.trim().replace(/\u200c/g, ''); // حذف ZWNJ
// }

// تعداد صفحات
let numPagesText = doc.querySelector('ion-item:nth-child(6) ion-col:nth-child(2)')?.textContent?.trim();
if (numPagesText) {
	let numPages = parseInt(numPagesText.replace(/\D/g, ""));
	if (!isNaN(numPages)) {
		newItem.numPages = numPages;
	}
}

newItem.url = url;
newItem.libraryCatalog = "BazarKetab.ir";
newItem.attachments = [{
	title: "صفحه وب",
	document: doc
}];



newItem.complete();

}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
