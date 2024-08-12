
console.log("service worker start");

var GET_STATE = "GET_STATE";
var SET_STATE = "SET_STATE";
var SWITCH_TAB = "SWITCH_TAB";
var OPEN_IN_INCOGNITO = "OPEN_IN_INCOGNITO";
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

function getShadowRoots() {
    var roots = [];
    Array.from(document.querySelectorAll("*")).forEach(function(element) {
        if (element.shadowRoot) {
            roots.push(element.shadowRoot);
        }
    });
    return roots;
}

// function findElement(selector, regex) {
//     if (regex && typeof regex == "string") {
//         regex = eval(regex);
//     }
//     var elements = document.querySelectorAll(selector);
//     for (var i = 0; i < elements.length; i++) {
//         if (regex) {
//             if (regex.test(elements[i].textContent)) {
//                 return elements[i];
//             }
//         } else {
//             return elements[i];
//         }
//     }

//     // if we didn't find it, look for shadow roots and check inside them.
//     // todo: make this handle nested shadow DOM nodes (probably not too important though).
//     var shadowRoots = getShadowRoots();
//     for (var i = 0; i < shadowRoots.length; i++) {
//         var elements = shadowRoots[i].querySelectorAll(selector);
//         for (var j = 0; j < elements.length; j++) {
//             if (regex) {
//                 if (regex.test(elements[j].textContent)) {
//                     return elements[j];
//                 }
//             } else {
//                 return elements[j];
//             }
//         }
//     }
// }

function findElements(selector, regex) {
    if (regex && typeof regex == "string") {
        regex = eval(regex);
    }
    
    var elements = Array.from(document.querySelectorAll(selector)).filter(function(element) {
        if (regex) {
            return regex.test(element.textContent);
        } else {
            return true;
        }
    });

    // check inside elements that are shadow roots.
    getShadowRoots().forEach(function(shadowRoot) {
        Array.from(shadowRoot.querySelectorAll(selector)).forEach(function(element) {
            if (regex) {
                if (regex.test(element.textContent)) {
                    elements.push(element);
                }
            } else {
                elements.push(element);
            }
        });
    });
    return elements;
}

// this is similar to findElement but works if there's no selector.
function findElementWithText(selector, text) {
    if (selector) {
        var elements = findElements(selector);
        var element = Array.from(elements).find(function(el) {
            return doesContainString(el.textContent, text);
        });
        if (element) {
            return element;
        }
    } else {
        // todo: find elements inside shadow dom nodes.
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

function copyHtml(html) {
    function listener(e) {
        e.clipboardData.setData("text/html", html);
        e.clipboardData.setData("text/plain", html);
        e.preventDefault();
    }
    document.addEventListener("copy", listener);
    document.execCommand("copy");
    document.removeEventListener("copy", listener);
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
        if (instruction.incognito) {
            content = `Open <a href="${url}" onclick="return false;">${label || formatUrl(url)}</a> in an incognito window.`;
        } else {
            content = `Navigate to <a href="${url}" onclick="return false;">${label || formatUrl(url)}</a>`;
        }
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

// the background script keeps track of the tests and syncs
// this data across the popup and all content scripts.
var state;

// when we're recording a test, this keeps track of all the events.
var eventsBuffer = [];
var _instructions = [];
var _feedback = {};

function getData() {
    var data = {};
    if (state) {
        data.state = state;
    }
    return data;
}

function updateAllTabs(sender) {
    chrome.tabs.query({}, function(tabs) {
        var data = getData();
        console.log("update tab with data", data);
        for (var i = 0; i < tabs.length; i++) {
            if (sender && sender.tab && sender.tab.id == tabs[i].id) {
                continue;
            }
            chrome.tabs.sendMessage(tabs[i].id, data);
        }
    });
}

// process the events buffer and turn it into a list of instructions.
function generateInstructions() {
    _instructions.splice(0, _instructions.length);
    var index = 0;
    var hasNavigated = false;
    while (index < eventsBuffer.length) {
        var prev = eventsBuffer[index - 1];
        var next = eventsBuffer[index + 1];
        var curr = eventsBuffer[index++];

        if (curr.type == "navigate") {
            if (prev && prev.hostname == curr.hostname) {
                if (prev.type == "click") {
                    continue;
                }
                if (prev.type == "keydown" && prev.key == "Enter") {
                    continue;
                }
            }
            hasNavigated = true;
            if (prev && prev.tab != curr.tab) {
                newTab(curr.url);
            } else {
                navigate(curr.url);
            }
        } else if (curr.type == "click") {
            if (!hasNavigated) {
                hasNavigated = true;
                navigate(curr.url);
            }
            if (prev && curr.tab != prev.tab) {
                var tabLabel = curr.hostname.split(".").slice(-2).join(".");
                switchTab(curr.hostname, tabLabel);
            }

            // if the next event targets the same element, ignore this one.
            // this might happen because you click on something then type in it
            // and type() should work without having a click() for that element.
            if (next && next.selector == curr.selector) {
                continue;
            }

            // if the next event is a blur event, record that first because this click is
            // what triggered the blur but they get recorded in the opposite order.
            if (next && next.subtype == "blur") {
                type(next.text, next.selector, next.label);
                index += 1;
            }

            var label = curr.label ? "the " + curr.label : "";
            click(curr.selector, label);
        } else if (curr.type == "type") {
            // if the next event targets the same element, ignore this one.
            if (next && next.selector == curr.selector) {
                continue;
            }
            if (!hasNavigated) {
                hasNavigated = true;
                navigate(curr.url);
            }
            type(curr.text, curr.selector, curr.label);
        }
    }

    // do a final pass to remove unnecessary events.
    return _instructions.filter(function(curr, index) {
        var next = _instructions[index + 1];
        if (curr.type == "click" && next && next.selector == curr.selector) {
            return false;
        }
        return true;
    });
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("got message", message);

    // load the state from storage then process the message.
    chrome.storage.local.get("state").then(function(result) {
        try {
            state = JSON.parse(result.state);
        } catch (e) {
            state = undefined;
        }
        handleMessage(message, sender, sendResponse);
    });

    return true;
});

function saveState(newState) {
    console.log("set state", newState);
    state = newState;
        
    chrome.storage.local.set({
        state: JSON.stringify(newState)
    });
}

function handleMessage(message, sender, sendResponse) {
    if (message.type == GET_STATE) {
        // if this is for the popup and we're done, include feedback too.
        if (message.isPopup && state && state.done) {
            var data = getData();
            data.feedback = _feedback;
            sendResponse(data);
        } else {
            sendResponse(getData());
        }
    } else if (message.type == START_TEST) {
        _feedback = {};
        saveState(message.state);
        sendResponse(getData());
        updateAllTabs(sender);
    } else if (message.type == SAVE_FEEDBACK) {
        var key = `${message.testIndex}_${message.stepIndex}`;
        _feedback[key] = message.feedback;
    } else if (message.type == SET_STATE) {
        // if the existing state is not done and the new one is, this means we just finished.
        var justFinished = state && !state.done && message.state.done;

        // if the old state was not recording but this one is, we just started.
        var justStartedRecording = (!state || !state.recording) && message.state.recording;

        saveState(message.state);
        sendResponse(getData());

        // send this new state to every other content script.
        updateAllTabs(sender);

        if (justFinished) {
            // open the results tab.
            setTimeout(function() {
                chrome.tabs.create({url : "popup.html"});
            }, 800);
        }

        if (justStartedRecording) {
            eventsBuffer.splice(0, eventsBuffer.length);
        }
    } else if (message.type == SWITCH_TAB) {
        // the message includes a url fragment, find the first tab that matches it.
        chrome.tabs.query({}, function(tabs) {
            for (var i = 0; i < tabs.length; i++) {
                if (doesContainString(tabs[i].url, message.url)) {
                    chrome.windows.update(tabs[i].windowId, {
                        focused: true
                    }, function() {
                        chrome.tabs.highlight({
                            windowId: tabs[i].windowId,
                            tabs: [tabs[i].index],
                        }, function() {
                            state.tests[message.testIndex].steps[message.stepIndex].instructions[message.instructionIndex].status = "success";
                            updateAllTabs();
                        });
                    });
                    return;
                }
            }
            state.tests[message.testIndex].steps[message.stepIndex].instruction[instructionIndex].status = "failed";
            updateAllTabs();
        });
    } else if (message.type == OPEN_IN_INCOGNITO) {
        chrome.windows.create({
            url: message.url,
            focused: true,
            incognito: true
        });
    } else if (message.type == SET_STEP) {
        state.testIndex = message.testIndex;
        state.stepIndex = message.stepIndex
        updateAllTabs();
    } else if (message.type == STOP_TEST) {
        state = {
            tests: [],
            code: state.code || "",
            url: state.url || ""
        };
        sendResponse();
        updateAllTabs();
    } else if (message.type == RELAY_TO_FRAMES) {
        chrome.webNavigation.getAllFrames({ tabId: sender.tab.id }, function(frames) {
            frames.forEach(function(frame) {
                // if it's the top frame, do nothing, that's who sent us this message.
                if (frame.parentFrameId == -1) {
                    return;
                }
                chrome.tabs.sendMessage(sender.tab.id, message, { frameId: frame.frameId });
            });
        });
    } else if (message.type == RUN_IN_FRAMES) {
        // relay this to all frames within the tab that sent this message.
        // we use this when the top-level frame tried to execute something
        // (e.g. click on an element) but couldn't find it, we ask all frames
        // on the page to try it and see if any of them succeed.
        chrome.webNavigation.getAllFrames({ tabId: sender.tab.id }, function(frames) {
            var timeout;
            var setStatus = function(status) {
                state.tests[message.testIndex].steps[message.stepIndex].instructions[message.instructionIndex].status = status;
                updateAllTabs();
            };

            var messagesSent = 0;
            frames.forEach(function(frame) {
                // if it's the top frame, do nothing, that's who sent us this message.
                if (frame.parentFrameId == -1) {
                    return;
                }
                messagesSent += 1;
                chrome.tabs.sendMessage(sender.tab.id, message, { frameId: frame.frameId }, function(status) {
                    // all_frames.js has to send a response otherwise there's an error printed in
                    // the background tab. if it's successful it'll include a status, otherwise
                    // it'll pass `undefined`.
                    if (!status) {
                        return;
                    }
                    
                    clearTimeout(timeout);
                    setStatus(status);
                });
            });

            // if there's at least one iframe to try this in, wait up to 500ms to see if it succeeds.
            // if there were no iframes, we know right away that this failed.
            if (messagesSent) {
                timeout = setTimeout(function() {
                    setStatus("failed");
                }, 500);
            } else {
                setStatus("failed");
            }
        });
    } else if (message.type == RECORD_EVENT) {
        message.event.tab = sender.tab.id;
        // console.log("got event", message.event);

        eventsBuffer.push(message.event);
        var instructions = generateInstructions();
        state.tests[0].steps[0].instructions = instructions;

        function wrapInQuotes(selector) {
            return '"' + selector.replace(/"/g, "\\\"") + '"';
        }

        // turn the instructions into code.
        state.code = instructions.map(function(i) {
            if (i.type == "navigate") {
                return `        navigate(${wrapInQuotes(i.url)});`;
            } else if (i.type == "new-tab") {
                return `        newTab(${wrapInQuotes(i.url)});`;
            } else if (i.type == "click") {
                if (i.label) {
                    return `        click(${wrapInQuotes(i.selector)}, ${wrapInQuotes(i.label)});`;
                } else {
                    return `        click(${wrapInQuotes(i.selector)});`;
                }
            } else if (i.type == "type") {
                var text = i.text + (i.doPressEnter ? "{Enter}" : "");
                if (i.label) {
                    return `        type(${wrapInQuotes(text)}, ${wrapInQuotes(i.selector)}, ${wrapInQuotes(i.label)});`;
                } else {
                    return `        type(${wrapInQuotes(text)}, ${wrapInQuotes(i.selector)});`
                }
            } else if (i.type == "switch-tab") {
                return `        switchTab(${wrapInQuotes(i.url)}, ${wrapInQuotes(i.label)});`;
            } else {
                return `        // unrecognized type: ${i.type}`;
            }
        }).join("\n");
        state.code = `test(${wrapInQuotes(state.tests[0].title)}, () => {
    step(${wrapInQuotes(state.tests[0].steps[0].title)}, () => {
${state.code}
    });
});`;

        // send the generated instructions and code to all tabs.
        updateAllTabs();
    }
}

function test(title, func) {
    if (typeof title != "string") {
        throw new Error("INTERNAL: test(title, func) requires a string as its first parameter.");
    }
    if (typeof func != "function") {
        throw new Error("INTERNAL: test(title, func) requires a function as its second parameter.");
    }
    if (_test) {
        throw new Error("INTERNAL: test() cannot be called from inside another test.");
    }
    _test = {
        title: title,
        steps: []
    };
    _tests.push(_test);
    func();
    if (!_test.steps.length) {
        throw new Error("INTERNAL: this test needs at least one step.");
    }
    _test = null;
}

function step(title, func) {
    if (typeof title != "string") {
        throw new Error("INTERNAL: step(title, func) requires a string as its first parameter.");
    }
    if (typeof func != "function") {
        throw new Error("INTERNAL: step(title, func) requires a function as its second parameter.");
    }
    if (!_test) {
        throw new Error("INTERNAL: step() must be called inside a test.");
    }
    if (_instructions) {
        throw new Error("INTERNAL: step() cannot be called from inside another step.");
    }
    _instructions = [];
    func();
    if (!_instructions.length) {
        throw new Error("INTERNAL: this step needs at least one instruction.");
    }
    _test.steps.push({
        title: title,
        instructions: _instructions
    });
    _instructions = null;
}

// these make us "focus" on a single test or step which means we ignore all others.
// if multiple tests are focused, then we'll include all of those.
function ftest(title, func) {
    test(title, func);
    _test.focus = true;
    _usesFocus = true;
}
function fstep(title, func) {
    step(title, func);
    _test.steps[_test.steps.length - 1].focus = true;
    _test.usesFocus = true;
}

function navigate(url, label) {
    if (typeof url == "undefined") {
        throw new Error("INTERNAL: missing 'url' value for navigate(url, [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: navigate() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: navigate() cannot be called outside of a step.");
    }
    // remove trailing slashes.
    url = url.replace(/\/$/, "");
    _instructions.push({
        type: "navigate",
        url: url,
        canDo: true,
        label: label
    });
}

function incognito(url, label) {
    if (typeof url == "undefined") {
        throw new Error("INTERNAL: missing 'url' value for incognito(url, [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: incognito() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: incognito() cannot be called outside of a step.");
    }
    // remove trailing slashes.
    url = url.replace(/\/$/, "");
    _instructions.push({
        type: "navigate",
        url: url,
        incognito: true,
        canDo: true,
        label: label
    });
}

function newTab(url, label) {
    if (typeof url == "undefined") {
        throw new Error("INTERNAL: missing 'url' value for newTab(url, [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: newTab() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: newTab() cannot be called outside of a step.");
    }
    // remove trailing slashes.
    url = url.replace(/\/$/, "");
    _instructions.push({
        type: "new-tab",
        url: url,
        canDo: true,
        label: label
    });
}

function switchTab(url, label) {
    if (typeof url == "undefined") {
        throw new Error("INTERNAL: missing 'url' value for switchTab(url, [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: switchTab() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: switchTab() cannot be called outside of a step.");
    }
    _instructions.push({
        type: "switch-tab",
        url: url,
        label: label,
        canDo: true
    });
}

function type(text, selector, label) {
    if (typeof selector == "undefined") {
        throw new Error("INTERNAL: missing 'selector' value for type(text, selector, [label])");
    }
    if (typeof text == "undefined") {
        throw new Error("INTERNAL: missing 'text' value for type(text, selector, [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: type() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: type() cannot be called outside of a step.");
    }
    // if the text ends with "{Enter}", that means we type the
    // text before it then dispatch an keyboard event.
    var enterRegex = /\{enter\}$/i;
    var doPressEnter = enterRegex.test(text);
    text = text.replace(enterRegex, "");

    _instructions.push({
        type: "type",
        text: text,
        selector: selector,
        label: label || "",
        // you don't have to provide a selector here. if you only give us a label
        // we'll say "enter 'whatever' in the {label}" so you'll have to do it manually.
        canDo: !!selector,
        doPressEnter: doPressEnter
    });
}

function _addFunc(instruction, func) {
    instruction.args = [];
    instruction.func = func.toString()
        .replace(/^(?:function\s*[^\(]*)?\s*\(([^)]*)\)\s*(?:=>)?\s*\{/i, function(text, argString) {
            instruction.args = argString.split(",").map(function(arg) {
                return arg.trim();
            }).filter(function(arg) {
                return !!arg;
            });
            return "";
        }).replace(/\}\s*$/i, "").trim();
}

function custom(text, func) {
    if (typeof text == "undefined") {
        throw new Error("INTERNAL: missing 'text' value for custom(text, [func])");
    }
    if (!_test) {
        throw new Error("INTERNAL: custom() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: custom() cannot be called outside of a step.");
    }
    var instruction = {
        type: "custom",
        text: text,
        canDo: false
    };
    if (func) {
        _addFunc(instruction, func);
        instruction.canDo = true;
    }
    _instructions.push(instruction);
}

function click(selector, regex, label) {
    if (typeof selector == "undefined") {
        throw new Error("INTERNAL: missing 'selector' value for click(selector, [regex], [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: click() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: click() cannot be called outside of a step.");
    }
    // if you only provided two args, treat them as a selector and label.
    if (typeof label == "undefined") {
        label = regex;
        regex = undefined;
    }
    var instruction = {
        type: "click",
        selector: selector,
        label: label || "",
        canDo: true
    };
    if (regex) {
        instruction.regex = regex;
    }
    _instructions.push(instruction);
}

function observe(text, selector, label) {
    if (typeof text == "undefined") {
        throw new Error("INTERNAL: missing 'text' value for observe(text, [selector], [label])");
    }
    if (!_test) {
        throw new Error("INTERNAL: observe() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: observe() cannot be called outside of a step.");
    }
    var instruction = {
        type: "observe",
        text: text,
        canDo: true
    };
    if (selector) {
        instruction.selector = selector;
    }
    if (label) {
        instruction.label = label;
    }
    _instructions.push(instruction);
}

function note(text) {
    if (typeof text == "undefined") {
        throw new Error("INTERNAL: missing 'text' value for note(text)");
    }
    if (!_test) {
        throw new Error("INTERNAL: note() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: note() cannot be called outside of a step.");
    }
    var lastInstruction = _instructions[_instructions.length - 1];
    if (lastInstruction) {
        lastInstruction.note = text;
    } else {
        // if this is the first instruction in a step, then this is essentially
        // a custom step where the note's text _is_ the instruction.
        custom(text);
    }
}

function findElement(selector, regex, label) {
    if (typeof selector == "undefined") {
        throw new Error("INTERNAL: missing 'selector' value for findElement(selector, [regex], label)");
    }
    if (!_test) {
        throw new Error("INTERNAL: findElement() cannot be called outside of a test.");
    }
    if (!_instructions) {
        throw new Error("INTERNAL: findElement() cannot be called outside of a step.");
    }
    // if you only provided two args, treat them as a selector and label.
    if (typeof label == "undefined") {
        label = regex;
        regex = undefined;
    }
    var instruction = {
        type: "find-element",
        selector: selector,
        label: label || "",
        canDo: true
    };
    if (regex) {
        instruction.regex = regex;
    }
    _instructions.push(instruction);
}

function record(text, func) {
    var instruction = {
        type: "record",
        text: text
    };
    if (func) {
        _addFunc(instruction, func);
        instruction.canDo = true;
    }
    _instructions.push(instruction);
}

console.log("service worker end");
