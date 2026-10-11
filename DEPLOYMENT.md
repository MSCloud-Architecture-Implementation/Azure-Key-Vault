# Azure deployment record

This document records the architecture implementation, deployment workflow, checks, and final state for the resources deployed from [`azuredeploy.json`](./azuredeploy.json).

## Deployment summary

| Setting | Value |
| --- | --- |
| Subscription | `REDACTED_SUBSCRIPTION_NAME` (`YOUR_SUBSCRIPTION_ID`) |
| Tenant | `YOUR_TENANT_ID` |
| Resource group | `YOUR_RESOURCE_GROUP` |
| Region | `westus` |
| ARM deployment | `YOUR_DEPLOYMENT_NAME` |
| Final deployment state | `Succeeded` |
| Deployment correlation ID | `REDACTED_CORRELATION_ID` |
| Defender for Servers plan | Left at `Free`; no subscription pricing change |

The deployment created a private Windows Server 2022 VM, virtual network, private Key Vault endpoint and DNS, Log Analytics workspace, Sentinel onboarding, Defender for Cloud alert connector, and Azure Monitor collection resources. It did not create a public IP, NAT Gateway, or Bastion host.

## Resources deployed

The resource names are deterministic for the selected subscription/resource group unless otherwise noted.

| Resource | Name | Details |
| --- | --- | --- |
| Resource group | `YOUR_RESOURCE_GROUP` | `westus` |
| Virtual network | `YOUR_VNET_NAME` | `REDACTED_VNET_CIDR` |
| VM subnet | `snet-vm` | `REDACTED_VM_SUBNET_CIDR` |
| Private endpoint subnet | `snet-private-endpoints` | `REDACTED_PRIVATE_ENDPOINT_SUBNET_CIDR` |
| Network security group | `YOUR_VNET_NAME-nsg` | No custom inbound rules |
| Windows VM | `YOUR_VM_NAME` | Windows Server 2022 Azure Edition, `Standard_D2s_v5`, private IP `REDACTED_PRIVATE_IP`, system-assigned managed identity |
| VM NIC and OS disk | `YOUR_VM_NAME-nic`, generated OS disk | VM has no public IP |
| VM extensions | `AADLoginForWindows`, `AzureMonitorWindowsAgent`, `enablevmaccess` | Entra sign-in, Azure Monitor agent, and local admin account reset |
| Key Vault | `YOUR_KEY_VAULT_NAME` | RBAC authorization enabled; public network access disabled |
| Key Vault secret | `vm-admin-password` | Random local admin password stored in Key Vault |
| VM to Key Vault authorization | `Key Vault Secrets User` | Assigned to the VM's system-assigned identity, scoped to the vault |
| Private endpoint | `YOUR_PRIVATE_ENDPOINT_NAME` | Approved connection to Key Vault |
| Private DNS zone | `privatelink.vaultcore.azure.net` | Linked to the VNet |
| Log Analytics workspace | `YOUR_LOG_ANALYTICS_WORKSPACE` | 30-day retention |
| Microsoft Sentinel | Workspace onboarding state | Enabled on the Log Analytics workspace |
| Defender for Cloud connector | `AzureSecurityCenter` data connector | Subscription alert ingestion enabled |
| Data collection rule | `YOUR_DCR_NAME` | Windows performance counters and selected Windows event logs |
| Data collection rule association | `windowsTelemetry` | Associated with the VM |
| Key Vault diagnostic setting | `sendKeyVaultAuditLogs` | Sends Key Vault audit events to Log Analytics |

## Workflow executed

### 1. Confirm subscription and region

The Azure CLI session was checked and confirmed to use subscription `YOUR_SUBSCRIPTION_ID`. The resource group was not already present.

### 2. Review subscription policies

Subscription policy assignments were reviewed before deployment. The `Azure Backup should be enabled for Virtual Machines` assignment uses `AuditIfNotExists` by default; backup was not part of the requested architecture. Other assigned security benchmark policies and custom policies were also inspected.

### 3. Create the resource group

```bash
az group create \
  --subscription YOUR_SUBSCRIPTION_ID \
  --name YOUR_RESOURCE_GROUP \
  --location westus
```

### 4. Inspect and prepare the ARM template

The ARM template was created as [`azuredeploy.json`](./azuredeploy.json). It accepts the VM administrator password as a `secureString`, uses a system-assigned managed identity, disables public network access to Key Vault, and does not attach a public IP to the VM.

The existing Azure subscription had Defender for Servers pricing set to `Free`. The initial preview showed that enabling the diagram's Defender for Servers Standard P1 plan would change subscription-wide pricing. At the user's direction, the plan was left at `Free`; the template now defaults `enableDefenderForServers` to `false`.

### 5. Validate the template and preview changes

Azure-side ARM validation succeeded:

```bash
az deployment group validate \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --template-file azuredeploy.json \
  --parameters location=westus enableDefenderForServers=false \
  --parameters adminPassword='<temporary validation value>' \
              entraLoginPrincipalId='<Entra object ID>'
```

The deployment was previewed with `what-if` before applying changes:

```bash
az deployment group what-if \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --template-file azuredeploy.json \
  --parameters location=westus enableDefenderForServers=false \
  --parameters adminPassword='<temporary validation value>' \
              entraLoginPrincipalId='<Entra object ID>' \
  --result-format ResourceIdOnly
```

After setting Defender to `false`, the preview showed changes scoped to `YOUR_RESOURCE_GROUP`; it no longer showed a subscription-level Defender pricing update.

### 6. Deploy incrementally

The deployment used ARM incremental mode. A random administrator password was generated locally for the deployment process, placed in a permission-restricted temporary parameter file, passed to Azure CLI, and the temporary file was removed on exit. The password was not written in this document or sent in chat.

The deployment also passed the signed-in Entra user's object ID as `entraLoginPrincipalId`, to grant the user the `Virtual Machine Administrator Login` role scoped to the VM.

Equivalent command shape (without credentials):

```bash
az deployment group create \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_DEPLOYMENT_NAME \
  --template-file azuredeploy.json \
  --parameters @<secure-temporary-parameters-file> \
  --mode Incremental
```

### 7. Synchronize the VM local administrator password

After ARM deployment, `az vm user update` was run for local account `azureadmin` using the same generated password. Azure reported that the VM access extension successfully updated the administrator account and enabled Remote Desktop. No password value is recorded here.

### 8. Verify the deployment

The deployment record reported `Succeeded`. Checks confirmed:

- VM power state is `VM running`, with private IP `REDACTED_PRIVATE_IP` and no public IP.
- `AADLoginForWindows` and `AzureMonitorWindowsAgent` reported `Provisioning succeeded`.
- The Key Vault private endpoint connection state is `Approved`.
- Key Vault has RBAC authorization enabled and public network access disabled.
- The VM identity has the `Key Vault Secrets User` role on the vault.
- The signed-in Entra user has `Virtual Machine Administrator Login` on the VM.
- The Key Vault secret resource `vm-admin-password` exists.
- Microsoft Sentinel onboarding and the `AzureSecurityCenter` alerts connector exist.
- Defender for Servers still reports `Free`.

## Deployment troubleshooting history

The initial deployment attempt created some resources before failing. The deployment was retried incrementally after the template issues were fixed; resources already present were retained.

| Azure error | Resolution |
| --- | --- |
| Template dependency referred to a nested deployment resource not declared at the parent level | Removed the invalid dependency; the subscription-scoped nested deployment remains conditional on the Defender parameter. |
| `AADLoginForWindows` does not support `enableAutomaticUpgrade` | Removed that property from the Entra login VM extension. |
| VM Administrator Login role definition was not found | Corrected the built-in role definition ID to `1c0163c0-47e6-4577-8991-ea5c82e286e4`. |
| Windows event stream was not available in the Log Analytics destination | Changed the data collection stream to `Microsoft-Event`, the supported stream for Windows event logs. |
| Legacy Sentinel gallery solution update failed because `plan.promotionCode` was null | Removed the non-idempotent gallery-solution resource from the template. The Sentinel solution had already been created by the first attempt; onboarding and the alert connector remain represented separately in the template. |

## Access and operational notes

- The VM is private-only. Connect from a network that can reach its VNet, such as an appropriately configured VPN, peered VNet, jump host, or a subsequently deployed Azure Bastion. This deployment did not create Bastion or a VPN.
- The deployment assumes existing outbound egress for the VM and extensions; no NAT Gateway was added.
- The local Windows administrator password is held in Key Vault as `vm-admin-password`. Retrieve it only through an authorized, secure process; rotate it after initial setup and follow your credential-handling policy.
- The VM also has Entra-based login enabled. The user/group role assignment is scoped to the VM.
- The subscription's VM backup policy is audit-oriented (`AuditIfNotExists`). No Recovery Services vault or backup policy was created.
- The workspace is configured for 30-day retention. Sentinel ingestion and Log Analytics data ingestion may incur usage charges.
- The deployment intentionally left Defender for Servers at the subscription's existing Free tier. Enabling Standard P1 later is a subscription-wide, billable change and should be reviewed separately.
- VM compute, managed disks, private endpoint, and related network resources can incur charges.

## Redeploy or inspect

Check the final ARM deployment:

```bash
az deployment group show \
  --subscription YOUR_SUBSCRIPTION_ID \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_DEPLOYMENT_NAME \
  --query '{name:name,state:properties.provisioningState,correlationId:properties.correlationId}' \
  -o json
```

Before any future template update, run `az deployment group validate` and `az deployment group what-if` again. Use a secure parameter file or another approved secret-delivery mechanism for `adminPassword`; never put a real password literal in shell history, source control, or this document.
