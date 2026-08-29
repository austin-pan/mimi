const cache = new Map();

// Platform-neutral loader: the caller supplies the resolved URL for the word
// bank asset. The PWA passes a URL relative to document.baseURI; the extension
// passes chrome.runtime.getURL(...). This module never touches the DOM or any
// browser-extension API, so it is safe to share across clients.
export async function loadWordBankFrom(url) {
  const key = String(url);
  if (!cache.has(key)) {
    cache.set(key, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load word bank: ${key}`);
      return (await response.text()).split(/\r?\n/).filter(Boolean);
    }));
  }
  return cache.get(key);
}
