// inject.js
(function() {
    'use strict';

    const isItPoliticalCache = {};
    let session = null;
    let isProcessing = false;
    const processingQueue = [];

    const style = document.createElement('style');
    style.textContent = `
        .processing-animation {
            position: relative;
            overflow: hidden;
        }
        .processing-animation::after {
            content: '';
            position: absolute;
            top: -100%;
            left: 0;
            width: 100%;
            height: 200%;
            background: linear-gradient(transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: processingAnim 1.5s linear infinite;
        }
        @keyframes processingAnim {
            0% { top: -100%; }
            100% { top: 100%; }
        }
        .blurred-content {
            filter: blur(5px);
            transition: filter 0.5s;
            cursor: pointer;
        }
        .buttons-container {
            position: absolute;
            top: 0;
            right: 0;
            background-color: rgba(255, 255, 255, 0.8);
            padding: 2px;
            z-index: 9999;
            display: flex;
            gap: 5px;
        }
        .buttons-container button {
            background-color: #0078D7;
            border: none;
            color: white;
            padding: 5px;
            cursor: pointer;
            font-size: 12px;
            border-radius: 3px;
        }
        .buttons-container button:hover {
            background-color: #005a9e;
        }
    `;
    document.head.appendChild(style);

    const initialPrompts =  [
        { role: "system", content: "Assistants goal is to determine if the users statement is related to politics regardless of the specifics or factuality. The assistant shall respond only with 'political' or 'not political' followed by the reasoning. Please be aware this is only to detect governmental and governmental policy politics exclusively. Only respond in English and as concise as possible, only respond in characters without accents. Please be aware this is only to detect governmental and policy politics, if the topic is not related then respond with not political." },
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
        { role: "assistant", content: "political, Andrej Babis is a political figure and Make Europe Great again might be related to MAGA" },
    ];

    window.postMessage({ type: 'REQUEST_INITIAL_DATA' }, '*');

    window.addEventListener('message', function(event) {
        if (event.source !== window) return;

        if (event.data.type === 'RESPONSE_INITIAL_DATA') {
            const storedPrompts = event.data.prompts || [];
            const ignoredDomains = event.data.ignoredDomains || [];
            const promptResults = event.data.promptResults || {};
            const currentDomain = window.location.hostname;

            Object.assign(isItPoliticalCache, promptResults);
            console.log('Initial data received:', storedPrompts, ignoredDomains, promptResults);

            if (ignoredDomains.includes(currentDomain)) {
                console.log('Current domain is ignored. Skipping processing.');
                return;
            } else {
                const prompts = initialPrompts.concat(storedPrompts);
                initializeSession(prompts);
            }
        }
    });

    async function initializeSession(prompts) {
        try {
            if (session == null || session.tokensLeft < 100) {
                session = await window.ai.languageModel.create({
                    temperature: 0,
                    topK: 3,
                    initialPrompts: prompts
                });
                console.log('AI session initialized.');
            }

            startProcessing();
        } catch (error) {
            console.error('Failed to initialize AI session:', error);
        }
    }

    function startProcessing() {
        collectElementsToProcess();
        processQueue();
        setInterval(() => {
            collectElementsToProcess();
            processQueue();
        }, 5000);
    }

    const regexExclusions = [
        /^submitted\s\d+\shours\sago\s.*?by\s\S+\sto\sr\/\S+/
    ];

    async function isItPolitical(prompt) {
        if (isItPoliticalCache[prompt]) {
            return isItPoliticalCache[prompt];
        }

        console.log('Prompt:', prompt);

        for (let i = 0; i < regexExclusions.length; i++) {
            const regex = new RegExp(regexExclusions[i]);
            if (prompt.match(regex)) {
                isItPoliticalCache[prompt] = 'not political';
                storeCachedResult(prompt, 'not political');
                return 'not political';
            }
        }

        try {
            const cachedResult = await getCachedResult(prompt);
            if (cachedResult) {
                isItPoliticalCache[prompt] = cachedResult;
                return cachedResult;
            }
        } catch (error) {
            console.error('Error getting cached result:', error);
        }

        try {
            if (!window.ai || !window.ai.languageModel) {
                console.error('Chrome AI capabilities are not available.');
                return 'not political';
            }

            if (!session) {
                console.error('AI session is not initialized.');
                return 'not political';
            }

            const result = await session.prompt(prompt);
            isItPoliticalCache[prompt] = result;

            storeCachedResult(prompt, result);

            return result;
        } catch (error) {
            console.error('Error in isItPolitical:', error);
            return 'not political';
        }
    }

    function getCachedResult(prompt) {
        return new Promise((resolve, reject) => {
            const messageId = 'getCachedResult_' + Math.random().toString(36).substr(2, 9);
            function handleMessage(event) {
                if (event.source !== window) return;
                if (event.data.type === 'CACHED_RESULT' && event.data.messageId === messageId) {
                    window.removeEventListener('message', handleMessage);
                    resolve(event.data.result);
                }
            }
            window.addEventListener('message', handleMessage);
            window.postMessage({ type: 'GET_CACHED_RESULT', prompt: prompt, messageId: messageId }, '*');
        });
    }

    function storeCachedResult(prompt, result) {
        window.postMessage({ type: 'STORE_CACHED_RESULT', prompt: prompt, result: result }, '*');
    }

    function collectElementsToProcess() {
        const elements = document.querySelectorAll('span:not([data-processing-status]), a:not([data-processing-status]), p:not([data-processing-status])');
        const highestLevelElements = Array.from(elements).filter((element) => {
            let parent = element.parentElement;
            while (parent) {
                if (parent.matches('span, a, p')) {
                    return false;
                }
                parent = parent.parentElement;
            }
            return true;
        });

        highestLevelElements.forEach(element => {
            const text = element.textContent.trim();
            if (!text || text.split(/\s+/).length <= 3) {
                element.setAttribute('data-processing-status', 'processed');
                return;
            }

            element.setAttribute('data-processing-status', 'toBeProcessed');
            element.style.filter = 'blur(5px)';
            element.style.transition = 'filter 0.5s';
            element.style.cursor = 'wait';
            element.classList.add('processing-animation');

            element._onHoverDuringProcessing = function() {
                element.style.filter = 'none';
            };
            element._offHoverDuringProcessing = function() {
                element.style.filter = 'blur(5px)';
            };
            element.addEventListener('mouseenter', element._onHoverDuringProcessing);
            element.addEventListener('mouseleave', element._offHoverDuringProcessing);

            processingQueue.push(element);
        });
    }

    async function processQueue() {
        if (isProcessing) return;
        isProcessing = true;

        while (processingQueue.length > 0) {
            const element = processingQueue.shift();
            const text = element.textContent.trim();

            if (isItPoliticalCache[text]) {
                const result = isItPoliticalCache[text];
                updateElementBasedOnResult(element, result);
                continue;
            }

            try {
                const result = await isItPolitical(text);
                updateElementBasedOnResult(element, result);
            } catch (error) {
                console.error('Error processing element:', error);
            }
        }

        isProcessing = false;
    }

    function updateElementBasedOnResult(element, result) {
        element.classList.remove('processing-animation');
        element.removeEventListener('mouseenter', element._onHoverDuringProcessing);
        element.removeEventListener('mouseleave', element._offHoverDuringProcessing);

        if (result.startsWith('political')) {
            element.classList.add('blurred-content');
            element.style.cursor = 'pointer';
            element.title = 'Hover to unblur';

            if (element._onHover && element._offHover) {
                element.removeEventListener('mouseenter', element._onHover);
                element.removeEventListener('mouseleave', element._offHover);
            }

            element._onHover = function() {
                element.style.filter = 'none';

                showButtons(element, result);
            };
            element._offHover = function() {
                element.style.filter = 'blur(5px)';

                hideButtons(element);
            };
            element.addEventListener('mouseenter', element._onHover);
            element.addEventListener('mouseleave', element._offHover);
        } else {
            element.style.filter = 'none';
            element.style.cursor = '';
            element.title = '';
            element.classList.remove('blurred-content');

            if (element._onHover && element._offHover) {
                element.removeEventListener('mouseenter', element._onHover);
                element.removeEventListener('mouseleave', element._offHover);
                delete element._onHover;
                delete element._offHover;
            }
        }
        element.setAttribute('data-processing-status', 'processed');
    }

    function showButtons(element, result) {
        if (element._buttonsContainer) return;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        const notPoliticalButton = document.createElement('button');
        notPoliticalButton.textContent = 'Not Political?';
        notPoliticalButton.addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();

            handleNotPolitical(element);
        });

        const whyBlockedButton = document.createElement('button');
        whyBlockedButton.textContent = 'Blocked Reason';
        whyBlockedButton.addEventListener('click', function(event) {
            event.stopPropagation();
            event.preventDefault();

            alert('Blocked because: ' + result);
        });

        buttonsContainer.appendChild(notPoliticalButton);
        buttonsContainer.appendChild(whyBlockedButton);

        element.style.position = 'relative';
        buttonsContainer.style.position = 'absolute';
        buttonsContainer.style.top = '0';
        buttonsContainer.style.right = '0';

        element.appendChild(buttonsContainer);

        element._buttonsContainer = buttonsContainer;
    }

    function hideButtons(element) {
        if (element._buttonsContainer) {
            element.removeChild(element._buttonsContainer);
            element._buttonsContainer = null;
        }
    }

    function handleNotPolitical(element) {
        element.classList.remove('blurred-content');
        element.style.filter = 'none';
        element.style.cursor = '';
        element.title = '';
        hideButtons(element);

        if (element._onHover && element._offHover) {
            element.removeEventListener('mouseenter', element._onHover);
            element.removeEventListener('mouseleave', element._offHover);
            delete element._onHover;
            delete element._offHover;
        }

        const reason = prompt('Provide a reason why this content is not political (optional):');

        if(reason === null){
            return;
        }

        const userPrompt = { role: 'user', content: element.textContent.trim() };
        const assistantContent = 'not political' + (reason ? ', ' + reason : '');
        const assistantPrompt = { role: 'assistant', content: assistantContent };

        window.postMessage({ type: 'SAVE_PROMPT_PAIR', userPrompt: userPrompt, assistantPrompt: assistantPrompt }, '*');

        const promptText = element.textContent.trim();
        isItPoliticalCache[promptText] = assistantContent;
        storeCachedResult(promptText, assistantContent);
    }

})();
