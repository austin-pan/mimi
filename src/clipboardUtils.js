/**
 *
 * @param {string} text
 */
async function copyContent(text) {
  try {
     await navigator.clipboard.writeText(text);
     console.log('Content copied to clipboard');
  } catch (err) {
     console.error('Failed to copy: ', err);
  }
}

export { copyContent };