
var state, feedback;

// these are updated by the functions in builders.js.
var _tests, _test, _instructions, _usesFocus;

function hide(id) {
    var element = $(id);
    if (element) {
        element.classList.add("is-hidden");
        element.classList.remove("transparently");
    } else {
        // console.warn("couldn't find element #" + id);
    }
}

function show(id) {
    var element = $(id);
    if (element) {
        element.classList.remove("is-hidden");
    } else {
        console.warn("couldn't find element #" + id);
    }
}

function makeStepIcon(step, stepIndex, testIndex) {
    var isActive = testIndex == state.testIndex && stepIndex == state.stepIndex;
    var result = step.result || "";
    var tooltip = `Step ${stepIndex + 1}: ${step.title}`;
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
    return `<span class="step-icon ${result} ${isActive ? "active": ""}" ${tooltipAttr(tooltip)} data-test="${testIndex}" data-step="${stepIndex}">${label}</span>`;
}

function showTestDetails() {
    // list out each test and it's status.
    var html = [];
    state.tests.forEach(function(test, testIndex) {
        html.push(`<div class="test">`);
        var icons = test.steps.map(function(step, stepIndex) {
            return makeStepIcon(step, stepIndex, testIndex);
        }).join("");
        var testTitle = `<span class="test-title" data-test="${testIndex}">${test.title}</span>`;
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
    // console.log("got data", message);
    
    hide("loading");
    if (message.state && message.state.tests && message.state.tests.length) {
        hide("test-form");
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
        $("manifest-url").value = (state && state.url) || "";
        $("manifest-code").value = (state && state.code) || "";
    }
}

chrome.runtime.sendMessage({ type: GET_STATE, isPopup: true }, gotNewData);

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

window.addEventListener("message", function(event) {
    console.log("popup received message", event);

    if (event.data.evalError) {
        return showError(event.data.evalError);
    } else if (event.data.evalSuccess) {
        _tests = event.data.evalSuccess;

        // if we reach this point, the eval worked.
        chrome.runtime.sendMessage({
            type: START_TEST,
            state: {
                testIndex: 0,
                stepIndex: 0,
                tests: _tests,
                code: event.data.code,
                url: (state && state.url) || ""
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

    
});

function processManifest(code) {
    _tests = [];
    
    // in case we had been showing an error, clear it.
    hideError();

    // the textarea is inside an iframe because we can't call eval() here.
    // we can call it inside the iframe though, so we edit the code and run
    // it there, then it'll call postMessage to pass back the test json.
    $("manifest-code").contentWindow.postMessage({ compile: true }, "https://robotmiller.com");
}

function loadManifest(url) {
    if (!url) {
        return;
    }

    // indicate that we're loading the manifest.
    hideError();
    $("load-manifest").textContent = "...";
    $("load-manifest").classList.remove("error", "success");
    $("manifest-code").value = "";
    state.url = url;

    var showNetworkError = function(error) {
        $("load-manifest").innerHTML = "&times;";
        $("load-manifest").classList.remove("success");
        $("load-manifest").classList.add("error");
        showError("Network error.", $("manifest-url"));
    };
    
    fetch(url).then(function(response) {
        window.res = response;
        if (response.ok) {
            return response.text();
        } else {
            showNetworkError();
        }
    }).then(function(text) {
        if (text) {
            $("load-manifest").innerHTML = "&check;";
            $("load-manifest").classList.remove("error");
            $("load-manifest").classList.add("success");
            $("manifest-code").value = text;
        } else {
            $("manifest-code").value = "";
        }
    }).catch(showNetworkError);
}

$("manifest-url").addEventListener("keydown", function(event) {
    if (event.key == "Enter") {
        loadManifest($("manifest-url").value);
    } else {
        $("load-manifest").textContent = "load";
        $("load-manifest").classList.remove("error", "success");
    }
});

$("load-manifest").onclick = function() {
    loadManifest($("manifest-url").value);
};

$("start-test").onclick = function() {
    processManifest();
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
        state = {
            code: state.code || "",
            url: state.url || ""
        };
        show("test-form");
        $("manifest-code").value = state.code;
        $("manifest-url").value = state.url;
        hide("test-running");
    });
};

$("close-popup1").onclick = $("close-popup2").onclick = function() {
    window.close();
};

$("open-in-tab1").onclick = $("open-in-tab2").onclick = function() {
    window.open("popup.html");
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

// make tooltips work.
function handleMouseOver(event) {
    if (event.target.hasAttribute("data-tooltip")) {
        showTooltip(event.target, event.target.getAttribute("data-tooltip"));
    }
}
function handleMouseOut(event) {
    if (event.target.hasAttribute("data-tooltip")) {
        hideTooltip(event.target);
    }
}

document.addEventListener("mouseover", handleMouseOver, false);
document.addEventListener("mouseout", handleMouseOut, false);

// this button copies the full report HTML to the clipboard.
var copyReportTimeout;
$("copy-report").onclick = function() {
    // todo: make this take styling into account.
    // todo: update the report so things copy more nicely.
    copyHtml($("test-details").innerHTML);

    if (copyReportTimeout) {
        clearTimeout(copyReportTimeout);
    }
    copyReportTimeout = setTimeout(function() {
        $("copy-report").innerHTML = "Copy to Clipboard";
    }, 1000);
    $("copy-report").innerHTML = "&check; Copied!";
};

if (window.innerWidth > 530) {
    document.body.className = "full-page";
}
