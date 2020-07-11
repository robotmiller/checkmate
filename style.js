
var STYLE = `
div, span, h1, h2, h3, p, pre,
input, textarea, select, button,
a, code, em, img, small, strong, label {
    margin: 0;
    padding: 0;
    border: 0;
    font-family: "trebuchet ms", Tahoma, sans-serif;
    font-size: inherit;
    vertical-align: baseline;
    box-sizing: border-box;
    min-height: initial;
    min-width: initial;
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
.center {
    text-align: center;
}
.hidden {
    display: none;
}
.minimized .title-bar {
    border-bottom: 0;
}

a {
    color: #44e;
    text-decoration: underline;
}

/* general utility stuff */
.flex {
    display: flex;
    align-items: center;
}
.grow {
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

.title-bar {
    background: #40a070;
    border-radius: 2px 2px 0 0;
    border-bottom: 1px solid #444;
    color: #fff;
    padding: 8px 10px;
    font-size: 16px;
    font-weight: bold;
}
.step-icon {
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
.step-icon:first-child {
    margin-left: 10px;
}
.step-icon.fail {
    background: #e07800;
    font-size: 12px;
}

.current-step {
    padding: 0;
    position: relative;
}

.step-title {
    padding: 10px;
}

.instructions-list {
    max-height: 330px;
    overflow: auto;
}
[data-scroll] {
    transition: box-shadow 0.5s ease;
}
[data-scroll="down"].instructions-list {
    box-shadow: inset rgba(0, 0, 0, .333) 0 -8px 8px -8px;
}
[data-scroll="up"].instructions-list {
    /* box-shadow: inset rgba(0, 0, 0, .5) 0 12px 12px -12px; */
}
[data-scroll="updown"].instructions-list {
    box-shadow: inset rgba(0, 0, 0, .333) 0 -8px 8px -8px;
}
.instruction {
    padding: 10px;
    border-bottom: 1px solid #ddd;
}
.instruction .note {
    font-size: 12px;
    color: #777;
}
[data-copy] {
    background: #e8e8f8;
    color: #000;
    padding: 2px 4px;
    cursor: pointer;
    position: relative;
}
[data-copy]:after {
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
[data-copy].copied:after {
    top: -12px;
    opacity: 1;
}
[data-minimize] {
    line-height: 1;
    margin-right: 4px;
    font-weight: normal;
    cursor: pointer;
}
[data-minimize]:hover {
    text-decoration: underline;
}
[data-automatic] {
    line-height: 1;
    margin-left: 20px;
    margin-right: 4px;
    font-weight: normal;
    cursor: pointer;
}
[data-automatic=true] {
    animation: rotating 2s linear infinite;
}
[data-lr-toggle] {
    line-height: 1;
    font-weight: normal;
    cursor: pointer;
    margin-right: 10px;
}

button {
    border: 0;
    border-radius: 4px;
    background: #446;
    color: #fff;
    font-weight: bold;
    outline: none;
    cursor: pointer;
}
[data-do-it] {
    box-sizing: border-box;
    width: 36px;
    text-align: center;
    font-size: 11px;
    line-height: 12px;
    padding: 3px 6px;
    margin-left: 10px;
}
[data-do-it].failed {
    background: #e07800;
}
[data-do-it].success {
    background: #40a070;
}
[data-do-it].manual {
    background: #ccc;
}
[data-do-it].disabled {
    background: #ccc;
    color: #eee;
    cursor: not-allowed;
}

.buttons {
    padding: 10px;
}

button.big {
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
* + .big {
    margin-left: 6px;
}
button.big:active {
    background: #fff;
}
button.good {
    background: #40a070;
    color: #fff;
}
button.good:active {
    background: #4a7;
}
button.warn {
    background: #e07800;
    color: #fff;
}
button.warn:active {
    background: #f80;
}

.getting-feedback .current-step {
    min-height: 200px;
    min-width: 400px !important
}

.getting-feedback .instructions {
    opacity: 0;
}
.feedback-form {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
}
.feedback-form .screenshot {
    display: none;
}
.getting-feedback .feedback-form {
    display: block;
}
.feedback-form [data-feedback] {
    background: #fff;
    border: 1px solid #444;
    border-radius: 3px;
    box-shadow: rgba(0, 0, 0, 0.3) 0 2px 5px;
    padding: 5px 8px;
    width: calc(100% - 40px);
    height: calc(100% - 76px);
    margin: 10px 20px;
    resize: none;
    overflow: auto;
}
.feedback-form [data-feedback]:focus {
    border-color: #4a7;
    box-shadow: rgba(128, 192, 128, 1) 0 2px 5px 1px;
}

.minimized .current-step {
    height: 0;
    min-height: 0;
    overflow: hidden;
}

.tooltip {
    background: #223;
    font-size: 11px;
    font-weight: normal;
    padding: 3px 5px;
    border-radius: 3px;
    color: #fff;
    position: fixed;
    max-width: 100px;
    transform: translateX(-50%) translateY(-100%);
    pointer-events: none;
    line-height: 1.3;
    box-shadow: rgba(0, 0, 0, 0.5) 0 2px 10px;
}
.tooltip:after {
    content: "";
    position: absolute;
    bottom: -5px;
    margin: 0 auto;
    left: 0;
    right: 0;
    max-width: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 5px 5px 0 5px;
    border-color: #223 transparent transparent transparent;
}
.tooltip.left {
    transform: translateX(-30px) translateY(-100%);
}
.tooltip.left:after {
    margin: 0;
    left: 25px;
}

.viewing-code .current-step {
    min-height: 200px;
}
.viewing-code .instructions {
    opacity: 0;
}
.code-display {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
}
.code-display pre {
    background: #f4f4f4;
    border: 1px solid #444;
    border-radius: 3px;
    box-shadow: rgba(0, 0, 0, 0.3) 0 2px 5px;
    padding: 5px 8px;
    width: calc(100% - 20px);
    height: calc(100% - 71px);
    margin: 10px;
    font-family: Consolas, monaco, "Courier New", monospace;
    overflow: auto;
}
.viewing-code .code-display {
    display: block;
}
`;
