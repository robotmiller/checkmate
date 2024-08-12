
var LEFT_RIGHT_TOOLTIP = "Move the display to the left or right.";
var AUTO_MODE_TOOLTIP = "Automatically execute instructions.";
var EXPAND_COLLAPSE_TOOLTIP = "Expand or collapse this UI.";

function makeStepIcon(step, index) {
    var isActive = index == state.stepIndex;
    var result = step.result || "";
    var label, tooltip;
    if (result == "pass") {
        label = "&check;";
        tooltip = `Step ${index + 1}: ${step.title}<br/><strong>Passed!</strong>`;
    } else if (result == "fail") {
        label = "&times;";
        tooltip = `Step ${index + 1}: ${step.title}<br/><strong>Failed!</strong>`;
    } else if (index == state.stepIndex) {
        label = "&hellip;";
        tooltip = `Step ${index + 1}: ${step.title}<br/><strong>In Progress</strong>`;
    } else {
        label = "&nbsp;";
        tooltip = `Step ${index + 1}: ${step.title}`;
    }
    return `<span class="step-icon ${result} ${isActive ? "active": ""}" ${tooltipAttr(tooltip)} data-set-step="${index}">${label}</span>`;
}

function updateScroll(element) {
    var atBottom = (element.scrollTop + element.offsetHeight >= element.scrollHeight);
    var atTop = element.scrollTop == 0;

    element.setAttribute(
        "data-scroll",
        (!atTop ? "up" : "") + (!atBottom ? "down" : "")
    );
}

function buildStepHtml() {
    var testIndex = state.testIndex || 0;
    var stepIndex = state.stepIndex || 0;
    var test = state.tests[testIndex];
    if (!test) {
        return "";
    }
    var step = test.steps[stepIndex];
    if (!step) {
        return "";
    }
    
    var html = [];

    // make the title bar:
    html.push(`<div class="title-bar flex">`);
    html.push(`<span data-lr-toggle="" ${tooltipAttr(LEFT_RIGHT_TOOLTIP)}>&rightleftarrows;</span>`);
    html.push(`<span data-minimize="" ${tooltipAttr(EXPAND_COLLAPSE_TOOLTIP)}>${test.title}</span>`);
    if (!state.recording) {
        // make icons for each step.
        html.push(`<span class="grow">${test.steps.map(makeStepIcon).join("")}</span>`);
        html.push(`<span ${tooltipAttr(AUTO_MODE_TOOLTIP)} data-automatic="${state.automatic}">&orarr;</span>`);
    }
    html.push(`</div>`); // end of title bar.

    html.push(`<div class="current-step">`);
    html.push(`<div class="instructions">`);
    html.push(`<div class="instructions-list" data-scroll="">`);
    step.instructions.forEach((instruction, index) => {
        html.push(buildInstructionHtml(instruction, index, true));
    });
    html.push(`</div>`); // end of .instructions-list
    
    // add buttons to either pass or fail this step.
    html.push(`<div class="buttons flex">`);
    var backButton = (testIndex > 0 || stepIndex > 0) ? `<button class="big" data-back-step="${stepIndex}">Back</button>` : "";
    html.push(`<span class="grow">${backButton}</span>`);
    if (state.recording) {
        // todo: get better icons for these.
        // todo: make these buttons work.
        // html.push(`<button class="big">&#128065;</button>`);
        // html.push(`<button class="big">&#9881;</button>`);
        html.push(`<button class="big" data-view-code="">View Code</button>`);
        if (!state.doneRecording) {
            html.push(`<button class="big" data-stop-recording="">Stop Recording</button>`);
        }
    } else {
        html.push(`<button class="big" data-next-step="${stepIndex}">Next</button>`);
        html.push(`<button class="big good" data-pass-step="${stepIndex}">Pass</button>`);
        html.push(`<button class="big warn" data-start-fail="">Fail</button>`);
    }
    html.push(`</div>`); // end of .buttons
    html.push(`</div>`); // end of .instructions
    
    if (state.recording) {
        html.push(`<div class="code-display">`);
        html.push(`<pre>${state.code}</pre>`);
        html.push(`<div class="buttons flex">`);
        html.push(`<span class="grow"></span>`);
        html.push(`<button class="big" data-hide-code="">View Instructions</button>`);
        if (!state.doneRecording) {
            html.push(`<button class="big" data-stop-recording="">Stop Recording</button>`);
        }
        html.push(`</div>`); // end of .buttons
        html.push(`</div>`); // end of .code-display
    } else {
        html.push(`<div class="feedback-form">`);
        html.push(`<div data-feedback="" contenteditable="true"></div>`);
        html.push(`<div class="buttons flex">`);
        html.push(`<span class="grow"><button class="big" data-cancel-fail="">Cancel</button></span>`);
        html.push(`<span class="grow"><button class="big" data-take-screenshot="">Add Screenshot</button></span>`);
        html.push(`<button class="big warn" data-fail-step="${stepIndex}">Submit</button>`);
        html.push(`</div>`); // end of .buttons
        html.push(`</div>`); // end of .feedback-form
    }

    html.push(`</div>`); // end of .current-step

    return html.join("");
}

var rootElement, uiElement, state;

function syncState() {
    chrome.runtime.sendMessage({
        type: SET_STATE,
        state: state
    }, gotNewData);
}

function submitFeedback(testIndex, stepIndex, feedback) {
    chrome.runtime.sendMessage({
        type: SAVE_FEEDBACK,
        testIndex: testIndex,
        stepIndex: stepIndex,
        feedback: feedback
    });
}

function advanceStep(stepIndex, result, feedback) {
    var test = state.tests[state.testIndex];

    // if there's no result provided then we're just going to the next step
    // and we don't want to change the assigned status.
    if (result) {
        test.steps[stepIndex].result = result;
    }

    // save feedback before we increment the test/step indexes.
    if (feedback) {
        submitFeedback(state.testIndex, state.stepIndex, feedback);
    }

    // if this was the last step, advance to the next test.
    if (stepIndex >= test.steps.length - 1) {
        // if this was the last test, we're done!
        if (state.testIndex >= state.tests.length - 1) {
            state.done = true;
        } else {
            state.testIndex += 1;
            state.stepIndex = 0;
        }
    } else {
        state.stepIndex = stepIndex + 1;
    }

    // turn off automatic mode when switching steps.
    state.automatic = false;

    syncState();
    buildOrUpdateUI();
}

function backStep(stepIndex, testIndex) {
    if (stepIndex > 0) {
        state.stepIndex = stepIndex - 1;
    } else if (testIndex > 0) {
        state.testIndex = testIndex - 1;
        state.stepIndex = state.tests[state.testIndex].steps.length - 1;
    }

    // turn off automatic mode when switching steps.
    state.automatic = false;

    syncState();
    buildOrUpdateUI();
}

var doers = {};

function register(type, func) {
    doers[type] = func;
}

function highlightInAllFrames(instruction) {
    chrome.runtime.sendMessage({
        type: RELAY_TO_FRAMES,
        instruction: instruction,
        highlight: true
    });
}

function unhighlightInAllFrames(instruction) {
    chrome.runtime.sendMessage({
        type: RELAY_TO_FRAMES,
        instruction: instruction,
        highlight: false
    });
}

function doInstruction(instructionIndex) {
    var testIndex = state.testIndex;
    var stepIndex = state.stepIndex;
    var test = state.tests[testIndex];
    var step = test.steps[stepIndex];
    var instruction = step.instructions[instructionIndex];

    var setStatus = function(status) {
        var test = state.tests[testIndex];
        var step = test.steps[stepIndex];
        var instruction = step.instructions[instructionIndex];
        instruction.status = status;
        syncState();
        buildOrUpdateUI();
    };

    var tryInAllFrames = function() {
        setStatus("running");
        chrome.runtime.sendMessage({
            type: RUN_IN_FRAMES,
            instruction: instruction,
            testIndex: testIndex,
            stepIndex, stepIndex,
            instructionIndex: instructionIndex
        });
    };

    var func = doers[instruction.type];
    if (func) {
        // todo: figure out why this try/catch is commented out.
        // try {
            func(instruction, setStatus, instructionIndex, tryInAllFrames);
        // } catch (e) {
        //     setStatus("failed");
        // }
    } else {
        setStatus("success");
    }
}

register("navigate", function(instruction, setStatus, instructionIndex) {
    setStatus("success");
    if (instruction.incognito) {
        chrome.runtime.sendMessage({
            type: OPEN_IN_INCOGNITO,
            url: instruction.url,
            testIndex: state.testIndex,
            stepIndex: state.stepIndex,
            instructionIndex: instructionIndex
        });
    } else {
        setTimeout(function() {
            location.href = instruction.url;
        }, 100);
    }
});

register("new-tab", function(instruction, setStatus) {
    setStatus("success");
    setTimeout(function() {
        window.open(instruction.url);
    }, 100);
});

register("switch-tab", function(instruction, setStatus, instructionIndex) {
    chrome.runtime.sendMessage({
        type: SWITCH_TAB,
        url: instruction.url,
        testIndex: state.testIndex,
        stepIndex: state.stepIndex,
        instructionIndex: instructionIndex
    });
});

register("type", function(instruction, setStatus, _, tryInAllFrames) {
    // todo: wait up to a few seconds for this element to exist.
    var element = document.querySelector(instruction.selector);

    if (typeInElement(instruction.text, element, instruction.doPressEnter)) {
        setStatus("success");
    } else {
        tryInAllFrames();
    }
});

register("click", function(instruction, setStatus, _, tryInAllFrames) {
    // todo: wait up to a few seconds for this element to exist.
    var element = findElement(instruction.selector, instruction.regex);
    if (element) {
        setTimeout(function() {
            // todo: this can fire click events twice, but sometimes one or the other by itself is insufficient.
            element.dispatchEvent(new Event("click"));
            element.click();
            setStatus("success");
        }, 0);
    } else {
        // send a message to all frames to try doing this.
        tryInAllFrames();
    }
});

register("observe", function(instruction, setStatus, _, tryInAllFrames) {
    // todo: try this for a little while before failing.
    var element = findElementWithText(instruction.selector, instruction.text);
    if (element) {
        highlight(element);
        setStatus("success");
    } else {
        tryInAllFrames();
    }
});

register("find-element", function(instruction, setStatus, _, tryInAllFrames) {
    // todo: make this try for 5-10 seconds.
    var element = findElement(instruction.selector, instruction.regex);
    if (element) {
        setStatus("success");
    } else {
        tryInAllFrames();
    }
});

register("custom", function(instruction, setStatus) {
    // if there's no code block with this, there's nothing to do
    // here and the user is just marking it as being done.
    if (!instruction.func) {
        if (instruction.status == "success") {
            setStatus("failed");
        } else {
            setStatus("success");
        }
        return;
    }

    var timeout;
    var callback = function(status) {
        if (timeout) {
            clearTimeout(timeout);
        }
        setStatus(status);
    };
    var func = new Function(instruction.args[0], instruction.func);
    // if the custom func takes a parameter, that parameter is a callback that's used to
    // set the status of this instruction. this is used when the status needs to be set
    // asynchronously. if it doesn't take a parameter, we assume the custom function's
    // successful execution means the instruction succeeded.
    if (instruction.args.length) {
        setStatus("running");
        try {
            // if the callback isn't called within 5 seconds, assume it failed.
            timeout = setTimeout(function() {
                setStatus("failed");
            }, 5000);
            func(callback);
        } catch (e) {
            setStatus("failed");
        }
    } else {
        try {
            func();
            setStatus("success");
        } catch (e) {
            setStatus("failed");
        }
    }
});

// this loop is always running but if the tab is hidden or automation
// is turned off, it'll just do nothing each time.
setInterval(function() {
    if (document.hidden) {
        return;
    }
    if (!state || !state.automatic) {
        return;
    }

    // find the next instruction that can be executed. consider each of these:
    //  - the next instruction may already be running.
    //  - the next instruction might be one we can't automate.
    //  - the next instruction can only run if the previous one succeeded.
    var test = state.tests[state.testIndex];
    var step = test.steps[state.stepIndex];
    for (var i = step.instructions.length - 1; i >= 0; i--) {
        // if this one has no status and the previous is successful, try this one.
        var curr = step.instructions[i];
        var prev = step.instructions[i - 1];

        // if the step has a status, that means the next instruction is running or failed.
        if (curr.status) {
            return;
        }
        // if we're at an instruction we don't know how to do, skip it.
        if (!curr.canDo) {
            continue;
        }
        // if the prior instruction failed, turn automatic mode off.
        if (prev && prev.status == "failed") {
            state.automatic = false;
            syncState();
        }
        // only try this instruction if the previous one was successful.
        // if curr is the first instruction, prev will be null and that means we can try this.
        if (!prev || prev.status == "success") {
            doInstruction(i);
            return;
        }
    }
}, 1000);

function handleClick(event) {
    if (event.target.hasAttribute("data-do-it")) {
        // do nothing here, these are handled on mousedown now.
    } else if (event.target.hasAttribute("data-copy")) {
        var value = decodeURIComponent(event.target.getAttribute("data-copy"));
        if (copyText(value)) {
            event.target.classList.add("copied");
            setTimeout(function() {
                event.target.classList.remove("copied");
            }, 800);
        }
    } else if (event.target.hasAttribute("data-lr-toggle")) {
        uiElement.classList.toggle("left");

        // make this persist through page refreshes.
        if (uiElement.classList.contains("left")) {
            localStorage.__cm_left = true;
        } else {
            delete localStorage.__cm_left;
        }
    } else if (event.target.hasAttribute("data-minimize")) {
        // todo: make this persist through page refreshes.
        uiElement.classList.toggle("minimized");
    } else if (event.target.hasAttribute("data-automatic")) {
        state.automatic = !state.automatic;
        syncState();
        buildOrUpdateUI();
    } else if (event.target.hasAttribute("data-pass-step")) {
        var stepIndex = +event.target.getAttribute("data-pass-step");
        advanceStep(stepIndex, "pass");
    } else if (event.target.hasAttribute("data-start-fail")) {
        // show the feedback form for this step.
        // prepopulate the textarea with the text of the instructions that failed.
        var input = uiElement.querySelector("[data-feedback]");
        if (!input.innerHTML) {
            var failedButtons = uiElement.querySelectorAll("[data-do-it].failed");
            var text = Array.from(failedButtons).map(function(button, index) {
                return (index + 1) + ". " + button.previousSibling.textContent.replace(/\n/g, " ");
            }).join("<br/>");
            if (text) {
                input.innerHTML = "I wasn't able to to:<br/><br/>" + text;
            }
        }
        uiElement.classList.add("getting-feedback");
        uiElement.querySelector("[data-feedback]").focus();
    } else if (event.target.hasAttribute("data-cancel-fail")) {
        // hide the feedback form for this step and go back to the instructions.
        uiElement.classList.remove("getting-feedback");
    } else if (event.target.hasAttribute("data-take-screenshot")) {
        uiElement.classList.add("hidden");
        takeScreenshot(function(dataUrl) {
            uiElement.classList.remove("hidden");
            if (dataUrl) {
                var input = uiElement.querySelector("[data-feedback]");
                var paragraph = document.createElement("p");
                var image = document.createElement("img");
                image.setAttribute("height", "160");
                image.src = dataUrl;
                paragraph.appendChild(image);
                input.appendChild(paragraph);
            } else {
                var paragraph = document.createElement("p");
                paragraph.innerText = "We encountered an error while trying to capture the screenshot. You can take one manually and paste it in here though.";
                input.appendChild(paragraph);
            }
        });
    } else if (event.target.hasAttribute("data-fail-step")) {
        var stepIndex = +event.target.getAttribute("data-fail-step");
        // uiElement.classList.remove("getting-feedback");
        advanceStep(stepIndex, "fail", uiElement.querySelector("[data-feedback]").innerHTML);
    } else if (event.target.hasAttribute("data-next-step")) {
        var stepIndex = +event.target.getAttribute("data-next-step");
        advanceStep(stepIndex);
    } else if (event.target.hasAttribute("data-back-step")) {
        var stepIndex = +event.target.getAttribute("data-back-step");
        backStep(stepIndex, state.testIndex);
    } else if (event.target.hasAttribute("data-set-step")) {
        state.stepIndex = +event.target.getAttribute("data-set-step");
        syncState();
        buildOrUpdateUI();
    } else if (event.target.hasAttribute("data-view-code")) {
        uiElement.classList.add("viewing-code");
    } else if (event.target.hasAttribute("data-hide-code")) {
        uiElement.classList.remove("viewing-code");
    } else if (event.target.hasAttribute("data-stop-recording")) {
        uiElement.classList.add("viewing-code");
        state.doneRecording = true;
        stopRecording();
        syncState();
        buildOrUpdateUI();
    }
}

function handleMouseDown(event) {
    if (event.target.hasAttribute("data-do-it")) {
        if (state.recording) {
            return;
        }
        var index = +event.target.getAttribute("data-do-it");
        doInstruction(index);
    }
}

function getInstruction(instructionIndex) {
    var test = state.tests[state.testIndex];
    var step = test.steps[state.stepIndex];
    return step.instructions[instructionIndex];
}

function handleMouseOver(event) {
    if (event.target.hasAttribute("data-highlight")) {
        var instruction = getInstruction(+event.target.getAttribute("data-highlight"));
        highlight(instruction.selector, instruction.regex);
        highlightInAllFrames(instruction);
    } else if (event.target.hasAttribute("data-tooltip")) {
        showTooltip(event.target, event.target.getAttribute("data-tooltip"));
    }
}
function handleMouseOut(event) {
    if (event.fromElement.hasAttribute("data-highlight")) {
        // if you're still inside the same data-highlight element, ignore this event.
        if (event.fromElement && event.toElement && event.fromElement.closest("[data-highlight]") == event.toElement.closest("[data-highlight]")) {
            return;
        }
        var instruction = getInstruction(+event.target.getAttribute("data-highlight"));
        unhighlight(instruction.selector, instruction.regex);
        unhighlightInAllFrames(instruction);
    } else if (event.target.hasAttribute("data-tooltip")) {
        hideTooltip(event.target);
    }
}

function handleScroll(event) {
    if (event.target.hasAttribute("data-scroll")) {
        updateScroll(event.target);
    }
}

function buildOrUpdateUI() {
    var html = buildStepHtml();

    if (!uiElement) {
        rootElement = document.createElement("div");
        var shadow = rootElement.attachShadow({ mode: "closed" });
        document.body.appendChild(rootElement);

        var style = document.createElement("style");
        style.innerHTML = STYLE;
        shadow.appendChild(style);

        uiElement = document.createElement("div");
        uiElement.className = "cm_ui";
        if (localStorage.__cm_left) {
            uiElement.classList.add("left");
        }

        uiElement.addEventListener("click", handleClick, false);
        uiElement.addEventListener("mousedown", handleMouseDown, false);
        uiElement.addEventListener("mouseover", handleMouseOver, false);
        uiElement.addEventListener("mouseout", handleMouseOut, false);
        shadow.appendChild(uiElement);
    } else {
        uiElement.classList.remove("getting-feedback");
    }

    if (html) {
        uiElement.innerHTML = html;
        uiElement.style.display = "";
    } else {
        uiElement.style.display = "none";
    }
    setTimeout(function() {
        var feedbackInput = uiElement.querySelector("[data-feedback]");
        if (feedbackInput) {
            var stopPropagation = function(event) {
                event.stopPropagation();
            };
            feedbackInput.addEventListener("keyup", stopPropagation, true);
            feedbackInput.addEventListener("keydown", stopPropagation, true);
            feedbackInput.addEventListener("keypress", stopPropagation, true);
        }

        Array.from(uiElement.querySelectorAll("[data-scroll]")).forEach(function(element) {
            updateScroll(element);
            element.addEventListener("scroll", handleScroll);
        });

        if (state.recording && !state.doneRecording) {
            uiElement.querySelector(".instructions-list").scrollBy(0, 100000);
        }
    }, 0);
}

// keep track of whether or not we're recording so we can detect
// when recording starts and set up event listeners.
var recording = false;

function stopRecording() {
    document.removeEventListener("blur", recordBlurEvent, true);
    document.removeEventListener("keydown", recordKeyEvent, true);
    document.removeEventListener("mousedown", recordClickEvent, true);
}

function recordEvent(event) {
    event.hostname = location.hostname;
    event.url = location.href;
    chrome.runtime.sendMessage({
        type: RECORD_EVENT,
        event: event
    });
}

function recordKeyEvent(event) {
    // we only care if you hit enter while typing.
    if (isInput(event.target) && event.key == "Enter") {
        var selector = generateSelector(event.target);
        if (selector) {
            recordEvent({
                type: "type",
                text: (event.target.value || event.target.innerHTML) + "{Enter}",
                selector: selector,
                label: generateLabel(event.target)
            });
        }
    }
}

function recordBlurEvent(event) {
    var text = getInputValue(event.target);
    if (text) {
        var selector = generateSelector(event.target);
        if (selector && text) {
            recordEvent({
                type: "type",
                subtype: "blur",
                text: text,
                selector: selector,
                label: generateLabel(event.target)
            });
        }
    }
}

function recordClickEvent(event) {
    // if it's an element inside the extension's UI, ignore the event.
    if (event.target.matches(".cm_ui, .cm_ui *")) {
        return;
    }

    var selector = generateSelector(event.target);
    if (selector) {
        recordEvent({
            type: "click",
            selector: selector,
            isInput: isInput(event.target),
            label: generateLabel(event.target)
        });
    }
}

function gotNewData(message, isInitializingCall) {
    if (message.state) {
        state = message.state;
        buildOrUpdateUI();

        if (!recording && state.recording && !state.doneRecording) {
            recording = true;

            document.addEventListener("blur", recordBlurEvent, true);
            document.addEventListener("keydown", recordKeyEvent, true);
            document.addEventListener("mousedown", recordClickEvent, true);

            if (isInitializingCall) {
                recordEvent({ type: "navigate" });
            }
        } else {
            uiElement.classList.remove("viewing-code");
        }
    }
}

chrome.runtime.onMessage.addListener(function(message) {
    gotNewData(message, false);
});

chrome.runtime.sendMessage({ type: GET_STATE }, function(message) {
    console.log("got state from background", message);
    gotNewData(message, true);
});
