
var state;

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

// vvv functions we call while building tests vvv
var _tests, _test, _instructions;

function test(title, func) {
	_test = {
		title: title,
		steps: []
    };
    _tests.push(_test);
	func();
	// $("output").innerHTML = buildStepHtml(_test, 0);
}
	
function step(title, func) {
	_instructions = [];
	func();
	_test.steps.push({
		title: title,
		instructions: _instructions
	});
}

function navigate(url) {
	_instructions.push({
		type: "navigate",
        url: url,
        canDo: true
	});
}

function newTab(url) {
	_instructions.push({
		type: "new-tab",
        url: url,
        canDo: true
	});
}

function switchTab(url, label) {
    _instructions.push({
        type: "switch-tab",
        url: url,
        label: label,
        canDo: true
    });
}

function type(text, selector, label) {
	_instructions.push({
		type: "type",
		text: text,
		selector: selector,
        label: label || "",
        // you don't have to provide a selector here. if you only give us a label
        // we'll say "enter 'whatever' in the {label}" so you'll have to do it manually.
        canDo: !!selector
	});
}

function custom(text, func) {
    var instruction = {
        type: "custom",
        text: text,
        canDo: false
    };
    if (func) {
        instruction.hasArgs = false;
        instruction.func = func.toString()
            .replace(/^(?:function\s*[^\(]*)?\s*\(([^)]*)\)\s*(?:=>)?\s*\{/i, function(text, argString) {
                instruction.hasArgs = !!argString.trim();
                return "";
            }).replace(/\}\s*$/i, "").trim();
        instruction.canDo = true;
    }
    _instructions.push(instruction);
}

function click(selector, regex, label) {
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
    var lastInstruction = _instructions[_instructions.length - 1];
    if (lastInstruction) {
        lastInstruction.note = text;
    }
}

function findElement(selector, regex, label) {
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

// ^^^ functions we call while building tests ^^^

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

$("stop-test").onclick = $("start-new-test").onclick = function() {
    chrome.runtime.sendMessage({ type: STOP_TEST }, function() {
        state = null;
        show("test-form");
        hide("test-running");
    });
};

$("close-popup").onclick = function() {
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