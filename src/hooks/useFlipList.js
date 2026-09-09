import { useLayoutEffect, useRef } from 'react';

const DURATION_MS = 600;
// A "back out" curve that overshoots slightly past the resting position
// before settling - reads as a snappy pop rather than a flat slide.
const EASING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// FLIP-style reorder animation for a vertical list: when items keyed by id
// change order between renders, this makes them visibly slide from their
// old position to their new one instead of silently jumping. Only handles
// reordering of items that stay in the list across renders - items
// entering/leaving just appear/disappear normally, which is fine here
// since this is meant for "the same 5 players swapping rank," not a
// general-purpose list transition.
export function useFlipList(orderKey) {
  const nodesRef = useRef(new Map()); // id -> element
  const positionsRef = useRef(new Map()); // id -> last measured top (px)
  const callbacksRef = useRef(new Map()); // id -> stable ref callback

  const getRegisterNode = (id) => {
    if (!callbacksRef.current.has(id)) {
      callbacksRef.current.set(id, (el) => {
        if (el) nodesRef.current.set(id, el);
        else nodesRef.current.delete(id);
      });
    }
    return callbacksRef.current.get(id);
  };

  useLayoutEffect(() => {
    const nodes = nodesRef.current;
    const prevPositions = positionsRef.current;
    const newPositions = new Map();

    nodes.forEach((el, id) => {
      const top = el.getBoundingClientRect().top;
      newPositions.set(id, top);

      const prevTop = prevPositions.get(id);
      if (prevTop != null && prevTop !== top) {
        const delta = prevTop - top;
        el.style.transition = 'none';
        // A slight starting scale-up on top of the position offset gives
        // the settle a bit of "pop" instead of just a flat slide.
        el.style.transform = `translateY(${delta}px) scale(1.06)`;
        // Force a reflow so the browser registers the starting transform
        // before the transition below is applied - otherwise it'd just
        // jump straight to the final position with no animation.
        // eslint-disable-next-line no-unused-expressions
        el.getBoundingClientRect();
        requestAnimationFrame(() => {
          el.style.transition = `transform ${DURATION_MS}ms ${EASING}`;
          el.style.transform = '';
        });
      }
    });

    positionsRef.current = newPositions;
  }, [orderKey]);

  return getRegisterNode;
}
