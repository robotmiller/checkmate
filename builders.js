
function test(title, func) {
    _test = {
        title: title,
        steps: []
    };
    _tests.push(_test);
    func();
}
    
function step(title, func) {
    _instructions = [];
    func();
    _test.steps.push({
        title: title,
        instructions: _instructions
    });
}

function navigate(url, label) {
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
    _instructions.push({
        type: "switch-tab",
        url: url,
        label: label,
        canDo: true
    });
}

function type(text, selector, label) {
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

function custom(text, func) {
    var instruction = {
        type: "custom",
        text: text,
        canDo: false
    };
    if (func) {
        instruction.args = [];
        instruction.func = func.toString()
            .replace(/^(?:function\s*[^\(]*)?\s*\(([^)]*)\)\s*(?:=>)?\s*\{/i, function(text, argString) {
                instruction.args = argString.split(",").map(function(arg) {
                    return arg.trim();
                });
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
    } else {
        // if this is the first instruction in a step, then this is essentially
        // a custom step where the note's text _is_ the instruction.
        custom(text);
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
