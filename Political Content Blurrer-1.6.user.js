// ==UserScript==
// @name         Political Content Blurrer
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Blurs political content on web pages; hover to reveal with fade effect
// @author       Andrew Murgola
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const isItPoliticalCache = {};
    const processingQueue = [];
    let isProcessing = false;

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
    `;
    document.head.appendChild(style);

    async function isItPolitical(prompt) {
        if (isItPoliticalCache[prompt]) {
            return isItPoliticalCache[prompt];
        }
        try {
            const session = await window.ai.languageModel.create({
                initialPrompts: [
                    { role: "system", content: "Assistant's goal is to determine if the user's statement is related to politics regardless of the specifics or factuality. The assistant shall respond only with 'political' or 'not political' followed by the reasoning. If the statement is not factual and related to politics, please respond starting with 'political but not factual'. Only respond in English and as concise as possible, only respond in characters without accents" },
                    { role: "user", content: "Donald Trump is now the president" },
                    { role: "assistant", content: "political, Donald Trump is a political figure" },
                    { role: "user", content: "Grilled cheese is delicious" },
                    { role: "assistant", content: "not political, grilled cheese is a food and the opinion of the food is not related to politics" },
                    { role: "user", content: "Look at my cool hamster" },
                    { role: "assistant", content: "not political, a hamster has nothing to do with politics" },
                    { role: "user", content: "Kamala Harris lost the election" },
                    { role: "assistant", content: "political, both Kamala Harris and the election is a political topic" },
                    { role: "user", content: "Kamala Harris is the president" },
                    { role: "assistant", content: "political but not factual, while Kamala Harris is not the president she is a political figure" },
                    { role: "user", content: "Former Czech PM Andrej Babiš wearing a 'Make Europe Great Again'" },
                    { role: "assistant", content: "political, Andrej Babis is a political figure and Make Europe Great again might be related to MAGA" },
                ]
            });
            const result = await session.prompt(prompt);
            isItPoliticalCache[prompt] = result;
            return result;
        } catch (error) {
            throw error;
        }
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
            element.style.cursor = 'wait';
            element.style.transition = 'filter 0.5s';
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
        // Remove hover event listeners during processing
        element.removeEventListener('mouseenter', element._onHoverDuringProcessing);
        element.removeEventListener('mouseleave', element._offHoverDuringProcessing);
        if (result.startsWith('political')) {
            element.classList.add('blurred-content');
            element.style.cursor = 'pointer';
            element.title = 'Hover to unblur';

            // Define hover event handlers
            element._onHover = function() {
                element.style.filter = 'none';
            };
            element._offHover = function() {
                element.style.filter = 'blur(5px)';
            };
            element.addEventListener('mouseenter', element._onHover);
            element.addEventListener('mouseleave', element._offHover);
        } else {
            element.style.filter = 'none';
            element.style.cursor = '';
            element.title = '';
            element.classList.remove('blurred-content');

            // Remove hover event listeners
            if (element._onHover && element._offHover) {
                element.removeEventListener('mouseenter', element._onHover);
                element.removeEventListener('mouseleave', element._offHover);
                delete element._onHover;
                delete element._offHover;
            }
        }
        element.setAttribute('data-processing-status', 'processed');
    }

    function checkAndBlurPoliticalText() {
        collectElementsToProcess();
        processQueue();
    }

    checkAndBlurPoliticalText();
    setInterval(checkAndBlurPoliticalText, 5000);
})();

// Made by Andrew Murgola at andy@murgo.la
