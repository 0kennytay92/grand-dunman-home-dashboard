import { useEffect, useState } from 'react';

// Simple page navigation using the part of the web address after "#",
// e.g. "#/rooms/living". No extra library needed, and the browser's
// back button works as expected.

function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    let previous = currentPath();
    const onChange = () => {
      const next = currentPath();
      // Switching tabs inside the same room (or budget item) keeps your place on the page.
      const sameRoom = (p: string) => p.match(/^\/(rooms|budget\/items)\/[\w-]+/)?.[0];
      if (!sameRoom(next) || sameRoom(next) !== sameRoom(previous)) window.scrollTo(0, 0);
      previous = next;
      setPath(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}

export const href = (path: string) => `#${path}`;
