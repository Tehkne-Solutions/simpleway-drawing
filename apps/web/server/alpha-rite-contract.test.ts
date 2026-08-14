import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("Alpha is an integration rite instead of a checklist document", () => {
  const page = source("app/alpha/page.tsx");
  const css = source("app/alpha/alpha-v18.css");
  assert.match(page, /Rito de Integração Alpha/);
  assert.match(page, /PROVA I · RAIZ/);
  assert.match(page, /PROVA II · ESPELHO/);
  assert.match(page, /PROVA III · OBRA/);
  assert.match(page, /alpha-rite-center/);
  assert.doesNotMatch(page, /alpha-requirements/);
  assert.doesNotMatch(page, /alpha-capstone-brief/);
  assert.doesNotMatch(page, /<ol>/);
  assert.match(css, /alpha-rite-board/);
  assert.match(css, /alpha-runes/);
});

test("Alpha trials use canonical Atelier presets and return to the rite", () => {
  const alpha = source("app/alpha/page.tsx");
  const create = source("app/create/page.tsx");
  const form = source("app/create/artwork-form.tsx");
  assert.match(alpha, /\/create\?mode=revisit#registro-externo/);
  assert.match(alpha, /\/create\?mode=capstone#registro-externo/);
  assert.match(create, /lockPreset=\{alphaMode\}/);
  assert.match(create, /alphaMode \? \{ returnTo: "\/alpha" \} : \{\}/);
  assert.match(form, /disabled=\{lockPreset\}/);
  assert.match(form, /readOnly=\{lockPreset\}/);
  assert.match(form, /router\.push\(returnTo \?\?/);
});

test("sealing Alpha opens Player Continuity and Alpha runs as a game workspace", () => {
  const client = source("app/alpha/alpha-client.tsx");
  const shell = source("app/app-shell.tsx");
  assert.match(client, /router\.push\("\/resume"\)/);
  assert.match(client, /Selar Alpha e abrir a próxima região/);
  assert.match(shell, /alphaWorkspace = pathname === "\/alpha"/);
  assert.match(shell, /\|\| alphaWorkspace/);
});
