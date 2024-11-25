// popup.js

const tabs = [
    { id: 'addPrompt', loadFunction: null },
    { id: 'viewPrompts', loadFunction: loadPrompts },
    { id: 'ignoredDomains', loadFunction: loadDomains },
    { id: 'about', loadFunction: null }
];

tabs.forEach(tab => {
    document.getElementById(`${tab.id}Tab`).addEventListener('click', () => {
        openTab(tab.id);
        if (tab.loadFunction) tab.loadFunction();
    });
});

document.getElementById('resetSystemPrompts').addEventListener('click', () => {
    chrome.storage.local.remove('systemPrompts', () => {
        alert('System prompts have been reset. Refresh page to reload.');
    });
});

function openTab(tabName) {
    const tabcontents = document.getElementsByClassName('tabcontent');
    const tablinks = document.getElementsByClassName('tablinks');

    Array.from(tabcontents).forEach(content => content.classList.remove('active'));
    Array.from(tablinks).forEach(link => link.classList.remove('active'));

    document.getElementById(`${tabName}Content`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

document.getElementById('savePrompt').addEventListener('click', () => {
    const example = document.getElementById('example').value.trim();
    const isPolitical = document.getElementById('isPolitical').value;
    const reason = document.getElementById('reason').value.trim();

    if (!example) {
        alert('Please provide an example.');
        return;
    }

    const assistantContent = isPolitical + (reason ? ', ' + reason : '');
    const userPrompt = { role: 'user', content: example };
    const assistantPrompt = { role: 'assistant', content: assistantContent };

    chrome.storage.local.get({ prompts: [] }, (data) => {
        const prompts = [...data.prompts, userPrompt, assistantPrompt];
        chrome.storage.local.set({ prompts }, () => {
            document.getElementById('status').innerText = 'Prompt saved!';
            setTimeout(() => {
                document.getElementById('status').innerText = '';
            }, 2000);

            document.getElementById('example').value = '';
            document.getElementById('reason').value = '';
        });
    });
});

function loadPrompts() {
    loadPromptList('prompts', 'promptList', 'No prompts added yet.');
    loadPromptList('systemPrompts', 'systemPromptList', 'No system prompts added yet.');
}

function loadPromptList(storageKey, listElementId, emptyMessage) {
    chrome.storage.local.get({ [storageKey]: [] }, (data) => {
        const prompts = data[storageKey];
        const promptList = document.getElementById(listElementId);
        promptList.innerHTML = '';

        for (let i = 0; i < prompts.length; i += 2) {
            const userPrompt = prompts[i];
            const assistantPrompt = prompts[i + 1];

            const li = document.createElement('li');
            li.className = 'prompt-item';

            li.innerHTML = `
                <strong>Prompt:</strong> ${userPrompt.content}<br>
                <strong>Response:</strong> ${assistantPrompt.content}
                <button data-index="${i}">Remove</button>
            `;

            li.querySelector('button').addEventListener('click', function () {
                const index = parseInt(this.getAttribute('data-index'));
                removePromptPair(storageKey, index, () => loadPromptList(storageKey, listElementId, emptyMessage));
            });

            promptList.appendChild(li);
        }

        if (prompts.length === 0) {
            promptList.innerHTML = `<p>${emptyMessage}</p>`;
        }
    });
}

function removePromptPair(storageKey, index, reloadFunction) {
    chrome.storage.local.get({ [storageKey]: [] }, (data) => {
        const prompts = data[storageKey];
        prompts.splice(index, 2);
        chrome.storage.local.set({ [storageKey]: prompts }, () => {
            reloadFunction();
        });
    });
}

document.getElementById('ignoreDomainButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;

        chrome.storage.local.get({ ignoredDomains: [] }, (data) => {
            let ignoredDomains = data.ignoredDomains;
            if (!ignoredDomains.includes(domain)) {
                ignoredDomains.push(domain);
                chrome.storage.local.set({ ignoredDomains }, () => {
                    alert(`Domain ${domain} has been added to the ignored list.`);
                });
            } else {
                alert(`Domain ${domain} is already in the ignored list.`);
            }
        });
    });
});

function loadDomains() {
    chrome.storage.local.get({ ignoredDomains: [] }, (data) => {
        const domains = data.ignoredDomains;
        const domainList = document.getElementById('domainList');
        domainList.innerHTML = '';

        domains.forEach((domain, i) => {
            const li = document.createElement('li');
            li.className = 'domain-item';

            li.innerHTML = `
                ${domain}
                <button data-index="${i}">Remove</button>
            `;

            li.querySelector('button').addEventListener('click', function () {
                const index = parseInt(this.getAttribute('data-index'));
                removeDomain(index);
            });

            domainList.appendChild(li);
        });

        if (domains.length === 0) {
            domainList.innerHTML = '<p>No domains are ignored.</p>';
        }
    });
}

function removeDomain(index) {
    chrome.storage.local.get({ ignoredDomains: [] }, (data) => {
        const domains = data.ignoredDomains;
        domains.splice(index, 1);
        chrome.storage.local.set({ ignoredDomains: domains }, () => {
            loadDomains();
        });
    });
}

const contentLoaders = [
    { contentId: 'viewPromptsContent', loadFunction: loadPrompts },
    { contentId: 'ignoredDomainsContent', loadFunction: loadDomains }
];

contentLoaders.forEach(item => {
    if (document.getElementById(item.contentId).classList.contains('active')) {
        item.loadFunction();
    }
});
