function openGuruExtension() {
    var message = {
        guru: {
            originator: 123,
            payload: {},
            message: "toggle-menu",
            respond: null
        },
        origin: "https://app.getguru.com"
    };
    window.postMessage(JSON.parse(JSON.stringify(message)), "*");
}

test("AIS Text over Gmail", () => {
    step("Sign into Gmail", () => {
        navigate("https://mail.google.com");
        type("guru.rainforest@gmail.com", "#identifierId", "email field");
        click("#identifierNext", "the next button");
        type("1234ABCD", "input[type=password]", "password field");
        click("#passwordNext", "the next button");
    });

    step("Check AIS Text", () => {
        click("[role=row]:first-child", "any email");
        click("[role=link]", /^reply$/i, "the reply button");
        findElement(".ghq-GuruButton", "the Guru button");
        custom("Open the Guru extension.", openGuruExtension);
        custom("Go to the suggestions tab.");
        observe("Gmail", ".ghq-ContextualSuggestionSection__title", "the suggestions tab");
    });
});

test("AIS Text over LivePerson", () => {
    step("Sign into LivePerson", () => {
        navigate("https://authentication.liveperson.net/login.html");
        type("69748652", "#siteNumber", "account number field");
        type("flux-dev@getguru.com", "#userName", "email field");
        type("Guru1992?", "#sitePass", "password field");
        click("input[name=loginButton]", "the Sign In button");
        findElement(".lpview_queue_orb", /waiting/i, "'waiting' button in the bottom left");
    });

    step("Start a chat", () => {
        newTab("https://powerful-hamlet-79700.herokuapp.com/liveperson");
        click(".LPMcontainer", "the Live Chat button.");
        note("If you don't see the button or it doesn't say 'Live Chat', try refreshing.");
        switchTab("liveperson.net", "LivePerson");
        click(".lpview_queue_orb.blink", "the accept button");
        switchTab("herokuapp.com", "chat");
        type("does guru support markdown in cards?", "#lpChat textarea", "chat input");
        click(".lp_send_button", "send button");
    });

    step("Check that AIS Text works", () => {
        switchTab("liveperson.net", "LivePerson");
        observe("does guru support markdown in cards?");
        findElement(".ghq-GuruButton", "the Guru button");
        custom("Open the Guru extension.", openGuruExtension);
        custom("Go to the suggestions tab.");
        observe("Liveperson", ".ghq-ContextualSuggestionSection__title", "the suggestions tab");
    });
});

test("Test things in Slack", () => {
    step("Create a card using an action", () => {
        navigate("https://app.slack.com/client/T1W943ZH7/CAFNRJR0S");
        custom("Hover over a message and use the \"Create Card\" action.");
        click(".c-input_select__chevron", "the collection dropdown");
        click(`[id*="collectionEl_b2bc9b9b-620e-4739-9b1a-a9df8c43618a"]`, "'General' in the dropdown");
        type("slack action card", "input[name=titleEl]", "title field");
        type(`here's my content

## markdown heading

it has a list:

 * item 1
 * item 2
 * item 3`, "textarea[name=contentEl]", "content field");
        click(".c-dialog__go", "the save button");
        click(`[data-qa-action-id^="savenewcard/"]`, "the next save button");
        observe("created a card");
    });
});