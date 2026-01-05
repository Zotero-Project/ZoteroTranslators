{
	"translatorID": "2b64b7de-2a72-4b86-9c2f-4f9c6fb2417f",
	"label": "Qaf Book (ghbook.ir)",
	"creator": "Codex",
	"target": "^https?://(?:www\\.)?ghbook\\.ir/index\\.php\\?option=com_dbook&task=viewbook&book_id=\\d+",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-05 00:00:00"
}

var ZU = Zotero.Utilities;

function detectWeb(doc, url) {
	Zotero.debug("Checking item type for URL: " + url);
	if (url.indexOf("option=com_dbook") === -1 || url.indexOf("task=viewbook") === -1) {
		return false;
	}
	if (url.includes("option=com_dbook") && url.includes("task=viewbook")) {
		return "book";
	}
	return false;
}

function doWeb(doc, url) {
	Zotero.debug("doWeb function called.");
	var result = detectWeb(doc, url);
	if (result === "book") {
		scrape(doc, url);
	}
}

function textFromSelector(doc, selector) {
	var el = doc.querySelector(selector);
	return el ? ZU.trimInternal(el.textContent) : "";
}

function textFromXPath(doc, xpath) {
	var text = ZU.xpathText(doc, xpath);
	return text ? ZU.trimInternal(text) : "";
}

function firstText(doc, selectors, xpaths) {
	if (selectors) {
		for (var i = 0; i < selectors.length; i++) {
			var text = textFromSelector(doc, selectors[i]);
			if (text) return text;
		}
	}
	if (xpaths) {
		for (var j = 0; j < xpaths.length; j++) {
			var xpathText = textFromXPath(doc, xpaths[j]);
			if (xpathText) return xpathText;
		}
	}
	return "";
}

function imageFromSelector(doc, selector) {
	var el = doc.querySelector(selector);
	if (!el) return "";
	var img = el;
	if (!(el.tagName && el.tagName.toUpperCase() === "IMG")) {
		img = el.querySelector("img");
	}
	return getImageURLFromNode(img);
}

function imageFromXPath(doc, xpath) {
	var nodes = ZU.xpath(doc, xpath);
	if (!nodes || !nodes.length) return "";
	var node = nodes[0];
	if (node && node.nodeType === 2) {
		return ZU.trimInternal(node.nodeValue || "");
	}
	var img = node;
	if (node && node.nodeName && node.nodeName.toLowerCase() !== "img" && node.querySelector) {
		img = node.querySelector("img");
	}
	return getImageURLFromNode(img);
}

function getImageURLFromNode(node) {
	if (!node || !node.getAttribute) return "";
	var src = pickImageAttr(node, "src");
	if (!src) src = pickImageAttr(node, "data-src");
	if (!src) src = pickImageAttr(node, "data-original");
	if (!src) src = pickImageAttr(node, "data-lazy-src");
	if (!src) src = pickImageAttr(node, "data-srcset");
	if (!src) src = pickImageAttr(node, "srcset");
	return src || "";
}

function pickImageAttr(node, attr) {
	var val = node.getAttribute(attr);
	if (!val) return "";
	val = ZU.trimInternal(val);
	if (attr === "srcset" || attr === "data-srcset") {
		return parseSrcset(val);
	}
	return val;
}

function parseSrcset(value) {
	var first = value.split(",")[0];
	if (!first) return "";
	return first.trim().split(/\s+/)[0];
}

function guessImageMimeType(url) {
	var cleanURL = url.split("?")[0].split("#")[0];
	var dotIndex = cleanURL.lastIndexOf(".");
	var ext = dotIndex !== -1 ? cleanURL.slice(dotIndex + 1).toLowerCase() : "";
	if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
	if (ext === "png") return "image/png";
	if (ext === "gif") return "image/gif";
	if (ext === "webp") return "image/webp";
	return "";
}

function resolveURL(href, baseURL) {
	if (!href) return "";
	try {
		return new URL(href, baseURL).href;
	} catch (e) {
		return href;
	}
}

function splitCreators(value) {
	return value.split(/,|\u060C/).map(function (name) {
		return ZU.trimInternal(name);
	}).filter(function (name) {
		return name;
	});
}

function scrape(doc, url) {
	Zotero.debug("Scraping book page: " + url);
	var item = new Zotero.Item("book");
	item.libraryCatalog = "Qaf Book";

	var title = textFromSelector(doc, "#listing > h2 > span");
	if (!title) {
		title = textFromXPath(doc, "/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/h2/span");
	}
	if (!title) {
		title = ZU.trimInternal(doc.title || "");
	}
	if (!title) {
		Zotero.debug("Book title not found; continuing without title");
	}
	item.title = title;
	item.url = url;

	var author = firstText(doc, [
		"#field_29 > div.output > a",
		"#field_29 > div.output"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[1]/div[2]/a",
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[1]/div[2]"
	]);
	if (author) {
		var authors = splitCreators(author);
		authors.forEach(function (name) {
			item.creators.push({
				lastName: name,
				creatorType: "author",
				fieldMode: 1
			});
		});
	}

	var publisher = firstText(doc, [
		"#field_34 > div.output > a",
		"#field_34 > div.output"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[2]/div[2]/a",
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[2]/div[2]"
	]);
	if (publisher) {
		item.publisher = publisher;
	}

	var language = firstText(doc, [
		"#field_31 > div.output > a",
		"#field_31 > div.output"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[3]/div[2]/a",
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[3]/div[2]"
	]);
	if (language) {
		item.language = language;
	}

	var volumesCaption = firstText(doc, [
		"#field_49 > div.caption"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[6]/div[1]"
	]);
	if (volumesCaption && volumesCaption.indexOf("تعداد جلد") !== -1) {
		var numberOfVolumes = firstText(doc, [
			"#field_49 > div.output",
			"#field_49 > div.output > a"
		], [
			"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[6]/div[2]"
		]);
		if (numberOfVolumes) {
			item.numberOfVolumes = numberOfVolumes;
		}
	}

	var isbnCaption = firstText(doc, [
		"#field_41 > div.caption"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[12]/div[1]"
	]);
	if (isbnCaption && /isbn/i.test(isbnCaption)) {
		var isbn = firstText(doc, [
			"#field_41 > div.output",
			"#field_41 > div.output > a"
		], [
			"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[12]/div[2]"
		]);
		if (isbn) {
			item.ISBN = isbn;
		}
	}

	var printYearCaption = firstText(doc, [
		"#field_39 > div.caption"
	], [
		"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[13]/div[1]"
	]);
	if (printYearCaption && printYearCaption.indexOf("سال چاپ") !== -1) {
		var printYear = firstText(doc, [
			"#field_39 > div.output > a",
			"#field_39 > div.output"
		], [
			"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[13]/div[2]/a",
			"/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/ul/li[13]/div[2]"
		]);
		if (printYear) {
			item.date = printYear;
		}
	}

	var coverURL = imageFromSelector(doc, "#mainimage");
	if (!coverURL) {
		coverURL = imageFromXPath(doc, "/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/div[1]/div[2]/div[1]/div/ul/li/div/img");
	}
	if (coverURL) {
		coverURL = resolveURL(coverURL, url);
		if (!/^(https?|data):/i.test(coverURL)) {
			coverURL = "";
		}
	}
	if (coverURL) {
		var mimeType = guessImageMimeType(coverURL);
		var attachment = {
			title: "Cover Image",
			url: coverURL,
			snapshot: true
		};
		if (mimeType) {
			attachment.mimeType = mimeType;
		}
		item.attachments.push(attachment);
	}

	item.complete();
}
