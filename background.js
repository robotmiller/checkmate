
// the background script keeps track of the tests and syncs
// this data across the popup and all content scripts.
var state;

function getData() {
    var data = {};
    if (state) {
        data.state = state;
    }
    return data;
}

function sendData(sendResponse) {
    sendResponse(getData());
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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("got message", message);
    if (message.type == GET_STATE) {
        sendData(sendResponse);
    } else if (message.type == SET_STATE) {
        // if the existing state is not done and the new one is, this means we just finished.
        var justFinished = state && !state.done && message.state.done;
        state = message.state;
        sendData(sendResponse);

        // send this new state to every other content script.
        updateAllTabs(sender);

        if (justFinished) {
            // open the results tab.
            setTimeout(function() {
                chrome.tabs.create({url : "popup.html"});
            }, 800);
        }
    } else if (message.type == SWITCH_TAB) {
        // the message includes a url fragment, find the first tab that matches it.
        chrome.tabs.query({}, function(tabs) {
            for (var i = 0; i < tabs.length; i++) {
                if (tabs[i].url.toLowerCase().includes(message.url.toLowerCase())) {
                    chrome.tabs.highlight({
                        windowId: tabs[i].windowId,
                        tabs: [tabs[i].index],
                    }, function() {
                        state.tests[message.testIndex].steps[message.stepIndex].instructions[message.instructionIndex].status = "success";
                        updateAllTabs();
                    });
                    return;
                }
            }
            state.tests[message.testIndex].steps[message.stepIndex].instruction[instructionIndex].status = "failed";
            updateAllTabs();
        });
    } else if (message.type == SET_STEP) {
        state.testIndex = message.testIndex;
        state.stepIndex = message.stepIndex
        updateAllTabs();
    } else if (message.type == STOP_TEST) {
        state = {
            tests: []
        };
        sendResponse();
        updateAllTabs();
    } else if (message.type == RUN_IN_FRAMES) {
        // relay this to all frames within the tab that sent this message.
        // we use this when the top-level frame tried to execute something
        // (e.g. click on an element) but couldn't find it, we ask all frames
        // on the page to try it and see if any of them succeed.
        chrome.webNavigation.getAllFrames({ tabId: sender.tab.id }, function(frames) {
            // if we don't hear back in 2 seconds, fail the step.
            var timeout = setTimeout(function() {
                state.tests[message.testIndex].steps[message.stepIndex].instructions[message.instructionIndex].status = "failed";
                updateAllTabs();
            }, 2000);

            frames.forEach(function(frame) {
                // if it's the top frame, do nothing, that's who sent us this message.
                if (frame.parentFrameId == -1) {
                    return;
                }
                chrome.tabs.sendMessage(
                    sender.tab.id,
                    message, 
                    { frameId: frame.frameId },
                    function(status) {
                        // all_frames.js has to send a response otherwise there's an error printed in
                        // the background tab. if it's successful it'll include a status, otherwise
                        // it'll pass `undefined`.
                        if (!status) {
                            return;
                        }
                        
                        clearTimeout(timeout);
                        state.tests[message.testIndex].steps[message.stepIndex].instructions[message.instructionIndex].status = status;
                        updateAllTabs();
                    }
                );
            });
        });
    }
});
