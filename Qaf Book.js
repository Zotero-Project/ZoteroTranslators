{
	"translatorID": "2b64b7de-2a72-4b86-9c2f-4f9c6fb2417f",
	"label": "Qaf Book (ghbook.ir)",
	"creator": "Codex",
	"target": "^https?://www\\.ghbook\\.ir/index\\.php\\?option=com_dbook&task=viewbook&book_id=\\d+",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-01-05 00:00:00"
}

function detectWeb(doc, url) {
	if (url.includes("option=com_dbook") && url.includes("task=viewbook")) {
		return "book";
	}
	return false;
}

function doWeb(doc, url) {
	scrape(doc, url);
}

function textFromSelector(doc, selector) {
	var el = doc.querySelector(selector);
	return el ? ZU.trimInternal(el.textContent) : "";
}

function textFromXPath(doc, xpath) {
	var node = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	return node ? ZU.trimInternal(node.textContent) : "";
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
	if (el.tagName && el.tagName.toUpperCase() === "IMG") {
		return el.getAttribute("src") || "";
	}
	var img = el.querySelector("img");
	return img ? (img.getAttribute("src") || "") : "";
}

function imageFromXPath(doc, xpath) {
	var node = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	if (!node) return "";
	if (node.nodeName && node.nodeName.toLowerCase() === "img") {
		return node.getAttribute("src") || "";
	}
	return "";
}

function guessImageMimeType(url) {
	var ext = ZU.getFileExtension(url).toLowerCase();
	if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
	if (ext === "png") return "image/png";
	if (ext === "gif") return "image/gif";
	if (ext === "webp") return "image/webp";
	return "";
}

function scrape(doc, url) {
	var item = new Zotero.Item("book");

	var title = textFromSelector(doc, "#listing > h2 > span");
	if (!title) {
		title = textFromXPath(doc, "/html/body/div[1]/div/div/div[2]/div/div[2]/div/div[1]/div/div/div/div/div/main/div/div/div/div[2]/div[1]/h2/span");
	}
	if (!title) {
		title = ZU.trimInternal(doc.title || "");
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
		item.creators.push({
			lastName: author,
			creatorType: "author",
			fieldMode: 1
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
		coverURL = ZU.resolveRelativeURL(coverURL, url);
		var mimeType = guessImageMimeType(coverURL);
		var attachment = {
			title: "Cover Image",
			url: coverURL
		};
		if (mimeType) {
			attachment.mimeType = mimeType;
		}
		item.attachments.push(attachment);
	}

	item.complete();
}
