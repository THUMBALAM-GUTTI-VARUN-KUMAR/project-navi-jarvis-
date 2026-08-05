import { ipcRenderer } from 'electron';

// This script is injected into every website loaded by Navi's WebContentsView.
// It has full access to the DOM but is securely isolated from the Electron Node APIs.

ipcRenderer.on('request-page-content', () => {
  try {
    // Basic heuristics to extract meaningful content while ignoring noise (nav, footer, etc.)
    const title = document.title;
    
    // Try to find the main article container, fallback to body
    let mainContent = document.querySelector('article') 
                   || document.querySelector('main') 
                   || document.body;

    // Clone it so we don't mutate the live DOM
    const clone = mainContent.cloneNode(true) as HTMLElement;

    // Remove noisy elements from the clone
    const selectorsToRemove = ['nav', 'footer', 'header', 'script', 'style', 'noscript', 'iframe', 'svg', '[role="navigation"]', '#sidebar'];
    selectorsToRemove.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Extract raw text content and condense whitespace
    let rawText = clone.innerText || "";
    rawText = rawText.replace(/\n\s*\n/g, '\n\n').trim();

    // Limit text length to prevent blowing up the LLM context window (~15k chars is safe for Gemini Flash)
    if (rawText.length > 15000) {
      rawText = rawText.substring(0, 15000) + "\n\n[Content truncated due to length]";
    }

    const payload = {
      title,
      url: window.location.href,
      content: rawText,
    };

    ipcRenderer.send('response-page-content', payload);
  } catch (error) {
    ipcRenderer.send('response-page-content', { 
      error: error instanceof Error ? error.message : "Failed to extract page content" 
    });
  }
});

// Automation: Scroll the page
ipcRenderer.on('scroll-page', (event, direction: 'up' | 'down' | 'top' | 'bottom') => {
  const scrollAmount = window.innerHeight * 0.8; // Scroll 80% of viewport height
  
  switch (direction) {
    case 'up':
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      break;
    case 'down':
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      break;
    case 'top':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'bottom':
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      break;
  }
  ipcRenderer.send('response-scroll-page', { success: true });
});

// Automation: Click an element by fuzzy matching text
ipcRenderer.on('click-element', (event, searchText: string) => {
  try {
    const textToFind = searchText.toLowerCase();
    
    // Get all clickable elements
    const elements = Array.from(document.querySelectorAll('a, button, [role="button"]')) as HTMLElement[];
    
    // Find the best match
    let targetElement: HTMLElement | null = null;
    
    // 1. Exact match
    targetElement = elements.find(el => el.innerText.trim().toLowerCase() === textToFind) || null;
    
    // 2. Contains match
    if (!targetElement) {
      targetElement = elements.find(el => el.innerText.trim().toLowerCase().includes(textToFind)) || null;
    }
    
    // 3. Aria-label match
    if (!targetElement) {
      targetElement = elements.find(el => (el.getAttribute('aria-label') || '').toLowerCase().includes(textToFind)) || null;
    }

    if (targetElement) {
      // Bring into view and click
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a visual flash effect before clicking
      const originalOutline = targetElement.style.outline;
      targetElement.style.outline = '3px solid #ec4899'; // Pink ring
      
      setTimeout(() => {
        targetElement!.style.outline = originalOutline;
        targetElement!.click();
        ipcRenderer.send('response-click-element', { success: true, message: `Clicked element matching "${searchText}"` });
      }, 500); // Short delay for visual feedback
    } else {
      ipcRenderer.send('response-click-element', { success: false, error: `Could not find clickable element matching "${searchText}"` });
    }
  } catch (error) {
    ipcRenderer.send('response-click-element', { success: false, error: error instanceof Error ? error.message : "Failed to click element" });
  }
});
