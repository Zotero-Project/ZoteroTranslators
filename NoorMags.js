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
	"lastUpdated": "2025-07-20 03:43:37"
}

function detectWeb(doc, url) {
	try {
		// تشخیص صفحه مقاله
		if (url.includes("/view/fa/articlepage/")) {
			return "journalArticle";
		}
		// تشخیص صفحه جستجو یا لیست
		
		return false;
	} catch (e) {
		Zotero.debug(`⚠️ Error in detectWeb: ${e.message}`);
		return false;
	}
}

function doWeb(doc, url) {
	try {
		if (detectWeb(doc, url) === "multiple") {
			processMultiple(doc, url);
		} else if (detectWeb(doc, url) === "journalArticle") {
			scrapeSingle(doc, url);
		}
	} catch (e) {
		Zotero.debug(`⚠️ Error in doWeb: ${e.message}`);
	}
}

function scrapeSingle(doc, url) {
	try {
		let item = new Zotero.Item("journalArticle");

		// استخراج عنوان
		item.title = ZU.xpathText(doc, '//meta[@name="DC.title" or @name="og:title" or @name="citation_title"]/@content') ||
			ZU.xpathText(doc, '//div[@id="title"]/span[1]') ||
			ZU.xpathText(doc, '//h1[@class="title"] | //h2[@class="title"]') ||
			"No title found";
		Zotero.debug(`📌 Title: ${item.title}`);

		// استخراج نویسندگان
		let creators = ZU.xpath(doc, '//meta[@name="DC.creator" or @name="citation_author"]/@content') ||
			ZU.xpath(doc, '//p[contains(@class, "creator-value")]/a') ||
			ZU.xpath(doc, '//div[contains(@class, "author") or contains(@class, "creator")]/a | //div[contains(@class, "author") or contains(@class, "creator")]/span') ||
			[];
		for (let creator of creators) {
			try {
				item.creators.push(ZU.cleanAuthor(creator.textContent || creator, "author", true));
			} catch (e) {
				Zotero.debug(`⚠️ Error processing creator: ${e.message}`);
			}
		}
		Zotero.debug(`🖊️ Creators found: ${item.creators.length}`);

		// استخراج کلیدواژه‌ها به عنوان تگ
		let keywords = ZU.xpath(doc, '//div[contains(@class, "keyword-list-wrapper")]//a/span') || [];
		for (let keyword of keywords) {
			try {
				item.tags.push(keyword.textContent.trim());
			} catch (e) {
				Zotero.debug(`⚠️ Error processing keyword: ${e.message}`);
			}
		}
		Zotero.debug(`🏷️ Keywords found: ${item.tags.length}`);

		// استخراج اطلاعات نشریه
		item.publicationTitle = ZU.xpathText(doc, '//meta[@name="citation_journal_title"]/@content') ||
			ZU.xpathText(doc, '//div[contains(@class, "journal-title")]/a') ||
			"No publication title found";
		Zotero.debug(`📰 Publication Title: ${item.publicationTitle}`);

		// استخراج اطلاعات شماره/سال
		let issueDetails = ZU.xpathText(doc, '//div[contains(@class, "magazine-details-wrapper")]/p[1]') ||
			ZU.xpathText(doc, '//div[contains(@class, "journal") or contains(@class, "issue")]/p | //div[contains(@class, "journal") or contains(@class, "issue")]/span');
		if (issueDetails) {
			try {
				let yearMatch = issueDetails.match(/سال\s+([^\s,]+)/);
				if (yearMatch) item.volume = ZU.trimInternal(yearMatch[1]);

				let issueMatch = issueDetails.match(/شماره\s+([\d\w]+)/);
				if (issueMatch) item.issue = issueMatch[1];

				let dateMatch = issueDetails.match(/(بهار|تابستان|پاییز|زمستان)\s+\d{4}/);
				if (dateMatch) item.date = dateMatch[0];
			} catch (e) {
				Zotero.debug(`⚠️ Error processing issue details: ${e.message}`);
			}
		}
		// متادیتای اضافی برای شماره/سال
		if (!item.volume) item.volume = ZU.xpathText(doc, '//meta[@name="citation_volume"]/@content') || "N/A";
		if (!item.issue) item.issue = ZU.xpathText(doc, '//meta[@name="citation_issue"]/@content') || "N/A";
		if (!item.date) item.date = ZU.xpathText(doc, '//meta[@name="DC.date" or @name="citation_publication_date"]/@content') || "N/A";
		Zotero.debug(`📰 Publication Details: Vol: ${item.volume}, Iss: ${item.issue}, Date: ${item.date}`);

		// استخراج صفحات
		let pagesDetails = ZU.xpathText(doc, '//div[contains(@class, "magazine-details-wrapper")]/p[2]') ||
			ZU.xpathText(doc, '//div[contains(@class, "journal") or contains(@class, "issue")]/p[2]');
		if (pagesDetails) {
			try {
				let pagesMatch = pagesDetails.match(/از\s+(\d+)\s+تا\s+(\d+)/);
				if (pagesMatch) {
					item.pages = `${pagesMatch[1]}-${pagesMatch[2]}`;
				}
			} catch (e) {
				Zotero.debug(`⚠️ Error processing pages: ${e.message}`);
			}
		}
		// متادیتای اضافی برای صفحات
		if (!item.pages && ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content')) {
			item.pages = ZU.xpathText(doc, '//meta[@name="citation_firstpage"]/@content') + '-' +
				ZU.xpathText(doc, '//meta[@name="citation_lastpage"]/@content') || "N/A";
		}
		Zotero.debug(`📄 Pages: ${item.pages || "No pages found"}`);

		// ضمیمه کردن فایل PDF
		let pdfLink = ZU.xpathText(doc, '//a[@id="article-download-pdf"]/@href') ||
			ZU.xpathText(doc, '//a[contains(@href, ".pdf") or contains(@class, "download")]/@href') ||
			ZU.xpathText(doc, '//meta[@name="citation_pdf_url"]/@content');
		if (pdfLink) {
			try {
				if (!pdfLink.startsWith("http")) {
					pdfLink = new URL(pdfLink, "https://www.noormags.ir").href;
				}
				item.attachments.push({
					title: "NoorMags Full Text PDF",
					url: pdfLink,
					mimeType: "application/pdf"
				});
				Zotero.debug(`📄 PDF URL: ${pdfLink}`);
			} catch (e) {
				Zotero.debug(`⚠️ Error processing PDF link: ${e.message}`);
			}
		}

		// استخراج چکیده (سلکتور تأییدشده)
		let abstract = ZU.xpathText(doc, '//*[@id="abstractfa"]/p[2]') ||
			ZU.xpathText(doc, '//meta[@name="citation_abstract"]/@content');
		if (abstract) {
			item.abstractNote = ZU.trimInternal(abstract);
			Zotero.debug(`📝 Abstract: ${item.abstractNote.substring(0, 100)}...`);
		} else {
			Zotero.debug("📝 No abstract found");
		}

		item.url = url;
		item.libraryCatalog = "NoorMags";

		item.complete();
	} catch (e) {
		Zotero.debug(`⚠️ Error in scrapeSingle: ${e.message}`);
	}
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
	{
		"type": "web",
		"url": "https://www.noormags.ir/view/fa/articlepage/2234732/",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "راهبردهای حکومت اسلامی در برخورد با مفاسد اداری و اقتصادی؛ با تکیه بر سیره علوی",
				"creators": [
					{
						"firstName": "زین العادین",
						"lastName": "احمدی",
						"creatorType": "author"
					},
					{
						"firstName": "عبدالله",
						"lastName": "امیدی فرد",
						"creatorType": "author"
					},
					{
						"firstName": "محمدعلی",
						"lastName": "راغبی",
						"creatorType": "author"
					}
				],
				"date": "پاییز 1403",
				"issue": "113",
				"volume": "N/A",
				"pages": "55-86",
				"libraryCatalog": "NoorMags",
				"publicationTitle": "حکومت اسلامی",
				"abstractNote": "الهام‌گیری از آموزه‌ها و سیره امام علی علیه السّلام می‌تواند مسیر برنامه‌ریزی‌ها و تعیین رویکردهای آینده را اصلاح و به مسیر صحیح هدایت کند و بررسی سیره حکومتی ایشان در دوره کوتاه خلافت، راهبردهای مقابله با فساد اداری و اقتصادی را نمایان سازد. امام علی علیه السّلام با اتخاذ راهبردهایی؛ مانند پیش‌گیری، نظارت، مجازات‌های بازدارنده و راهکارهایی از قبیل ترویج فرهنگ قناعت و ساده‌زیستی، انتخاب افراد شایسته و متخصص برای مناصب حکومتی، شفافیت در عملکرد حکومت، نظارت دقیق و همه‌جانبه بر عملکرد مدیران اقتصادی، توزیع عادلانه ثروت و امکانات، نظارت مستقیم و غیر مستقیم بر کارگزاران، تشویق و ترویج نظارت عمومی، وضع قوانین و مقررات در جهت تناسب مجازات با جرم، تسریع در رسیدگی به پرونده‌های مفاسد و قاطعیت در اجرای احکام مفسدان، توانست به طور قابل توجهی با فساد مقابله کند. با مقایسه این راهبردها با برنامه‌های مقابله با فساد در کشور، می‌توان به این نتیجه دست یافت که برنامه‌های موجود با چالش‌هایی؛ مانند عدم عدالت در برخوردها و ناکافی‌بودن مجازات‌ها روبه‌رو هستند. چالش‌هایی که با اجرای برخی سیاست‌های لیبرالیستی مضاعف شده است و پژوهش حاضر با مطالعه توصیفی ـ تحلیلی به دنبال یافتن الگویی مناسب برای مبارزه با فساد در حکومت اسلامی است.",
				"attachments": [
					{
						"title": "NoorMags Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"حکومت اسلامی",
					"نظارت عمومی",
					"سیره علوی",
					"مفاسد اقتصادی",
					"مفاسد اداری",
					"اقتصادی",
					"حکومت",
					"نظارت",
					"مجازات",
					"اطلاعات",
					"راهبردهای",
					"جرایم",
					"شفافیت",
					"قانون",
					"مالیاتی"
				],
				"url": "https://www.noormags.ir/view/fa/articlepage/2234732/"
			}
		]
	}
]
/** END TEST CASES **/

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.noormags.ir/view/fa/articlepage/2157092/%D8%A7%D8%AB%D8%B1-%D8%A8%D8%A7%D8%B2%DB%8C-%D9%87%D8%A7%DB%8C-%D8%A8%D9%88%D9%85%DB%8C-%D9%85%D8%AD%D9%84%D9%87-%D8%A7%DB%8C-%D8%A8%D8%B1-%D8%AA%D8%A8%D8%AD%D8%B1-%D8%AD%D8%B1%DA%A9%D8%AA%DB%8C-%DA%A9%D9%88%D8%AF%DA%A9%D8%A7%D9%86-%D8%A8%D8%A7-%D8%A8%D9%87%D8%B1%D9%87-%D9%87%D9%88%D8%B4%DB%8C-%D8%A8%D8%A7%D9%84%D8%A7-%D9%88-%D9%BE%D8%A7%DB%8C%DB%8C%D9%86",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "اثر بازی‌های بومی محله‌ای بر تبحر حرکتی کودکان با بهره هوشی بالا و پایین",
				"creators": [
					{
						"firstName": "حسین",
						"lastName": "اکبری یزدی",
						"creatorType": "author"
					}
				],
				"date": "بهار و تابستان 1402",
				"issue": "41",
				"libraryCatalog": "NoorMags",
				"publicationTitle": "پژوهش در مدیریت ورزشی و رفتار حرکتی",
				"abstractNote": "تأثیر بهره هوشی بر پیشرفت تحصیلی تأییدشده است؛ اما تأثیر آن بر کارایی مداخلات حرکتی ناشناخته است. مطالعه حاضر به بررسی اثر بازی‌های بومی محله‌ای بر تبحر حرکتی کودکان با بهره هوشی بالا و پایین می‌پردازد؛ بنابراین با استفاده از پرسشنامه هوش ریون از بین کودکان 10-13 ساله شهر تهران تعداد 15 کودک با بهره هوشی بالا و 15 کودک با بهره هوشی پایین انتخاب و طی هشت هفته بازی‌های بومی محله‌ای را تمرین کردند. آزمون برونینکس-اوزرتسکی 2 قبل و بعد از تمرین جهت ارزیابی تبحر حرکتی کودکان استفاده شد. نتایج نشان داد اگرچه هردو گروه از مداخله موردنظر سود بردند، اما تأثیر مداخله بر کودکان با بهره هوشی بالا بیشتر بود. نتایج این پژوهش با تأکید بر استفاده از بازی‌های بومی محله‌ای در مدارس جهت رشد حرکتی، به متخصصین استعدادیابی ورزشی نیز پیشنهاد می‌کند از هوش به‌عنوان یک شاخص در کشف استعدادها بهره بگیرند.",
				"attachments": [
					{
						"title": "NoorMags Full Text PDF",
						"mimeType": "application/pdf"
					}
				],
				"tags": [
					"Children",
					"Indigenous",
					"Intelligent Quotient",
					"Local play",
					"Motor Proficiency",
					"بازی‌های بومی محله‌ای",
					"بهره هوشی",
					"تبحر حرکتی",
					"کودکان"
				],
				"volume": "ششم",
				"url": "https://www.noormags.ir/view/fa/articlepage/2157092/%D8%A7%D8%AB%D8%B1-%D8%A8%D8%A7%D8%B2%DB%8C-%D9%87%D8%A7%DB%8C-%D8%A8%D9%88%D9%85%DB%8C-%D9%85%D8%AD%D9%84%D9%87-%D8%A7%DB%8C-%D8%A8%D8%B1-%D8%AA%D8%A8%D8%AD%D8%B1-%D8%AD%D8%B1%DA%A9%D8%AA%DB%8C-%DA%A9%D9%88%D8%AF%DA%A9%D8%A7%D9%86-%D8%A8%D8%A7-%D8%A8%D9%87%D8%B1%D9%87-%D9%87%D9%88%D8%B4%DB%8C-%D8%A8%D8%A7%D9%84%D8%A7-%D9%88-%D9%BE%D8%A7%DB%8C%DB%8C%D9%86"
			}
		]
	}
]
/** END TEST CASES **/
