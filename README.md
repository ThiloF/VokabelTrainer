# 🎓 VokabelTrainer — Modular Multi-Language Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Architecture](https://img.shields.io/badge/Architecture-DDD%20%2F%20Hexagonal-10b981)](#architektur-ddd--clean-architecture)

Ein moderner, lokal laufender Single-User Desktop-Vokabeltrainer für beliebig viele Sprachen. Entwickelt nach den Prinzipien von **Domain-Driven Design (DDD)**, **Clean / Hexagonal Architecture (Ports & Adapters)**, **Dependency Injection (`tsyringe`)** und dem **Repository- & Strategy-Pattern**.

---

## ✨ Hauptfunktionen

### 🌍 Multi-Language, Kategorien & Tagging
- **Beliebige Sprachenpaare**: Standardmäßig mit Starter-Paketen für *Deutsch, Englisch, Spanisch, Französisch, Italienisch und Japanisch* ausgestattet. Eigene Sprachen (inkl. ISO-Code, Locale und Flagge) lassen sich jederzeit in den Einstellungen ergänzen.
- **Strukturierte Organisation**: Jede Vokabel unterstützt mehrere gültige Übersetzungen/Synonyme, Wortart, Lautschrift (IPA), Notizen, Beispielsätze, eine **Kategorie** sowie beliebig viele **Tags**.

### 🧠 Spaced Repetition (SM-2) & Gamification
- **SM-2 Algorithmus**: Berechnet nach jeder Abfrage dynamisch den neuen *Ease-Factor*, das Wiederholungsintervall in Tagen (`intervalDays`), die Wiederholungsserie (`repetitions`) und das nächste Fälligkeitsdatum (`nextReviewAt`).
- **5 Gedächtnis-Stufen (Mastery Levels)**: *Neu* → *Lernend* → *Vertraut* → *Gefestigt* → *Gemeistert*.
- **Motivations-System**: Spieler-Level, Erfahrungspunkte (XP) mit Combo-Multiplikator, tägliches Lernziel und Daily Streak Tracking sowie detaillierte Trefferquoten (`successCount` vs. `failCount`).

### 🎮 6 Interaktive Trainingsmodi
1. **Freitext-Eingabe (Typing)**: Inklusive **Levenshtein-Tippfehler-Toleranz** (1 Buchstabe Abweichung wird als *„Fast richtig“* gewertet) und farbigem Buchstaben-Diff.
2. **Karteikarten (Flashcards)**: Klassisches Umdrehen mit 4-stufiger SM-2 Selbstbewertung (*Nochmal, Schwer, Gut, Einfach*).
3. **Multiple-Choice**: Automatische Generierung plausibler Antwortoptionen aus dem eigenen Wortschatz.
4. **Hörverständnis (Listening)**: Spielt die gesprochene Vokabel ab – das gehörte Wort bzw. die Bedeutung muss erkannt werden.
5. **Lückentext (Cloze Deletion)**: Blendet das gesuchte Wort automatisch in den hinterlegten Beispielsätzen aus.
6. **Paare Zuordnen (Matching-Game)**: Spielerisches Verbinden zusammengehöriger Wortpaare auf Zeit.

### ✨ 1-Klick „Auto-Enrich“ (Übersetzung, Wörterbuch & Hörbeispiele)
Beim Anlegen oder Bearbeiten einer Vokabel genügt die Eingabe des Fremdwortes und ein Klick auf **„Auto-Enrich“**:
- **Wörterbuch-Anreicherung**: Ruft über die *Free Dictionary API* automatisch die **IPA-Lautschrift**, **Wortart**, **Definitionen**, **Beispielsätze** und **Audio-Aufnahmen** ab.
- **Übersetzungs-Kaskade**: Unterstützt wahlweise offizielle **DeepL API-Keys** und **Google Cloud Translation API-Keys** und nutzt ohne Konfiguration automatisch kostenlose Schnittstellen (*Google Translate GTX inkl. Synonymen* & *MyMemory*).
- **Aussprache / TTS**: Kombiniert echte Wörterbuch-Aufnahmen, *Google Translate TTS* (als Offline-fähige Data-URI) und die *Web Speech API* als Fallback.

### 🔄 Multi-Format Import & Export
Über das **Import/Export-Center** lassen sich Vokabelsammlungen (optional inklusive Lernfortschritt) mit Live-Vorschau importieren und exportieren:
- **JSON** (strukturiertes Komplettformat)
- **XML** (validiertes XML-Schema über `fast-xml-parser`)
- **CSV / TSV** (Tabellenformat sowie direkte **Anki-Deck-Kompatibilität**)

---

## 🏗️ Architektur (DDD & Clean Architecture)

```text
c:\Entwicklung\VokabelTrainer\
├── docker-compose.yml              # Lokale PostgreSQL 16 Instanz
├── prisma/
│   └── schema.prisma               # PostgreSQL Datenbankschema
├── src/
│   ├── shared/                     # Geteilte DTOs & typsichere IPC-Verträge
│   ├── main/                       # Electron Main-Prozess (DDD Backend)
│   │   ├── container.ts            # tsyringe Dependency Injection Container
│   │   ├── domain/                 # DOMAIN LAYER (Reine Business-Logik, 0 externe Abhängigkeiten)
│   │   │   ├── repositories/       # Ports / Interfaces (ILexiconRepository, ITranslationProvider, ...)
│   │   │   └── services/           # SM2Service, AnswerEvaluator (Levenshtein), GamificationService
│   │   ├── application/            # APPLICATION LAYER (Use Cases / Orchestrierung)
│   │   │   ├── LearningApplicationService.ts
│   │   │   ├── EnrichmentApplicationService.ts
│   │   │   └── DataExchangeApplicationService.ts
│   │   ├── infrastructure/         # INFRASTRUCTURE LAYER (Adapters)
│   │   │   ├── database/           # PrismaPostgreSQL + ResilientDatabaseRepository (Local Fallback)
│   │   │   ├── enrichment/         # FreeDictionary, MultiTranslation (DeepL/Google), GoogleTTS
│   │   │   └── exchange/           # JsonExchangeStrategy, XmlExchangeStrategy, CsvExchangeStrategy
│   │   └── presentation/           # PRESENTATION LAYER (Electron IPC Controller)
│   ├── preload/                    # Sichere Electron contextBridge (window.electronAPI)
│   └── renderer/                   # React 18 + TypeScript + Tailwind CSS Frontend
└── tests/                          # Vitest Unit-Tests für Domain & Exchange
```

---

## 🚀 Anleitung zum Starten der Anwendung

### Voraussetzungen
- **Node.js** (Version 18 oder 20+ empfohlen) & **npm**
- **Optional für PostgreSQL**: **Docker Desktop** oder eine lokal installierte **PostgreSQL**-Datenbank (Port `5432`).
  > **Hinweis:** Dank des integrierten `ResilientDatabaseRepository` startet und funktioniert die Anwendung **auch komplett ohne laufenden PostgreSQL-/Docker-Server** sofort! Wenn PostgreSQL nicht erreichbar ist, speichert die App alle Daten automatisch lokal unter `~/.vokabeltrainer/local-store.json`.

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/ThiloF/VokabelTrainer.git
cd VokabelTrainer
npm install
```

### 2. Umgebungsvariablen prüfen (`.env`)
Kopiere bei Bedarf die Vorlage `.env.example` nach `.env`:
```bash
cp .env.example .env
```
Standardinhalt der `.env`:
```env
DATABASE_URL="postgresql://vokabel_user:vokabel_password@localhost:5432/vokabeltrainer?schema=public"
DEEPL_API_KEY=""
GOOGLE_TRANSLATE_API_KEY=""
```

### 3. PostgreSQL-Datenbank starten & Schema anwenden (Optional)
Wenn Docker Desktop läuft, startest du die PostgreSQL-16-Datenbank mit zwei Befehlen:
```bash
npm run db:up
npm run db:push
```

### 4. Anwendung im Entwicklungsmodus starten
```bash
npm run dev
```
Das Electron-Desktop-Fenster öffnet sich automatisch und lädt beim allerersten Start ein vorkonfiguriertes Starter-Paket mit Sprachen, Kategorien, Tags und Beispielvokabeln.

---

## 🧪 Tests & Produktions-Build

| Befehl | Beschreibung |
| :--- | :--- |
| `npm run dev` | Startet die Electron-App im Entwicklungsmodus mit Hot-Reload |
| `npm test` | Führt alle Unit-Tests (SM-2, Levenshtein, Gamification, JSON/XML/CSV) mit `vitest` aus |
| `npm run build` | Kompiliert Main, Preload und React-Renderer für die Produktion (`out/`) |
| `npm run preview` | Startet den gebauten Produktions-Stand in Electron |
| `npm run db:up` | Startet den PostgreSQL Docker-Container im Hintergrund |
| `npm run db:push` | Synchronisiert das Prisma-Schema mit der PostgreSQL-Datenbank |
| `npm run db:studio` | Öffnet Prisma Studio im Browser zur direkten Datenbank-Inspektion |

---

## 📜 Lizenz
MIT License — Entwickelt von [ThiloF](https://github.com/ThiloF).
