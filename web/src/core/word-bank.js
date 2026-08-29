const cache = new Map();

export async function loadWordBank(version = "v2") {
  if (!cache.has(version)) {
    const url = new URL(`word-bank-${version}.txt`, document.baseURI);
    cache.set(version, fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
      return (await response.text()).split(/\r?\n/).filter(Boolean);
    }));
  }
  return cache.get(version);
}
