// popup.js

document.getElementById('addPromptTab').addEventListener('click', () => {
    openTab('addPrompt');
});

document.getElementById('viewPromptsTab').addEventListener('click', () => {
    openTab('viewPrompts');
    loadPrompts();
});

document.getElementById('ignoredDomainsTab').addEventListener('click', () => {
    openTab('ignoredDomains');
    loadDomains();
});

function openTab(tabName) {
    const tabcontents = document.getElementsByClassName('tabcontent');
    const tablinks = document.getElementsByClassName('tablinks');

    for (let i = 0; i < tabcontents.length; i++) {
        tabcontents[i].classList.remove('active');
    }

    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove('active');
    }

    document.getElementById(tabName + 'Content').classList.add('active');
    document.getElementById(tabName + 'Tab').classList.add('active');
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
    chrome.storage.local.get({ prompts: [] }, (data) => {
        const prompts = data.prompts;
        const promptList = document.getElementById('promptList');
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

            li.querySelector('button').addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removePromptPair(index);
            });

            promptList.appendChild(li);
        }

        if (prompts.length === 0) {
            promptList.innerHTML = '<p>No prompts added yet.</p>';
        }
    });
}

function removePromptPair(index) {
    chrome.storage.local.get({ prompts: [] }, (data) => {
        const prompts = data.prompts;
        prompts.splice(index, 2);
        chrome.storage.local.set({ prompts }, () => {
            loadPrompts();
        });
    });
}

if (document.getElementById('viewPromptsContent').classList.contains('active')) {
    loadPrompts();
}

document.getElementById('ignoreDomainButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;

        chrome.storage.local.get({ ignoredDomains: [] }, (data) => {
            let ignoredDomains = data.ignoredDomains;
            if (!ignoredDomains.includes(domain)) {
                ignoredDomains.push(domain);
                chrome.storage.local.set({ ignoredDomains: ignoredDomains }, () => {
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

        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];

            const li = document.createElement('li');
            li.className = 'domain-item';

            li.innerHTML = `
                ${domain}
                <button data-index="${i}">Remove</button>
            `;

            li.querySelector('button').addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removeDomain(index);
            });

            domainList.appendChild(li);
        }

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

if (document.getElementById('ignoredDomainsContent').classList.contains('active')) {
    loadDomains();
}
