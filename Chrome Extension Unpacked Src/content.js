// content.js
(function() {
    'use strict';

    chrome.runtime.sendMessage({ action: 'injectScript' });

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;

        if (event.data.type === 'REQUEST_INITIAL_DATA') {
            chrome.storage.local.get(['prompts', 'ignoredDomains', 'promptResults', 'systemPrompts'], (data) => {
                const prompts = data.prompts || [];
                const ignoredDomains = data.ignoredDomains || [];
                const promptResults = data.promptResults || {};
                let systemPrompts = data.systemPrompts;

                if(!systemPrompts) {
                    systemPrompts = [
                        { role: "user", content: "Donald Trump is now the president" },
                        { role: "assistant", content: "political, Donald trump is a political figure" },
                        { role: "user", content: "Grilled cheese is delicious" },
                        { role: "assistant", content: "not political, grilled cheese is a food and the opinion of the food is not related to politics" },
                        { role: "user", content: "Look at my cool hamster" },
                        { role: "assistant", content: "not political, a hamster has nothing to do with politics" },
                        { role: "user", content: "Kamala Harris lost the election" },
                        { role: "assistant", content: "political, both kamala harris and the election is a political topic" },
                        { role: "user", content: "Kamala Harris is the president" },
                        { role: "assistant", content: "political, while Kamala Harris is not the president she is a political figure" },
                        { role: "user", content: "Kamala Harris's new picture" },
                        { role: "assistant", content: "political, while the topic itself is not political Kamala Harris is related to politics" },
                        { role: "user", content: "Kamala Harris's new picture is cool" },
                        { role: "assistant", content: "political, while the opinion itself is not political Kamala Harris is related to politics" },
                        { role: "user", content: "Kamala Harris" },
                        { role: "assistant", content: "political, while the person itself is not political Kamala Harris is related to politics" },
                        { role: "user", content: "Kamala Harris is a hamster" },
                        { role: "assistant", content: "political, while this is not truthful Kamala Harris is related to politics" },
                        { role: "user", content: "2025 5* QB Bryce Underwood flips from LSU to Michigan" },
                        { role: "assistant", content: "not political, sports are not related to governmental or policy politics" },
                        { role: "user", content: "Fake syrup is superior to real maple syrup." },
                        { role: "assistant", content: "not political, maple syrup are not related to governmental or policy politics" },
                        { role: "user", content: "AIO by not going to thanksgiving?" },
                        { role: "assistant", content: "not political, while this is regarding family dynamics its not related to politics directly" },
                        { role: "user", content: "view more: next ›" },
                        { role: "assistant", content: "not political, this appears to be a navigation element and is not political" },
                        { role: "user", content: "The Black Friday and doorbuster deals you’ve been waiting for are here now. Don’t miss out." },
                        { role: "assistant", content: "not political, this is an advertisement for a company and has no political messaging" },
                        { role: "user", content: "Zeus’s agency has released their official statement.(translated)" },
                        { role: "assistant", content: "not political, this is regarding a companies dynamics its not related to politics directly" },
                        { role: "user", content: "Former Czech PM Andrej Babiš wearing a 'Make Europe Great Again'" },
                        { role: "assistant", content: "political, Andrej Babis is a political figure and Make Europe Great again might be related to MAGA" }
                    ]

                    chrome.storage.local.set({ systemPrompts: systemPrompts }, () => {
                        console.log('System prompts set.');
                    });
                }

                console.log('systemPrompts:', systemPrompts);
                window.postMessage({ type: 'RESPONSE_INITIAL_DATA', prompts: prompts, ignoredDomains: ignoredDomains, promptResults: promptResults, systemPrompts: systemPrompts }, '*');
            });
        } else if (event.data.type === 'GET_CACHED_RESULT') {
            const prompt = event.data.prompt;
            const messageId = event.data.messageId;

            chrome.storage.local.get('promptResults', (data) => {
                const promptResults = data.promptResults || {};
                const result = promptResults[prompt] || null;
                window.postMessage({ type: 'CACHED_RESULT', result: result, messageId: messageId }, '*');
            });
        } else if (event.data.type === 'STORE_CACHED_RESULT') {
            const prompt = event.data.prompt;
            const result = event.data.result;

            chrome.storage.local.get('promptResults', (data) => {
                const promptResults = data.promptResults || {};
                promptResults[prompt] = result;
                chrome.storage.local.set({ promptResults: promptResults });
            });
        } else if (event.data.type === 'SAVE_PROMPT_PAIR') {
            const userPrompt = event.data.userPrompt;
            const assistantPrompt = event.data.assistantPrompt;

            chrome.storage.local.get('prompts', (data) => {
                const prompts = data.prompts || [];
                prompts.push(userPrompt);
                prompts.push(assistantPrompt);
                chrome.storage.local.set({ prompts: prompts }, () => {
                    console.log('Prompt pair saved.');
                });
            });
        }
    });
})();
