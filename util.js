
var GET_STATE = "GET_STATE";
var SET_STATE = "SET_STATE";
var SWITCH_TAB = "SWITCH_TAB";
var SET_STEP = "SET_STEP";
var START_TEST = "START_TEST";
var STOP_TEST = "STOP_TEST";
var RUN_IN_FRAMES = "RUN_IN_FRAMES";
var RELAY_TO_FRAMES = "RELAY_TO_FRAMES";
var RECORD_EVENT = "RECORD_EVENT";
var SAVE_FEEDBACK = "SAVE_FEEDBACK";

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

function isInput(element) {
    return element.matches("input, textarea, [contenteditable]");
}

function getInputValue(element) {
    if (isInput(element)) {
        if (element.hasAttribute("contenteditable")) {
            return element.textContent.trim();
        } else {
            return element.value.trim();
        }
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

// todo: this is very similar to findElement, figure out if we need both.
function findElementWithText(selector, text) {
    if (selector) {
        var elements = document.querySelectorAll(selector);
        var element = Array.from(elements).find(function(el) {
            return doesContainString(el.textContent, text);
        });
        if (element) {
            return element;
        }
    } else {
        var elements = document.evaluate(".//text()", document.body, null, XPathResult.ANY_TYPE, null); 
        var element;
        while (element = elements.iterateNext()) {
            // if it's inside the checkmate UI, skip it.
            if (element.parentNode.closest(".cm_ui")) {
                continue;
            }
            if (doesContainString(element.textContent, text)) {
                return element.parentNode;
            }
        }
    }
}

function pressEnter(element) {
    element.focus();
    ["keydown", "keypress", "keyup", "submit"].forEach(function(eventType) {
        element.dispatchEvent(
            new KeyboardEvent(eventType, {
                code: "Enter",
                key: "Enter",
                keyCode: 13,
                altKey: false,
                bubbles: true,
                cancelBubble: false,
                cancelable: true,
                charCode: 0,
                composed: true,
                ctrlKey: false,
                currentTarget: null,
                defaultPrevented: false,
                detail: 0,
                eventPhase: 0,
                explicitOriginalTarget: element,
                isComposing: false,
                isTrusted: true,
                layerX: 0,
                layerY: 0,
                location: 0,
                metaKey: false,
                originalTarget: element,
                rangeOffset: 0,
                rangeParent: null,
                repeat: false,
                returnValue: true,
                shiftKey: false,
                srcElement: element,
                target: element,
                timeStamp: 44355,
                type: eventType,
                which: 13
            })
        );
    });

    const form = element.closest("form");
    if (form) {
        form.dispatchEvent(new SubmitEvent("submit", { submitter: element }));
    }
}

function typeInElement(text, element, doPressEnter) {
    if (!element) {
        return false;
    }

    if (element.hasAttribute("contenteditable")) {
        element.innerHTML = text;
        if (doPressEnter) {
            setTimeout(function() {
                pressEnter(element);
            }, 0);
        }
    } else {
        // from: https://github.com/facebook/react/issues/10135#issuecomment-314441175
        var valueProp = Object.getOwnPropertyDescriptor(element, "value");
        var prototype = Object.getPrototypeOf(element);
        var prototypeValueProp = Object.getOwnPropertyDescriptor(
            prototype,
            "value"
        );
        var valueSetter = valueProp && valueProp.set;
        var prototypeValueSetter = prototypeValueProp && prototypeValueProp.set;

        if (valueSetter && valueSetter !== prototypeValueSetter) {
            prototypeValueSetter.call(element, text);
        } else if (valueSetter) {
            valueSetter.call(element, text);
        } else {
            element.value = text;
        }

        element.dispatchEvent(
            new Event("input", {
                bubbles: true,
                target: element
            })
        );
        if (doPressEnter) {
            setTimeout(function() {
                pressEnter(element);
            }, 0);
        }
    }
    return true;
}

function copyText(text) {
    var textarea = document.createElement("textarea");
    textarea.value = text;
    
    // avoid scrolling to bottom.
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

function doesContainString(a, b) {
    a = (a || "").toLowerCase();
    b = (b || "").toLowerCase();
    return a.includes(b);
}

function truncate(value, length) {
    if (value.length < length) {
        return value;
    } else {
        return value.substring(0, length).trim() + "&hellip;";
    }
}

function takeScreenshot(callback) {
    var video = document.createElement("video");
    video.setAttribute("autoplay", "");

    video.addEventListener("play", function() {
        // we delay this 400ms so the 'share screen' modal has time to go away.
        setTimeout(function() {
            try {
                var settings = video.srcObject.getVideoTracks()[0].getSettings();
                var canvas = document.createElement("canvas");
                canvas.width = settings.width;
                canvas.height = settings.height;

                var context = canvas.getContext("2d");
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                callback(canvas.toDataURL("image/jpeg"));
            } catch (e) {
                console.error("Error: " + e);
                callback(null);
            }

            try {
                var tracks = video.srcObject.getTracks();
                tracks.forEach(function(track) {
                    track.stop();
                });
                video.srcObject = null;
            } catch (e) {
                console.error("Error: " + e);
            }
        }, 400);
    });

    var options = {
        video: {
            cursor: "always"
        },
        audio: false
    };

    try {
        navigator.mediaDevices.getDisplayMedia(options).then(function(stream) {
            window.video = stream;
            video.srcObject = stream;
        });
    } catch(e) {
        console.error("Error: " + e);
        callback();
    }
}

function makeCopyBlock(value) {
    return `<span data-copy="${encodeURIComponent(value)}">${truncate(value, 40)}</span>`;
}

function makeSelectBlock(selector, label) {
    if (selector) {
        return `<span data-select="${encodeURIComponent(selector)}">${label || selector}</span>`;
    } else {
        return label;
    }
}

function formatUrl(url) {
    url = url.replace(/^http(s?):\/\//i, "");
    if (url.length > 50 && url.includes("?")) {
        url = url.split("?")[0] + "?&hellip;";
    }
    return url;
}

function buildInstructionHtml(instruction, index, addDoItButton) {
    var content;
    var status = instruction.status;
    var canDo = instruction.canDo;
    var type = instruction.type;
    var url = instruction.url;
    var selector = instruction.selector;
    var label = instruction.label;
    var text = instruction.text;

    if (type == "navigate") {
        content = `Navigate to <a href="${url}" onclick="return false;">${label || formatUrl(url)}</a>`;
    } else if (type == "new-tab") {
        content = `Open <a href="${url}" onclick="return false;">${label || formatUrl(url)}</a> in a new tab.`;
    } else if (type == "switch-tab") {
        content = `Switch to the ${label || url} tab.`;
    } else if (type == "type") {
        var pressEnter = instruction.doPressEnter ? " and press Enter" : "";
        content = `Type ${makeCopyBlock(text)} in the ${makeSelectBlock(selector, label)}${pressEnter}.`;
    } else if (type == "click") {
        content = `Click on ${makeSelectBlock(selector, label)}.`;
    } else if (type == "custom") {
        content = text;
    } else if (type == "observe") {
        if (selector || label) {
            content = `Find the text ${makeCopyBlock(text)} in ${makeSelectBlock(selector, label)}.`;
        } else {
            content = `Find the text ${makeCopyBlock(text)}`;
        }
    } else if (type == "find-element") {
        content = `Find the ${makeSelectBlock(label)}`;
    } else if (type == "record") {
        content = `Record ${text}.`;
        if (!canDo) {
            content += ` <input type="text" />`;
        } else {
            // todo: still show an input but you can't type in it.
        }
    }

    var highlightAttr = selector ? `data-highlight="${index}"` : "";

    var note = instruction.note ? `<br/><span class="note">${instruction.note}</span>` : "";
    var doIt = "";
    if (addDoItButton) {
        var doitLabel = "do it";
        var doitClass = "";
        if (status == "running") {
            doitLabel = "...";
        } else if (status == "success") {
            doitLabel = "&check;";
        } else if (status == "failed") {
            doitLabel = "&times;";
        } else if (!canDo) {
            doitLabel = "?";
            doitClass = "manual";
        }
        if (state.recording) {
            doitClass += " disabled";
        }
        doIt = `<button class="${status || ""} ${doitClass}" data-do-it="${index}">${doitLabel}</button>`;
    }
    return content ? `<div class="instruction flex" ${highlightAttr}><span class="grow">${content}${note}</span>${doIt}</div>` : "";
}

function showTooltip(element, message) {
    // if the element already has a tooltip then we just update that element.
    var tooltip;
    if (element.nextSibling && element.nextSibling.classList.contains("tooltip")) {
        tooltip = element.nextSibling;
    } else {
        tooltip = document.createElement("div");
    }
    tooltip.classList.add("tooltip");
    tooltip.innerHTML = decodeURIComponent(message);

    var rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.x + rect.width / 2) + "px";
    tooltip.style.top = (rect.y - 8) + "px";

    var tooltipX = rect.x + rect.width / 2;
    if (tooltipX < 50) {
        tooltip.classList.add("left");
    } else {
        tooltip.classList.remove("left");
    }

    element.insertAdjacentElement("afterend", tooltip);
}

function hideTooltip(element) {
    if (element.nextSibling && element.nextSibling.classList.contains("tooltip")) {
        element.parentElement.removeChild(element.nextSibling);
    }
}

function tooltipAttr(tooltip) {
    return `data-tooltip="${encodeURIComponent(tooltip)}"`;
}
