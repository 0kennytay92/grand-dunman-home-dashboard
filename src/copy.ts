/**
 * Copies text to the clipboard. Falls back to the older method on phones
 * viewing the app over the local network, where the modern clipboard is unavailable.
 */
export async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the older method
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  const ok = document.execCommand('copy');
  area.remove();
  return ok;
}
