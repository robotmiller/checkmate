
chrome.runtime.onMessage.addListener(function(message, sender, setStatus) {
    if (message.type == RUN_IN_FRAMES) {
        var instruction = message.instruction;
        if (instruction.type == "click") {
            var element = findElement(instruction.selector, instruction.regex);
            if (element) {
                setTimeout(function() {
                    element.dispatchEvent(new Event("click"));
                    element.click();
                }, 0);
                return setStatus("success");
            } else {
                // fail silently because we expect most frames will fail and maybe one will succeed.
            }
        } else if (instruction.type == "type") {
            // todo: wait up to a few seconds for this element to exist.
            var element = document.querySelector(instruction.selector);
            if (typeInElement(instruction.text, element, instruction.doPressEnter)) {
                setStatus("success");
            }
        } else if (instruction.type == "find-element") {
            // todo: make this try for 5-10 seconds.
            var element = findElement(instruction.selector, instruction.regex);
            if (element) {
                return setStatus("success");
            }
        } else if (instruction.type == "observe") {
            // todo: try this for a little while before failing.
            if (instruction.selector) {
                var elements = document.querySelectorAll(instruction.selector);
                var element = Array.from(elements).find(function(el) {
                    return doesContainString(el.textContent, instruction.text);
                });
                if (element) {
                    highlight(element);
                    return setStatus("success");
                }
            } else {
                var elements = document.evaluate(".//text()", document.body, null, XPathResult.ANY_TYPE, null); 
                var element;
                while (element = elements.iterateNext()) {
                    // if it's inside the checkmate UI, skip it.
                    if (element.parentNode.closest(".cm_ui")) {
                        continue;
                    }
                    if (doesContainString(element.textContent, instruction.text)) {
                        highlight(element.parentNode);
                        return setStatus("success");
                    }
                }
            }
        }

        // call this to avoid an error message from being logged.
        setStatus(undefined);
    } else if (message.type == RELAY_TO_FRAMES) {
        var instruction = message.instruction;
        if (instruction) {
            if (message.highlight === true) {
                highlight(instruction.selector, instruction.regex);
            } else if (message.highlight === false) {
                unhighlight(instruction.selector, instruction.regex);
            }
        }
    }
});
