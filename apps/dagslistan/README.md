# Dagslistan

En delad checklista. Du planerar tasks per person och dag, och alla bockar av med ett klick.

Samma kod ger två saker:

| | Vem | Kan |
|---|---|---|
| **Appen** (iPhone/Android) | Du som planerar | Logga in, lägga till och ändra personer och tasks, bocka av, se historik |
| **Avbockningssidan** (webb) | Alla andra, utan konto | Se allas tasks per person och bocka av. Inget annat. |

Data och inloggning ligger i Firebase (Firestore och Authentication). Firebase har en gratisnivå som räcker gott.

---

## 1. Prova direkt (demoläge)

Utan Firebase-uppgifter startar appen i **demoläge**. Allt sparas då bara på enheten, och du är alltid planerare.

```bash
npm install
npx expo start
```

Skanna QR-koden med appen **Expo Go** på telefonen, eller tryck `w` för att öppna i webbläsaren.
Avbockningssidan provar du med `npm run web:checker`.

## 2. Koppla in Firebase

1. Skapa ett projekt på <https://console.firebase.google.com>.
2. **Firestore Database** → *Create database* → välj *production mode* och en region i Europa (t.ex. `europe-north1`).
3. **Authentication** → *Sign-in method* → aktivera **Email/Password** och **Anonymous**.
   Anonym inloggning används av avbockningssidan, så att besökare kan bocka av utan konto.
4. **Authentication** → *Users* → *Add user*: skapa ditt eget konto (e-post och lösenord).
   Kopiera kontots **User UID**.
5. Gör dig till planerare: **Firestore** → *Start collection* → samlingens namn `admins`,
   dokument-id = ditt User UID. Lägg till ett fält, t.ex. `email` med din adress.
   Vill du ha fler planerare lägger du till fler dokument på samma sätt.
6. **Projektinställningar** → *Dina appar* → lägg till en **webbapp** och kopiera konfigurationen.
   Kopiera `.env.example` till `.env.local` och fyll i värdena.
7. Publicera säkerhetsreglerna:

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # välj ditt projekt
   npx firebase-tools deploy --only firestore:rules
   ```

Starta om `npx expo start`. Demolägesrutan ska nu vara borta. Logga in under **Planering**.

## 3. Publicera avbockningssidan

```bash
npm run build:checker
npx firebase-tools deploy --only hosting
```

Sidan hamnar på `https://<ditt-projekt>.web.app`. Skicka länken till dem som ska bocka av.
De kan lägga den på hemskärmen via webbläsarens *Dela → Lägg till på hemskärmen*.

## 4. Lägga ut appen i App Store och Google Play

Appen byggs i molnet med EAS, så du behöver ingen Mac för iPhone-bygget.

**Du behöver:**
- ett gratis konto på <https://expo.dev>
- **Apple Developer Program** (99 USD/år) för App Store
- **Google Play Console** (25 USD en gång) för Google Play

**Gör så här:**
1. Byt `ios.bundleIdentifier` och `android.package` i `app.json` till något eget, t.ex. `se.dittnamn.dagslistan`.
   Det går inte att ändra efter första publiceringen.
2. `npx eas-cli login` och sedan `npx eas-cli init`.
3. `.env.local` följer inte med till molnbygget. Lägg därför in samma `EXPO_PUBLIC_FIREBASE_*`-variabler
   på expo.dev under projektets **Environment variables**, för miljöerna *preview* och *production*.
4. Prova på din egen telefon först: `npx eas-cli build --profile preview --platform android`
   ger en installationsfil. För iPhone registrerar du telefonen med `npx eas-cli device:create`.
5. Bygg och skicka in:

   ```bash
   npx eas-cli build --profile production --platform all
   npx eas-cli submit --platform ios
   npx eas-cli submit --platform android
   ```

   Apple och Google granskar appen innan den syns i butikerna. Det tar oftast några dagar första gången.

## Säkerhet

Reglerna i `firestore.rules` avgör vad som tillåts. Det är de som skyddar datan, inte appen:

- Bara konton i samlingen `admins` kan ändra personer och tasks.
- Alla som är inloggade, även anonymt, kan läsa och bocka av. Det gäller alltså alla som har länken till avbockningssidan.
- En avbockning godtas bara för en task som finns, av en person som är tilldelad den, och med serverns klockslag.
- Andra än planerare kan bara ångra avbockningar från det senaste dygnet.

Reglerna har automatiska tester. De kräver Java, som Firestore-emulatorn behöver:

```bash
npm run test:rules
```

## Bra att veta

- Återkommande tasks som missas följer inte med till nästa dag. Bara engångstasks hamnar under *Försenade*.
- Tar du bort en person plockas den bort från sina tasks. Står en task då utan personer tas den bort helt. Historiken finns kvar.
- Historiken visar de senaste 500 avbockningarna.

## Utveckling

```bash
npm run typecheck
npm run lint
npm run test:rules
```

Koden: skärmarna finns i `src/app/` (Expo Router), datalagret i `src/lib/backend/` (Firebase och demoläge) och logiken för vilka tasks som visas vilken dag i `src/lib/dates.ts` och `src/lib/occurrences.ts`.
