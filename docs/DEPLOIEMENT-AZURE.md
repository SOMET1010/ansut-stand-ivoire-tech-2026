# Déploiement Azure – Stand ANSUT · ITF 2026

> Cible : **Azure App Service (conteneur Linux)** dans l'abonnement **ANSUT DSI**, déployé par **Azure DevOps**.
> Démonstrations : **9 novembre 2026**. Aucune ressource ne doit être créée sans validation de la dépense.

## 1. Ce qui est prêt dans le dépôt

| Élément | Fichier | Vérifié |
|---|---|---|
| Image de l'application (Next.js standalone, utilisateur non-root, port 8080, sonde de santé) | `Dockerfile` cible `app` | Construite et lancée localement ; 4 suites e2e (94 contrôles) passées contre le conteneur |
| Image de migration (Prisma `migrate deploy` + seeds idempotents + compte DG) | `Dockerfile` cible `migrator` | Lancée 2 fois sur une base neuve : 0 doublon, compte DG **inchangé** au 2e passage |
| Migrations versionnées PostgreSQL | `prisma/migrations/` | Appliquées sur PostgreSQL 16 |
| Sonde de santé (app + base) | `GET /api/health` → 200 / 503 | 200 base joignable, 503 base coupée |
| Pipeline Azure DevOps | `azure-pipelines.yml` | YAML valide ; **non exécuté** (pas d'accès à Azure DevOps ANSUT depuis la session de développement) |
| Web App sur plan existant (IaC) | `infra/azure/webapp.bicep` | **Non exécuté** |

Principes : la **compilation ne touche jamais la base** ; les migrations sont une étape séparée, précédée d'une validation (environnement `ansut-stand-recette`) ; le **mot de passe du DG n'est jamais réinitialisé** par un déploiement (`scripts/bootstrap-accounts.ts` ne crée le compte que s'il n'existe pas).

## 2. Inventaire à faire AVANT toute création (DSI, lecture seule)

```bash
az account show --query "{abonnement:name, id:id}"
az appservice plan list --query "[?kind=='linux'].{plan:name, rg:resourceGroup, sku:sku.name, sites:numberOfSites, region:location}" -o table
az acr list --query "[].{acr:name, rg:resourceGroup, serveur:loginServer, sku:sku.name}" -o table
az postgres flexible-server list --query "[].{serveur:name, rg:resourceGroup, sku:sku.name, version:version}" -o table
az webapp list --query "[].{app:name, rg:resourceGroup, plan:appServicePlanId}" -o table
```

Ce qu'on cherche : **un plan App Service Linux existant avec de la capacité** (pas de nouveau coût de calcul), **l'ACR existant** de l'ANSUT, et **un serveur PostgreSQL** existant ou une décision de base (§ 4).

## 3. Mise en place (une fois l'inventaire validé)

1. **Web App** sur le plan existant (aucun nouveau plan) :
   ```bash
   az deployment group what-if -g <rg> -f infra/azure/webapp.bicep -p planName=<plan> acrLoginServer=<acr>.azurecr.io
   az deployment group create  -g <rg> -f infra/azure/webapp.bicep -p planName=<plan> acrLoginServer=<acr>.azurecr.io
   az role assignment create --assignee <principalId en sortie> --role AcrPull --scope $(az acr show -n <acr> --query id -o tsv)
   ```
2. **Azure DevOps** (projet ANSUT) :
   - Pipeline sur `SOMET1010/ansut-stand-ivoire-tech-2026`, fichier `azure-pipelines.yml`.
   - Groupe de variables **`ansut-stand-itf2026`** : `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` (ex. `openssl rand -base64 32`), `ORGANIZER_EMAIL`, `ORGANIZER_PASSWORD`, `DG_EMAIL`, `DG_PASSWORD` (≥ 12 caractères), `ANTHROPIC_API_KEY` (facultatif) — tous en **secret** sauf les e-mails.
   - Environnement **`ansut-stand-recette`** avec validation manuelle.
   - Paramètres du pipeline : `acrConnection`, `acrLoginServer`, `azureConnection`, `webAppName`, `resourceGroup` (valeurs « A_DEFINIR » à remplacer).
3. **Lancer le pipeline** : CI → images → (validation) migrations → déploiement → tests de fumée HTTPS.
4. **Invitations** (données privées, hors Git) : depuis un poste ayant accès à la base,
   `DATABASE_URL=… DIRECT_URL=… npx tsx scripts/import-invitations-itf2026.ts data/private/itf2026-sessions-full.json`.

URL de recette attendue : `https://app-ansut-stand-itf2026-recette.azurewebsites.net` (HTTPS fourni par App Service).

## 4. Base PostgreSQL : décision à prendre

| Option | Coût | Délai | Remarque |
|---|---|---|---|
| Serveur **Azure Database for PostgreSQL Flexible** existant : nouvelle base `ansut_stand` | 0 € de plus | Minutes | Base séparée, aucune table des autres applications touchée |
| Nouveau serveur Flexible **Burstable B1ms** | ≈ 15 à 20 €/mois | ~15 min | Validation de dépense requise |
| Supabase (déjà utilisé par l'ANSUT, groupe de variables `SUPABASE`) | Selon offre | Minutes | Pooler 6543 → `DATABASE_URL` (`?pgbouncer=true&connection_limit=1`), session 5432 → `DIRECT_URL` |

## 5. Points d'attention

- **Réseau** : l'agent CD (`ANSUT-CI-POOL`) et la Web App doivent joindre PostgreSQL (règle de pare-feu ou intégration VNet).
- **Une seule instance** recommandée pour la démo : la limitation de débit et le budget IA sont en mémoire.
- **Ne rien toucher aux applications existantes** : la Web App, l'image et la base sont dédiées (`ansut-stand*`).
- Retour arrière : redéployer l'image précédente (`AzureWebAppContainer` avec l'ancien tag) ; les migrations sont additives.

## 6. Publication réalisée le 9 novembre 2026

**URL de recette : https://app-ansut-stand-itf2026.azurewebsites.net** (HTTPS, `GET /api/health` → `{"status":"ok","db":"ok"}`).

| Ressource | Valeur |
|---|---|
| Abonnement / groupe | ANSUT DSI / `rg-kokoman-recette` (seul groupe accessible ; ressources Kokoman non modifiées) |
| Plan App Service | `asp-ansut-stand-itf2026`, Linux **B1**, 1 instance, **France Central** (West Europe sans capacité B1 ce jour) |
| Web App | `app-ansut-stand-itf2026`, Node 20 LTS, `node server.js`, HTTPS seul, TLS 1.2, Always On, sonde `/api/health`, étiquettes `projet=ansut-stand-itf2026`, `a-supprimer-apres=2026-11-30` |
| Base | Supabase `ansut-stand-itf2026` (eu-west-3 Paris), pooler 6543 (`DATABASE_URL`) / 5432 (`DIRECT_URL`), RLS activé sur toutes les tables (Prisma se connecte en `postgres`) |
| Secrets | Paramètres d'application de la Web App uniquement (jamais dans Git) |

Voie de publication utilisée : **paquet Next.js standalone déployé par Kudu (zipdeploy)**, compilé à partir du commit `9b153a3`, sans registre de conteneurs (aucun ACR ni connexion de service ARM dans le projet Azure DevOps PASS-Patrick-Dev). Migrations et seeds : appliqués sur un PostgreSQL 17 local puis rejoués dans Supabase via l'API de gestion (le conteneur de développement n'ouvre pas les ports 5432/6543). Le pipeline `azure-pipelines.yml` reste la cible pour les prochaines versions, une fois une connexion de service créée.

Recette sur l'URL HTTPS (données fictives, base remise à l'état initial ensuite) : `panels` 17/17, `live` 18/18, `securite` 39/39 (10a-10c repli IA : test local uniquement, non applicable), `stand` 17/17 (28 invitations importées depuis la matrice privée, hors Git ; questions de test fictives). Total : 91 contrôles réussis sur l'URL HTTPS.

## 7. Suppression après le forum (ressources `ansut-stand*` uniquement)

```bash
# Azure : supprimer la Web App PUIS le plan (ne JAMAIS supprimer le groupe rg-kokoman-recette)
az webapp delete -g rg-kokoman-recette -n app-ansut-stand-itf2026
az appservice plan delete -g rg-kokoman-recette -n asp-ansut-stand-itf2026 --yes
# Vérifier qu'il ne reste que les ressources Kokoman
az resource list -g rg-kokoman-recette --query "[].name" -o tsv
```

Supabase : exporter si besoin (`pg_dump`), puis Dashboard → projet `ansut-stand-itf2026` → Settings → General → *Delete project* (ou *Pause project* pour garder les données sans calcul).
