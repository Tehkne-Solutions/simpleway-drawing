import Link from "next/link";

type PixelMode = "quest" | "studio" | "sprite" | "tile" | "animation";

export function PixelModeNav({ active }: { active: PixelMode }) {
  return <nav className="pixel-mode-nav" aria-label="Modos do Atelier da Síntese">
    <Link className={active === "quest" ? "primary link-button" : "secondary link-button"} href="/create/pixel/quest">00 · Expedição</Link>
    <Link className={active === "studio" ? "primary link-button" : "secondary link-button"} href="/create/pixel">01 · Pixel Studio</Link>
    <Link className={active === "sprite" ? "primary link-button" : "secondary link-button"} href="/create/pixel/sprite">02 · Sprite Lab</Link>
    <Link className={active === "tile" ? "primary link-button" : "secondary link-button"} href="/create/pixel/tile">03 · Tile Lab</Link>
    <Link className={active === "animation" ? "primary link-button" : "secondary link-button"} href="/create/pixel/animation">04 · Animation Lab</Link>
  </nav>;
}
