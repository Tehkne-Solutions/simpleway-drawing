import Link from "next/link";
import styles from "./pixel-mode-nav.module.css";

type PixelMode = "studio" | "sprite";

export function PixelModeNav({ active }: { active: PixelMode }) {
  return (
    <nav className={styles.nav} aria-label="Modos do Atelier da Síntese">
      <Link className={active === "studio" ? styles.active : undefined} href="/create/pixel">
        <span>01</span> Pixel Studio
      </Link>
      <Link className={active === "sprite" ? styles.active : undefined} href="/create/pixel/sprite">
        <span>02</span> Sprite Lab
      </Link>
      <span className={styles.locked} aria-disabled="true"><span>03</span> Tile Lab</span>
      <span className={styles.locked} aria-disabled="true"><span>04</span> Animation Lab</span>
    </nav>
  );
}
