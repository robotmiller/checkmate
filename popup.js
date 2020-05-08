
var state, feedback;

// these are updated by the functions in builders.js.
var _tests, _test, _instructions;

function hide(id) {
    $(id).classList.add("is-hidden");
}

function show(id) {
    $(id).classList.remove("is-hidden");
}

function makeStepIcon(step, stepIndex, testIndex) {
    var isActive = testIndex == state.testIndex && stepIndex == state.stepIndex;
    var result = step.result || "";
    var label;
    if (result == "pass") {
        label = "&check;";
    } else if (result == "fail") {
        label = "&times;";
    } else if (isActive) {
        label = "&hellip;";
    } else {
        label = "&nbsp;";
    }
    return `<span class="step-icon ${result} ${isActive ? "active": ""}" data-test="${testIndex}" data-step="${stepIndex}">${label}</span>`;
}

function showTestDetails() {
    // list out each test and it's status.
    var html = [];
    state.tests.forEach(function(test, testIndex) {
        html.push(`<div class="test">`);
        var icons = test.steps.map(function(step, stepIndex) {
            return makeStepIcon(step, stepIndex, testIndex);
        }).join("");
        var testTitle = `<span class="test-title" data-toggle-steps="">${test.title}</span>`;
        html.push(`<div class="title">${testIndex + 1}. ${testTitle}${icons}</div>`)

        // include feedback about each test.
        html.push(`<div class="steps">`);
        test.steps.forEach(function(step, stepIndex) {
            html.push(`<div class="step ${step.result}">`);
            html.push(`<p class="h3">Step ${stepIndex + 1}: ${step.title}</p>`);
            html.push(`<ol class="instructions">`);
            step.instructions.forEach(function(instruction, index) {
                html.push(`<li>${buildInstructionHtml(instruction, index, false)}</li>`);
            });
            html.push(`</ol>`);

            var key = `${testIndex}_${stepIndex}`;
            if (feedback && feedback[key]) {
                html.push(`<blockquote>${feedback[key]}</blockquote>`);
            }
            html.push(`</div>`); // end of .step
        });
        html.push(`</div>`); // end of .steps
        html.push(`</div>`); // end of .test
    });
    $("test-details").innerHTML = html.join("");
}

function gotNewData(message) {
    console.log("got data", message);
    
    hide("loading");
    if (message.state && message.state.tests && message.state.tests.length) {
        hide("test-form")
        show("test-running");

        // if the tests are all done, say so.
        if (message.state.done) {
            hide("stop-test");
            show("start-new-test");
            $("test-status").innerHTML = `You're all done &mdash; great job! `;
        }

        state = message.state;
        feedback = message.feedback;
        showTestDetails();
    } else {
        show("test-form");
        hide("test-running");
        $("manifest-url").focus();
    }
}

chrome.runtime.sendMessage({ type: GET_STATE, isPopup: true }, gotNewData);

function handleEvalError(e) {
    // we can remove this because we'll add it before trying to eval again.
    window.removeEventListener("error", handleEvalError);

    var isInternal = /^.*INTERNAL:/.test(e.message);
    var line, column, message;
    if (isInternal) {
        window.stack = e.stack;
        window.error_obj = e;
        message = e.message.replace(/^.*INTERNAL:\s*/, "");

        // find the line this call was made from.
        var parts = e.error.stack.split(/\n/g)[2].split(/:|\)/g);
        line = +parts[parts.length - 3];
        column = +parts[parts.length - 2];
    } else {
        line = typeof e.lineno == "number" ? e.lineno : e.lineNumber;
        column = typeof e.colno == "number" ? e.colno : e.columnNumber;
        message = e.message;
    }

    // highlight the error range.
    var textarea = $("manifest-code");
    var lines = textarea.value.split("\n");
    var index = line - 1 + column;
    for (var i = 1; i < line; i++) {
        index += lines[i - 1].length;
    }
    textarea.focus();
    textarea.setSelectionRange(index - 1, index);

    var lineHeight = (textarea.scrollHeight - 10) / lines.length;
    textarea.scrollTop = (line - 1) * lineHeight - lineHeight * 3 + 5;
    textarea.scrollLeft = column * 10;
    showError(`Line ${line}, column ${column}: ${message}`, textarea);
}

// this is how we catch errors processing the manifest so
// we can see the line number they happened on.

function showError(message, element) {
    $("manifest-error").innerHTML = message;
    show("manifest-error");
    if (element) {
        element.classList.add("error");
    }
}

function hideError() {
    hide("manifest-error");
    $("manifest-url").classList.remove("error");
    $("manifest-code").classList.remove("error");
}

function processManifest(code) {
    _tests = [];
    
    // in case we had been showing an error, clear it.
    hideError();

    // we can't do a try/catch here because that won't give us an accurate line number
    // so instead we use this onerror listener.
    window.addEventListener("error", handleEvalError);
    eval(code);
    window.removeEventListener("error", handleEvalError);
    
    // todo: check for the case where no tests got created.
    if (!_tests.length) {
        return showError("No tests were found.", $("manifest-code"));
    }

    // if we reach this point, the eval worked.
    chrome.runtime.sendMessage({
        type: START_TEST,
        state: {
            testIndex: 0,
            stepIndex: 0,
            tests: _tests,
        }
    }, function(message) {
        if (message.state && message.state.tests) {
            hide("loading");
            hide("test-form");
            show("test-running");
            $("test-status").textContent = `The test has started. Here are the tests we'll run:`;
            state = message.state;
            showTestDetails();
        } else {
            show("test-error");
        }
    });
}

function loadManifest(url) {
    hideError();
    $("manifest-code").value = "";
    
    fetch(url).then(function(response) {
        window.res = response;
        if (response.ok) {
            return response.text();
        } else {
            showError("Network error.", $("manifest-url"));
        }
    }).then(function(text) {
        $("manifest-code").value = text;
    }).catch(function(error) {
        showError("Network error.", $("manifest-url"));
    });
}

$("manifest-url").addEventListener("keydown", function(event) {
    if (event.key == "Enter") {
        var url = $("manifest-url").value;
        if (url) {
            loadManifest(url);
        }
    }
});

$("start-test").onclick = function() {
    processManifest($("manifest-code").value);
};

$("record-test").onclick = function() {
    chrome.runtime.sendMessage({
        type: SET_STATE,
        state: {
            testIndex: 0,
            stepIndex: 0,
            recording: true,
            code: "",
            tests: [{
                title: "Recorded Test - " + new Date().toLocaleString(),
                steps: [{
                    title: "untitled",
                    instructions: []
                }]
            }]
        }
    }, function(message) {
        if (message.state && message.state.recording) {
            hide("loading");
            hide("test-form");
            show("test-running");
            $("test-status").textContent = `The recording has started.`;
            state = message.state;
        } else {
            show("test-error");
        }
    });
}

$("stop-test").onclick = $("start-new-test").onclick = function() {
    chrome.runtime.sendMessage({ type: STOP_TEST }, function() {
        state = null;
        show("test-form");
        hide("test-running");
    });
};

$("close-popup1").onclick = $("close-popup2").onclick = function() {
    window.close();
};

document.body.addEventListener("click", function(event) {
    if (event.target.hasAttribute("data-test")) {
        var testIndex = +event.target.getAttribute("data-test");
        var stepIndex = 0;
        if (event.target.hasAttribute("data-step")) {
            stepIndex = +event.target.getAttribute("data-step");
        }
        chrome.runtime.sendMessage({
            type: SET_STEP,
            testIndex: testIndex,
            stepIndex: stepIndex
        });
        state.testIndex = testIndex;
        state.stepIndex = stepIndex;
        showTestDetails();
    } else if (event.target.hasAttribute("data-toggle-steps")) {
        var steps = event.target.parentElement.nextSibling;
        steps.classList.toggle("is-hidden");
    } else if (event.target.matches("blockquote img")) {
        event.target.classList.toggle("maximized");
    }
}, false);

if (window.innerWidth > 430) {
    document.body.className = "full-page";
}