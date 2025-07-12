{
	"translatorID": "7e05ee49-4e98-4485-8e62-665003d1d29f",
	"label": "fidibo",
	"creator": "mohammadkhalkahali",
	"target": "https://fidibo.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-06-30 13:28:19"
}

/**
 * Detects whether the current page is a single book page on Fidibo.
 * @param {Document} doc - The DOM document of the page.
 * @param {string} url - The URL of the page.
 * @returns {string|null} - "book" if it's a book page, otherwise null.
 */
/**
 * Detects whether the current page is a single book page on Fidibo using DOM inspection.
 * This method is more reliable than a simple URL regex.
 * @param {Document} doc - The DOM document of the page.
 * @param {string} url - The URL of the page.
 * @returns {string|null} - "book" if it's a book page, otherwise null.
 */
function detectWeb(doc, url) {
	// Regex to match book pages like: https://fidibo.com/book/103970-...
	if (/\/book\/\d+-.+/.test(url)) {
		return "book";
	}
	// Note: You could later add detection for multiple items on search/category pages.
	return null;
}

/**
 * Executes the scraping process by calling the main scrape function.
 * @param {Document} doc - The DOM document of the page.
 * @param {string} url - The URL of the page.
 */
function doWeb(doc, url) {
	// Since detectWeb confirmed this is a book page, we can directly call the scrape function.
	scrapeBookPage(doc, url);
}

// ==================================================================================
// == YOUR ORIGINAL CODE STARTS HERE (with minor good-practice adjustments) ==
// ==================================================================================

/**
 * Helper function to safely get text content from an element.
 * @param {Element} elem - The DOM element.
 * @returns {string} - The trimmed text content or an empty string.
 */
function getText(elem) {
	return elem ? elem.textContent.trim() : '';
}

/**
 * استخراج عنوان کتاب از URL فیدیبو
 * @param {string} url - لینک صفحه کتاب
 * @returns {string} - عنوان پاک شده کتاب
 */
function extractTitleFromURL(url) {
	try {
		// الگوی اصلی: /book/شماره-عنوان
		const match = url.match(/\/book\/\d+-(.*?)(?:[?#]|$)/);
		if (!match || !match[1]) {
			return null;
		}
		
		let title = match[1];
		
		// URL decode کردن
		title = decodeURIComponent(title);
		
		// تبدیل dash ها به فاصله
		title = title.replace(/-/g, ' ');
		
		// حذف کلمات اضافی از ابتدای عنوان
		const wordsToRemove = [
			'کتاب صوتی',
			'کتاب های', 
			'کتاب‌های',
			'کتاب',
			'صوتی'
		];
		
		// پیدا کردن و حذف کلمات اضافی از ابتدا
		for (const word of wordsToRemove) {
			const regex = new RegExp(`^${word}\\s+`, 'i');
			title = title.replace(regex, '');
			if(word == 'کتاب'){
				 const regex = new RegExp(`^${word}\\s+`, 'i');
				title = title.replace(regex, '');}
		}
		
		// تمیز کردن فاصله‌های اضافی
		title = title.replace(/\s+/g, ' ').trim();
		
		return title || null;
		
	} catch (error) {
		console.error('خطا در استخراج عنوان از URL:', error);
		return null;
	}
}

/**
 * Scrapes metadata from a single book page on Fidibo.
 * @param {Document} doc - The DOM document of the book page.
 * @param {string} url - The URL of the book page.
 */
function scrapeBookPage(doc, url) {
	// Initialize a new Zotero item for a book
	let item = new Zotero.Item("book");
	item.url = url;
	item.libraryCatalog = "Fidibo";

	// --- Title (روش جدید با استخراج از URL) ---
	// ابتدا سعی در استخراج از URL
	let titleFromURL = extractTitleFromURL(url);
	
	if (titleFromURL) {
		item.title = titleFromURL;
		Zotero.debug(`Fidibo: عنوان از URL استخراج شد: ${titleFromURL}`);
	} else {
		// در صورت عدم موفقیت، از روش‌های قدیمی استفاده کن
		item.title = ZU.xpathText(doc, '//div[contains(@class, "book-main-box-detail")]//h1 | //h1[contains(@class, "book-title")] | //h1[contains(@class, "book_page_book_title")] | //h1');
		
		if (!item.title) {
			// آخرین تلاش: از meta tag
			item.title = ZU.xpathText(doc, '//meta[@property="og:title"]/@content');
		}
		
		Zotero.debug(`Fidibo: عنوان از DOM استخراج شد: ${item.title}`);
	}

	// اگر هنوز عنوان پیدا نشد، پیام خطا
	if (!item.title) {
		Zotero.debug("Fidibo: هیچ عنوانی پیدا نشد!");
		item.title = "عنوان نامشخص";
	}

	// Keep track of added creators to avoid duplicates
	let creatorsAdded = {};

	// --- Creators (Attempt 1: From dedicated info rows) ---
	let creatorRowsOld = doc.querySelectorAll('.book_page_info_row__uG8_E');
	creatorRowsOld.forEach(row => {
		let labelElem = row.querySelector('.book_page_info_label__QoOUS');
		let valueElem = row.querySelector('.book_page_info_value__D1dF0 a');
		if (labelElem && valueElem) {
			let roleLabel = getText(labelElem).replace(':', '').trim();
			let name = getText(valueElem);
			let creatorType = 'contributor'; // Default type

			// Map Persian roles to Zotero creator types
			if (roleLabel.includes('نویسنده')) creatorType = 'author';
			else if (roleLabel.includes('مترجم')) creatorType = 'translator';
			else if (roleLabel.includes('ویراستار')) creatorType = 'editor';
			else if (roleLabel.includes('گردآورنده')) creatorType = 'compiler';
			else if (roleLabel.includes('گوینده')) creatorType = 'narrator'; // For audiobooks

			// Add creator if name exists and not already added
			if (name && !creatorsAdded[name + creatorType]) {
				item.creators.push(ZU.cleanAuthor(name, creatorType, true));
				creatorsAdded[name + creatorType] = true;
			}
		}
	});

	// --- Metadata from Table (Attempt 2: Using class 'book-vl-rows-item') ---
	let tableRows = doc.querySelectorAll('tr.book-vl-rows-item');
	let foundInTable = false;

	if (tableRows.length > 0) {
		foundInTable = true;
		tableRows.forEach(row => processTableRow(row, item, creatorsAdded));
	} else {
		// --- Metadata from Table (Attempt 3: Using provided XPath) ---
		Zotero.debug("Fidibo: Could not find 'tr.book-vl-rows-item'. Trying XPath for the table.");
		const tableXPath = "/html/body/div[1]/div[1]/div/div/div/div/div/div/div[3]/div[2]/div[2]/div[2]/table";
		const tableNode = doc.evaluate(tableXPath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

		if (tableNode) {
			foundInTable = true;
			const rowsInXPathTable = tableNode.querySelectorAll('tbody tr'); // Get all rows
			rowsInXPathTable.forEach(row => processTableRow(row, item, creatorsAdded));
		} else {
			Zotero.debug("Fidibo: XPath also failed. Metadata from table might be incomplete.");
		}
	}

	// --- Abstract/Description ---
let abstractNote = null;

// First, try the new, more specific selector based on your input.
// This is more reliable for current Fidibo pages.
const abstractElement = doc.querySelector('div.book-introduction-desc-text');
if (abstractElement) {
    // We get the full HTML content to preserve formatting like paragraphs.
    abstractNote = abstractElement.innerHTML.replace(/\s+/g, ' ').trim();
}

// Fallback to the old XPath method if the new one doesn't find anything.
if (!abstractNote) {
    Zotero.debug("Fidibo: New abstract selector failed, trying old XPath method.");
    abstractNote = ZU.xpathText(doc, '//div[contains(@class, "book_description")]/p | //div[@itemprop="description"] | //section[contains(@class, "description")]//p');
}

item.abstractNote = abstractNote;
	// --- Cover Image ---
let coverImageSrc = null;

// A more robust CSS selector based on your input
const imageSelector = "div.book-main-box > img";
const imageElement = doc.querySelector(imageSelector);

if (imageElement) {
	// Prioritize 'srcset' as it often contains higher quality images, fall back to 'src'.
	coverImageSrc = imageElement.getAttribute('srcset') || imageElement.getAttribute('src');
	
	// Add a debug message to see the exact URL/srcset found.
	Zotero.debug(`Fidibo Cover Selector Found: ${coverImageSrc}`);

	// If the source is from srcset, it might contain multiple URLs.
	// We'll take the first one and clean it up.
	// if (coverImageSrc && coverImageSrc.includes(',')) {
	//     coverImageSrc = coverImageSrc.split(',')[0].split(' ')[0].trim();
	// }
}

// If a valid image source was found, add it as an attachment.
if (coverImageSrc) {
	item.attachments.push({
		title: "Cover Image",
		// Ensure the URL is absolute before attaching
		url: coverImageSrc.startsWith('http') ? coverImageSrc : (new URL(coverImageSrc, url)).href,
		mimeType: "image/jpeg",
		snapshot: false
	});
}
	
	// --- Publisher (If not found in table) ---
	if (!item.publisher) {
		item.publisher = ZU.xpathText(doc, '//a[contains(@href, "/publisher/")]');
	}

	// --- ISBN (If not found in table) --
	if (!item.ISBN) {
		// Look for ISBN in meta tags or other parts of the page
		let isbnStr = ZU.xpathText(doc, '//meta[@property="books:isbn"]/@content | //span[contains(text(), "شابک")]/following-sibling::span');
		if (isbnStr) {
			 item.ISBN = ZU.cleanISBN(isbnStr);
		}
	}

	// Complete the item to save it to Zotero
	item.complete();
}

/**
 * Processes a single row from the metadata table.
 * @param {Element} row - The <tr> element.
 * @param {Zotero.Item} item - The Zotero item being built.
 * @param {Object} creatorsAdded - An object to track added creators.
 */
function processTableRow(row, item, creatorsAdded) {
	const cells = row.querySelectorAll('td');
	if (cells.length === 2) {
		const label = getText(cells[0]).replace(':', '').trim();
		// Look for the specific 'a' or 'div' tags as described
		let valueElem = cells[1].querySelector('a.material.book-vl-rows-item-subtitle.have-action') ||
						cells[1].querySelector('div.material.book-vl-rows-item-subtitle.disable') ||
						cells[1].querySelector('a') || // Fallback to any 'a'
						cells[1]; // Fallback to the whole cell
		const value = getText(valueElem);

		let creatorType = null;
		switch (label) {
			case 'نویسنده':         creatorType = 'author'; break;
			case 'مترجم':           creatorType = 'translator'; break;
			case 'گردآورنده':       creatorType = 'compiler'; break;
			case 'ویراستار':        creatorType = 'editor'; break;
			case 'گوینده':          creatorType = 'narrator'; break;
			case 'ناشر':           if (!item.publisher) item.publisher = value; break;
			case 'تاریخ انتشار':    if (!item.date) item.date = value; break;
			case 'تعداد صفحه':
			case 'تعداد صفحات':    if (!item.numPages) item.numPages = value.replace(/\D/g, ''); break;
			case 'زبان':           if (!item.language) item.language = value; break;
			case 'شابک':           if (!item.ISBN) item.ISBN = ZU.cleanISBN(value); break;
			case 'نوبت چاپ':        if (!item.edition) item.edition = value; break;
			case 'قطع':             // Could potentially map to 'callNumber' or a note
				break;
			case 'نوع فایل':         // Could add as a note or attachment type info
				break;
			case 'قیمت نسخه چاپی': // Probably not needed for Zotero
				break;
		}

		// Add creator if it's a creator type and not already added
		if (creatorType && value && !creatorsAdded[value + creatorType]) {
			item.creators.push(ZU.cleanAuthor(value, creatorType, true));
			creatorsAdded[value + creatorType] = true;
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
