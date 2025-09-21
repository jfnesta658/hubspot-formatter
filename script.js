class HubSpotFormatter {
    constructor() {
        this.input = document.getElementById('input');
        this.output = document.getElementById('output');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.cleanedHTML = '';

        this.init();
    }

    init() {
        this.input.addEventListener('input', () => this.processContent());
        this.input.addEventListener('paste', () => {
            setTimeout(() => this.processContent(), 10);
        });
        this.input.addEventListener('focus', () => this.selectAllContent());
        this.output.addEventListener('click', () => this.copyToClipboard());

        // Add click handlers for action icons
        this.clearBtn.addEventListener('click', () => this.clearInput());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    processContent() {
        const content = this.input.innerHTML.trim();

        if (!content) {
            this.output.innerHTML = '<div class="placeholder">Cleaned content will appear here...</div>';
            this.cleanedHTML = '';
            this.updateIconVisibility();
            return;
        }

        this.cleanedHTML = this.cleanHTML(content);
        this.output.innerHTML = this.cleanedHTML;
        this.updateIconVisibility();
    }

    updateIconVisibility() {
        // Show clear icon if input has content
        const hasInputContent = this.input.innerHTML.trim() && this.input.textContent.trim();
        this.clearBtn.style.display = hasInputContent ? 'flex' : 'none';

        // Show copy icon if output has content
        const hasOutputContent = this.cleanedHTML.trim();
        this.copyBtn.style.display = hasOutputContent ? 'flex' : 'none';
    }

    clearInput() {
        this.input.innerHTML = '';
        this.processContent(); // This will also update icon visibility
    }

    cleanHTML(html) {
        // Create temporary DOM element for parsing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Step 1: Remove Google Docs wrapper elements
        this.removeGoogleDocsWrappers(tempDiv);

        // Step 2: Convert inline styles to proper HTML elements (bold, italic) BEFORE removing spans
        this.convertInlineStylesToElements(tempDiv);

        // Step 3: Clean up paragraph structure and remove unwanted elements
        this.cleanParagraphStructure(tempDiv);

        // Step 4: Remove all remaining inline styles (except the ones we'll add for emoji indentation)
        this.cleanStyles(tempDiv);

        // Step 5: Remove spans but preserve their content (after formatting conversion)
        this.removeSpans(tempDiv);

        // Step 5.5: Remove empty paragraphs again (after span removal might create new empty ones)
        this.removeEmptyParagraphs(tempDiv);

        // Step 6: Normalize emoji spacing and add indentation (AFTER cleaning styles)
        this.normalizeEmojiSpacing(tempDiv);

        // Step 7: Convert emoji lists to HTML lists (BEFORE adding paragraph spacing)
        this.convertEmojiListsToHTML(tempDiv);

        // Step 8: Add proper paragraph spacing
        this.addParagraphSpacing(tempDiv);

        // Step 9: Convert straight quotes to curly quotes
        this.convertToCurlyQuotes(tempDiv);

        // Step 10: Clean up any leftover artifacts
        this.cleanupArtifacts(tempDiv);

        return tempDiv.innerHTML;
    }

    removeGoogleDocsWrappers(element) {
        // Remove the main Google Docs wrapper span
        const docsWrappers = element.querySelectorAll('span[id^="docs-internal-guid"]');
        docsWrappers.forEach(wrapper => {
            while (wrapper.firstChild) {
                wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.remove();
        });
    }

    convertInlineStylesToElements(element) {
        // Process all elements with style attributes (not just spans)
        const styledElements = element.querySelectorAll('*[style]');

        styledElements.forEach(el => {
            const style = el.getAttribute('style');
            const isBold = /font-weight\s*:\s*(700|bold)/i.test(style);
            const isItalic = /font-style\s*:\s*italic/i.test(style);

            if (isBold && isItalic) {
                // Both bold and italic - wrap content in strong > em
                const strong = document.createElement('strong');
                const em = document.createElement('em');

                // Move all content to em, then em to strong
                while (el.firstChild) {
                    em.appendChild(el.firstChild);
                }
                strong.appendChild(em);

                // Replace original element with strong
                el.parentNode.replaceChild(strong, el);

            } else if (isBold) {
                // Just bold - wrap in strong
                const strong = document.createElement('strong');
                while (el.firstChild) {
                    strong.appendChild(el.firstChild);
                }
                el.parentNode.replaceChild(strong, el);

            } else if (isItalic) {
                // Just italic - wrap in em
                const em = document.createElement('em');
                while (el.firstChild) {
                    em.appendChild(el.firstChild);
                }
                el.parentNode.replaceChild(em, el);
            }
        });

    }

    removeSpans(element) {
        // Remove span elements but preserve their content (including any strong/em inside)
        const spans = element.querySelectorAll('span');
        spans.forEach(span => {
            // Move all child nodes (including strong, em elements) before the span
            while (span.firstChild) {
                span.parentNode.insertBefore(span.firstChild, span);
            }
            span.remove();
        });

    }

    cleanParagraphStructure(element) {
        // Remove ALL standalone <br> tags - they represent spacing that we'll handle with <p>&nbsp;</p>
        const brs = element.querySelectorAll('br');
        brs.forEach(br => {
            br.remove();
        });

        // Remove empty divs
        const divs = element.querySelectorAll('div');
        divs.forEach(div => {
            if (!div.textContent.trim() || div.innerHTML === '<br>') {
                div.remove();
            } else {
                // Convert divs to paragraphs
                const p = document.createElement('p');
                while (div.firstChild) {
                    p.appendChild(div.firstChild);
                }
                div.parentNode.replaceChild(p, div);
            }
        });

        // Remove Google Docs paragraph attributes
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.removeAttribute('dir');
            p.removeAttribute('style');
        });

        // Remove paragraphs that are empty after cleaning (like Google Docs GUID paragraphs)
        this.removeEmptyParagraphs(element);
    }

    removeEmptyParagraphs(element) {
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            const textContent = p.textContent.trim();
            // Remove paragraphs that are completely empty or only contain whitespace/non-breaking spaces
            if (!textContent || textContent === '\u00A0' || /^\s*$/.test(textContent)) {
                // But don't remove paragraphs that are intentionally used for spacing
                if (p.innerHTML !== '&nbsp;') {
                    p.remove();
                }
            }
        });
    }

    cleanStyles(element) {
        // Remove style attributes from all elements
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            el.removeAttribute('style');
        });

        // Specifically clean anchor tags of any remaining styling attributes
        const anchors = element.querySelectorAll('a');
        anchors.forEach(anchor => {
            // Remove common styling attributes that might be on links
            anchor.removeAttribute('style');
            anchor.removeAttribute('color');
            anchor.removeAttribute('text-decoration');
            anchor.removeAttribute('text-decoration-line');
            anchor.removeAttribute('text-decoration-skip-ink');
        });
    }

    normalizeEmojiSpacing(element) {
        const paragraphs = Array.from(element.querySelectorAll('p'));

        paragraphs.forEach((p, index) => {
            const textContent = p.textContent.trim();

            // Check if paragraph starts with an emoji (Unicode emoji range)
            // This regex matches most common emoji without needing a hardcoded list
            const emojiAtStart = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

            if (emojiAtStart.test(textContent)) {
                // Normalize spacing: ensure exactly one regular space after emoji
                // This handles regular spaces, &nbsp;, multiple spaces, etc.
                p.innerHTML = p.innerHTML.replace(/^([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}])(\s|&nbsp;|&#160;)*/u, '$1 ');

                // Check for 3+ consecutive emoji paragraphs for indentation
                let consecutiveCount = 1;

                // Count backwards
                for (let i = index - 1; i >= 0; i--) {
                    const prevP = paragraphs[i];
                    if (prevP.tagName === 'P' && emojiAtStart.test(prevP.textContent.trim())) {
                        consecutiveCount++;
                    } else if (prevP.innerHTML === '&nbsp;') {
                        // Skip spacing paragraphs
                        continue;
                    } else {
                        break;
                    }
                }

                // Count forwards
                for (let i = index + 1; i < paragraphs.length; i++) {
                    const nextP = paragraphs[i];
                    if (nextP.tagName === 'P' && emojiAtStart.test(nextP.textContent.trim())) {
                        consecutiveCount++;
                    } else if (nextP.innerHTML === '&nbsp;') {
                        // Skip spacing paragraphs
                        continue;
                    } else {
                        break;
                    }
                }

                // Mark paragraphs that should be part of emoji lists for later conversion
                if (consecutiveCount >= 3) {
                    p.classList.add('emoji-list-item');
                }
            }
        });
    }

    convertEmojiListsToHTML(element) {
        const emojiListParagraphs = element.querySelectorAll('p.emoji-list-item');

        if (emojiListParagraphs.length === 0) return;

        // HubSpot strips all styling, so use em space characters for indentation
        emojiListParagraphs.forEach(p => {
            // Try using em space (wider) for cleaner indentation
            const emSpace = '&#8195;'; // Em space character
            const indentString = emSpace + emSpace + emSpace; // 3 em spaces ≈ 40px

            if (!p.innerHTML.startsWith(emSpace)) {
                p.innerHTML = indentString + p.innerHTML;
            }

            // Remove the temporary class - don't need it in final HTML
            p.classList.remove('emoji-list-item');
        });
    }

    addParagraphSpacing(element) {
        const paragraphs = Array.from(element.querySelectorAll('p'));

        // Insert spacing paragraphs after each paragraph (except the last)
        paragraphs.forEach((p, index) => {
            if (index < paragraphs.length - 1) {
                const nextElement = p.nextElementSibling;

                // Check if there's already spacing between paragraphs
                const hasExistingSpacing = nextElement &&
                    nextElement.tagName === 'P' &&
                    (nextElement.innerHTML === '&nbsp;' ||
                     nextElement.textContent.trim() === '' ||
                     nextElement.innerHTML.trim() === '');

                // Also check if current or next paragraph has CSS margins that create spacing
                const currentHasMargins = p.style.marginTop || p.style.marginBottom ||
                                         (p.getAttribute('style') &&
                                          (p.getAttribute('style').includes('margin-top') ||
                                           p.getAttribute('style').includes('margin-bottom')));

                const nextHasMargins = nextElement &&
                                      (nextElement.style.marginTop || nextElement.style.marginBottom ||
                                       (nextElement.getAttribute('style') &&
                                        (nextElement.getAttribute('style').includes('margin-top') ||
                                         nextElement.getAttribute('style').includes('margin-bottom'))));

                const hasVisualSpacing = currentHasMargins || nextHasMargins;

                // Only add spacing if there's no existing spacing (explicit or visual)
                if (!hasExistingSpacing && !hasVisualSpacing) {
                    const spacingP = document.createElement('p');
                    spacingP.innerHTML = '&nbsp;';
                    p.parentNode.insertBefore(spacingP, p.nextSibling);
                }
            }
        });
    }

    convertToCurlyQuotes(element) {
        // Get all text nodes in the element
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            let text = textNode.textContent;

            // Convert straight quotes to curly quotes using a single comprehensive regex
            // Handle double quotes first
            text = text.replace(/"/g, (_, offset, string) => {
                const before = offset > 0 ? string[offset - 1] : '';
                const after = offset < string.length - 1 ? string[offset + 1] : '';

                // Opening quote: after whitespace, start of string, or opening brackets
                if (/^[\s\(\[\{]$/.test(before) || offset === 0) {
                    return '\u201C'; // "
                }
                // Closing quote: before whitespace, punctuation, end of string, or closing brackets
                else if (/[\s\.,;:!?\)\]\}]$/.test(after) || offset === string.length - 1) {
                    return '\u201D'; // "
                }
                // Default to closing quote
                return '\u201D';
            });

            // Handle single quotes/apostrophes
            text = text.replace(/'/g, (_, offset, string) => {
                const before = offset > 0 ? string[offset - 1] : '';
                const after = offset < string.length - 1 ? string[offset + 1] : '';

                // Apostrophe in contractions (between letters)
                if (/[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after)) {
                    return '\u2019'; // '
                }
                // Opening quote: after whitespace, start of string, or opening brackets
                else if (/^[\s\(\[\{]$/.test(before) || offset === 0) {
                    return '\u2018'; // '
                }
                // Closing quote or possessive: before whitespace, punctuation, end, or after letters
                else {
                    return '\u2019'; // '
                }
            });

            textNode.textContent = text;
        });
    }

    cleanupArtifacts(element) {
        // Clean up any remaining temporary classes or attributes
        const paragraphs = element.querySelectorAll('p');
        paragraphs.forEach(p => {
            // Remove ALL unwanted attributes from paragraphs
            const attributesToRemove = [
                'data-emoji-list',
                'data-margin-left',
                'data-hsprotectmargin-left',
                'data-hsprotectmarginleft',
                'data-hsprotectleftmargin',
                'data-hsprotectindent',
                'class'
            ];

            attributesToRemove.forEach(attr => {
                p.removeAttribute(attr);
            });

            // If paragraph is just spacing, ensure it's completely clean
            if (p.innerHTML === '&nbsp;') {
                // Remove ALL attributes from spacing paragraphs
                Array.from(p.attributes).forEach(attr => {
                    p.removeAttribute(attr.name);
                });
            }
        });
    }

    async copyToClipboard() {
        if (!this.cleanedHTML) return;

        try {
            // Copy as rich text (HTML) and plain text fallback
            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': this.cleanedHTML,
                    'text/plain': this.output.textContent
                })
            ]);
            this.showCopied();
        } catch (err) {
            console.error('Rich text copy failed, trying text fallback:', err);
            // Fallback to plain text if rich text copy fails
            try {
                await navigator.clipboard.writeText(this.output.textContent);
                this.showCopied();
            } catch (fallbackErr) {
                console.error('All copy methods failed:', fallbackErr);
            }
        }
    }

    selectAllContent() {
        if (this.input.innerHTML.trim()) {
            const range = document.createRange();
            range.selectNodeContents(this.input);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    showCopied() {
        this.output.classList.add('copied');

        setTimeout(() => {
            this.output.classList.remove('copied');
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HubSpotFormatter();
});