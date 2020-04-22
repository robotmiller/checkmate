
var STYLE = `

    .cm_ui, .cm_ui div, .cm_ui span, .cm_ui h1, .cm_ui h2, .cm_ui h3, .cm_ui p,
    .cm_ui input, .cm_ui textarea, .cm_ui select, .cm_ui button,
    .cm_ui a, .cm_ui code, .cm_ui em, .cm_ui img, .cm_ui small, .cm_ui strong, .cm_ui label {
        margin: 0;
        padding: 0;
        border: 0;
        font-family: "trebuchet ms", Tahoma, sans-serif;
        font-size: inherit;
        vertical-align: baseline;
        box-sizing: border-box;
        outline: 0;
    }
    
    .cm_ui {
        background: #f8f8f8;
        color: #000;
        position: fixed;
        right: 20px;
        bottom: 20px;
        display: inline-block;
        border: 1px solid #444;
        border-radius: 3px;
        box-shadow: rgba(0, 0, 0, 0.5) 0 2px 10px;
        font-size: 13px;
        z-index: 2147483647;
    }
    .cm_ui.left {
        right: initial;
        left: 20px;
    }
    .cm_ui.minimized .title-bar {
        border-bottom: 0;
    }
    .cm_ui.minimized .current-step {
        height: 0;
        overflow: hidden;
    }

    .cm_ui a {
        color: #44e;
        text-decoration: underline;
    }

    /* general utility stuff */
    .cm_ui .flex {
        display: flex;
        align-items: center;
    }
    .cm_ui .grow {
        flex-grow: 1;
    }

    @keyframes rotating {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .cm_ui .title-bar {
        background: #40a070;
        border-radius: 2px 2px 0 0;
        border-bottom: 1px solid #444;
        color: #fff;
        padding: 8px 10px;
        font-size: 16px;
        font-weight: bold;
    }
    .cm_ui .step-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        border-radius: 10px;
        background: rgba(192, 255, 192, 0.3);
        margin-left: 4px;
        margin-bottom: 2px;
        line-height: 16px;
        text-align: center;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
    }
    .cm_ui .step-icon:first-child {
        margin-left: 10px;
    }
    .cm_ui .step-icon.fail {
        background: #e07800;
        font-size: 12px;
    }

    .cm_ui .current-step {
        padding: 0;
    }

    .cm_ui .step-title {
        padding: 10px;
    }

    .cm_ui .instruction {
        padding: 10px;
        border-bottom: 1px solid #ddd;
    }
    .cm_ui .instruction .note {
        font-size: 12px;
        color: #777;
    }
    .cm_ui [data-copy] {
        background: #e8e8f8;
        color: #000;
        padding: 2px 4px;
        cursor: pointer;
        position: relative;
    }
    .cm_ui [data-copy]:after {
        position: absolute;
        content: "copied!";
        left: 0;
        right: 0;
        width: 100%;
        text-align: center;
        top: -8px;
        opacity: 0;
        color: #44e;
        font-size: 11px;
        font-weight: bold;
        pointer-events: none;
        transition: opacity 0.2s ease, top 0.2s ease;
    }
    .cm_ui [data-copy].copied:after {
        top: -12px;
        opacity: 1;
    }
    .cm_ui [data-select] {
    }
    .cm_ui [data-minimize] {
        line-height: 1;
        margin-right: 4px;
        font-weight: normal;
        cursor: pointer;
    }
    .cm_ui [data-automatic] {
        line-height: 1;
        margin-right: 4px;
        font-weight: normal;
        cursor: pointer;
    }
    .cm_ui [data-automatic=true] {
        animation: rotating 2s linear infinite;
    }
    .cm_ui [data-lr-toggle] {
        line-height: 1;
        font-weight: normal;
        cursor: pointer;
    }

    .cm_ui button {
        border: 0;
        border-radius: 4px;
        background: #446;
        color: #fff;
        font-weight: bold;
        outline: none;
        cursor: pointer;
    }
    .cm_ui [data-do-it] {
        box-sizing: border-box;
        width: 36px;
        text-align: center;
        font-size: 11px;
        line-height: 12px;
        padding: 3px 6px;
        margin-left: 10px;
    }
    .cm_ui [data-do-it].failed {
        background: #e07800;
    }
    .cm_ui [data-do-it].success {
        background: #40a070;
    }
    .cm_ui [data-do-it].manual {
        background: #ccc;
    }

    .cm_ui .buttons {
        padding: 10px;
    }

    .cm_ui button.big {
        border: 1px solid #444;
        box-shadow: rgba(0, 0, 0, 0.2) 0 2px 5px;
        outline: 0;
        border-radius: 3px;
        background: #f4f4f4;
        color: #000;
        padding: 7px 10px;
        font-weight: bold;
        position: relative;
        cursor: pointer;
    }
    .cm_ui button.big + .big {
        margin-left: 6px;
    }
    .cm_ui button.big:active {
        background: #fff;
    }
    .cm_ui button.big[data-pass-step] {
        background: #40a070;
        color: #fff;
    }
    .cm_ui button.big[data-pass-step]:active {
        background: #4a7;
    }
    .cm_ui button.big[data-fail-step] {
        background: #e07800;
        color: #fff;
    }
    .cm_ui button.big[data-fail-step]:active {
        background: #f80;
    }
    
`;

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
        content = `Navigate to <a href="${url}" onclick="return false;">${formatUrl(url)}</a>`;
    } else if (type == "new-tab") {
        content = `Open <a href="${url}" onclick="return false;">${formatUrl(url)}</a> in a new tab.`;
    } else if (type == "switch-tab") {
        content = `Switch to the ${label || url} tab.`;
    } else if (type == "type") {
        content = `Type ${makeCopyBlock(text)} in the ${makeSelectBlock(selector, label)}.`;
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
    var label;
    if (result == "pass") {
        label = "&check;";
    } else if (result == "fail") {
        label = "&times;";
    } else if (index == state.stepIndex) {
        label = "&hellip;";
    } else {
        label = "&nbsp;";
    }
    return `<span class="step-icon ${result} ${isActive ? "active": ""}" data-set-step="${index}">${label}</span>`;
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
    html.push(`<span>${test.title}</span>`);
    // make icons for each step.
    html.push(`<span class="grow">${test.steps.map(makeStepIcon).join("")}</span>`);
    html.push(`<span data-minimize="">_</span>`);
    html.push(`<span data-automatic="${state.automatic}">&orarr;</span>`);
    html.push(`<span data-lr-toggle="">&rightleftarrows;</span>`);
    html.push(`</div>`);

    html.push(`<div class="current-step">`);
    // html.push(`<div class="step-title">${step.title}</div>`);
    
    step.instructions.forEach((instruction, index) => {
        html.push(buildInstructionHtml(instruction, index));
    });
    
    // add buttons to either pass or fail this step.
    html.push(`<div class="buttons flex">`);
    var backButton = (testIndex > 0 || stepIndex > 0) ? `<button class="big" data-back-step="${stepIndex}">back</button>` : "";
    html.push(`<span class="grow">${backButton}</span>`);
    html.push(`<button class="big" data-next-step="${stepIndex}">next</button>`);
    html.push(`<button class="big" data-pass-step="${stepIndex}">pass</button>`);
    html.push(`<button class="big" data-fail-step="${stepIndex}">fail</button>`);
    html.push(`</div>`);
    
    html.push(`</div>`);
    
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

    instruction.status = "running";
    var setStatus = function(status) {
        var test = state.tests[testIndex];
        var step = test.steps[stepIndex];
        var instruction = step.instructions[instructionIndex];
        instruction.status = status;
        syncState();
        buildOrUpdateUI();
    };

    var tryInAllFrames = function() {
        chrome.runtime.sendMessage({
            type: RUN_IN_FRAMES,
            instruction: instruction,
            testIndex: testIndex,
            stepIndex, stepIndex,
            instructionIndex: instructionIndex
        });
    };
    setStatus("running");

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

    if (typeInElement(instruction.text, element)) {
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
        setStatus("success");
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
    } else if (event.target.hasAttribute("data-fail-step")) {
        var stepIndex = +event.target.getAttribute("data-fail-step");
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
    }
}

function handleMouseDown(event) {
    if (event.target.hasAttribute("data-do-it")) {
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

        var styleTag = document.createElement("style");
        styleTag.textContent = STYLE;
        document.body.appendChild(styleTag);
    }
    uiElement.innerHTML = html;
}

function gotNewData(message) {
    console.log("got data", message);
    if (message.state) {
        state = message.state;
        buildOrUpdateUI();
    }
}

chrome.runtime.sendMessage({ type: GET_STATE }, gotNewData);
chrome.runtime.onMessage.addListener(gotNewData);
