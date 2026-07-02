# Spec: Výběr „PRAUT role" při pozvánce → automatické přiřazení prostorů

**Stav:** návrh (blueprint). Kód se napíše + otestuje s build pipeline na novém serveru
(viz `docs/CUSTOM-BUILD.md`). Bez build loopu to nejde otestovat — proto nejdřív spec.

## Cíl
Při zvaní uživatele do workspace `praut` vybrat v pozvánce **PRAUT roli**
(obchodník / vývojář / markeťák / vedení / zaměstnanec). Po přijetí pozvánky se uživatel
**automaticky přidá do správných prostorů** (`space.members`) podle té role — tj. hned vidí jen to,
co má. Nahrazuje ruční běh `tools/huly-admin/praut-onboard-user.cjs`.

## Mapa kódu (fork `HulyPrautplatform`, v0.7.423)
- **Invite UI:** `plugins/setting-resources/src/components/InviteSetting.svelte`,
  `plugins/login-resources/src/components/InviteLink.svelte`.
- **Invite model + vytvoření (account služba):** `server/account/src/operations.ts` →
  `createInvite` (ř. 635), `createInviteLink` (837), `sendInvite` (696). Invite doc dnes:
  `{ workspaceUuid, expiresOn, email, emailPattern, remainingUses, role, autoJoin }`.
- **Přijetí pozvánky:** `join` (1001) / `joinByToken` (1128) → centrální
  **`doJoinByInvite`** (`server/account/src/utils.ts:1487`).
- **DŮLEŽITÉ:** `doJoinByInvite` pracuje JEN s účtovou DB (`db.assignWorkspace` = členství ve
  workspace), **NEsahá do prostorů** uvnitř workspace. Prostory (`space.members`) žijí v transactoru.
  Account služba se do transactoru nepřipojuje (jen `generateToken`).
- **Workspace-side triggery:** `server-plugins/*` (vzor `contact`, `hr`, `card`).

## Architektonické rozhodnutí (klíčový bod)
`prautRole` se volí **account-side** (pozvánka), ale přiřazení prostorů je **workspace-side**. Možnosti:
- **(A) `doJoinByInvite` → transactor:** po `assignWorkspace`, je-li `invite.prautRole`, připojit se
  systémovým tokenem (`@hcengineering/server-client`, jako admin skripty) a přidat osobu do prostorů.
  Nejmenší a nejlokálnější zásah (jedno místo), znovupoužije ověřenou logiku role→prostory. Přidává
  account→transactor závislost.
- **(B) server-plugin trigger ve workspace:** čistě workspace-side, ale je nutné `prautRole` dostat
  z pozvánky do workspace (plumbing) — víc kódu.

**Doporučeno: (A).** Logika role→prostory je identická s `praut-onboard-user.cjs` → sdílet.

## Změny (minimální, kvůli slučování s upstream — značit `// PRAUT:`)
1. **Invite model:** přidat `prautRole?: string` do typu `WorkspaceInvite` + do `db.invite.insertOne`
   v `createInvite` a `createInviteLink`.
2. **Params:** `createInvite` / `createInviteLink` / `sendInvite` přijmou `prautRole`.
3. **`doJoinByInvite`** (`utils.ts`): po `assignWorkspace`, je-li `invite.prautRole`, přes
   `server-client` + systémový token přidat osobu do `ROLE_SPACES[prautRole]`.
4. **UI:** do `InviteSetting.svelte` přidat `DropdownLabels` „PRAUT role" a poslat `prautRole`
   do `createInviteLink` / `sendInvite`.

## Role → prostory (sdíleno s `praut-onboard-user.cjs`)
| Role | Prostory |
|---|---|
| obchodnik | Obchod · Obchodní dokumenty · Lead funnel · (SHARED) |
| vyvojar | PULS · (SHARED) |
| marketak | Marketing · (SHARED) |
| vedeni | Vedení · Řízení a reporting · Obchodní dokumenty · Marketing · Obchod · pipeline · (SHARED) |
| zamestnanec | (SHARED) |

SHARED = „Firemní dokumentace HULY". **ID/názvy prostorů jsou per-workspace → konfigurovat**
(env nebo lookup podle názvu), ne hardcode.

## Build & nasazení
Vyžaduje vlastní build (`docs/CUSTOM-BUILD.md`): upravit fork → CI postaví image **front** + **account**
→ deploy na novém serveru → přepnout `HULY_IMAGE_REGISTRY`/`HULY_VERSION`. **Otestovat až s build
pipeline** (account↔transactor cesta + render dropdownu).

## Rizika
- account→transactor závislost (varianta A) — ověřit systémový token + transactor endpoint v account službě.
- Re-merge upstream — držet zásahy malé a komentované.
- Per-workspace ID prostorů → konfigurace.
- Bez build loopu netestovatelné → kód psát až s pipeline.
- **Sloučené/duplicitní osoby (poznatek 2026-07-02):** `doJoinByInvite` na workspace straně volá
  `ensureEmployee` → `ensureEmployeeForPerson`, které vyhodí „Confirmed social identity is attached
  to the wrong person", pokud má účet ověřenou social identitu připojenou k jiné (staré) osobě.
  Auto-přiřazení při joinu proto musí počítat s tím, že account-merge **NEpřepojuje** workspace
  `contact:class:SocialIdentity.attachedTo` — před spoléháním na `personUuid`→prostory je nutné mít
  identity srovnané (viz `praut-merge-persons.cjs` + přepojení identit). Jinak nový člen po přijetí
  pozvánky spadne na error screen místo přiřazení do prostorů.
