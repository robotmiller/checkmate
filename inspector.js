
// ctrl + alt + right-click on an element tries to get a unique CSS selector for it
// and copies that to the clipboard.

var HIGHLIGHT_DURATION = 1500;

function isUnique(selector) {
    return document.querySelectorAll(selector).length == 1;
}

function showSelector(element, selector) {
    var rects = element.getClientRects();
    if (!rects[0]) {
        return;
    }
    var x = rects[0].x;
    var y = rects[0].y;

    var labelY = y - 18;
    if (labelY < 0) {
        labelY += 18 + rects[0].height;
    }

    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = (x - 4) + "px";
    div.style.top = labelY + "px";
    div.style.background = "#40a070";
    div.style.color = "#fff";
    div.style.fontFamily = "monaco, consolas, 'courier new', monospace";
    div.style.fontSize = "11px";
    div.style.padding = "2px 4px";
    div.style.border = "0";
    div.style.borderRadius = "3px";
    div.style.zIndex = 2147483647;
    div.textContent = selector;
    document.body.appendChild(div);

    setTimeout(function() {
        div.parentElement.removeChild(div);
    }, HIGHLIGHT_DURATION);
}

function attrSelector(attr, value, operation) {
    operation = operation || "="
    return `[${attr}${operation}"${value.replace(/"/g, "\\\"")}"]`;
}

function getSelector(element) {
    if (element.id) {
        // we need to escape certain symbols from IDs otherwise
        // id="a.b" becomes #a.b which means something else.
        var id = element.id.replace(/([:.>~+" ])/g, "\\$1");
        return "#" + id;
    }

    var attributesToCheck = ["name", "data-testid", "data-qa", "role", "type"];
    for (var i = 0; i < attributesToCheck.length; i++) {
        var attr = attributesToCheck[i];
        if (element.hasAttribute(attr)) {
            var selector = attrSelector(attr, element.getAttribute(attr));
            if (isUnique(selector)) {
                return selector;
            }
        }
    }

    if (element.hasAttribute("href")) {
        // try to find a short part of the href that's unique.
        var route = element.getAttribute("href").split("?")[0];
        var parts = route.split("/");
        for (var i = 0; i < parts.length; i++) {
            var href = parts.slice(parts.length - i - 1).join("/");
            var selector = attrSelector("href", href, "$=");
            if (isUnique(selector)) {
                return selector;
            }
            selector = attrSelector("href", href, "*=");
            if (isUnique(selector)) {
                return selector;
            }
        }
    }

    var mostUniqueClass = "";
    var mostUniqueClassMatches = 9999999;
    for (var i = 0; i < element.classList.length; i++) {
        var matches = document.getElementsByClassName(element.classList[i]).length;
        if (matches < mostUniqueClassMatches) {
            mostUniqueClassMatches = matches;
            mostUniqueClass = element.classList[i];
        }
    }

    // if we haven't found anything yet, our preferences here are:
    //  1. a unique class.
    //  2. a tag name for something that's clickable.
    //  3. the most unique (but not unique) class.
    if (mostUniqueClass && isUnique("." + mostUniqueClass)) {
        return "." + mostUniqueClass;
    } else if (/input|button|select|a/i.test(element.tagName)) {
        return element.tagName.toLowerCase();
    } else if (mostUniqueClass) {
        return "." + mostUniqueClass;
    }
}

function generateSelector(element) {
    var selectors = [];
    var maxWidth = Math.max(element.offsetWidth * 1.5, element.offsetWidth + 40);
    var maxHeight = Math.max(element.offsetHeight * 1.5, element.offsetHeight + 40);

    while (element) {
        // this element is considered a proxy for the one you actually clicked on if they're
        // close in size. this way if you click on a span inside a button, the span might not
        // have a unique selector but if the button does, we'll use its selector instead.
        var isProxyForTarget = (element.offsetWidth <= maxWidth && element.offsetHeight <= maxHeight);
        var selector = getSelector(element);

        if (selector) {
            if (isProxyForTarget && isUnique(selector)) {
                return selector;
            }
            // if this selector by itself isn't unique, lets try the whole list.
            selectors.unshift(selector);
            if (isUnique(selectors.join(" "))) {
                return selectors.join(" ");
            }
        }

        element = element.parentElement;
        if (!element) {
            break;
        }
    }
}

function generateLabel(element) {
    var isInput = element.matches("input, textarea") && !/submit|button/i.test(element.getAttribute("type"));

    function normalizeWhitespace(text) {
        return text.replace(/\n|\r|\t/g, " ").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    }
    function quoteIfNeeded(label) {
        return label.includes(" ") ? `'${label}'` : label;
    }

    if (isInput) {
        var label = element.getAttribute("placeholder") || element.getAttribute("name");
        if (label) {
            label = normalizeWhitespace(label);
            return `${quoteIfNeeded(label)} field`;
        }
    } else {
        var isTab = element.matches("[role=tab], [role=tab] *, [class*=tab], [class*=tab] *");
        var isButton = element.matches("input[type=submit], input[type=button], button, button *, [role=button], [role=button] *");
        var isLink = element.matches("a, a *");

        if (isTab) {
            return `${quoteIfNeeded(element.innerText)} tab`;
        } else if (isButton) {
            return `${quoteIfNeeded(element.innerText)} button`;
        } else if (isLink) {
            return `${quoteIfNeeded(element.innerText)} link`;
        }
    }
}

document.body.addEventListener("contextmenu", function(event) {
    if (event.ctrlKey && event.altKey) {
        var selector = generateSelector(event.target);
        if (selector) {
            copyText(selector);
            highlight(selector);
            showSelector(event.target, selector);
            setTimeout(function() {
                unhighlight(selector);
            }, HIGHLIGHT_DURATION);
        }
        if (event.cancelBubble) {
            event.cancelBubble();
        }
        event.stopPropagation();
        event.preventDefault();
        return false;
    }
}, true);
