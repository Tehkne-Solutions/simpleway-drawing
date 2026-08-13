import Link from "next/link";

type PixelMode = "studio" | "sprite" | "tile";

export function PixelModeNav({ active }: { active: PixelMode }) {
  return <nav className="pixel-mode-nav" aria-label="Modos do Atelier da Síntese">
    <Link className={active === "studio" ? "primary link-button" : "secondary link-button"} href="/create/pixel">01 · Pixel Studio</Link>
    <Link className={active === "sprite" ? "primary link-button" : "secondary link-button"} href="/create/pixel/sprite">02 · Sprite Lab</Link>
    <Link className={active === "tile" ? "primary link-button" : "secondary link-button"} href="/create/pixel/tile">03 · Tile Lab</Link>
    <span className="secondary link-button is-disabled" aria-disabled="true">04 · Animation Lab</span>
  </nav>;
}
