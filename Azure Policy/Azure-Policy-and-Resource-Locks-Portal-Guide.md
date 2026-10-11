# Azure Policy and Resource Locks Lab — Azure portal guide

This companion guide explains how to configure the same lab as
[Azure-Policy-and-Resource-Locks-Lab.md](./Azure-Policy-and-Resource-Locks-Lab.md)
using the Azure portal.

## Lab values

Use these values to match the deployed lab:

| Setting | Value |
|---|---|
| Subscription | `<SUBSCRIPTION_NAME>` (`<SUBSCRIPTION_ID>`) |
| Resource group | `<LAB_RESOURCE_GROUP>` |
| Region | `West US 2` |
| Built-in policy assignment | `<LOCATION_POLICY_ASSIGNMENT>` |
| Built-in policy | `Allowed locations` |
| Custom policy definition | `<CUSTOM_POLICY_DEFINITION>` |
| Custom policy assignment | `<CUSTOM_POLICY_ASSIGNMENT>` |
| Sample storage account | `<STORAGE_ACCOUNT_NAME>` |
| Resource lock | `<RESOURCE_LOCK_NAME>` (`CanNotDelete`) |

The lab's policy assignments apply **only to the lab resource group**. The
custom policy definition is stored at subscription scope, but its assignment
is not. Do not change the scope to the subscription unless you deliberately
intend to govern other resources.

Replace the angle-bracketed placeholders with the values for your own
subscription and lab. Azure Storage account names must be globally unique.

## Prerequisites

- Sign in to the [Azure portal](https://portal.azure.com/) using an identity
  with permission to create resource groups, policy definitions and
  assignments, storage accounts, and locks.
- Confirm the active directory and subscription in the portal's account menu.
- The `Microsoft.Storage` and `Microsoft.PolicyInsights` providers should be
  registered for the subscription. Check **Subscriptions** > your subscription
  > **Resource providers** if needed.

## 1. Select the subscription

1. In the Azure portal, open **Subscriptions**.
2. Select `<SUBSCRIPTION_NAME>` (`<SUBSCRIPTION_ID>`).
3. Confirm the subscription ID on the overview page before continuing.

## 2. Create or inspect the dedicated resource group

To rebuild the lab:

1. Search for **Resource groups** in the top search bar and select
   **Create**.
2. On **Basics**, select the subscription above, enter
   `<LAB_RESOURCE_GROUP>`, and choose **West US 2**.
3. On **Tags**, add:
   - `environment` = `lab`
   - `purpose` = `governance-training`
4. Select **Review + create**, then **Create**.

To inspect an existing lab, search for **Resource groups**, open
`<LAB_RESOURCE_GROUP>`, and verify the overview and tags.

## 3. Assign the built-in Allowed locations policy

To inspect the existing assignment, open **Policy** from the portal search,
then select **Assignments**. Select the `<LOCATION_POLICY_ASSIGNMENT>` and
confirm that its scope is the lab resource group and its allowed location is
West US 2.

To create the assignment:

1. In **Policy**, select **Assignments** and select **Assign policy**.
2. On the **Basics** tab:
   - Set **Scope** to the subscription, then use the scope picker to select
     `<LAB_RESOURCE_GROUP>` as the resource group. Do not leave scope at
     the subscription.
   - Leave **Exclusions** empty.
   - Select the policy definition picker, search for **Allowed locations**,
     and select the built-in policy.
   - Set **Assignment name** to `<LOCATION_POLICY_ASSIGNMENT>`.
   - Optionally enter the description: `Denies lab resources deployed outside West US 2.`
   - Keep **Policy enforcement** enabled.
3. On the **Parameters** tab, set **Allowed locations** to **West US 2**.
   Keep the effect as **Deny** if the policy exposes the effect parameter.
4. Leave **Remediation** and **Non-compliance messages** at their defaults.
   This policy uses the `Deny` effect and does not require a managed identity.
5. Select **Review + create**, check the scope and parameter, then select
   **Create**.

## 4. Create and assign the custom environment-tag policy

### Create its definition

1. In **Policy**, open **Definitions** and select **+ Policy definition**.
2. Set **Definition location** to the target subscription,
   `<SUBSCRIPTION_NAME>`. This is where Azure stores the definition;
   it does **not** assign the policy to the whole subscription.
3. Enter:
   - **Name**: `<CUSTOM_POLICY_DEFINITION>`
   - **Description**: `Denies indexed resources in the lab resource group when the environment tag is missing.`
   - **Category**: select an existing category such as **General**, or create
     a lab category if the portal offers that option.
   - **Mode**: **Indexed**
4. In the **Policy rule** editor, replace the sample rule with:

   ```json
   {
     "if": {
       "field": "tags['environment']",
       "exists": "false"
     },
     "then": {
       "effect": "deny"
     }
   }
   ```

5. Select **Save**.

This rule denies creation or update of supported, indexed resource types in
the assignment scope when the `environment` tag is absent. It does not add the
tag automatically.

### Assign the custom definition to the lab resource group

1. Return to **Policy** > **Assignments** and select **Assign policy**.
2. On **Basics**, choose the lab resource group as **Scope**. Do not assign it
   at subscription scope.
3. Select the policy definition picker, search for
   `<CUSTOM_POLICY_DEFINITION>`, and select the definition just created.
4. Enter `<CUSTOM_POLICY_ASSIGNMENT>` as the assignment name, keep policy
   enforcement enabled, and leave exclusions empty.
5. No parameters or managed identity are needed for this policy.
6. Select **Review + create**, confirm the lab resource group scope, and select
   **Create**.

If rebuilding after a previous run, the definition may already exist at the
subscription. Reuse it instead of creating a duplicate.

## 5. Create or inspect the sample storage account

To rebuild the lab:

1. Search for **Storage accounts** and select **Create**.
2. On **Basics**, set:
   - **Subscription**: `<SUBSCRIPTION_NAME>`
   - **Resource group**: `<LAB_RESOURCE_GROUP>`
   - **Storage account name**: `<STORAGE_ACCOUNT_NAME>`; choose a globally
     unique lowercase name of 3–24 letters and numbers.
   - **Region**: **West US 2**
   - **Preferred storage type**: **Azure Blob Storage or Azure Data Lake
     Storage** (if shown)
   - **Performance**: **Standard**
   - **Redundancy**: **Locally-redundant storage (LRS)**
3. On **Advanced**, keep **Require secure transfer** enabled, set the minimum
   TLS version to **Version 1.2** if shown, and disable anonymous blob access
   if that option is available.
4. On **Tags**, add:
   - `environment` = `lab`
   - `purpose` = `governance-training`
5. Select **Review**, confirm the resource group, region, and tags, then select
   **Create**.

The allowed location and tag policies should permit this creation. A different
region or a missing `environment` tag should be denied by the corresponding
assignment.

To inspect an existing lab, open **Storage accounts** >
`<STORAGE_ACCOUNT_NAME>` and verify its resource group, location, redundancy, and
tags.

## 6. Add a CanNotDelete resource lock

For the existing lab, open the sample storage account, then select
**Settings** > **Locks** and verify that `<RESOURCE_LOCK_NAME>` is
listed as **Delete** / `CanNotDelete`.

To create it:

1. Open the sample storage account in the portal.
2. In the resource menu, select **Settings** > **Locks**.
3. Select **Add**.
4. Enter:
   - **Lock name**: `<RESOURCE_LOCK_NAME>`
   - **Lock type**: **Delete**
   - **Notes**: `Lab: prevent accidental deletion of the sample storage account.`
5. Select **OK** or **Apply** to save the lock.

A `CanNotDelete` (portal label **Delete**) lock permits reads and updates but
blocks deletion. A `ReadOnly` lock also blocks updates and can disrupt normal
management operations; use it only as an optional demonstration. A lock can
be placed at different scopes and inherited by child resources, so verify the
scope is only the sample account for this lab.

## 7. Verify assignments and compliance

1. Open **Policy** > **Assignments**. Filter or inspect the assignments and
   confirm both have scope `<LAB_RESOURCE_GROUP>`.
2. Open **Policy** > **Compliance**. Select the lab resource group scope or
   filter by the lab assignments.
3. If results are not yet available, allow evaluation time and use
   **Re-evaluate** or **Create a compliance task** if the portal presents
   that action. Policy evaluation can take time after creating an assignment.
4. The compliant sample storage account should eventually show compliant for
   both policies. Policy does not automatically repair or delete pre-existing
   noncompliant resources.
5. Open the sample storage account > **Settings** > **Locks** and confirm the
   lock level is **Delete**.

## 8. Safely test policy denials (optional)

Only do these tests after verifying both assignments and their resource-group
scope. Use unique temporary storage-account names; these names are examples
and may already be taken globally.

1. From **Storage accounts** > **Create**, select the lab resource group,
   choose a region other than West US 2, and include the `environment=lab`
   tag. Review the validation result. The location policy should deny it.
2. Start another storage-account creation in West US 2, but omit the
   `environment` tag. The custom policy should deny it.
3. Do not proceed past a denial or try a production resource. If a test
   account is unexpectedly created, open that exact temporary account and
   delete it immediately. The lab lock protects only the named sample account.

The portal may show a policy violation during validation or after submission.
Check the displayed policy assignment name and scope if an attempt is denied.

## 9. Clean up the lab in the portal

Cleanup removes the sample storage account and the lab governance resources.
The storage account can incur charges while it exists. Delete only this
dedicated lab; do not delete the subscription or other resource groups.

1. Remove the resource lock first:
   - Open `<STORAGE_ACCOUNT_NAME>` > **Settings** > **Locks**.
   - Select `<RESOURCE_LOCK_NAME>`, then select **Delete**.
   - If you changed it to a `ReadOnly` lock, remove that lock instead.
2. Remove the assignments:
   - Open **Policy** > **Assignments**.
   - Select `<LOCATION_POLICY_ASSIGNMENT>`, then select **Delete assignment**.
   - Repeat for `<CUSTOM_POLICY_ASSIGNMENT>`.
3. Remove the custom definition only if it is no longer needed:
   - Open **Policy** > **Definitions** at the subscription location.
   - Find `<CUSTOM_POLICY_DEFINITION>` and delete it after its assignment
     has been removed. Do not delete definitions used by other assignments.
4. Delete the lab resource group:
   - Open **Resource groups** > `<LAB_RESOURCE_GROUP>`.
   - Confirm that this is the lab resource group, select **Delete resource
     group**, enter `<LAB_RESOURCE_GROUP>` when prompted, and confirm.

## Microsoft Learn references

- [Create a policy assignment using the Azure portal](https://learn.microsoft.com/azure/governance/policy/assign-policy-portal)
- [Azure Policy definitions structure](https://learn.microsoft.com/azure/governance/policy/concepts/definition-structure-basics)
- [Lock your Azure resources to protect your infrastructure](https://learn.microsoft.com/azure/azure-resource-manager/management/lock-resources?tabs=portal)
