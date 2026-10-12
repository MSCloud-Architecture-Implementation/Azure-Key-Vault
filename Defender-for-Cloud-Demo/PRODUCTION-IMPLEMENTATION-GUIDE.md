# Production implementation guide: Microsoft Defender for Cloud

This runbook translates the training scenario into a staged production rollout of Microsoft Defender for Cloud security posture management, standards, hybrid server protection, and remediation operations. It is based on Microsoft Learn and the Azure Well-Architected Framework (WAF).

> **Scope:** This guide implements Defender for Cloud in an organization's Azure environment. It does not deploy the Cloud360 training website. The lab contains fabricated tenant and finding data; do not use it as production evidence or as a source of Azure configuration.
>
> **Product experience:** Microsoft is expanding Defender for Cloud capabilities into the Microsoft Defender portal. Portal locations and feature availability can change; follow the portal-specific entry points in current Microsoft Learn articles. This runbook uses "Defender for Cloud" for the service and calls out Azure portal steps where documented.

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
