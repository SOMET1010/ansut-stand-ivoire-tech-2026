// Agent (b) : rédaction du courrier d'invitation d'un partenaire à une séquence.
import { db } from '@/lib/db'
import { generateText, logAgentRun, withAI } from '@/lib/ai'
import { templateLetter } from '@/lib/stand'
import { EVENT } from '@/config/event'
import { toProgramItem } from '@/lib/program'

const SYSTEM = `Tu rédiges des courriers officiels d'invitation pour l'ANSUT (Agence Nationale du Service Universel des Télécommunications-TIC, Côte d'Ivoire), signés par le Directeur Général.
Style : français administratif ivoirien, sobre, courtois, une page maximum.
Structure : ligne « À l'attention de », objet, formule d'appel, contexte (Ivoire Tech Forum 2026), séquence (titre, date, heure, lieu), intérêt de la présence du partenaire, demande de confirmation, formule de politesse, signature « Le Directeur Général de l'ANSUT ».
N'invente aucun fait, chiffre, nom de personne ni engagement absent des informations fournies. Réponds uniquement par le texte du courrier.`

export async function draftInvitation(invitationId: string) {
  const inv = await db.invitation.findUnique({ where: { id: invitationId }, include: { panel: true } })
  if (!inv) throw new Error('Invitation introuvable')

  const session = toProgramItem(inv.panel)
  const facts = {
    partner: inv.partnerName,
    contact: inv.contactRole,
    title: inv.panel.title,
    day: session.day,
    time: session.time,
    location: inv.panel.location ?? 'Stand ANSUT',
    pilot: inv.panel.speaker,
  }

  const { value: letter, usedAI } = await withAI(
    () =>
      generateText({
        system: SYSTEM,
        prompt: `Informations (seules sources autorisées) :
- Événement : ${EVENT.shortTitle}, ${EVENT.dates}, ${EVENT.location}. Thème : « ${EVENT.tagline} ».
- Partenaire invité : ${facts.partner}${facts.contact ? ` (contact : ${facts.contact})` : ''}
- Séquence : « ${facts.title} »
- Date et heure : ${facts.day}, ${facts.time}
- Lieu : ${facts.location}
- Direction ANSUT pilote : ${facts.pilot ?? 'non précisée'}`,
      }),
    () => templateLetter(facts),
  )

  const updated = await db.invitation.update({
    where: { id: inv.id },
    data: {
      letterDraft: letter,
      letterSource: usedAI ? 'ia' : 'modele',
      letterStatus: inv.letterStatus === 'ENVOYE' ? 'ENVOYE' : 'REDIGE',
      // Toute nouvelle rédaction repasse par la validation du DG.
      dgValidation: 'A_VALIDER',
    },
  })
  await logAgentRun('invitation', usedAI, { invitationId }, letter)
  return { invitation: updated, usedAI }
}
