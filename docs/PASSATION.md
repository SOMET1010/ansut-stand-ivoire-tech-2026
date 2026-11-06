# Passation – Plateforme du stand ANSUT · Ivoire Tech Forum 2026

> Pour : **Akoun** (reprise du développement) · État au **6 novembre 2026** · Forum : **11 – 13 novembre 2026, Sofitel Hôtel Ivoire**

## 1. En bref

La plateforme PanelEvent (salon 2025, repo `akoun-dev/panelevent`) a été reprise, mise à jour et transformée en plateforme du **stand ANSUT** : charte ITF 2026, programme réel du stand, pilotage des invitations, pointage par QR code, agents IA et animations en direct (quiz, nuage de mots, etc.).

| | |
|---|---|
| **Repo de travail** | `SOMET1010/ansut-stand-ivoire-tech-2026` — branche `main` (à jour) |
| **Repo d'origine** | `akoun-dev/panelevent` — **ne plus y pousser**. Une branche `ansut-ivoire-tech-2026` y a été créée par erreur : à supprimer. |
| **En ligne ?** | **Non.** Rien n'est déployé. Tout a été vérifié en local uniquement. |
| **IA branchée ?** | **Non.** Pas de clé Claude : les agents tournent en « mode sans IA » (affiché à l'écran). |
| **CI GitHub** | Elle **échouait sur `main` depuis l'origine** (variable `NEXTAUTH_SECRET` absente au build). Correctif sur la branche `fix/ci-build-env` (voir §8). |
| **Visibilité** | Le repo est **public**. À passer en privé si la plateforme reste interne. |

## 2. Stack

Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind 4 + shadcn/ui · Prisma 6 (**SQLite** aujourd'hui) · NextAuth 4 (identifiants e-mail / mot de passe) · SDK officiel Anthropic (`@anthropic-ai/sdk`, modèle `claude-opus-5-5`) · `qrcode`.
Le temps réel des animations se fait par **interrogation régulière** (1 à 4 s), sans WebSocket : compatible avec Vercel. `server.ts` (Socket.IO) vient de l'ancien projet ; les nouvelles fonctions n'en ont pas besoin.

## 3. Démarrer en local

```bash
npm ci
cp .env.example .env    # renseigner NEXTAUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD ; ANTHROPIC_API_KEY facultatif
npx prisma db push
ORGANIZER_EMAIL=stand@ansut.local ORGANIZER_PASSWORD='<10+ caractères>' npm run db:seed:itf2026   # événement + 11 séquences
npx tsx scripts/import-invitations-itf2026.ts       # partenaires : nécessite data/private/ (voir §5)
npx tsx scripts/seed-animations-itf2026.ts          # quiz + 4 activités prêts à l'emploi
USER_EMAIL=dg@ansut.local USER_PASSWORD='<10+ caractères>' USER_ROLE=ADMIN npx tsx scripts/create-user.ts   # compte DG
npm run build && npx next start                      # http://localhost:3000
```

Rôles : **ADMIN** = DG (seul à valider les courriers) · **ORGANIZER** = équipe du stand. Les deux accèdent à `/dashboard/stand`.
⚠️ `prisma/seed.ts` et `scripts/create-admin.ts` (ancien projet) contiennent des **mots de passe en dur** (`password`, `supersecret`) : ne pas les utiliser hors local ; utiliser `scripts/create-user.ts`.

## 4. Ce qui existe (écrans)

**Public (visiteurs)**

| URL | Rôle |
|---|---|
| `/` | Accueil aux couleurs ITF 2026, temps forts du stand |
| `/program` | Programme du stand par jour (issu de la matrice) |
| `/register` | Inscription au stand |
| `/checkin/[séquence]` | Pointage de présence (ouvert par le QR code de la séquence) |
| `/assistant` | Assistant du stand (agent IA) : répond sur le programme, enregistre les contacts |
| `/jouer` | Saisie du code à 6 chiffres → quiz ou activité en direct sur le téléphone |

**Équipe (connexion requise)**

| URL | Rôle |
|---|---|
| `/dashboard/stand` | Onglets **Invitations** · **Présences** · **Questions** (modération IA) · **Contacts** · **Bilan du jour** (DG) |
| `/dashboard/stand/qr` | Planche des 11 QR codes de pointage à imprimer |
| `/dashboard/stand/animations` | Création des quiz (manuelle ou générée par IA) et des activités |
| `/ecran/quiz/[id]` | Écran animateur / projection du quiz (code, QR, chrono, réponses, classement) |
| `/ecran/activite/[id]` | Projection d'une activité (nuage de mots, sondage, note sur 5, mur d'idées) |

### Les fonctions de l'an dernier sont conservées

Ce repo est une **copie complète de PanelEvent avec tout son historique** : rien n'a été retiré. On peut toujours créer des **événements**, leur ajouter des **panels**, et sur chaque panel des **questions du public** et des **sondages**, puis délivrer **attestations** et recueillir des **feedbacks**. Les 11 séquences du stand sont d'ailleurs elles-mêmes des panels du même modèle.

Vérifié en réel (`e2e/panels.e2e.cjs`, 17 contrôles) : création d'un événement « panel conférence », ajout d'un panel, sondage, question du public, et chargement de toutes les pages organisateur (`/dashboard/events/[id]` : programme, Q&A, sondages, participants, certificats) et publiques (`/e/[slug]`, `/events/[id]/qa`, `/polls`, `/feedback`).

Les **animations en direct** (quiz, nuage de mots, sondage, note, mur) sont **en plus** et ne sont pas encore rattachées à un panel : elles se lancent depuis `/dashboard/stand/animations`. Les rattacher à un panel est une évolution simple (ajouter `panelId` à `Quiz` et `LiveActivity`).

## 5. Données et confidentialité

- **Programme public** : `data/itf2026-sessions.json` (versionné) → lu par `src/config/event.ts`.
- **Matrice complète** (partenaires invités, contacts, statut courrier, validation DG) : `data/private/` — **jamais versionnée** (`.gitignore`), car le repo est public et les invitations ne sont pas encore validées par le DG.
  - Source : fichier Excel/CSV « Matrice_invitations_et_presence_ANSUT_ITF2026_V2.01 » → **à demander au porteur du projet** (non transmis par Git).
  - Conversion : `python3 scripts/matrice-to-json.py <matrice.csv>` régénère les deux JSON, puis relancer `seed-itf2026.ts` et `import-invitations-itf2026.ts` (idempotents).
- Les invités ne sont **jamais** affichés côté public ; le programme public ne montre que la direction ANSUT qui pilote chaque séquence.

## 6. Architecture (où est quoi)

```
src/config/event.ts          Événement (dates, lieu, signature) + séquences ; source unique
src/lib/ai.ts                Client Anthropic, generateText / generateJSON (Zod), repli de modèle, journal agent_runs
src/lib/stand.ts             Accès équipe (requireStaff, canValidate), rate limit, base de connaissance publique, courrier par modèle
src/lib/stand-labels.ts      Libellés partagés client/serveur
src/lib/agents/              invitation.ts · assistant.ts (outil save_contact) · moderation.ts · report.ts (+ report-types.ts)
src/lib/quiz.ts              Quiz : codes, points (500 + jusqu'à 500 selon la rapidité), transitions, génération IA des questions
src/lib/live.ts              Activités : types, validation des réponses, agrégation des résultats
src/app/api/stand/…          sessions, invitations (+ /draft), checkin, leads
src/app/api/agents/…         assistant, moderation, daily-report
src/app/api/live/…           quizzes (+ control, generate), activities, play/[code] (public : join / answer / respond)
src/components/brand/        Logo, logotype ITF, en-tête et pied de page
src/components/stand/        Panneaux du tableau de bord stand
src/components/live/         Joueur quiz, joueur activité, écrans, résultats, usePoll
prisma/schema.prisma         + Invitation, SessionAttendance, Lead, AgentRun, Quiz*, LiveActivity, LiveResponse
```

**Règles métier en place** (testées) :
- Seul le rôle ADMIN (DG) valide ou refuse un courrier. Un courrier ne peut être marqué « envoyé » qu'après validation. Toute modification d'un courrier validé le renvoie en validation.
- L'envoi se fait depuis la messagerie de l'agent (lien `mailto:`), puis « Marquer envoyé » : **aucun service d'e-mail n'est branché**.
- Quiz : pseudo unique, une réponse par question, réponse refusée après le temps imparti, bonne réponse jamais envoyée aux téléphones avant la révélation.
- Activités : nuage 3 mots par téléphone, sondage et note 1 vote, mur 2 idées ; fermeture possible ; identifiant anonyme du téléphone en `localStorage`.
- Sans `ANTHROPIC_API_KEY`, chaque agent le dit à l'écran et bascule sur un repli déterministe (jamais de faux texte IA). Chaque exécution d'agent est tracée dans `agent_runs`.

## 7. Ce qui a été vérifié — et ce qui ne l'a pas été

✅ **Vérifié en réel** (serveur de production local, navigateur Chromium, base SQLite) :
- `e2e/stand.e2e.cjs` — 17 contrôles : pointages (inscrit, anonyme, doublon), assistant sans IA, rédaction de courrier, refus 403/409, validation DG, bilan, modération, routes équipe fermées (401), 11 QR codes.
- `e2e/live.e2e.cjs` — 18 contrôles : partie de quiz à 3 téléphones (pseudo en double refusé, points à la rapidité, Bravo/Raté, podium), 4 activités (nuage, sondage, note 4,7/5, mur), vote multiple refusé, activité fermée, écran interdit sans connexion.
- Build de production OK ; lint sans erreur (avertissements hérités de l'ancien code).

❌ **Non vérifié** :
- **Les agents avec la vraie IA** (aucune clé disponible) : rédaction de courrier, assistant, regroupement des questions, bilan rédigé, génération de quiz.
- **Aucun déploiement**, donc rien testé en ligne, sur le Wi-Fi du Sofitel ou avec beaucoup de visiteurs simultanés.
- Fonctions héritées de PanelEvent non retestées (certificats, feedbacks, admin).

Lancer les tests (serveur démarré, base seedée) :
```bash
ORGANIZER_EMAIL=… ORGANIZER_PASSWORD=… node e2e/live.e2e.cjs
ORGANIZER_EMAIL=… ORGANIZER_PASSWORD=… DG_EMAIL=… DG_PASSWORD=… TOP_QUESTION_ID=… node e2e/stand.e2e.cjs
```
(Playwright n'est pas une dépendance du projet : `npm i -D playwright` puis `npx playwright install chromium` si besoin.)

## 8. À faire, par priorité (forum le 11 novembre)

1. **Fusionner `fix/ci-build-env`** (CI verte sur `main`) — prêt, en attente du GO.
2. **Base PostgreSQL** (Supabase recommandé) : passer `provider = "postgresql"` dans `schema.prisma`, `DATABASE_URL`, puis `prisma migrate` (aujourd'hui `db push`, pas de migrations versionnées). SQLite ne fonctionne pas sur Vercel.
3. **Déploiement** Vercel branché sur `main` + variables : `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (URL publique), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DATABASE_URL`, `ANTHROPIC_API_KEY`. Lancer les 3 scripts de seed + `create-user.ts` sur la base de production. **Accord du porteur requis.**
4. **Clé Claude** (dépense à valider) puis tester les 5 usages IA en réel.
5. **Accès du DG** : à la connexion, un ADMIN est redirigé vers `/admin`, dont le menu n'a pas de lien vers « Stand ANSUT » → ajouter le lien (ou rediriger vers `/dashboard/stand`).
6. Charger les **contacts e-mail** des partenaires dans la matrice (vides aujourd'hui) pour que « Ouvrir dans ma messagerie » soit utile.
7. Répétition générale sur le Wi-Fi du stand avec 20–30 téléphones (l'interrogation toutes les secondes est légère mais non testée à cette échelle).

**Sécurité (héritée de PanelEvent, à corriger avant mise en ligne)** :
- `POST /api/events/[id]/polls` : **aucune vérification de connexion** → n'importe qui peut créer un sondage.
- `POST /api/organizer/events` : enregistre le corps de la requête tel quel (`...body`) et l'autorise à **tout utilisateur connecté**, même participant → restreindre aux rôles ORGANIZER/ADMIN et lister les champs acceptés.

**Backlog / dette** : données fictives « 2024 » codées en dur dans plusieurs pages `/admin` · mots de passe en dur dans `prisma/seed.ts` et `scripts/create-admin.ts` · rate limit en mémoire (une seule instance) · `server.ts`/Socket.IO inutilisé par les nouvelles fonctions · liens réseaux sociaux ANSUT à confirmer (non affichés) · service d'envoi d'e-mails (Resend/Twilio) si l'envoi automatique est voulu · avertissements ESLint hérités.

## 9. Décisions prises (et pourquoi)

| Décision | Raison |
|---|---|
| Repo dédié `SOMET1010/ansut-stand-ivoire-tech-2026` | Un projet = un repo ; l'original reste intact |
| Matrice complète hors Git | Repo public, invitations non validées par le DG |
| Interrogation régulière au lieu de WebSocket | Fonctionne sur tout hébergement, y compris Vercel |
| Mode « sans IA » explicite | Le stand reste utilisable sans clé ; aucun faux succès affiché |
| Validation DG obligatoire avant envoi | Courriers officiels signés par le DG |
| Nom « Quiz Live ANSUT » | Mécanique de quiz en direct, sans reprendre de marque existante |
| Pas de montée de version majeure (Next 16, Prisma 7) | Risque trop élevé à 5 jours du forum |

## 10. Pièges connus

- **Ne pas pousser vers `akoun-dev/panelevent`** : vérifier `git remote -v` avant chaque push.
- `src/lib/auth.ts` exige `NEXTAUTH_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD` **dès le build** (cause de la CI rouge).
- Les heures « à confirmer » de la matrice sont stockées à 9 h 00 avec la description « Horaire à confirmer » ; l'affichage s'en sert (`timeLabel`). Trier les séquences par `order`, pas par heure.
- Les codes à 6 chiffres sont uniques **entre** quiz et activités (même écran `/jouer`).
