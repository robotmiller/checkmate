
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
        for (var i = 0; i < tabs.length; i++) {
            if (sender && sender.tab && sender.tab.id == tabs[i].id) {
                continue;
            }
            chrome.tabs.sendMessage(tabs[i].id, getData());
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
    // console.log("got message", message);
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
        state = message.state;
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

        state = message.state;
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
});
