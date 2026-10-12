# Production implementation guide: Microsoft Defender for Cloud

This runbook translates the training scenario into a staged production rollout of Microsoft Defender for Cloud security posture management, standards, hybrid server protection, and remediation operations. It is based on Microsoft Learn and the Azure Well-Architected Framework (WAF).

> **Scope:** This guide implements Defender for Cloud in an organization's Azure environment. It does not deploy the Cloud360 training website. The lab contains fabricated tenant and finding data; do not use it as production evidence or as a source of Azure configuration.
>
> **Product experience:** Microsoft is expanding Defender for Cloud capabilities into the Microsoft Defender portal. Portal locations and feature availability can change; follow the portal-specific entry points in current Microsoft Learn articles. This runbook uses "Defender for Cloud" for the service and calls out Azure portal steps where documented.

### Walkthrough contents

- [Prepare a safe pilot](#lab-0--prepare-a-safe-pilot)
- [Inspect and enable approved plans](#lab-1--inspect-defender-for-cloud-and-enable-only-approved-plans)
- [Assign a compliance standard](#lab-2--assign-a-compliance-standard-to-the-pilot)
- [Connect a hybrid server with Azure Arc](#lab-3--connect-one-approved-hybrid-server-with-azure-arc)
- [Review and remediate a recommendation](#lab-4--review-and-remediate-one-recommendation-safely)
- [Configure continuous export](#lab-5--export-a-small-set-of-security-data)
- [Configure notification automation](#lab-6--add-notificationticket-automation-optional)
- [Scale onboarding to a management group](#lab-7--extend-onboarding-to-a-management-group-after-the-pilot)
- [Record pilot evidence](#lab-completion-record)

## Hands-on portal walkthrough

This section is a guided, click-by-click pilot. Complete it first in a dedicated nonproduction subscription with a small, noncritical workload. The screenshots are **reference snapshots published by Microsoft Learn**, not captures of your tenant. Azure portal labels, blades, and available plans can vary by tenant, role, cloud, and rollout wave; use the linked article if your portal differs.

> **Cost and change gate:** Do not select **Enable all** just because it appears in a screenshot. Paid plans can start billing when enabled. Before selecting **Save**, confirm the active directory/tenant, subscription ID, pilot scope, plan-specific estimate, and written change approval. Do not run the exercise against production or a management group until the pilot exit criteria later in this guide are met.

### Lab 0 — Prepare a safe pilot

**You need**

- An approved Azure nonproduction subscription and a named pilot resource group.
- Permission to read Defender for Cloud and inventory. Ask a subscription Owner/Security Admin to perform plan or environment changes, and a user with Owner or Policy Contributor to assign regulatory standards.
- A named workload owner and change approver; an inventory/CMDB list against which you can reconcile results.
- A written cost ceiling and list of paid plans approved for this pilot. If there is no paid-plan approval, do not enable a paid plan.
- For the hybrid exercise, one approved noncritical Windows or Linux server, an approved Azure region/resource group, outbound network access to Azure Arc endpoints, and an approved onboarding identity.

**Do this**

1. Sign in to the [Azure portal](https://portal.azure.com) using your organization account and complete the organization’s MFA/PIM process.
2. Select the directory/avatar in the portal header and confirm the expected tenant. Search **Subscriptions**, open the approved pilot subscription, and copy its subscription ID into your change record.
3. Confirm the current subscription and resource-group names with the workload owner. Do not rely on display-name similarity; verify the full ID and scope before any configuration change.
4. Create a change record containing the requested plans, standards, pilot resources, cost limit, start/end time, approver, success checks, and rollback/disable procedure. Record no secrets or client credentials in screenshots, tickets, or this runbook.
5. In **Cost Management + Billing**, configure or confirm a budget/alert for the pilot as an additional signal. A budget notification is not a hard spend cap and does not replace the plan cost review.

**Check:** The change record identifies exactly one pilot subscription and an owner-approved server/resource list. If the portal header or subscription ID differs, stop and correct the scope before continuing.

### Lab 1 — Inspect Defender for Cloud and enable only approved plans

1. In the Azure portal search bar, find and open **Microsoft Defender for Cloud**.
2. In its left menu, select **Environment settings**, then select the approved pilot subscription.
3. Review **Defender plans** before changing anything. Record which plans are currently On/Off and check for inherited settings or pre-existing coverage.
4. Enable **Defender CSPM** or an individual workload plan only if that specific plan is in the approved change and the expected cost has been reviewed. For Defender for Servers, choose Plan 1 versus Plan 2 by matching required capabilities to Microsoft’s [plan comparison and prerequisites](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers); confirm workspace/agent/data-collection requirements separately.
5. Select **Save** for the reviewed change only. Do not enable unrelated workload plans or use **Enable all** as a shortcut.
6. Reopen the subscription’s **Environment settings** page and confirm the intended plan status. Check **Inventory** and **Recommendations** after assessment has had time to populate; capture the time and scope of the review in your change record.

![Microsoft Learn reference snapshot: Defender for Cloud environment settings entry point.](https://learn.microsoft.com/azure/defender-for-cloud/media/get-started/environmental-settings.png)

*Reference snapshot from Microsoft Learn, [Connect your Azure subscriptions](https://learn.microsoft.com/azure/defender-for-cloud/connect-azure-subscription). The “Enable all” screen is shown for documentation only; enabling every plan is not the recommendation for this pilot.*

![Microsoft Learn reference snapshot: the Defender for Cloud plans page with the Enable all control. Do not use Enable all unless every listed plan was separately approved.](https://learn.microsoft.com/azure/defender-for-cloud/media/get-started/enable-all-plans.png)

**Check:** The subscription scope is the approved pilot; only approved plans are On; recorded plan status matches the portal; cost monitoring is in place. **Rollback:** With the approved administrator, return to **Environment settings**, turn off only the plan enabled by this change, and save. Check feature dependencies and Microsoft’s current plan-disable behavior first; retain the change record and investigate any billable usage already accrued.

### Lab 2 — Assign a compliance standard to the pilot

**Precheck:** Regulatory compliance standards require an eligible Defender for Cloud plan; Microsoft notes that Defender for Servers Plan 1 and Defender for API Plan 1 alone do not qualify. The operator needs **Owner** or **Policy Contributor** at the intended scope. Check legal/compliance approval and policy effects before assignment.

1. Open **Microsoft Defender for Cloud** > **Regulatory compliance** and confirm the scope selector is set to the pilot subscription.
2. Select **Manage compliance policies**.
3. Select the pilot subscription (or the approved management group only after the pilot) and open **Security policies**.
4. Locate the specific standard approved by your compliance owner. Read its description, prerequisites, and parameters; do not enable multiple frameworks just to increase the displayed control count.
5. Toggle the approved standard **On** and provide any required parameters, then review the scope and confirm the assignment.
6. Return to **Regulatory compliance**. After evaluation, open the standard and inspect control status, affected resources, and recommendations. Record the framework/version, assignment scope, timestamp, and evidence owner. Do not treat the dashboard alone as an audit attestation.

![Microsoft Learn reference snapshot: entry point to Manage compliance policies.](https://learn.microsoft.com/azure/defender-for-cloud/media/update-regulatory-compliance-packages/manage-compliance.png)

*Reference snapshot from Microsoft Learn, [Assign regulatory compliance standards](https://learn.microsoft.com/azure/defender-for-cloud/assign-regulatory-compliance-standards).*

![Microsoft Learn reference snapshot: enabling a selected standard in Security policies.](https://learn.microsoft.com/azure/defender-for-cloud/media/update-regulatory-compliance-packages/turn-standard-on.png)

**Check:** The target scope is still the pilot subscription; only the approved standard is enabled; the standard appears in compliance view after assessment. **Rollback:** Ask the policy/compliance owner to turn off/remove the pilot assignment through **Manage compliance policies** if the wrong standard or scope was selected. Preserve the audit trail and confirm the resulting assignment state.

### Lab 3 — Connect one approved hybrid server with Azure Arc

Use this exercise only on a machine approved for onboarding. Azure Arc onboarding creates an Azure resource and may install or configure an agent on the server; coordinate with its administrator and maintenance/change process.

**A. Create/approve the onboarding identity**

1. In the Azure portal, search **Azure Arc**. Under **Additional setup**, select **Service principals**, then **Add**.
2. Choose a descriptive identity name, pilot subscription and (where supported) the dedicated Arc resource group. Assign only the **Azure Connected Machine Onboarding** role as documented for this workflow.
3. Set the shortest practical credential lifetime. Restrict credential retrieval to the operator or deployment system. A client secret is sensitive: never paste it in this guide, a ticket, shell history, source control, a screenshot, or a chat. Store and distribute it only through the organization-approved secret manager and rotate/revoke it according to policy.

![Microsoft Learn reference snapshot: Azure Arc service-principal creation screen.](https://learn.microsoft.com/azure/azure-arc/servers/media/onboard-service-principal/new-azure-arc-service-principal.png)

*Reference snapshot from Microsoft Learn, [Connect hybrid machines to Azure at scale](https://learn.microsoft.com/azure/azure-arc/servers/onboard-service-principal).*

**B. Generate and run the one-machine onboarding script**

4. In Azure Arc, under **Infrastructure** > **Machines**, select **Onboard/Create** > **Onboard existing machines**.
5. On **Basics**, select the approved subscription, dedicated resource group, metadata region, and the machine’s correct operating system. Select the approved connectivity method and enter a proxy only if the server uses one. Review the [Azure Arc network requirements](https://learn.microsoft.com/azure/azure-arc/servers/network-requirements) before selecting a public/private endpoint.
6. Under **Authentication**, choose **Authenticate machines automatically** and select the approved onboarding service principal. Do not create or use an Owner-level identity.
7. Add approved physical-location and owner/environment tags. Review the summary, download the generated script, and transfer it using an approved secured channel. Treat the generated script as sensitive if it contains authentication material; restrict access and delete temporary copies safely after execution.
8. On the approved server, use an administrator session and the command/script for its operating system. Follow the current Microsoft article for exact commands and prerequisites; do not execute an unreviewed script on a production server.
9. In **Azure Arc** > **Machines**, locate the server and confirm **Status: Connected**. Confirm its resource ID, subscription, resource group, OS, region, tags, and last connection/heartbeat.

![Microsoft Learn reference snapshot: a successfully connected Azure Arc-enabled machine.](https://learn.microsoft.com/azure/azure-arc/servers/media/quick-enable-hybrid-vm/enabled-machine.png)

*Reference snapshot from Microsoft Learn, [Connect a machine to Arc-enabled servers](https://learn.microsoft.com/azure/azure-arc/servers/quick-enable-hybrid-vm).*

**C. Verify Defender coverage**

10. Return to **Microsoft Defender for Cloud** > **Environment settings** and verify the approved Defender for Servers plan is enabled at the scope containing the Arc server.
11. Open **Inventory**, filter to the pilot server, and verify its Azure Arc resource appears with the expected plan/agent state. Open its recommendations and confirm Defender for Cloud has assessed it; allow for assessment/agent propagation time.
12. Reconcile the result with the CMDB and server owner. If it is missing or unhealthy, investigate the Arc agent, network/proxy, subscription scope, policy, and plan prerequisites before onboarding another machine.

**Check:** One approved server is Connected in Arc, appears once in Defender for Cloud inventory, has the expected plan state, and has a named operational owner. **Rollback:** If onboarding must be undone, coordinate with the server owner, remove the Arc connection using Microsoft’s current disconnect guidance, verify the server agent/resource cleanup, and revoke/remove the temporary onboarding identity/credential when no longer required. Disconnecting Arc is not the same as uninstalling or disabling Defender for Endpoint; plan those separately.

### Lab 4 — Review and remediate one recommendation safely

1. In **Microsoft Defender for Cloud** > **Recommendations**, set the scope to the pilot subscription and filter for the pilot resource.
2. Open one recommendation. Read its severity/risk context, affected resources, remediation steps, owner, and any prerequisite or service impact. Confirm it is in scope with the resource owner.
3. Create a before-state record: resource ID, relevant configuration, current finding state, owner approval, change window, test/health check, and rollback plan. Choose a finding whose fix is understood and reversible; do not select a high-impact production fix for this lab.
4. If the recommendation has **Take action** > **Fix**, review what the proposed remediation will modify and the target resource set. Apply only to the single pilot resource if the portal supports scope selection; otherwise stop and follow the documented manual fix or create a narrower pilot.
5. If remediation uses Azure Policy, inspect the assignment and policy effect. A `DeployIfNotExists` or `Modify` remediation task can make changes immediately; verify its managed identity permissions and target scope before creating/running the task.
6. Recheck the actual resource configuration and application health, then wait for the assessment to refresh. Confirm the recommendation state changed for the correct resource; capture evidence and close the change only after the owner confirms service health.

![Microsoft Learn reference snapshot: recommendation details with the Fix action.](https://learn.microsoft.com/azure/defender-for-cloud/media/implement-security-recommendations/microsoft-defender-for-cloud-recommendations-fix-action.png)

*Reference snapshot from Microsoft Learn, [Remediate recommendations in Microsoft Defender for Cloud](https://learn.microsoft.com/azure/defender-for-cloud/implement-security-recommendations). The Fix action is only available for supported recommendations and does not remove the need to review scope and impact.*

**Check:** Finding is resolved on the intended resource, the live configuration agrees with the assessment, workload health is good, and evidence is recorded. **Rollback:** Execute the approved resource-specific rollback, validate service health, and recheck the finding. If a fix is unavailable, follow the recommendation’s manual remediation instructions or assign an owner; do not assume every recommendation can be auto-fixed.

### Lab 5 — Export a small set of security data

First choose an approved destination (Log Analytics workspace or Event Hubs), subscription/region, data owner, retention, access model, and expected ingestion cost. Verify you can write to the destination. Start with a pilot subscription and the smallest useful set of data/severities.

1. In **Microsoft Defender for Cloud** > **Environment settings**, select the pilot subscription.
2. Under **Settings**, select **Continuous export**, then choose the **Event Hubs** or **Log Analytics workspace** destination tab.
3. Select the required data type (for example, alerts or recommendations), apply only the approved filters, and choose **Streaming** for updates or **Snapshots** for scheduled current-state exports.
4. Under **Export target**, choose the approved Log Analytics workspace or Event Hubs target. Verify target subscription, workspace/namespace, region, and access before saving.
5. Select **Save**. Generate a known test change/alert only if authorized; otherwise validate delivery using existing pilot events. Confirm a representative record arrives, has expected fields/scope, and is searchable by the SOC. Monitor destination ingestion and cost.

![Microsoft Learn reference snapshot: Continuous export configuration and target options.](https://learn.microsoft.com/azure/defender-for-cloud/media/continuous-export/continuous-export-options-page.png)

*Reference snapshot from Microsoft Learn, [Set up continuous export in the Azure portal](https://learn.microsoft.com/azure/defender-for-cloud/continuous-export).*

**Check:** The selected subscription, data types, filters, frequency, destination, delivery and access all match the change record. **Rollback:** Disable/delete only the pilot export configuration if the target is wrong or data delivery/cost is unexpected; do not delete a shared workspace/Event Hubs namespace as a rollback action.

### Lab 6 — Add notification/ticket automation (optional)

1. Create or identify a pilot Azure Logic App owned by the security/platform team. Use a managed identity or approved connector authentication; grant only the permissions needed for the selected notification/ticket action.
2. In Defender for Cloud, open **Workflow automation** > **Add workflow automation**.
3. Give the rule a name, select only the intended alert/recommendation/compliance trigger conditions, and choose the pilot Logic App.
4. Start with notification or ticket creation only. Test a permitted pilot event and confirm the right team receives one actionable event with the resource ID, finding, severity, and portal link.
5. Add any remediation/write action only after separate approval, idempotency, error/retry handling, duplicate-event behavior, audit logging, and rollback have been tested.

**Check:** One intended pilot event creates one correctly routed notification/ticket; failure is visible to an owner. Disable the pilot workflow if it sends incorrectly. Do not add bulk remediation to this exercise.

### Lab 7 — Extend onboarding to a management group after the pilot

Do not begin this lab until Labs 0–5 have passed, any optional Lab 6 automation has been tested or explicitly excluded, cost/compliance/security owners have approved the expansion, and a rollout wave has a rollback and exception plan. Management-group scope can affect many subscriptions.

1. In the Azure portal, open **Management groups** and confirm the exact target management-group ID, its parent, and its child subscriptions. Record any subscriptions that are deliberately out of scope.
2. As a **Security Admin** with the necessary management-group access, register the `Microsoft.Security` resource provider at the management-group scope if it is not already registered. From Azure Cloud Shell or an authenticated Azure CLI session, replace the placeholder with the management-group **ID** (not its display name) and run:

   ```bash
   az provider register --namespace Microsoft.Security --management-group-id "<management-group-id>"
   ```

   Verify registration before policy assignment in **Subscriptions** > **Resource providers** or the applicable management-group provider registration view. If you cannot verify the scope/state, stop and ask the Azure platform owner.
3. Open **Policy** > **Definitions** and search for **Enable Microsoft Defender for Cloud on your subscription**.
4. Open the definition and select **Assign**. Set the **Scope** to the approved management group; review exclusions and parameters. Do not select the tenant root management group unless that is explicitly approved.
5. On **Remediation**, select **Create a remediation task** so existing noncompliant subscriptions can be onboarded. Review the task scope and what it does, then create the assignment/remediation task through the change record.
6. Check **Policy** > **Compliance** and the remediation task status. Resolve permission/failure states before starting the next management-group wave.
7. Verify each intended subscription is connected to Defender for Cloud. This supplied policy enables baseline Defender for Cloud functionality; it does **not** replace per-scope review and enablement of paid Defender plans. Confirm each approved plan in **Defender for Cloud** > **Environment settings**.

**Check:** Policy assignment scope/ID, exclusions, remediation task, and subscription inventory all match the approved wave. A subscription being compliant with this onboarding policy does not by itself prove a paid plan or every protection feature is enabled. **Rollback:** Pause subsequent waves and have the policy owner disable/remove only the newly created assignment if it targeted the wrong scope; review remediation effects and subscription states before cleanup.

For the portal flow and policy behavior, follow Microsoft’s [management-group onboarding guide](https://learn.microsoft.com/azure/defender-for-cloud/onboard-management-group).

![Microsoft Learn reference snapshot: the built-in policy definition for enabling Defender for Cloud on subscriptions.](https://learn.microsoft.com/azure/defender-for-cloud/media/get-started/enable-microsoft-defender-for-cloud-policy.png)

![Microsoft Learn reference snapshot: assign the Defender for Cloud onboarding policy at the reviewed scope.](https://learn.microsoft.com/azure/defender-for-cloud/media/get-started/assign-policy.png)

![Microsoft Learn reference snapshot: create the policy remediation task for existing subscriptions.](https://learn.microsoft.com/azure/defender-for-cloud/media/get-started/remediation-task.png)

*These are Microsoft Learn reference snapshots of the management-group onboarding workflow; review the current article before applying policy in your tenant.*

### Lab completion record

Before closing the pilot, record:

| Evidence | Value to record |
|---|---|
| Tenant, subscription, and scope | Tenant ID/name, subscription ID, selected resource group, pilot resource IDs |
| Approved configuration | Plans and status, standards and assignment scope, Arc onboarding method, export/automation settings |
| Outcome | Inventory reconciliation, Arc Connected status, assessment result, remediation validation, export delivery |
| Operational ownership | Resource owner, SOC destination, finding SLA, escalation contact, exception approver |
| Financial and change record | Cost estimate and observed ingestion, budget alert, change/approval IDs, rollback owner |

Use this evidence to decide whether the pilot is ready for the broader rollout. Do not copy fictional resource names or findings from the Cloud360 training demo into production records.

## 1. Decide the target operating model

Before enabling paid plans or assigning policies:

1. Name an accountable service owner, a cloud security/platform owner, server/endpoint owners, compliance owner, and incident/change approver.
2. Define the Azure management-group hierarchy and identify which subscriptions are production, nonproduction, sandbox, or excluded.
3. Decide whether the first release covers Azure only, Azure plus on-premises, or Azure plus AWS/GCP. For on-premises and most full-featured AWS/GCP server protection, plan to represent machines as Azure Arc-enabled servers.
4. Select an initial pilot: one noncritical Azure subscription and a small, representative hybrid-server group. Do not start by assigning broad policies to every production scope.
5. Define success and exception criteria before rollout: machine coverage, plan coverage, required standards, remediation SLAs, accepted-risk process, notification recipients, and measured spend.

**WAF connection:** Treat the security service as an operational workload with a defined owner, objectives, risks, and measurable outcomes—not just a portal setting. Use the [Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/what-is-well-architected-framework) and the [Cloud Adoption Framework enterprise-scale landing zone guidance](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/).

## 2. Inventory assets, dependencies, and commercial impact

1. Export the subscription and management-group inventory. For each server, record owner, environment, business criticality, operating system, location, current endpoint/security tooling, network egress/proxy, maintenance window, and planned onboarding method.
2. Identify existing Microsoft Defender for Endpoint deployment and avoid duplicate or conflicting endpoint agents/policies. Confirm data residency, Log Analytics workspace design, SIEM destination, retention requirements, and required outbound connectivity with network and privacy teams.
3. Use the current [Defender for Cloud pricing page](https://azure.microsoft.com/pricing/details/defender-for-cloud/) and [cost calculator](https://learn.microsoft.com/azure/defender-for-cloud/cost-calculator) to model the plans against billable resources and regions. Estimate Azure Arc, Log Analytics ingestion/retention, Event Hubs, Logic Apps, and SIEM costs where applicable.
4. Decide plans by workload and business risk. Foundational CSPM is available without charge; advanced capabilities, including Defender CSPM and workload-protection plans, can incur charges. Select Defender for Servers Plan 1 or Plan 2 only after matching required features to the [Defender for Servers plan details](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers).
5. Record the plan owner, expected monthly cost, spend alert threshold, and approval for each paid plan. Do not treat a free-trial period as a production cost estimate: Microsoft documents a 30-day trial or a plan usage limit, whichever comes first, after which enabled plans can be billed. See [free-trial terms](https://learn.microsoft.com/azure/defender-for-cloud/free-trial).

**WAF — Cost optimization:** Set a budget and monthly review before enabling paid plans. Measure protected assets and ingestion, remove unintended scope, and validate actual cost against estimates after the pilot.

## 3. Prepare identity, permissions, and change controls

1. Use Microsoft Entra ID groups for platform administrators, security operations, workload/resource owners, auditors, and responders. Assign built-in roles at the narrowest practical scope; avoid standing Owner/Contributor access for routine review.
2. Separate responsibilities: subscription/plan and policy administrators; read-only assessors; machine/application owners who implement changes; and the SOC that triages alerts. Use Privileged Identity Management (PIM), approval, MFA, and time-bound elevation for privileged operations where available.
3. Confirm permissions before rollout. Assigning a regulatory standard requires Owner or Policy Contributor at the relevant scope; Defender for Servers deployment and machine operations have additional role requirements. Check the current [Defender for Servers roles and permissions](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers-roles).
4. Route all Azure Policy assignments, plan changes, agent deployment, automatic fixes, and exceptions through the organization's change-management process. Document policy exemptions with owner, justification, affected resources, approver, and expiry/review date.

**WAF — Security:** Use least privilege, separation of duties, auditable changes, and a time-bounded exception process. Do not embed credentials in scripts or images.

## 4. Enable Defender for Cloud at the right Azure scopes

1. Start with the pilot subscription. In the Azure portal, open **Microsoft Defender for Cloud** and verify that Foundational CSPM is collecting assessments and showing inventory.
2. Review **Environment settings** and choose workload plans for the pilot. Enable only the plans approved in the cost/security decision. Verify the per-resource coverage and required Defender for Endpoint or agent integrations.
3. After the pilot succeeds, expand by management group in rollout waves. Microsoft documents using the Azure Policy definition **Enable Microsoft Defender for Cloud on your subscription** at management-group scope; register the `Microsoft.Security` resource provider as required and create the remediation task for existing subscriptions. This policy enables baseline Defender for Cloud functionality; validate paid workload plans separately.
4. Assign policy at the management-group or subscription scope only after checking inheritance, existing assignments, exclusions, and policy conflicts. Avoid duplicating initiatives at child scopes unless the design requires an override.
5. Record the assignment ID, scope, parameters, exclusions, noncompliance, and remediation task status in source control/change records. Prefer reviewed policy-as-code and deployment pipelines for repeatability.

References: [Connect Azure subscriptions](https://learn.microsoft.com/azure/defender-for-cloud/connect-azure-subscription) · [Onboard a management group](https://learn.microsoft.com/azure/defender-for-cloud/onboard-management-group) · [Defender for Cloud overview and plans](https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction)

## 5. Establish standards and compliance reporting

1. Keep the Microsoft Cloud Security Benchmark (MCSB) as the foundational security baseline. Confirm the benchmark and assigned initiative in the actual target scope rather than inferring coverage from the training demo.
2. With compliance, legal, and control owners, select only the additional regulatory frameworks required by policy or contract. Confirm plan prerequisites and licensing: Microsoft documents that accessing regulatory compliance standards requires onboarding a Defender for Cloud plan other than Defender for Servers Plan 1 or Defender for API Plan 1.
3. Assign the standard at the highest applicable scope for consistent aggregation—management group when appropriate, otherwise subscription or cloud-provider account/project—using **Regulatory compliance > Manage compliance policies > Security policies** as described in Microsoft Learn.
4. Review standard parameters and policy effects. Check whether policies are audit, deny, modify, or deploy-if-not-exists before enabling them. Use pilot scope and change review for policies that could alter resource deployment or configuration.
5. Map business controls to Microsoft controls and recommendations. Record which control owners provide evidence outside Azure Policy; a Defender for Cloud compliance dashboard is a posture view, not by itself an audit attestation.
6. Review unhealthy assessments and recommendations with accountable resource owners. Track accepted exceptions separately and periodically reassess expired exceptions.

References: [Assign regulatory compliance standards](https://learn.microsoft.com/azure/defender-for-cloud/assign-regulatory-compliance-standards) · [Security policies and recommendations](https://learn.microsoft.com/azure/defender-for-cloud/security-policy-concept)

## 6. Onboard the hybrid estate with Azure Arc

For on-premises and other non-Azure servers:

1. Approve the operating systems, network routes, proxy configuration, outbound endpoints, regions, and Azure subscriptions that can be used for Azure Arc. Validate these prerequisites against the current [Azure Arc-enabled servers network requirements](https://learn.microsoft.com/azure/azure-arc/servers/network-requirements).
2. Choose an onboarding method: Azure Arc-enabled servers is Microsoft’s recommended approach for on-premises machines. For fleet rollout, use the supported [Azure Arc onboarding-at-scale procedure](https://learn.microsoft.com/azure/azure-arc/servers/onboard-service-principal) or your organization’s configuration-management tooling.
3. Create a dedicated onboarding identity with only the documented permissions and scope required for the onboarding operation. Secure and rotate any service-principal credential, limit who can retrieve it, and remove or disable it after onboarding if it is no longer needed. Do not distribute a subscription Owner credential to machine teams.
4. Pilot representative Windows and Linux systems. Confirm Arc agent health, Azure resource ID, correct subscription/resource group/tags, heartbeat, policy evaluation, and Defender for Servers coverage. Test disconnected or proxy-constrained machines before including those populations in the rollout.
5. Enable the approved Defender for Servers plan at the applicable Azure scope. Verify the Microsoft Defender for Endpoint integration and protection status; plan-specific agent, extension, vulnerability, guest-configuration, and data-collection requirements differ.
6. Roll out by application/region/OS rings with an agreed maintenance window. Monitor onboarding failures and agent health, and stop the next ring if coverage, performance, or ownership checks fail.
7. For AWS/GCP, use the supported Defender for Cloud cloud connectors and their current multicloud setup guides; decide whether Azure Arc representation is required for the desired server features. Do not assume every cloud connector or plan has identical coverage.
8. Validate coverage under **Defender for Cloud > Inventory** and reconcile against the authoritative CMDB. Investigate machines that are absent, duplicated, incorrectly scoped, or missing plan/agent status.

Microsoft references: [Connect on-premises machines](https://learn.microsoft.com/azure/defender-for-cloud/quickstart-onboard-machines) · [Plan Defender for Servers](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers) · [Connect AWS](https://learn.microsoft.com/azure/defender-for-cloud/quickstart-onboard-aws) · [Connect GCP](https://learn.microsoft.com/azure/defender-for-cloud/quickstart-onboard-gcp)

## 7. Design remediation at scale with guardrails

1. Define severity-based triage SLAs with asset criticality and exposure in mind. Assign an accountable owner and ticket/change record to each production finding; do not treat every recommendation as equally urgent.
2. Pilot remediation on nonproduction or low-risk resources. Review the recommendation's affected resources, rationale, required permissions, dependencies, and impact with the workload owner. Capture the before-state and a rollback plan.
3. Use the recommendation's **Fix** action only when Microsoft provides it and the proposed change has been reviewed. Microsoft notes that Fix can remediate multiple resources for supported recommendations; it is not available for every finding. For policy-based remediation, inspect the initiative/definition and parameters, assign the needed identity and permissions, then create a remediation task and observe its completion/errors.
4. For changes that can interrupt workloads, require a normal change approval, maintenance window, canary scope, and health check. Roll out by small batches and stop on error-rate, availability, or policy-regression thresholds.
5. Use Defender for Cloud **Workflow automation** with Azure Logic Apps to notify the right team, create/update tickets, enrich an incident, or start an approval workflow from selected alert/recommendation/compliance triggers. Start in notification/ticket-only mode. Add write/remediation actions only after explicit approval, idempotency, least-privilege identity, failure handling, and audit logging are tested.
6. Do not automatically suppress, exempt, or close findings merely to improve secure score or compliance percentages. Document accepted risks and time-bound exceptions instead.
7. Validate outcomes: rerun/await assessment, verify the recommendation status and the actual resource configuration, check service health and application telemetry, and record evidence. Defender’s assessment update may not be instantaneous; agree on an appropriate validation window.
8. Report aged high-severity findings, repeat findings, failed policy remediation tasks, unowned resources, exception expiry, and completed fixes to service owners on a regular cadence.

References: [Review and act on security recommendations](https://learn.microsoft.com/azure/defender-for-cloud/review-security-recommendations) · [Workflow automation with Logic Apps](https://learn.microsoft.com/azure/defender-for-cloud/workflow-automations)

## 8. Centralize monitoring and evidence

1. Choose the approved destination for security alerts and recommendations: the Microsoft Defender portal/SOC workflow, Log Analytics, Azure Event Hubs, or an established SIEM/SOAR integration. Define data owner, region, access, retention, and incident response responsibility.
2. Configure Defender for Cloud **Continuous export** for the required data and filters. Test delivery, schema handling, duplicate/replay behavior, alerting on export failure, and retention before making it a production dependency.
3. For organization-wide consistency, evaluate Microsoft's Azure Policy `DeployIfNotExists` continuous-export policies at the appropriate scope. Confirm the deployment identity's permissions and test policy remediation in the pilot first.
4. Use least privilege on Log Analytics/Event Hubs and the destination, and minimize exported data to the fields and severities required for the use case. Model ingestion, retention, and egress cost.
5. Build operational views around coverage, trend, time-to-owner, remediation age, exceptions, and alert/export pipeline health—not only a headline secure-score percentage.

References: [Continuous export](https://learn.microsoft.com/azure/defender-for-cloud/continuous-export) · [Continuous export with Azure Policy](https://learn.microsoft.com/azure/defender-for-cloud/continuous-export-azure-policy) · [WAF observability strategy](https://learn.microsoft.com/azure/well-architected/operational-excellence/observability)

## 9. Rollout waves and go-live gates

| Wave | Scope | Exit criteria |
|---|---|---|
| 0 · Design | Inventory, ownership, data flow, pricing, policy/RBAC review | Signed scope, cost estimate, risk/exception model, rollback plan |
| 1 · Pilot | One nonproduction Azure subscription and representative Arc machines | Inventory reconciled; plans and policies understood; data export, alert routing, and agent health tested |
| 2 · Production canary | One low-risk production application/team | Change-approved findings remediated; health verified; no unacceptable workload impact or spend variance |
| 3 · Scale | Remaining subscriptions/management groups and server rings | Each wave meets coverage, stability, policy, support, and spend thresholds before the next wave |
| 4 · Operate | Steady-state review and continual improvement | Named owners, recurring reviews, tested incident/remediation paths, current exceptions and documentation |

**Go-live checklist**

- [ ] The service owner and security operations contact are named.
- [ ] Azure subscriptions, management groups, hybrid machines, and exclusions reconcile with the CMDB.
- [ ] Chosen plans, standards, policy scopes, exemptions, and commercial approvals are documented.
- [ ] RBAC is least privilege and privileged access is reviewable.
- [ ] Arc onboarding, Defender for Servers coverage, and required integrations are healthy for the pilot population.
- [ ] Continuous export/incident routing and operational dashboards are tested.
- [ ] Supported policy fixes have been canaried; destructive or disruptive changes require owner approval.
- [ ] Rollback, escalation, data-retention, exception-expiry, and cost-review procedures are documented.
- [ ] The team has verified the Defender portal/Azure portal entry points that apply to its tenant and feature availability.

## 10. Apply all five Well-Architected pillars

| Pillar | Production application |
|---|---|
| **Security** | MCSB baseline; narrowly scoped standards; least-privilege RBAC; PIM; secure Arc onboarding identities; approved remediation and auditable exceptions. |
| **Reliability** | Roll out in rings; monitor agent, policy, Logic App, and export failures; ensure security-event routing is not a single unmonitored path; define manual triage fallback and recovery owners. |
| **Cost optimization** | Calculate plan and ingestion costs before enabling; compare actuals to budget; scope paid plans intentionally; review data volume, retention, and unused coverage. |
| **Operational excellence** | Treat policies and configuration as reviewed change; define ownership and SLAs; automate ticketing/approval before auto-remediation; track failure and outcome metrics; regularly rehearse runbooks. |
| **Performance efficiency** | Avoid collecting/exporting telemetry without an operational purpose; scope data collection to needed sources; measure agent and workload impact during pilot rings; tune query, retention, and downstream pipeline load. |

Use the [WAF pillar landing pages](https://learn.microsoft.com/azure/well-architected/what-is-well-architected-framework) to review current checklists and trade-offs for the workload and organization.

## Microsoft references

- [Defender for Cloud overview, capabilities, and plans](https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction)
- [Connect Azure subscriptions](https://learn.microsoft.com/azure/defender-for-cloud/connect-azure-subscription)
- [Onboard Defender for Cloud across a management group](https://learn.microsoft.com/azure/defender-for-cloud/onboard-management-group)
- [Assign regulatory compliance standards](https://learn.microsoft.com/azure/defender-for-cloud/assign-regulatory-compliance-standards)
- [Security policies, standards, and recommendations](https://learn.microsoft.com/azure/defender-for-cloud/security-policy-concept)
- [Review and act on security recommendations](https://learn.microsoft.com/azure/defender-for-cloud/review-security-recommendations)
- [Defender for Servers deployment planning](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers)
- [Defender for Servers permissions](https://learn.microsoft.com/azure/defender-for-cloud/plan-defender-for-servers-roles)
- [Connect on-premises machines with Azure Arc](https://learn.microsoft.com/azure/defender-for-cloud/quickstart-onboard-machines)
- [Azure Arc onboarding at scale](https://learn.microsoft.com/azure/azure-arc/servers/onboard-service-principal)
- [Workflow automation](https://learn.microsoft.com/azure/defender-for-cloud/workflow-automations)
- [Continuous export](https://learn.microsoft.com/azure/defender-for-cloud/continuous-export)
- [Continuous export with Azure Policy](https://learn.microsoft.com/azure/defender-for-cloud/continuous-export-azure-policy)
- [Defender for Cloud pricing](https://azure.microsoft.com/pricing/details/defender-for-cloud/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/well-architected/what-is-well-architected-framework)
- [WAF security](https://learn.microsoft.com/azure/well-architected/security/)
- [WAF reliability](https://learn.microsoft.com/azure/well-architected/reliability/)
- [WAF cost optimization](https://learn.microsoft.com/azure/well-architected/cost-optimization/)
- [WAF operational excellence and observability](https://learn.microsoft.com/azure/well-architected/operational-excellence/observability)
- [WAF performance efficiency](https://learn.microsoft.com/azure/well-architected/performance-efficiency/)
