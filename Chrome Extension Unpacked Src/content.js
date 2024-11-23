// content.js
(function() {
    'use strict';

    chrome.runtime.sendMessage({ action: 'injectScript' });

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;

        if (event.data.type === 'REQUEST_INITIAL_DATA') {
            chrome.storage.local.get(['prompts', 'ignoredDomains', 'promptResults'], (data) => {
                const prompts = data.prompts || [];
                const ignoredDomains = data.ignoredDomains || [];
                const promptResults = data.promptResults || {};
                window.postMessage({ type: 'RESPONSE_INITIAL_DATA', prompts: prompts, ignoredDomains: ignoredDomains, promptResults: promptResults }, '*');
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
