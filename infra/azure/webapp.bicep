// Web App de recette pour le stand ANSUT – ITF 2026, sur un plan App Service EXISTANT.
// Rien n'est créé tant que ce fichier n'est pas déployé explicitement (az deployment group create).
// Aucun nouveau plan : la Web App réutilise un plan Linux déjà payé par l'ANSUT (pas de coût de calcul ajouté
// si le plan a de la capacité). Les secrets sont posés ensuite par le pipeline (AzureAppServiceSettings).
//
//   az deployment group what-if -g <rg> -f infra/azure/webapp.bicep -p planName=<plan> acrLoginServer=<acr>.azurecr.io
//   az deployment group create  -g <rg> -f infra/azure/webapp.bicep -p planName=<plan> acrLoginServer=<acr>.azurecr.io

@description('Nom de la Web App (unique dans Azure : <nom>.azurewebsites.net)')
param webAppName string = 'app-ansut-stand-itf2026-recette'

@description('Plan App Service Linux EXISTANT, dans le même groupe de ressources')
param planName string

@description('Serveur de l’ACR, ex. monacr.azurecr.io')
param acrLoginServer string

@description('Région (par défaut celle du groupe de ressources)')
param location string = resourceGroup().location

resource plan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: planName
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: { type: 'SystemAssigned' } // pour tirer l'image de l'ACR sans mot de passe (rôle AcrPull)
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/ansut-stand:latest'
      acrUseManagedIdentityCreds: true
      alwaysOn: true
      healthCheckPath: '/api/health'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      appSettings: [
        { name: 'WEBSITES_PORT', value: '8080' }
        { name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE', value: 'false' }
      ]
    }
  }
}

output url string = 'https://${webApp.properties.defaultHostName}'
output principalId string = webApp.identity.principalId
