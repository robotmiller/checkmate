
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
    var mostUniqueClass = "";
    var mostUniqueClassMatches = 9999999;
    for (var i = 0; i < element.classList.length; i++) {
        var matches = document.getElementsByClassName(element.classList[i]).length;
        if (matches < mostUniqueClassMatches) {
            mostUniqueClassMatches = matches;
            mostUniqueClass = element.classList[i];
        }
    }
    if (mostUniqueClass) {
        return "." + mostUniqueClass;
    }

    if (element.hasAttribute("name")) {
        return attrSelector("name", element.getAttribute("name"));
    } else if (element.hasAttribute("data-testid")) {
        return attrSelector("data-testid", element.getAttribute("data-testid"));
    } else if (element.hasAttribute("data-qa")) {
        return attrSelector("data-qa", element.getAttribute("data-qa"));
    } else if (element.hasAttribute("role")) {
        return attrSelector("role", element.getAttribute("role"));
    } else if (element.hasAttribute("href")) {
        // look for a unique part of the selector.
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
    } else if (/input|button|select|a/i.test(element.tagName)) {
        return element.tagName.toLowerCase();
    }
}

function findSelector(element) {
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

document.body.addEventListener("contextmenu", function(event) {
    if (event.ctrlKey && event.altKey) {
        // todo: figure out why this doesn't work on button elements.
        var selector = findSelector(event.target);
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
