
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

function truncate(value, length) {
    if (value.length < length) {
        return value;
    } else {
        return value.substring(0, length).trim() + "&hellip;";
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
    return url.replace(/^http(s?):\/\//i, "");
}

function buildInstructionHtml(instruction, index) {
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
    }

    var highlightAttr = selector ? `data-highlight="${index}"` : "";

    var note = instruction.note ? `<br/><span class="note">${instruction.note}</span>` : "";

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
    var doIt = `<button class="${status || ""} ${doitClass}" data-do-it="${index}">${doitLabel}</button>`;
    return content ? `<div class="instruction flex" ${highlightAttr}><span class="grow">${content}${note}</span>${doIt}</div>` : "";
}

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

    var leftRightTooltip = "Moves the display to the left or right.";
    var autoModeTooltip = "Toggles automatic execution of instructions.";

    // make the title bar:
    html.push(`<div class="title-bar flex">`);
    html.push(`<span data-lr-toggle="" ${tooltipAttr(leftRightTooltip)}>&rightleftarrows;</span>`);
    html.push(`<span data-minimize="">${test.title}</span>`);
    if (!state.recording) {
        // make icons for each step.
        html.push(`<span class="grow">${test.steps.map(makeStepIcon).join("")}</span>`);
        html.push(`<span ${tooltipAttr(autoModeTooltip)} data-automatic="${state.automatic}">&orarr;</span>`);
    }
    html.push(`</div>`); // end of title bar.

    html.push(`<div class="current-step">`);
    html.push(`<div class="instructions">`);
    html.push(`<div class="instructions-list" data-scroll="">`);
    step.instructions.forEach((instruction, index) => {
        html.push(buildInstructionHtml(instruction, index));
    });
    html.push(`</div>`); // end of .instructions-list
    
    // add buttons to either pass or fail this step.
    html.push(`<div class="buttons flex">`);
    var backButton = (testIndex > 0 || stepIndex > 0) ? `<button class="big" data-back-step="${stepIndex}">Back</button>` : "";
    html.push(`<span class="grow">${backButton}</span>`);
    if (state.recording) {
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

var uiElement, state;

function syncState() {
    chrome.runtime.sendMessage({
        type: SET_STATE,
        state: state
    }, gotNewData);
}

function advanceStep(stepIndex, result) {
    var test = state.tests[state.testIndex];
    // if there's no result provided then we're just going to the next step
    // and we don't want to change the assigned status.
    if (result) {
        test.steps[stepIndex].result = result;
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
        // try {
            func(instruction, setStatus, instructionIndex, tryInAllFrames);
        // } catch (e) {
        //     setStatus("failed");
        // }
    } else {
        setStatus("success");
    }
}

register("navigate", function(instruction, setStatus) {
    setStatus("success");
    setTimeout(function() {
        location.href = instruction.url;
    }, 100);
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

    var callback = function() {
        setStatus("success");
    };
    var func = new Function(instruction.func);
    if (instruction.hasArgs) {
        func(callback);
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
        // todo: make this persist through page refreshes.
        uiElement.classList.toggle("left");
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
        var input = document.querySelector(".cm_ui [data-feedback]");
        if (!input.innerHTML) {
            var failedButtons = document.querySelectorAll(".cm_ui [data-do-it].failed");
            var text = Array.from(failedButtons).map(function(button, index) {
                return (index + 1) + ". " + button.previousSibling.textContent.replace(/\n/g, " ");
            }).join("<br/>");
            if (text) {
                input.innerHTML = "I wasn't able to to:<br/><br/>" + text;
            }
        }
        document.querySelector(".cm_ui").classList.add("getting-feedback");
        document.querySelector(".cm_ui [data-feedback]").focus();
    } else if (event.target.hasAttribute("data-cancel-fail")) {
        // hide the feedback form for this step and go back to the instructions.
        document.querySelector(".cm_ui").classList.remove("getting-feedback");
    } else if (event.target.hasAttribute("data-take-screenshot")) {
        takeScreenshot(function(dataUrl) {
            var input = document.querySelector(".cm_ui [data-feedback]");
            var paragraph = document.createElement("p");
            var image = document.createElement("img");
            image.setAttribute("height", "160");
            image.src = dataUrl;
            paragraph.appendChild(image);
            input.appendChild(paragraph);
        });
    } else if (event.target.hasAttribute("data-fail-step")) {
        var stepIndex = +event.target.getAttribute("data-fail-step");
        // document.querySelector(".cm_ui").classList.remove("getting-feedback");
        advanceStep(stepIndex, "fail");
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
        if (event.fromElement.closest("[data-highlight]") == event.toElement.closest("[data-highlight]")) {
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
        uiElement = document.createElement("div");
        uiElement.className = "cm_ui";
        uiElement.addEventListener("click", handleClick, false);
        uiElement.addEventListener("mousedown", handleMouseDown, false);
        uiElement.addEventListener("mouseover", handleMouseOver, false);
        uiElement.addEventListener("mouseout", handleMouseOut, false);
        document.body.appendChild(uiElement);
    } else {
        document.querySelector(".cm_ui").classList.remove("getting-feedback");
    }
    uiElement.innerHTML = html;
    setTimeout(function() {
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
    // right now, we don't care about every keypress, just when you're
    // typing letters/numbers or you press enter.
    console.log("recordKeyEvent", event);
    if (event.key.length == 1 || event.key == "Enter") {
        recordEvent({
            type: "keydown",
            key: event.key
        });
    }
}

function recordClickEvent(event) {
    // if it's an element inside the extension's UI, ignore the event.
    if (event.target.matches(".cm_ui, .cm_ui *")) {
        return;
    }

    var selector = generateSelector(event.target);
    var isInput = event.target.matches("input, textarea, [contenteditable]");
    if (selector) {
        recordEvent({
            type: "click",
            selector: selector,
            isInput: isInput,
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

            // todo: remove these event listeners when you're done recording.
            // todo: switch this to use blur or change events so we just get the value that
            //       was entered and we don't record backspacing.
            document.addEventListener("keydown", recordKeyEvent, true);
            document.addEventListener("mousedown", recordClickEvent, true);

            if (isInitializingCall) {
                recordEvent({ type: "navigate" });
            }
        }
    }
}

chrome.runtime.sendMessage({ type: GET_STATE }, function(message) {
    gotNewData(message, true);
});
chrome.runtime.onMessage.addListener(function(message) {
    gotNewData(message, false);
});
