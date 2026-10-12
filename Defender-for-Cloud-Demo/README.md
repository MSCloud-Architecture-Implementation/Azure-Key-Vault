# Cloud Security Lab

A self-contained guided product-tour simulation for Microsoft Defender for Cloud. It follows a video-guide learning pattern: choose a chapter, follow step-by-step captions over a live-feeling console, and operate fictional cloud resources directly.

## Run the simulation

Open `index.html` in a modern browser. No build step, package installation, Azure account, or network connection is required.

The supplied Cloud360 logo is stored locally at `assets/cloud360-logo.png` and appears on the welcome screen and simulated portal. The console uses an Azure-inspired blue portal header, navigation, and neutral workspace surfaces.

## Guided experience

1. Choose **Start interactive tour** or jump to a chapter from the launch screen.
2. Use the bottom player to step backward/forward, play the timed walkthrough, seek to a step, open the script, or enable browser text-to-speech narration.
3. Explore the fictional security posture and recommendations, then switch scope to **Hybrid estate** to see two Azure Arc-enabled server examples.
4. At the server recommendation step, select **Remediate** in the console. The walkthrough pauses until you resolve this sample finding.
5. Verify the simulated health change in the inventory and explore the regulatory compliance standards.
6. Exit the tour to explore the console freely, or use **Reset simulation** before the next session.

## Facilitator walkthrough

The tour takes about five minutes. Use the launch screen's chapters to focus a session on posture, the hybrid estate, or remediation and compliance. Enable narration from the player to prefer an Indian-English voice with a feminine-sounding voice name when the browser provides one. Speech is generated with the browser's built-in text-to-speech; voice and gender availability vary by browser and operating system. If no Indian-English voice is installed, the tour requests Indian-English pronunciation and shows a notice. All guide text remains available through **Show script**.

## Important

This is a learning aid, not the Defender for Cloud product. All tenant, subscription, resource, score, and finding data is fictional. The remediation workflow only changes this page's in-memory demo state; it does not connect to Azure, onboard an Azure Arc machine, install endpoint protection, or modify cloud resources. Reload the page or select **Reset simulation** to restore the starting scenario.

## Learn more

- [Reference guided experience: Protect your hybrid cloud with Azure Security Center](https://mslearn.cloudguides.com/guides/Protect%20your%20hybrid%20cloud%20with%20Azure%20Security%20Center)
- [Microsoft Defender for Cloud overview](https://learn.microsoft.com/azure/defender-for-cloud/defender-for-cloud-introduction)
- [Connect non-Azure machines to Defender for Cloud with Azure Arc](https://learn.microsoft.com/azure/defender-for-cloud/quickstart-onboard-machines)
- [Production implementation guide](./PRODUCTION-IMPLEMENTATION-GUIDE.md) — phased rollout, hybrid onboarding, standards, remediation controls, monitoring, and Well-Architected alignment.
