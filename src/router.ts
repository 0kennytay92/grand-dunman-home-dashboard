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
    const onChange = () => {
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}

export const href = (path: string) => `#${path}`;
