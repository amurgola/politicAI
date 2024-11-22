chrome.runtime.onInstalled.addListener(() => {
    console.log("Installed Chrome extension.");
    chrome.storage.local.set({ additionalPrompts: [] });

    console.log("Extension installed and prompts initialized.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectScript') {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: ['inject.js'],
            world: 'MAIN'
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Script injection failed: ', chrome.runtime.lastError);
            }
        });
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.storage.local.get('prompts', (data) => {
        console.log('Current stored prompts:', data.prompts || []);
    });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.prompts) {
        console.log('Prompts updated:', changes.prompts.newValue);
    }
});

console.log("Background script loaded successfully.");