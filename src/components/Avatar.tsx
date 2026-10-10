import styles from './Avatar.module.css';

const COLORS = ['#e17076', '#faa774', '#a695e7', '#7bc862', '#6ec9cb', '#65aadd', '#ee7aae'];

/** Круглый аватар с первой буквой названия; цвет зависит от названия, как в Telegram. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.codePointAt(0)!, 0);
  const letter = name.replace(/^[+@]/, '').charAt(0).toUpperCase() || '?';
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, background: COLORS[hash % COLORS.length], fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
