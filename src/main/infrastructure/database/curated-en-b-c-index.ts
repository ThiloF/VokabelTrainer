import { CURATED_B_C_PART_1, RawCuratedEntry } from './curated-en-b-c-1'
import { CURATED_B_C_PART_2 } from './curated-en-b-c-2'
import { CURATED_B_C_PART_3 } from './curated-en-b-c-3'
import { CURATED_B_C_PART_4 } from './curated-en-b-c-4'

const SUPPLEMENTAL_C1_ENTRIES: RawCuratedEntry[] = [
  ['efficacious', ['wirksam', 'effektiv', 'wirkungsvoll'], 'adjective', 'C2', 'Wissenschaft & Umwelt', 'The clinical trial proved that the new therapy is highly efficacious.', 'Die klinische Studie bewies, dass die neue Therapie hochwirksam ist.'],
  ['egalitarian', ['egalitär', 'auf Gleichheit beruhend'], 'adjective', 'C1', 'Politik & Recht', 'Scandinavian countries are known for their egalitarian social models.', 'Skandinavische Länder sind für ihre auf Gleichheit beruhenden Gesellschaftsmodelle bekannt.'],
  ['egregious', ['ungeheuerlich', 'eklatant', 'gravierend'], 'adjective', 'C2', 'Politik & Recht', 'The audit uncovered an egregious violation of accounting rules.', 'Die Prüfung deckte einen eklatanten Verstoß gegen die Bilanzierungsregeln auf.'],
  ['elaborate', ['aufwendig', 'durchdacht', 'detailliert'], 'adjective', 'B2', 'Alltag & Gesellschaft', 'They prepared an elaborate autumn feast for their guests.', 'Sie bereiteten ein aufwendiges Herbstfestmahl für ihre Gäste zu.'],
  ['eligible', ['berechtigt', 'anspruchsberechtigt', 'geeignet'], 'adjective', 'B2', 'Politik & Recht', 'Students under twenty-five are eligible for a discounted pass.', 'Studierende unter fünfundzwanzig Jahren haben Anspruch auf ein ermäßigtes Ticket.'],
  ['eloquent', ['redegewandt', 'wortgewandt', 'ausdrucksstark'], 'adjective', 'C1', 'Kommunikation & Rhetorik', 'She made an eloquent plea for the preservation of old libraries.', 'Sie hielt ein wortgewandtes Plädoyer für den Erhalt alter Bibliotheken.'],
  ['elusive', ['schwer fassbar', 'flüchtig'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'Snow leopards are notoriously elusive in the wild.', 'Schneeleoparden sind in freier Wildbahn bekanntlich extrem scheu und schwer zu entdecken.'],
  ['eminent', ['angesehen', 'bedeutend', 'herausragend'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'Several eminent linguists reviewed the vocabulary collection.', 'Mehrere angesehene Sprachwissenschaftler prüften die Vokabelsammlung.'],
  ['empirical', ['empirisch', 'auf Erfahrung beruhend'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'Hypotheses must be tested against empirical data.', 'Hypothesen müssen anhand empirischer Daten überprüft werden.'],
  ['endemic', ['endemisch', 'einheimisch', 'weitverbreitet'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'This rare orchid is endemic to the Canary Islands.', 'Diese seltene Orchidee ist auf den Kanarischen Inseln heimisch.'],
  ['enigmatic', ['rätselhaft', 'geheimnisvoll'], 'adjective', 'C1', 'Psychologie & Charakter', 'The Mona Lisa is famous for her enigmatic smile.', 'Die Mona Lisa ist berühmt für ihr rätselhaftes Lächeln.'],
  ['entrenched', ['festgefahren', 'tief verwurzelt'], 'adjective', 'C1', 'Politik & Recht', 'It takes patience to change entrenched habits.', 'Es erfordert Geduld, tief verwurzelte Gewohnheiten zu ändern.'],
  ['ephemeral', ['flüchtig', 'kurzlebig', 'vergänglich'], 'adjective', 'C1', 'Alltag & Gesellschaft', 'Autumn rainbows are beautiful but ephemeral phenomena.', 'Herbstregenbögen sind wunderschöne, aber vergängliche Phänomene.'],
  ['equitable', ['gerecht', 'fair', 'ausgewogen'], 'adjective', 'C1', 'Politik & Recht', 'Negotiators worked toward an equitable distribution of resources.', 'Die Unterhändler arbeiteten auf eine gerechte Verteilung der Ressourcen hin.'],
  ['equivocal', ['zweideutig', 'ausweichend', 'unklar'], 'adjective', 'C2', 'Kommunikation & Rhetorik', 'The spokesperson gave an equivocal reply to the question.', 'Der Sprecher gab eine ausweichende Antwort auf die Frage.'],
  ['erratic', ['unberechenbar', 'unbeständig', 'sprunghaft'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'A loose connection caused erratic sensor readings.', 'Eine lockere Verbindung verursachte sprunghafte Sensormesswerte.'],
  ['erroneous', ['irrtümlich', 'fehlerhaft', 'falsch'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'Automated checks filter out erroneous translations.', 'Automatisierte Prüfungen filtern fehlerhafte Übersetzungen heraus.'],
  ['erudite', ['gelehrt', 'belesen', 'gebildet'], 'adjective', 'C2', 'Wissenschaft & Umwelt', 'The professor delivered an erudite lecture on Renaissance history.', 'Der Professor hielt einen gelehrten Vortrag über die Geschichte der Renaissance.'],
  ['esoteric', ['esoterisch', 'nur Eingeweihten verständlich'], 'adjective', 'C2', 'Wissenschaft & Umwelt', 'Clean code avoids esoteric syntax tricks.', 'Sauberer Code vermeidet schwer verständliche Syntax-Tricks.'],
  ['Exemplary', ['vorbildlich', 'beispielhaft', 'musterhaft'], 'adjective', 'C1', 'Beruf & Wirtschaft', 'Her team demonstrated exemplary collaboration throughout the project.', 'Ihr Team zeigte während des gesamten Projekts eine vorbildliche Zusammenarbeit.'],
  ['exhaustive', ['erschöpfend', 'lückenlos', 'umfassend'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'After an exhaustive search, we verified every single entry.', 'Nach einer lückenlosen Prüfung haben wir jeden einzelnen Eintrag verifiziert.'],
  ['exorbitant', ['exorbitant', 'überhöht', 'maßlos'], 'adjective', 'C1', 'Beruf & Wirtschaft', 'Travelers complained about exorbitant hotel prices during the fair.', 'Reisende beklagten sich über überhöhte Hotelpreise während der Messe.'],
  ['expedient', ['zweckmäßig', 'ratsam', 'dienlich'], 'adjective', 'C1', 'Politik & Recht', 'A temporary workaround was politically expedient but technically flawed.', 'Eine vorübergehende Notlösung war politisch zweckmäßig, aber technisch mangelhaft.'],
  ['explicit', ['explizit', 'ausdrücklich', 'eindeutig'], 'adjective', 'B2', 'Kommunikation & Rhetorik', 'TypeScript interfaces make data contracts explicit.', 'TypeScript-Interfaces machen Datenverträge eindeutig.'],
  ['exquisite', ['exquisit', 'erlesen', 'vorzüglich'], 'adjective', 'C1', 'Alltag & Gesellschaft', 'The craftsman carved exquisite details into the oak frame.', 'Der Handwerker schnitzte erlesene Details in den Eichenrahmen.'],
  ['extensive', ['umfangreich', 'ausgedehnt', 'weitreichend'], 'adjective', 'B2', 'Wissenschaft & Umwelt', 'Extensive testing confirmed that all training modes work properly.', 'Umfangreiche Tests bestätigten, dass alle Trainingsmodi einwandfrei funktionieren.'],
  ['extraneous', ['nebensächlich', 'nicht dazugehörig', 'überflüssig'], 'adjective', 'C2', 'Wissenschaft & Umwelt', 'Remove extraneous noise before analyzing the audio signal.', 'Entfernen Sie Störgeräusche, bevor Sie das Audiosignal analysieren.'],
  ['extrinsic', ['extrinsisch', 'von außen kommend'], 'adjective', 'C1', 'Psychologie & Charakter', 'Streaks provide extrinsic motivation alongside intrinsic curiosity.', 'Streaks bieten neben der intrinsischen Neugier eine zusätzliche äußere Motivation.'],
  ['exuberant', ['ausgelassen', 'überschwänglich', 'üppig'], 'adjective', 'C1', 'Psychologie & Charakter', 'The team celebrated the release in an exuberant mood.', 'Das Team feierte die Veröffentlichung in ausgelassener Stimmung.'],
  ['fallacious', ['trügerisch', 'irrig', 'auf einem Trugschluss beruhend'], 'adjective', 'C2', 'Kommunikation & Rhetorik', 'His argument was based on a fallacious assumption.', 'Sein Argument beruhte auf einer trügerischen Annahme.'],
  ['feasible', ['machbar', 'durchführbar', 'realisierbar'], 'adjective', 'B2', 'Beruf & Wirtschaft', 'A feasibility study showed the solar project was economically feasible.', 'Eine Machbarkeitsstudie zeigte, dass das Solarprojekt wirtschaftlich realisierbar war.'],
  ['fervent', ['leidenschaftlich', 'glühend', 'inbrünstig'], 'adjective', 'C1', 'Psychologie & Charakter', 'He is a fervent supporter of open-source education.', 'Er ist ein leidenschaftlicher Unterstützer von Open-Source-Bildung.'],
  ['fickle', ['launenhaft', 'wechselhaft', 'unbeständig'], 'adjective', 'C1', 'Alltag & Gesellschaft', 'October weather in the Alps is notoriously fickle.', 'Das Oktoberwetter in den Alpen ist bekanntlich sehr wechselhaft.'],
  ['finite', ['endlich', 'begrenzt'], 'adjective', 'B2', 'Wissenschaft & Umwelt', 'Fossil fuels are a finite resource that must be replaced.', 'Fossile Brennstoffe sind eine endliche Ressource, die ersetzt werden muss.'],
  ['fiscal', ['fiskalisch', 'Finanz-', 'Steuer-'], 'adjective', 'C1', 'Beruf & Wirtschaft', 'The company fiscal year ends on the last day of December.', 'Das Geschäftsjahr des Unternehmens endet am letzten Dezembertag.'],
  ['flagrant', ['eklatant', 'offenkundig', 'krass'], 'adjective', 'C2', 'Politik & Recht', 'The referee penalized the player for a flagrant foul.', 'Der Schiedsrichter bestrafte den Spieler für ein eklatantes Foul.'],
  ['flawless', ['fehlerfrei', 'makellos', 'einwandfrei'], 'adjective', 'B2', 'Alltag & Gesellschaft', 'Daily practice will bring you closer to flawless pronunciation.', 'Tägliches Üben bringt Sie einer fehlerfreien Aussprache näher.'],
  ['fleeting', ['flüchtig', 'kurz', 'vergänglich'], 'adjective', 'C1', 'Alltag & Gesellschaft', 'We caught a fleeting glimpse of a deer in the autumn mist.', 'Wir erhaschten im Herbstnebel einen kurzen Blick auf ein Reh.'],
  ['formidable', ['beachtlich', 'gewaltig', 'respekteinflößend'], 'adjective', 'C1', 'Alltag & Gesellschaft', 'Mastering C2 English is a formidable intellectual challenge.', 'Das Beherrschen von C2-Englisch ist eine beachtliche intellektuelle Herausforderung.'],
  ['fortuitous', ['zufällig', 'glücklich'], 'adjective', 'C2', 'Alltag & Gesellschaft', 'By a fortuitous turn of events, the lost notebook was found.', 'Durch eine glückliche Fügung wurde das verlorene Notizbuch wiedergefunden.']
]

function buildVerified1000Catalog(): RawCuratedEntry[] {
  const combined = [
    ...CURATED_B_C_PART_1,
    ...CURATED_B_C_PART_2,
    ...CURATED_B_C_PART_3,
    ...CURATED_B_C_PART_4,
    ...SUPPLEMENTAL_C1_ENTRIES
  ]

  const seen = new Set<string>()
  const unique: RawCuratedEntry[] = []

  for (const row of combined) {
    const normalizedWord = row[0].trim().toLowerCase()
    const pos = row[2]
    const key = `${normalizedWord}::${pos}`
    if (seen.has(key)) continue
    seen.add(key)

    unique.push([
      normalizedWord,
      row[1].map((t) => t.trim()).filter(Boolean),
      pos,
      row[3],
      row[4].trim(),
      row[5].trim(),
      row[6].trim()
    ])

    if (unique.length === 1000) break
  }

  return unique
}

export const VERIFIED_ENGLISH_B_C_1000: RawCuratedEntry[] = buildVerified1000Catalog()
