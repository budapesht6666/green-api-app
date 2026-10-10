import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** Насколько близко к низу (px) пользователь считается «читающим последнее». */
const NEAR_BOTTOM_PX = 80;

interface Options {
  /** Идентификатор открытого чата: при смене всегда прыгаем вниз. */
  chatKey: string | null;
  messageCount: number;
  /** Последнее сообщение — своё: после отправки всегда показываем его. */
  lastIsOutgoing: boolean;
}

/**
 * Поведение прокрутки как в мессенджерах:
 * – при открытии чата — сразу вниз, без анимации;
 * – новое сообщение прокручивает вниз только если пользователь у низа или написал сам;
 * – если он читает историю выше, позицию не трогаем и показываем счётчик новых;
 * – смена высоты контейнера (экранная клавиатура, рост поля ввода) не сбивает «приклеенность» к низу.
 */
export function useStickToBottom(
  ref: RefObject<HTMLDivElement | null>,
  { chatKey, messageCount, lastIsOutgoing }: Options,
) {
  const stuck = useRef(true);
  const previous = useRef({ chatKey, messageCount });
  const [unseen, setUnseen] = useState(0);

  const scrollToBottom = useCallback(
    (smooth = false) => {
      const el = ref.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    },
    [ref],
  );

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { chatKey, messageCount };

    if (before.chatKey !== chatKey) {
      stuck.current = true;
      setUnseen(0);
      scrollToBottom();
    } else if (messageCount > before.messageCount) {
      if (stuck.current || lastIsOutgoing) {
        stuck.current = true;
        setUnseen(0);
        scrollToBottom();
      } else {
        setUnseen((n) => n + messageCount - before.messageCount);
      }
    }
  }, [chatKey, messageCount, lastIsOutgoing, scrollToBottom]);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (stuck.current) scrollToBottom();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, chatKey, scrollToBottom]);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (stuck.current) setUnseen(0);
  }, [ref]);

  return { onScroll, unseen, jumpToBottom: () => scrollToBottom(true) };
}
