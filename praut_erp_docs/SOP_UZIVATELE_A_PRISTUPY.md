# SOP: Uživatelé a přístupy v Huly PRAUT

Denní operace okolo účtů a přístupů ve workspace `praut` na `huly.praut.cz`.
Konsoliduje znalosti z `tools/huly-admin/README.md`, admin skriptů a provozních memories
(account-management, access-model, merge-contacts, docspace-roles).

> **Bez tajemství:** dokument neobsahuje hesla ani tokeny. Admin skripty čtou přihlášení
> z `/Users/stepan/praut/huly-poc-secrets.env` (mimo git; `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

---

## Jak fungují účty v Huly (mentální model — čti první)

- **Globální účet** (e-mail) je oddělený od **členství ve workspace**. „Smazání uživatele" v UI
  odebere jen členství; globální účet + e-mail (`social_id`) v účtové DB (CockroachDB) **zůstává**.
  Proto re-add / create-account u vráceného člověka hlásí `AccountAlreadyExists` — takový účet se
  **nemaže, ale resetuje** (viz Reset hesla).
- **Viditelnost obsahu = úroveň prostoru:** `space.members` + `space.private`. Žádné per-složku ani
  per-dokument ACL neexistuje. `private:true` = vidí jen členové; `private:false` = vidí **každý
  přihlášený** (i nečlen). `owners` je jen metadata, přístup neřídí. Detail: memory `huly-access-model`.
- **Role** (co smíš dělat) mají jen typované prostory (Teamspace, QMS DocumentSpace, tracker Project).
  U běžných dokumentových teamspaců rozhoduje čistě members + private, role se neřeší.

---

## Jak se spouští admin skripty

Skripty `tools/huly-admin/*.cjs` píší přes oficiální Huly API do produkce (bez výpadku).
Nelze je spustit přímo z repa — potřebují `node_modules` s `@hcengineering/*`:

```bash
cd HulyPrautplatform/dev/import-tool
NODE_PATH="$PWD/node_modules" node /…/huly-selfhost/tools/huly-admin/<skript>.cjs
```

- **Bez `--apply` = DRY-RUN** (nic nezmění). Vždy nejdřív DRY-RUN → ukázat → pak `--apply`.
- Šum `no document found, failed to apply model transaction` je neškodný (`grep -v`).
- Před většími zásahy spusť zálohu (`scripts/praut-backup.sh` na VPS).

---

## 1. Pozvání nového uživatele (invite)

Pozvání do workspace **jde jen přes UI** (programově vyžaduje master SECRET, blokuje classifier):

1. **Nastavení → Členové (Members) → Invite**.
2. Zadej e-mail; role účtu ve workspace = **„Uživatel" (User)** (ne Guest, ne admin).
3. Pozvánka odejde e-mailem (přes `mail`/Postmark službu). Uživatel si nastaví heslo při přijetí.

> Pozn.: plný výběr „PRAUT role" přímo v pozvánce (auto-přiřazení prostorů) je zatím jen návrh —
> viz `docs/specs/invite-with-praut-role.md`. Do té doby se prostory přiřazují skriptem (krok 2).

---

## 2. Přiřazení role / prostorů (onboarding)

Po přijetí pozvánky přidej uživatele do správných prostorů podle role skriptem
`praut-onboard-user.cjs`:

```bash
node praut-onboard-user.cjs --list-roles
node praut-onboard-user.cjs --email jan@praut.cz --role obchodnik            # DRY-RUN
node praut-onboard-user.cjs --email jan@praut.cz --role obchodnik --apply
# libovolnou roli lze doplnit o konkrétní projekt:
node praut-onboard-user.cjs --email jan@praut.cz --role vyvojar --projekt DASTA_PREVOD --apply
```

Role → co uvidí:

| Role | Prostory |
|---|---|
| `vedeni` | vše (Vedení, Řízení a reporting, Obchodní dokumenty, Marketing, Obchod + pipeline) + sdílená dokumentace |
| `obchodnik` | Obchod + Lead pipeline + Obchodní dokumenty + sdílená dokumentace |
| `marketak` | Marketing + sdílená dokumentace |
| `vyvojar` | sdílená dokumentace + PULS (+ `--projekt NÁZEV`) |
| `zamestnanec` | jen sdílená dokumentace (`Firemní dokumentace HULY`) |

> **Role v dokumentových prostorech (QMS):** aby uživatel mohl **zakládat** řízené dokumenty,
> musí být v roli **Manager** nebo **QARA** daného prostoru (členství nestačí). Prázdný výběr
> „Prostor" v „Nový dokument" = nikdo nemá tuto roli. Fix: prostor → Nastavení → Role → přidat
> lidi do Manager/QARA. Detail: memory `huly-docspace-roles`.

---

## 3. Reset hesla (zapomenuté heslo)

Účet se **nemaže** — heslo se resetuje skriptem `praut-account-reset.cjs` (dělá `restorePassword` =
nastaví heslo + znovu ověří e-mail, + `assignWorkspace` jako USER):

```bash
node praut-account-reset.cjs uzivatel@praut.cz                        # DRY-RUN
node praut-account-reset.cjs uzivatel@praut.cz --apply --password 'NoveHeslo'
```

Nové heslo předej uživateli bezpečným kanálem, **ne do gitu/chatu**.

---

## 4. Zamčený účet (po 5 neúspěšných loginech)

Po `failed_login_attempts >= 5` je účet **natvrdo zamčený** (žádné časové odemčení). `restorePassword`
heslo nastaví, ale interní zkušební login stejně hodí `PasswordLoginLocked`. Odemčení:

**A) Nejjednodušeji — OTP (když běží SMTP):** na login obrazovce **„Login with code"** → e-mail →
dorazí kód → přihlášení přes OTP **automaticky vynuluje** `failed_login_attempts` → účet odemčen, bez DB.

**B) Fallback — DB UPDATE na serveru** (když OTP nejde):

```bash
docker compose exec cockroach ./cockroach sql --certs-dir=certs --host=127.0.0.1:26257 \
  --database=defaultdb \
  -e "UPDATE global_account.account SET failed_login_attempts = 0 WHERE uuid = '<UUID>';"
```

UUID účtu zjistíš z výstupu `praut-account-reset.cjs` (skript ho vypíše). Detail: memory
`huly-account-management`.

---

## 5. Offboarding (dvoufázový)

Skript `praut-offboard-user.cjs`. Zaměstnanec = `contact:class:Person` + mixin
`contact:mixin:Employee` s polem `active`.

**Fáze 1 — deaktivace (okamžitá ztráta přístupu, vratné 60 dní):**

```bash
node praut-offboard-user.cjs --list
node praut-offboard-user.cjs --deactivate odchazi@praut.cz            # DRY-RUN
node praut-offboard-user.cjs --deactivate odchazi@praut.cz --apply
```

Nastaví `Employee.active=false` (zmizí z výběrů), zapíše datum do `offboarding-tracker.json`
a **vypíše SQL** pro server, kterým se zablokuje přihlášení (vratné):

```sql
UPDATE global_account.account SET failed_login_attempts = 999 WHERE uuid = '<UUID>';
```

Odebrání z členství prostorů udělá owner v UI (Nastavení → Členové), příp. přes `praut-access-setup.cjs`.

**Návrat do 60 dní:**

```bash
node praut-offboard-user.cjs --recover odchazi@praut.cz --apply       # active=true + vypíše odblokovací SQL
```

**Fáze 2 — purge-sweep (> 60 dní, až na novém serveru):**

```bash
node praut-offboard-user.cjs --purge-sweep                            # DRY-RUN; --apply až po migraci
```

Smaže účet (login) v DB, ale osobu jen přejmenuje na „… (bývalý zaměstnanec)" — obsah zůstává s jménem.
Pojistky: skript odmítá boty/admin (`huly-praut`, `Admin,Praut`) a u duplicit vyžaduje person `_id`.

---

## 6. Sloučení duplicitních osob (merge persons)

Skript `praut-merge-persons.cjs`:

```bash
node praut-merge-persons.cjs --search "Novák"                                     # read-only kandidáti + UUID
node praut-merge-persons.cjs --primary <uuid-cíl> --secondary <uuid-zdroj>        # DRY-RUN
node praut-merge-persons.cjs --primary <uuid-cíl> --secondary <uuid-zdroj> --apply
```

**„Nelze sloučit globální osoby" (UI „Sloučit kontakty"):** příčina je **obrácený směr**.
`canMergeSpecifiedPersons` vrátí false, když **zdrojová** (slučovaná) osoba má jakékoli **ověřené**
social ID (`verified_on != null`). Fix bez skriptu: prohodit — do „Sloučit z" (zdroj) dát osobu **bez**
ověřeného přihlášení, do „cíl" tu s ověřeným. Když mají ověřené ID obě strany, projde jen
account-merge (`--apply`). Detail: memory `huly-merge-contacts`.

**„Confirmed social identity is attached to the wrong person" (error po přihlášení, precedent 2026-07-02):**
= **nedokončené** sloučení. Při vstupu do workspace Huly kontroluje social identity účtu; když je některá
**ověřená** identita připojená (workspace doc `contact:class:SocialIdentity.attachedTo`) k **jiné osobě**
než té s `personUuid` = uuid účtu, error nepustí dovnitř (přihlášení + heslo přitom OK).

**Důležité:** `praut-merge-persons.cjs` (account-merge) **NEpřepojí** workspace `SocialIdentity` docs —
proto tenhle error po merge zůstává. Oprava má **2 kroky**:

1. `praut-merge-persons.cjs --primary <správné-uuid> --secondary <staré-uuid> --apply` (account-merge).
2. **Přepojit workspace identity** na správnou osobu — pro každou `SocialIdentity`, kde
   `attachedTo == stará-osoba._id`:
   ```js
   c.updateDoc(SocialIdentity, space, _id, { attachedTo: <správná-osoba._id> })
   ```
   (ad-hoc skript `praut-fix-<jméno>-sid.cjs` v import-tool; diagnostika obdobný `praut-diag-*.cjs`).
   Alternativa bez skriptu = UI „Sloučit kontakty". Zbylá prázdná stará karta je jen kosmetika.

Ověření: všechny identity mají `attachedTo` = správná osoba. Detail: memory `huly-account-management`.

> **Poznámka k zápisům přes API:** `TxOperations` musí být postaven s **`socialId` z loginu**
> (`const { token, socialId } = await getAccountClient().login(...)`), ne s `selected.account` —
> jinak každý zápis hodí `platform:status:AccountMismatch`. Detail: memory `huly-admin-scripts-env`.

---

## Rychlá reference

| Operace | Nástroj |
|---|---|
| Pozvat uživatele | UI: Nastavení → Členové → Invite (role „Uživatel") |
| Přiřadit roli/prostory | `praut-onboard-user.cjs --role … --apply` |
| Reset hesla | `praut-account-reset.cjs <email> --apply` |
| Odemknout účet | OTP „Login with code" nebo SQL `failed_login_attempts=0` |
| Deaktivovat / vrátit | `praut-offboard-user.cjs --deactivate` / `--recover --apply` |
| Trvalý výmaz (>60 dní) | `praut-offboard-user.cjs --purge-sweep` (nový server) |
| Sloučit duplicity | `praut-merge-persons.cjs --apply` (+ přepojit SocialIdentity) |
