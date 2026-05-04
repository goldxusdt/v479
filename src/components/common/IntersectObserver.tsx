import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Observer } from 'tailwindcss-intersect';

const IntersectObserver = () => {
  const location = useLocation();

  useEffect(() => {
    // When the location changes, we need to restart the observer
    // to pick up new elements on the page.
    // We use a small timeout to ensure the DOM has updated.
    const timer = setTimeout(() => {
        try {
          Observer.restart();
        } catch (e) {
          console.error("Observer restart failed", e);
        }
    }, 100);

    // Fallback: If observer fails to trigger, show elements after 3 seconds
    const fallbackTimer = setTimeout(() => {
      const hiddenElements = document.querySelectorAll('.opacity-0.intersect-once');
      hiddenElements.forEach(el => {
        el.classList.remove('opacity-0');
        el.classList.add('opacity-100');
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [location]);

  return null;
};

export default IntersectObserver;
