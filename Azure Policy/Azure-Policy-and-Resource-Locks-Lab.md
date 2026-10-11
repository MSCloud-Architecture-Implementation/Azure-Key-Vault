# Azure Policy and Resource Locks Lab

This guide deploys and verifies an isolated Azure governance lab in subscription
`621e2594-c71a-4321-819b-70a70530dd8e`.

## Lab scope and deployed resources

The lab is limited to resource group `rg-policy-lock-lab-westus2` in `westus2`.
It contains:

- The built-in **Allowed locations** policy, configured to deny resources
  outside West US 2.
- A custom **Require environment tag** policy, configured to deny supported
  resources that are missing the `environment` tag.
- Storage account `stpl621e2594wus2a7` (StorageV2, Standard_LRS) tagged for the
  lab and protected by a `CanNotDelete` lock.

The two policy assignments are scoped to the lab resource group. The custom
policy **definition** is registered at subscription scope because Azure custom
policy definitions are created at subscription or management-group scope; the
definition itself does not enforce anything until assigned. No policy
assignment or resource lock is applied to the rest of the subscription.

The Storage account may incur a small ongoing charge. Remove the lab when it is
no longer needed, following the cleanup steps below.

## Prerequisites

- Azure CLI installed and signed in with permission to create resource groups,
  policy definitions and assignments, Storage accounts, and resource locks.
- The subscription's `Microsoft.Storage` and `Microsoft.PolicyInsights`
  providers registered. They were already registered for this deployment.

Set the subscription explicitly before running commands:

```bash
SUBSCRIPTION_ID="621e2594-c71a-4321-819b-70a70530dd8e"
RG="rg-policy-lock-lab-westus2"
LOCATION="westus2"
STORAGE_ACCOUNT="stpl621e2594wus2a7"
SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}"

az login
az account set --subscription "$SUBSCRIPTION_ID"
az account show --query '{id:id,name:name}' --output table
```

If using different names, Storage account names must be globally unique, 3–24
characters, and contain only lowercase letters and numbers. The two temporary
test account names below must also be unused; substitute unique names if needed.

## Deployment steps

### 1. Create the dedicated lab resource group

```bash
az group create \
  --name "$RG" \
  --location "$LOCATION" \
  --subscription "$SUBSCRIPTION_ID" \
  --tags environment=lab purpose=azure-policy-lock-lab
```

### 2. Assign the built-in location policy

The built-in policy definition ID is
`/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c`.
The `Deny` effect is the built-in default.

```bash
az policy assignment create \
  --name lab-allowed-locations \
  --display-name "Lab: allow West US 2 only" \
  --description "Denies lab resources deployed outside West US 2." \
  --scope "$SCOPE" \
  --policy e56962a6-4747-49cd-b67b-bf8b01975c4c \
  --params '{"listOfAllowedLocations":{"value":["westus2"]}}' \
  --subscription "$SUBSCRIPTION_ID"
```

### 3. Create and assign the custom tag policy

Create a local JSON file for the custom definition:

```bash
cat > require-environment-tag.json <<'JSON'
{
  "if": {
    "field": "tags['environment']",
    "exists": "false"
  },
  "then": {
    "effect": "deny"
  }
}
JSON
```

Create the definition at subscription scope, then assign it only to the lab
resource group:

```bash
az policy definition create \
  --name lab-require-environment-tag \
  --display-name "Lab: require environment tag" \
  --description "Denies indexed resources in the lab resource group when the environment tag is missing." \
  --mode Indexed \
  --rules @require-environment-tag.json \
  --subscription "$SUBSCRIPTION_ID"

az policy assignment create \
  --name lab-require-environment-tag \
  --display-name "Lab: require environment tag" \
  --description "Denies lab resources without the environment tag." \
  --scope "$SCOPE" \
  --policy "/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.Authorization/policyDefinitions/lab-require-environment-tag" \
  --subscription "$SUBSCRIPTION_ID"
```

### 4. Create a compliant sample Storage account

The required tag and allowed location are supplied at creation:

```bash
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --tags environment=lab purpose=azure-policy-lock-lab \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --subscription "$SUBSCRIPTION_ID"
```

### 5. Protect the sample with a deletion lock

```bash
az lock create \
  --name protect-policy-lab-storage \
  --lock-type CanNotDelete \
  --resource-group "$RG" \
  --resource-name "$STORAGE_ACCOUNT" \
  --resource-type Microsoft.Storage/storageAccounts \
  --notes "Lab: prevent accidental deletion of the sample storage account." \
  --subscription "$SUBSCRIPTION_ID"
```

`CanNotDelete` allows reads and updates, but blocks deletion. A `ReadOnly` lock
is more restrictive: it blocks updates and deletion. To try that lock type on
the sample instead, first remove the `CanNotDelete` lock, then create a lock
using `--lock-type ReadOnly`. Remove either lock before changing or deleting
the protected resource.

```bash
az lock delete \
  --name protect-policy-lab-storage \
  --resource-group "$RG" \
  --resource-name "$STORAGE_ACCOUNT" \
  --resource-type Microsoft.Storage/storageAccounts \
  --subscription "$SUBSCRIPTION_ID"

az lock create \
  --name protect-policy-lab-storage-readonly \
  --lock-type ReadOnly \
  --resource-group "$RG" \
  --resource-name "$STORAGE_ACCOUNT" \
  --resource-type Microsoft.Storage/storageAccounts \
  --notes "Lab: prevent modification or deletion of the sample storage account." \
  --subscription "$SUBSCRIPTION_ID"
```

## Verify and exercise the lab

### Check policy assignments, sample, and lock

```bash
az policy assignment list \
  --scope "$SCOPE" \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[].{name:name,definition:policyDefinitionId,scope:scope,parameters:parameters}" \
  --output table

az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RG" \
  --subscription "$SUBSCRIPTION_ID" \
  --query '{id:id,location:location,sku:sku.name,tags:tags}' \
  --output json

az lock show \
  --name protect-policy-lab-storage \
  --resource-group "$RG" \
  --resource-name "$STORAGE_ACCOUNT" \
  --resource-type Microsoft.Storage/storageAccounts \
  --subscription "$SUBSCRIPTION_ID" \
  --query '{id:id,level:level,notes:notes}' \
  --output json
```

### Check policy compliance

Policy Insights evaluation may take a little while after assignment. Trigger a
resource-group scan, then list the results:

```bash
az policy state trigger-scan \
  --resource-group "$RG" \
  --subscription "$SUBSCRIPTION_ID"

az policy state list \
  --resource-group "$RG" \
  --subscription "$SUBSCRIPTION_ID" \
  --query "[].{definition:policyDefinitionName,compliance:complianceState,resource:resourceId}" \
  --output table
```

The existing sample should be compliant with both assignments. Policy
evaluation is not retroactive remediation: existing non-compliant resources
are not automatically changed or deleted.

### Demonstrate policy denials

Run these only after confirming that both policy assignments exist. Each
creation attempt is expected to fail with `RequestDisallowedByPolicy`. If an
attempt unexpectedly succeeds, delete the test account immediately; the lock
in this lab protects only the named sample account.

Try a disallowed location while supplying the required tag:

```bash
az storage account create \
  --name stplbadloc621e2594 \
  --resource-group "$RG" \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --tags environment=lab \
  --subscription "$SUBSCRIPTION_ID"
```

Try the allowed location without the required tag:

```bash
az storage account create \
  --name stplnotag621e2594 \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --subscription "$SUBSCRIPTION_ID"
```

If either test unexpectedly creates an account, remove only that test account:

```bash
az storage account delete \
  --name <unexpected-test-account-name> \
  --resource-group "$RG" \
  --yes \
  --subscription "$SUBSCRIPTION_ID"
```

### Demonstrate the resource lock

The deletion lock can be verified with `az lock show` above. If you choose to
test a real delete request, target only the lab sample account; Azure should
reject it with `ScopeLocked`. Do not remove the lock unless you intend to
delete or modify the sample.

## Cleanup

Cleanup removes the lab and the subscription-scoped custom definition. The
Storage account can continue to incur charges until deleted.

```bash
# Remove the lock before deleting the protected account or resource group.
az lock delete \
  --name protect-policy-lab-storage \
  --resource-group "$RG" \
  --resource-name "$STORAGE_ACCOUNT" \
  --resource-type Microsoft.Storage/storageAccounts \
  --subscription "$SUBSCRIPTION_ID"

# Remove the assignments before deleting their scope and definition.
az policy assignment delete \
  --name lab-allowed-locations \
  --scope "$SCOPE" \
  --subscription "$SUBSCRIPTION_ID"

az policy assignment delete \
  --name lab-require-environment-tag \
  --scope "$SCOPE" \
  --subscription "$SUBSCRIPTION_ID"

az policy definition delete \
  --name lab-require-environment-tag \
  --subscription "$SUBSCRIPTION_ID"

az group delete \
  --name "$RG" \
  --yes \
  --no-wait \
  --subscription "$SUBSCRIPTION_ID"
```

If you switched the sample to the optional `ReadOnly` lock, remove
`protect-policy-lab-storage-readonly` instead of
`protect-policy-lab-storage` in the lock deletion command before cleanup.

The optional local definition file can be removed after deployment:

```bash
rm require-environment-tag.json
```
