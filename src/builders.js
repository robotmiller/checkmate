
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
