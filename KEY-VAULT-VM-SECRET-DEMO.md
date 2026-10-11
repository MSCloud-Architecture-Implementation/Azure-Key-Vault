# Demo: Read a Key Vault secret from the Windows VM

This walkthrough demonstrates that the Windows VM can use its **system-assigned managed identity** to read a Key Vault secret. It does not use a stored password, client secret, or other long-lived credential.

> **Keep the VM administrator password private.** The deployed vault contains the secret `vm-admin-password`, which is the local Windows administrator password. Do not select, print, copy, or project that value during a student demo. Use a separate harmless demo secret instead.

## What students will see

1. An operator creates a harmless secret in the private Key Vault.
2. A PowerShell script runs on the VM and requests a short-lived token from the Azure Instance Metadata Service (IMDS).
3. The VM uses that token to request the demo secret from Key Vault over HTTPS.
4. The script displays a success message, **not the token or secret value**.

The VM's identity already has the `Key Vault Secrets User` role at the vault scope. Key Vault public network access is disabled, so the demo also proves that the VM can resolve and reach the vault's private endpoint.

## Prerequisites

- The deployed Windows VM is running, and its `AADLoginForWindows` and Azure Monitor extensions have provisioned successfully.
- The Key Vault private endpoint connection is approved, its private DNS zone is linked to the VM's VNet, and the VM can resolve and reach the vault over HTTPS.
- The VM managed identity has the `Key Vault Secrets User` role on the vault. Role assignment changes can take several minutes to propagate.
- An operator who can create Key Vault secrets is connected to the private network. Because the vault is private-only, a workstation outside the VNet without private connectivity cannot create/read data-plane secrets.
- The examples use Azure CLI from Bash or PowerShell with the VM's managed identity. Replace placeholders with the values for your deployment; do not put passwords or access tokens in commands.

## Step 1: Set the operator's deployment variables

Run this on the operator workstation that has network access to the Key Vault private endpoint:

```bash
SUBSCRIPTION_ID="YOUR_SUBSCRIPTION_ID"
RESOURCE_GROUP="YOUR_RESOURCE_GROUP"
VAULT_NAME="YOUR_KEY_VAULT_NAME"
VM_NAME="YOUR_VM_NAME"
DEMO_SECRET_NAME="demo-message"
```

Select and verify the correct subscription:

```bash
az account set --subscription "$SUBSCRIPTION_ID"
az account show --query '{name:name,id:id}' -o json
```

## Step 2: Create a harmless demo secret

Create a benign value that is safe to display in a classroom, for example `Hello from the VM managed identity!`:

```bash
az keyvault secret set \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --vault-name "$VAULT_NAME" \
  --name "$DEMO_SECRET_NAME" \
  --value 'Hello from the VM managed identity!' \
  --query id \
  -o tsv
```

This command requires the operator's identity to have Key Vault secret write permission and private network access to the vault. If it fails with a network or DNS error, run it from a host in the VNet or connect through your organization's VPN/peering path. Do not enable public access just for the demo.

### PowerShell alternative (Azure VM Run Command; no interactive sign-in)

Run this with **Operations → Run command → RunPowerShellScript** on the Windows VM. It obtains a Key Vault token from the VM's system-assigned managed identity; it does not call `Connect-AzAccount` or require an interactive login. The value below is intentionally harmless and is included in the script, so do not replace it with a password or other sensitive value.

**Authorization prerequisite:** the deployed VM identity currently has the **Key Vault Secrets User** role, which permits reading secrets but not creating them. Therefore this write script will receive HTTP 403 with the current role. To use it, an Azure administrator must grant a custom Key Vault data-plane role that allows setting secrets but not getting or listing them. Keep that assignment as narrowly scoped as possible; a role at the vault scope could still overwrite other known secret names. Do not grant **Key Vault Secrets Officer** at the vault scope: this vault also contains `vm-admin-password`, and that built-in role permits reading existing secrets. For initial creation, the safer option is the Bash/Azure CLI method above using an already-authorized operator identity.

Replace the vault-name placeholder, then run:

```powershell
$ErrorActionPreference = 'Stop'

$VaultName = 'YOUR_KEY_VAULT_NAME'
$SecretName = 'demo-message'
$DemoValue = 'Hello from the VM managed identity!'
$tokenResponse = $null
$headers = $null
$response = $null

try {
    $tokenUri = 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net'
    $tokenResponse = Invoke-RestMethod `
        -Method Get `
        -Uri $tokenUri `
        -Headers @{ Metadata = 'true' } `
        -ErrorAction Stop

    if ([string]::IsNullOrWhiteSpace($tokenResponse.access_token)) {
        throw 'IMDS did not return an access token.'
    }

    $headers = @{
        Authorization = 'Bearer ' + [string]$tokenResponse.access_token
    }
    $secretUri = 'https://{0}.vault.azure.net/secrets/{1}?api-version=7.4' -f `
        $VaultName, [uri]::EscapeDataString($SecretName)
    $parsedSecretUri = [uri]$secretUri
    if ($parsedSecretUri.Query -ne '?api-version=7.4') {
        throw 'The Key Vault request URI is missing the required API version.'
    }
    $body = @{
        value       = $DemoValue
        contentType = 'text/plain'
    } | ConvertTo-Json -Compress

    try {
        $response = Invoke-RestMethod `
            -Method Put `
            -Uri $parsedSecretUri.AbsoluteUri `
            -Headers $headers `
            -ContentType 'application/json' `
            -Body $body `
            -ErrorAction Stop
    }
    catch {
        $status = $null
        if ($null -ne $_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        $serviceError = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($serviceError)) {
            $serviceError = $_.Exception.Message
        }
        throw "Key Vault secret creation failed (HTTP $status): $serviceError"
    }

    Write-Output "Created '$SecretName' in vault '$VaultName'. Secret value was not displayed."
}
finally {
    $response = $null
    $headers = $null
    $tokenResponse = $null
}
```

This uses the VM's private network path to Key Vault. A 403 indicates the VM identity lacks secret-write authorization; a DNS or connection error indicates a private endpoint/network issue. Creating a secret with an existing name creates a new version. See Microsoft's [VM Instance Metadata Service documentation](https://learn.microsoft.com/azure/virtual-machines/instance-metadata-service) and [Key Vault Set Secret REST API](https://learn.microsoft.com/rest/api/keyvault/secrets/set-secret/set-secret?view=rest-keyvault-secrets-7.4).

## Step 3: Run the test on the VM

Use either:

- **Azure portal:** Open the VM, select **Operations → Run command → RunPowerShellScript**, paste the PowerShell script below, replace the vault-name placeholder, and run it.
- **Interactive PowerShell:** Connect to the VM over an approved private path (such as VPN/peering or a jump host), open PowerShell, paste the script, and replace the vault-name placeholder.

The VM has no public IP. This deployment does not include Azure Bastion or a VPN, so a network path to the VNet must already exist.

```powershell
$ErrorActionPreference = 'Stop'

$VaultName = 'YOUR_KEY_VAULT_NAME'
$SecretName = 'demo-message'
$SecretUri = 'https://{0}.vault.azure.net/secrets/{1}?api-version=7.4' -f `
    $VaultName, [uri]::EscapeDataString($SecretName)
$ParsedSecretUri = [uri]$SecretUri
if ($ParsedSecretUri.Query -ne '?api-version=7.4') {
    throw 'The Key Vault request URI is missing the required API version.'
}

$tokenResponse = $null
$secretResponse = $null

try {
    # The token comes from this VM's managed identity via Azure IMDS.
    $tokenUri = 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net'
    try {
        $tokenResponse = Invoke-RestMethod `
            -Method Get `
            -Uri $tokenUri `
            -Headers @{ Metadata = 'true' }
    }
    catch {
        $details = $_.ErrorDetails.Message
        throw "IMDS token request failed: $($_.Exception.Message) $details"
    }

    if ([string]::IsNullOrWhiteSpace($tokenResponse.access_token)) {
        throw 'IMDS did not return an access token.'
    }

    # Read the harmless demo secret. Do not print the response or its value.
    $authorizationHeader = 'Bearer ' + [string]$tokenResponse.access_token
    try {
        $secretResponse = Invoke-RestMethod `
            -Method Get `
            -Uri $ParsedSecretUri.AbsoluteUri `
            -Headers @{ Authorization = $authorizationHeader }
    }
    catch {
        $details = $_.ErrorDetails.Message
        throw "Key Vault secret request failed: $($_.Exception.Message) $details"
    }

    if ([string]::IsNullOrWhiteSpace($secretResponse.value)) {
        throw 'Key Vault returned an empty secret value.'
    }

    Write-Output 'PASS: The VM managed identity successfully read the Key Vault demo secret.'
    Write-Output "Vault: $VaultName"
    Write-Output "Secret name: $SecretName"
    Write-Output 'Secret value: not displayed'
}
catch {
    Write-Error "FAIL: The managed-identity secret read did not succeed. $($_.Exception.Message)"
    throw
}
finally {
    $secretResponse = $null
    $tokenResponse = $null
}
```

Expected safe output:

```text
PASS: The VM managed identity successfully read the Key Vault demo secret.
Vault: YOUR_KEY_VAULT_NAME
Secret name: demo-message
Secret value: not displayed
```

Do not add `$secretResponse.value`, `$tokenResponse.access_token`, or the complete response objects to the output. Azure Run Command results are retained in Azure control-plane history; only return non-sensitive success/failure details.

### Optional: display the harmless demo value

Use this separate script only when you want students to see the actual harmless `demo-message` value. Azure Run Command output is retained in Azure control-plane history, so **never use this script with `vm-admin-password`, credentials, personal data, or any other sensitive secret**. Keep `$SecretName` fixed to `demo-message`, and replace only the vault-name placeholder.

```powershell
$ErrorActionPreference = 'Stop'

$VaultName = 'YOUR_KEY_VAULT_NAME'
$SecretName = 'demo-message'
$SecretUri = 'https://{0}.vault.azure.net/secrets/{1}?api-version=7.4' -f `
    $VaultName, [uri]::EscapeDataString($SecretName)
$ParsedSecretUri = [uri]$SecretUri
if ($ParsedSecretUri.Query -ne '?api-version=7.4') {
    throw 'The Key Vault request URI is missing the required API version.'
}

$tokenResponse = $null
$secretResponse = $null

try {
    $tokenUri = 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fvault.azure.net'
    $tokenResponse = Invoke-RestMethod `
        -Method Get `
        -Uri $tokenUri `
        -Headers @{ Metadata = 'true' } `
        -ErrorAction Stop

    if ([string]::IsNullOrWhiteSpace($tokenResponse.access_token)) {
        throw 'IMDS did not return an access token.'
    }

    $headers = @{
        Authorization = 'Bearer ' + [string]$tokenResponse.access_token
    }
    $secretResponse = Invoke-RestMethod `
        -Method Get `
        -Uri $ParsedSecretUri.AbsoluteUri `
        -Headers $headers `
        -ErrorAction Stop

    if ([string]::IsNullOrWhiteSpace($secretResponse.value)) {
        throw "Key Vault returned an empty value for '$SecretName'."
    }

    Write-Output "Demo secret '$SecretName' value:"
    Write-Output ([string]$secretResponse.value)
}
catch {
    Write-Error "Could not read demo secret: $($_.Exception.Message)"
    throw
}
finally {
    $secretResponse = $null
    $tokenResponse = $null
    $headers = $null
}
```

When using this script, the actual demo value will appear in the Run Command output and may be visible to users with access to the VM's command history. The script prints only the `demo-message` secret value; it does not print the access token or the full Key Vault response.

## Step 4: Explain the identity and authorization flow

1. The script calls the VM-local IMDS endpoint at `169.254.169.254`. IMDS is available from the VM and issues a short-lived token for the Key Vault resource.
2. The script sends that bearer token to the Key Vault REST endpoint over HTTPS.
3. Key Vault validates the token and checks the VM's system-assigned identity for the `Key Vault Secrets User` data-plane role.
4. The Key Vault hostname resolves through the private DNS zone to the private endpoint. Public network access remains disabled.
5. Key Vault returns the secret to the script. The standard Step 3 script verifies a value was returned but does not display it; the optional display script outputs only the harmless `demo-message` value.

The VM has no client secret or Key Vault access key configured. The managed identity token is obtained at runtime and is never printed.

## Troubleshooting

During a safe check of this deployment, IMDS returned a token and the VM reached Key Vault, which responded `404 SecretNotFound` for `demo-message`. This means the harmless demo secret must first be created in the same vault using Step 2; it does not indicate a connectivity or identity-token failure. That check did not read or display any secret value.

| Symptom | Checks |
| --- | --- |
| IMDS request fails or returns no token | Run the script on the Azure VM itself, not on a laptop or Cloud Shell. Confirm the VM has its system-assigned identity enabled and is running. |
| Key Vault responds with HTTP 403 | For the Step 2 PowerShell write, the VM's current `Key Vault Secrets User` role is read-only; a suitably scoped secret-set permission is required. For the Step 3 read, confirm `Key Vault Secrets User` is assigned and has propagated. Check Key Vault diagnostic logs if enabled. |
| HTTP 400 `BadParameter`: `api-version must be specified` | Use the updated Step 3 script. It constructs the request URI with an explicit format string, verifies the parsed URI contains `?api-version=7.4`, then sends that URI to Key Vault. |
| DNS lookup or connection to the vault fails | From the VM, check that `<vault-name>.vault.azure.net` resolves to the private endpoint, the private DNS zone is linked to the VM's VNet, and outbound TCP 443 is permitted. Do not enable public network access to work around private DNS/network configuration. |
| Secret not found (HTTP 404) | Confirm the vault name and secret name. Create the harmless `demo-message` secret in Step 2. |
| Run Command cannot execute | Check that the VM is running, the Azure VM agent is healthy, and required outbound access for the agent is available. Alternatively, connect interactively over private networking. |

## Optional cleanup

Delete only the harmless demo secret after the lesson. Do **not** delete or display the VM administrator secret:

```bash
az keyvault secret delete \
  --subscription "$SUBSCRIPTION_ID" \
  --vault-name "$VAULT_NAME" \
  --name "$DEMO_SECRET_NAME"
```

If soft delete is enabled, deletion may leave a recoverable secret until its retention period expires. Follow the organization's Key Vault retention policy; do not purge the secret unless explicitly authorized.

## Reference

- [Use a Windows VM or VM scale set to access Azure resources using a managed identity](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/tutorial-windows-vm-access-key-vault)
- [Azure Key Vault RBAC guide](https://learn.microsoft.com/azure/key-vault/general/rbac-guide)
- [Azure Instance Metadata Service: managed identity token acquisition](https://learn.microsoft.com/entra/identity/managed-identities-azure-resources/how-to-use-vm-token)
