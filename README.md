# Stand ANSUT · Ivoire Tech Forum 2026

Plateforme du stand ANSUT (11-13 novembre 2026, Sofitel Hôtel Ivoire), basée sur PanelEvent.
Next.js 15 · React 19 · Prisma 6 · NextAuth · Tailwind 4 · SDK Anthropic.

## Fonctions

| Public | Équipe (`/dashboard/stand`) |
|---|---|
| Accueil, programme du stand, inscription | **Invitations** : partenaires par séquence, statut courrier, validation DG |
| Pointage par QR code (`/checkin/[séquence]`) | **Agent d'invitation** : rédige le courrier, le DG valide, puis envoi |
| **Assistant du stand** (`/assistant`) : répond sur le programme, enregistre les contacts | **Présences** par séquence + planche de QR codes à imprimer |
| Questions en direct, sondages, attestations | **Agent de modération** : thèmes, doublons, 3 questions prioritaires |
| | **Contacts** recueillis par l'assistant · **Bilan du jour** pour le DG |

Règles : seul le rôle `ADMIN` (DG) valide un courrier ; un courrier ne peut être marqué envoyé qu'après validation ; toute modification d'un courrier validé le renvoie en validation.

## Agents IA

Sans `ANTHROPIC_API_KEY`, chaque agent fonctionne en **mode sans IA**, signalé à l'écran (courrier par modèle, tri des questions par votes, bilan limité aux chiffres, assistant qui oriente vers le programme). Les agents n'utilisent que les données de la plateforme ; chaque exécution est tracée dans la table `agent_runs`.

## Démarrage

```bash
npm ci
cp .env.example .env          # renseigner NEXTAUTH_SECRET, comptes, ANTHROPIC_API_KEY (facultatif)
npx prisma db push
ORGANIZER_EMAIL=... ORGANIZER_PASSWORD=... npm run db:seed:itf2026   # événement + 11 séquences
npx tsx scripts/import-invitations-itf2026.ts                       # partenaires (matrice privée)
npm run build && npx next start
```

La matrice complète des invitations (partenaires, statuts, validations) reste dans `data/private/`, **jamais versionnée**.
