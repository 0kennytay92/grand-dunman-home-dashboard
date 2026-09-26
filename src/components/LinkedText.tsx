/** Text with web addresses turned into tappable links (they open in a new tab). */
export function LinkedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} className="link inline-link" href={part} target="_blank" rel="noopener noreferrer">
            {part.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '')}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}
