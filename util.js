
var GET_STATE = "GET_STATE";
var SET_STATE = "SET_STATE";
var SWITCH_TAB = "SWITCH_TAB";
var SET_STEP = "SET_STEP";
var STOP_TEST = "STOP_TEST";
var RUN_IN_FRAMES = "RUN_IN_FRAMES";

function $(id) {
	return document.getElementById(id);
}

Object.defineProperty(RegExp.prototype, "toJSON", {
    value: RegExp.prototype.toString
});

function highlight(elementOrSelector, regex) {
    if (!elementOrSelector) {
        return;
    } else if (typeof elementOrSelector == "string") {
        findElements(elementOrSelector, regex).forEach(function(element) {
            element.style.outline = "4px solid #40a070";
        });
    } else {
        elementOrSelector.style.outline = "4px solid #40a070";
    }
}

function unhighlight(elementOrSelector, regex) {
    if (!elementOrSelector) {
        return;
    } else if (typeof elementOrSelector == "string") {
        findElements(elementOrSelector, regex).forEach(function(element) {
            element.style.outline = "";
        });
    } else {
        elementOrSelector.style.outline = "";
    }
}

function findElement(selector, regex) {
    if (regex && typeof regex == "string") {
        regex = eval(regex);
    }
    var elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
        if (regex) {
            if (regex.test(elements[i].textContent)) {
                return elements[i];
            }
        } else {
            return elements[i];
        }
    }
}

function findElements(selector, regex) {
    if (regex && typeof regex == "string") {
        regex = eval(regex);
    }
    
    return Array.from(document.querySelectorAll(selector)).filter(function(element) {
        if (regex) {
            return regex.test(element.textContent);
        } else {
            return true;
        }
    });
}

function copyText(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    
    // Avoid scrolling to bottom
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.position = "fixed";
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    var successful = false;
    try {
        successful = document.execCommand("copy");
    } catch (err) {
    }
    
    document.body.removeChild(textarea);
    return successful;
}

function isStringMatch(a, b) {
    a = a || "";
    b = b || "";
    return a.toLowerCase().includes(b.toLowerCase());
}
