
var state;

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
    html.push(`<ol>`);
    state.tests.forEach(function(test, testIndex) {
        var icons = test.steps.map(function(step, stepIndex) {
            return makeStepIcon(step, stepIndex, testIndex);
        }).join("");
        var testTitle = `<span class="test-title" data-test="${testIndex}">${test.title}</span>`;
        html.push(`<li>${testTitle}${icons}</li>`)
    });
    html.push(`</ol>`);
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
        showTestDetails();
    } else {
        show("test-form");
        hide("test-running");
        $("manifest-url").focus();
    }
}

chrome.runtime.sendMessage({ type: GET_STATE }, gotNewData);

function handleEvalError(e) {
    // we can remove this because we'll add it before trying to eval again.
    window.removeEventListener("error", handleEvalError);

    var textarea = $("manifest-code");
    var line = typeof e.lineno == "number" ? e.lineno : e.lineNumber;
    var column = typeof e.colno == "number" ? e.colno : e.columnNumber;

    // highlight the error range.
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

    showError(`Line ${line}, column ${column}: ${e.message}`, textarea);
}

// this is how we catch errors processing the manifest so
// we can see the line number they happened on.

function showError(message, element) {
    $("manifest-error").innerHTML = message;
    show("manifest-error");
    element.classList.add("error");
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

    // if we reach this point, the eval worked.
    chrome.runtime.sendMessage({
        type: SET_STATE,
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
    var manifestCode = $("manifest-code").value;
    if (manifestCode) {
        processManifest(manifestCode);
    }
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
    }
}, false);