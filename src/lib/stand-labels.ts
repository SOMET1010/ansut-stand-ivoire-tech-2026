// Libellés partagés client/serveur du module invitations.
export const LETTER_STATUS = { A_PREPARER: 'À préparer', REDIGE: 'Rédigé', ENVOYE: 'Envoyé' } as const
export const DG_VALIDATION = { A_VALIDER: 'À valider', VALIDE: 'Validé', REFUSE: 'Refusé' } as const
export type LetterStatus = keyof typeof LETTER_STATUS
export type DgValidation = keyof typeof DG_VALIDATION
