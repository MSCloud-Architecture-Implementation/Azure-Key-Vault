# Manual deployment guide

This guide explains how another operator can deploy the same infrastructure with the ARM template [`azuredeploy.json`](./azuredeploy.json), using either Bash or PowerShell and Azure CLI. The commands are examples: replace the subscription, resource group, region, or Entra object ID if deploying into a different environment.

## What this deploys

- A private Windows Server 2022 Azure Edition VM (`Standard_D2s_v5` by default) with a system-assigned managed identity.
- A VNet with separate VM and private-endpoint subnets. The VM has no public IP.
- A standard Key Vault with RBAC authorization and public network access disabled, plus a private endpoint and private DNS zone.
- A Key Vault secret named `vm-admin-password` containing the VM's local administrator password.
- A Log Analytics workspace, Microsoft Sentinel onboarding, and the Defender for Cloud alert connector.
- An Azure Monitor data collection rule and VM agent extensions.
- Key Vault audit-event diagnostics to Log Analytics.
- An optional subscription-level Defender for Servers Standard P1 change, **disabled by default** because it is billable.

The VM is private-only and this configuration assumes your network already provides the VM outbound connectivity needed by its extensions. It does not create a NAT Gateway, VPN, or Bastion host.

## Prerequisites

1. An Azure subscription with permission to create the resources and role assignments. Subscription-level `Microsoft.Security/pricings` permission is needed only if explicitly enabling Defender for Servers.
2. Azure CLI installed and authenticated. See [Install Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli).
3. The ARM template file in your working directory. Keep the template and parameter file in a private working folder; do not commit parameter files containing credentials.
4. `jq` installed if using the Bash example.
5. PowerShell 7 or later if using the PowerShell example.
6. A globally unique Key Vault name. The template's default is derived from the subscription and resource group; if Azure reports that it is already taken, supply a different `keyVaultName`.
7. A strong local administrator password. The examples prompt for it and write it briefly to a permission-restricted temporary parameter file. The password is never printed. The Key Vault data plane is private-only, so retrieve the secret later from a network location that can resolve and reach the private endpoint.

## 1. Choose the target and authenticate

The deployment values used for the original environment were:

```text
Subscription ID: YOUR_SUBSCRIPTION_ID
Resource group:  YOUR_RESOURCE_GROUP
Region:          westus
```

### Bash

```bash
az login --tenant YOUR_TENANT_ID
az account set --subscription YOUR_SUBSCRIPTION_ID
az account show --query '{name:name,id:id,tenantId:tenantId}' -o json
```

### PowerShell

```powershell
az login --tenant YOUR_TENANT_ID
az account set --subscription YOUR_SUBSCRIPTION_ID
az account show --query "{name:name,id:id,tenantId:tenantId}" -o json
```

Check that the output shows the intended subscription before continuing. If your target subscription belongs to another tenant, use that tenant's ID with `az login`.

## 2. Review policy, cost, and existing resources

Review policy assignments and their effects before deployment. For example, the subscription used for the recorded deployment had a VM backup policy with `AuditIfNotExists`; this template does not create a Recovery Services vault or configure VM backup.

```bash
az policy assignment list \
  --subscription YOUR_SUBSCRIPTION_ID \
  --query '[].{displayName:displayName,scope:scope,parameters:parameters}' \
  -o table
```

Check whether the target resource group already exists:

```bash
az group show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --name YOUR_RESOURCE_GROUP \
  --query '{name:name,location:location,id:id}' \
  -o json
```

If it does not exist, create it in the chosen region:

```bash
az group create \
  --subscription YOUR_SUBSCRIPTION_ID \
  --name YOUR_RESOURCE_GROUP \
  --location westus
```

Review the current Defender for Servers plan before deploying. The template defaults `enableDefenderForServers` to `false` and will leave the plan unchanged:

```bash
az security pricing show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --name VirtualMachines \
  --query '{pricingTier:pricingTier,subPlan:subPlan}' \
  -o json
```

Setting `enableDefenderForServers=true` changes the Defender for Servers plan at **subscription scope** to Standard P1 and can incur charges. Review and explicitly approve that change before enabling it.

## 3. Set the Entra login principal

To grant the currently signed-in Entra user the `Virtual Machine Administrator Login` role on the VM, get the user object ID:

```bash
az ad signed-in-user show --query id -o tsv
```

Use the resulting object ID for `entraLoginPrincipalId`. To grant a group instead, provide that group's Entra object ID. Leave it empty to omit this assignment and grant VM login access separately.

## 4. Validate and preview before deployment

Both examples below create a temporary parameter file containing the secure password. They run template validation and `what-if` before deployment. Read the full preview and only proceed if its target scope and planned changes are expected.

### Bash workflow

Run from the directory containing `azuredeploy.json`. Change the variables near the top if needed.

```bash
set -euo pipefail

SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
RESOURCE_GROUP="YOUR_RESOURCE_GROUP"
LOCATION="westus"
TEMPLATE_FILE="./azuredeploy.json"
DEPLOYMENT_NAME="YOUR_DEPLOYMENT_NAME"
ENTRA_LOGIN_PRINCIPAL_ID="replace-with-Entra-object-id"

read -r -s -p "Enter a strong local VM administrator password: " ADMIN_PASSWORD
printf '\n'
if [ "${#ADMIN_PASSWORD}" -lt 12 ]; then
  echo "Password must be at least 12 characters." >&2
  unset ADMIN_PASSWORD
  exit 1
fi

PARAMETER_FILE="$(mktemp "${TMPDIR:-/tmp}/azure-arm-params.XXXXXX.json")"
chmod 600 "$PARAMETER_FILE"
cleanup() {
  rm -f "$PARAMETER_FILE"
  unset ADMIN_PASSWORD
}
trap cleanup EXIT

jq -n \
  --arg password "$ADMIN_PASSWORD" \
  --arg location "$LOCATION" \
  --arg principalId "$ENTRA_LOGIN_PRINCIPAL_ID" \
  '{
    adminPassword: {value: $password},
    location: {value: $location},
    entraLoginPrincipalId: {value: $principalId},
    enableDefenderForServers: {value: false}
  }' > "$PARAMETER_FILE"

az deployment group validate \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$TEMPLATE_FILE" \
  --parameters @"$PARAMETER_FILE" \
  --query '{error:error,provisioningState:properties.provisioningState}' \
  -o json

az deployment group what-if \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$TEMPLATE_FILE" \
  --parameters @"$PARAMETER_FILE" \
  --result-format ResourceIdOnly \
  -o json

read -r -p "If the preview is expected, deploy now? Type yes to continue: " APPROVE
if [ "$APPROVE" != "yes" ]; then
  echo "Deployment cancelled."
  exit 0
fi

az deployment group create \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DEPLOYMENT_NAME" \
  --template-file "$TEMPLATE_FILE" \
  --parameters @"$PARAMETER_FILE" \
  --mode Incremental \
  --query '{name:name,provisioningState:properties.provisioningState,correlationId:properties.correlationId,outputs:properties.outputs}' \
  -o json

# The original deployment explicitly synchronized the generated local admin
# password after ARM deployment. This CLI operation briefly passes it as an
# argument; run only in a trusted environment and avoid shell tracing/debug logs.
az vm user update \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$(az deployment group show --subscription "$SUBSCRIPTION_ID" --resource-group "$RESOURCE_GROUP" --name "$DEPLOYMENT_NAME" --query properties.outputs.virtualMachineId.value -o tsv | awk -F/ '{print $NF}')" \
  --username azureadmin \
  --password "$ADMIN_PASSWORD" \
  --only-show-errors \
  -o none
```

### PowerShell workflow

Run from the directory containing `azuredeploy.json`. This uses PowerShell 7's `ConvertFrom-SecureString -AsPlainText`; the short-lived parameter file is restricted to the current user on Windows or set to mode `600` on Unix-like systems.

```powershell
$ErrorActionPreference = 'Stop'

$subscriptionId = 'YOUR_SUBSCRIPTION_ID'
$resourceGroup = 'YOUR_RESOURCE_GROUP'
$location = 'westus'
$templateFile = './azuredeploy.json'
$deploymentName = 'YOUR_DEPLOYMENT_NAME'
$entraLoginPrincipalId = 'replace-with-Entra-object-id'

$securePassword = Read-Host 'Enter a strong local VM administrator password' -AsSecureString
$adminPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
if ($adminPassword.Length -lt 12) {
    $adminPassword = $null
    throw 'Password must be at least 12 characters.'
}

$parameterFile = Join-Path ([System.IO.Path]::GetTempPath()) ([guid]::NewGuid().ToString() + '.json')
try {
    $parameters = @{
        adminPassword = @{ value = $adminPassword }
        location = @{ value = $location }
        entraLoginPrincipalId = @{ value = $entraLoginPrincipalId }
        enableDefenderForServers = @{ value = $false }
    }
    $parameters | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $parameterFile -Encoding utf8NoBOM

    if ($IsWindows) {
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        icacls $parameterFile /inheritance:r /grant:r "${identity}:(R,W)" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'Could not restrict parameter-file permissions.' }
    }
    else {
        chmod 600 $parameterFile
        if ($LASTEXITCODE -ne 0) { throw 'Could not restrict parameter-file permissions.' }
    }

    az deployment group validate `
      --subscription $subscriptionId `
      --resource-group $resourceGroup `
      --template-file $templateFile `
      --parameters "@$parameterFile" `
      --query "{error:error,provisioningState:properties.provisioningState}" `
      -o json
    if ($LASTEXITCODE -ne 0) { throw 'ARM validation failed.' }

    az deployment group what-if `
      --subscription $subscriptionId `
      --resource-group $resourceGroup `
      --template-file $templateFile `
      --parameters "@$parameterFile" `
      --result-format ResourceIdOnly `
      -o json
    if ($LASTEXITCODE -ne 0) { throw 'What-if preview failed.' }

    $approval = Read-Host 'If the preview is expected, type yes to deploy'
    if ($approval -cne 'yes') {
        Write-Host 'Deployment cancelled.'
        return
    }

    az deployment group create `
      --subscription $subscriptionId `
      --resource-group $resourceGroup `
      --name $deploymentName `
      --template-file $templateFile `
      --parameters "@$parameterFile" `
      --mode Incremental `
      --query "{name:name,provisioningState:properties.provisioningState,correlationId:properties.correlationId,outputs:properties.outputs}" `
      -o json
    if ($LASTEXITCODE -ne 0) { throw 'ARM deployment failed.' }

    # The original deployment explicitly synchronized the local admin password
    # after ARM deployment. This briefly passes it as a CLI argument; use only
    # in a trusted environment and avoid shell tracing/debug logs.
    $vmName = az deployment group show `
      --subscription $subscriptionId `
      --resource-group $resourceGroup `
      --name $deploymentName `
      --query 'properties.outputs.virtualMachineId.value' `
      -o tsv
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the deployed VM resource ID.' }

    $vmName = ($vmName -split '/')[-1]
    az vm user update `
      --subscription $subscriptionId `
      --resource-group $resourceGroup `
      --name $vmName `
      --username azureadmin `
      --password $adminPassword `
      --only-show-errors `
      -o none
    if ($LASTEXITCODE -ne 0) { throw 'VM administrator password synchronization failed.' }
}
finally {
    if (Test-Path -LiteralPath $parameterFile) {
        Remove-Item -LiteralPath $parameterFile -Force
    }
    $adminPassword = $null
    $securePassword.Dispose()
}
```

> The temporary file is removed at script exit, but deletion cannot guarantee forensic erasure on every filesystem. Use a trusted machine with disk encryption and follow your organization's secret-handling requirements. The post-deployment `az vm user update --password` step passes the password briefly as a process argument; if that is not acceptable in your environment, use your approved VM credential-reset workflow instead.

## 5. Verify the deployment

Check the ARM deployment result:

```bash
az deployment group show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_DEPLOYMENT_NAME \
  --query '{name:name,state:properties.provisioningState,correlationId:properties.correlationId}' \
  -o json
```

List deployed resources:

```bash
az resource list \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --query '[].{name:name,type:type,location:location}' \
  -o table
```

Check the VM power state and addresses:

```bash
az vm show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_VM_NAME \
  --show-details \
  --query '{name:name,powerState:powerState,privateIps:privateIps,publicIps:publicIps}' \
  -o json
```

Check Key Vault networking:

```bash
az keyvault show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_KEY_VAULT_NAME \
  --query '{name:name,publicNetworkAccess:properties.publicNetworkAccess,enableRbacAuthorization:properties.enableRbacAuthorization}' \
  -o json
```

Check Defender pricing stayed unchanged:

```bash
az security pricing show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --name VirtualMachines \
  --query '{pricingTier:pricingTier,subPlan:subPlan}' \
  -o json
```

## 6. Access and ongoing operations

- **VM access:** The VM has no public IP. Connect from a host with private connectivity to the VNet (for example, VPN or peering), or separately deploy/configure Bastion or a jump host. The template does not configure those services.
- **Key Vault secret:** The secret `vm-admin-password` can only be retrieved from an authorized identity with data-plane access and a network path to the private endpoint. A command such as `az keyvault secret show` from a machine outside the VNet will normally fail because public network access is disabled.
- **Outbound connectivity:** The template assumes egress already exists for VM setup and extensions. No NAT Gateway or other egress path is provisioned.
- **Monitoring costs:** The workspace has 30-day retention. Sentinel and Log Analytics ingestion are usage-billed.
- **Other costs:** VM compute, OS disk, private endpoint, and related network services may incur charges.
- **Defender:** Standard P1 is an opt-in subscription-level billable change. It is deliberately disabled by default.
- **Backup:** Review the subscription's VM backup policy and configure a Recovery Services vault/backup policy separately if required.
- **Incremental deployments:** Azure resource-group deployments use incremental mode here. Re-running the template can update resources with matching names; always run validation and `what-if` and inspect the preview first.

