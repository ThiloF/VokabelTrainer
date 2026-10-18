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
  ['endemic', ['endemisch', 'einheimisch', 'weitverbreitet'], 'adjective', 'C1', 'Wissenschaft & Umwelt', 'This rare orchid is endemic to the Canary Islands.', 'Diese seltene Orchidee ist auf den Kanarischen Inseln heimisch.']
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
