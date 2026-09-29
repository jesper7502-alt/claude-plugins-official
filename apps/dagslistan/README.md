# Dagslistan

En delad checklista på webben. Du planerar tasks per person och dag, och alla bockar av med ett klick.
Sidan fungerar i datorn och i mobilen, och kan läggas på mobilens hemskärm som en app.

Alla loggar in. Vad man kan göra beror på kontot:

| Konto | Ser | Kan |
|---|---|---|
| **Admin** | Tasks, Planering, Genomfört | Lägga till och ändra personer och tasks, bocka av, se historik och ångra |
| **Vanlig inloggning** (gemensam) | Tasks | Se allas tasks och bocka av. Väljer "Vem är du?" en gång per enhet; de egna tasks visas då överst. Kan byta djur på sin egen avatar. |

Data och inloggning ligger i Firebase (Firestore, Authentication och Hosting). Firebase har en gratisnivå som räcker gott.

---

## 1. Prova direkt (demoläge)

Utan Firebase-uppgifter startar sidan i **demoläge**. Allt sparas bara i webbläsaren.
Logga in med en e-post som börjar med `admin` för admin-vyn, eller med vilken annan e-post som helst för den vanliga vyn.
Lösenordet kontrolleras inte i demoläget.

```bash
npm install
npm start
```

## 2. Koppla in Firebase

1. Skapa ett projekt på <https://console.firebase.google.com>.
2. **Firestore Database** → *Create database* → välj *production mode* och en region i Europa (t.ex. `europe-north1`).
3. **Authentication** → *Sign-in method* → aktivera **Email/Password**. Låt *Anonymous* vara avstängd.
4. **Authentication** → *Users* → *Add user*. Skapa två konton:
   - ditt eget admin-konto, t.ex. `du@exempel.se`
   - den gemensamma inloggningen, t.ex. `familjen@exempel.se`

   Kopiera båda kontonas **User UID**.
5. Ge kontona behörighet i **Firestore** → *Start collection*:
   - Samlingen `admins` med ett dokument vars id är ditt User UID. Lägg till ett fält, t.ex. `email`.
   - Samlingen `members` med ett dokument vars id är den gemensamma inloggningens User UID, på samma sätt.

   Ett konto som inte finns i någon av samlingarna kommer inte åt något, även om det kan logga in.
   Det skyddar mot att någon skapar ett eget konto via Firebase:s öppna API.
6. **Projektinställningar** → *Dina appar* → lägg till en **webbapp** och kopiera konfigurationen.
   Kopiera `.env.example` till `.env.local` och fyll i värdena.
7. Koppla projektet: `npx firebase login` och `npx firebase use --add` (välj ditt projekt).

## 3. Publicera

```bash
npm run deploy
```

Det bygger sidan och publicerar både sidan och säkerhetsreglerna. Sidan hamnar på `https://<ditt-projekt>.web.app`.
Ge de andra adressen och den gemensamma inloggningen.

**Lägga på hemskärmen:** öppna sidan i mobilen och välj *Dela → Lägg till på hemskärmen* (iPhone, Safari)
eller *⋮ → Lägg till på startskärmen* (Android, Chrome).

## Byta lösenord och lägga till fler

- **Byta lösenord** på den gemensamma inloggningen: *Authentication → Users → ⋮ → Reset password*.
  Den som redan är inloggad förblir inloggad tills den loggar ut.
- **Fler admin:** skapa kontot och lägg dess User UID i `admins`.
- **Stänga av någon:** ta bort kontots dokument i `admins`/`members` eller inaktivera kontot i Authentication.

## Säkerhet

Reglerna i `firestore.rules` avgör vad som tillåts. Det är de som skyddar datan, inte sidan:

- Bara konton i `admins` kan ändra personer och tasks.
- Konton i `members` (och `admins`) kan läsa, bocka av och byta djur på en person. Alla andra nekas.
- En avbockning godtas bara för en task som finns, av en person som är tilldelad den, och med serverns klockslag.
- Vanliga användare kan bara ångra avbockningar från det senaste dygnet.

Reglerna har automatiska tester. De kräver Java, som Firestore-emulatorn behöver:

```bash
npm run test:rules
```

## Bra att veta

- Varje person har ett tecknat djur som avatar (12 att välja mellan). Nya personer får ett ledigt djur automatiskt. Tryck på avataren för att byta: admin i Planering, vanliga användare på sin egen avatar under Tasks.

- Den gemensamma inloggningen vet inte vem som sitter vid skärmen. Den som bockar av räknas som personen vars lista tasken bockades av i.
- Återkommande tasks som missas följer inte med till nästa dag. Bara engångstasks hamnar under *Försenade*.
- Tar du bort en person plockas den bort från sina tasks. Står en task då utan personer tas den bort helt. Historiken finns kvar.
- Historiken visar de senaste 500 avbockningarna.

## Utveckling

```bash
npm start           # utvecklingsserver
npm run typecheck
npm run lint
npm run test:rules
```

Sidan är byggd med Expo (React Native for Web) och Expo Router. Skärmarna finns i `src/app/`,
datalagret i `src/lib/backend/` (Firebase och demoläge) och logiken för vilka tasks som visas vilken dag
i `src/lib/dates.ts` och `src/lib/occurrences.ts`.
