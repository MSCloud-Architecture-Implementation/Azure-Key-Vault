const initialRecommendations = [
  { id: "storage-public", title: "Storage accounts should restrict network access", resource: "stnwproddata01", type: "Storage account", subscription: "Production", severity: "High", points: 8, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▤" },
  { id: "sql-tls", title: "SQL databases should use a minimum TLS version of 1.2", resource: "sql-customer-prod", type: "SQL database", subscription: "Production", severity: "High", points: 7, standard: "Azure CIS 2.0.0", status: "Active", icon: "▦" },
  { id: "vm-jit", title: "Management ports of virtual machines should be protected with just-in-time network access", resource: "vm-api-prod-02", type: "Virtual machine", subscription: "Production", severity: "High", points: 6, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▣" },
  { id: "key-expiry", title: "Keys should have an expiration date", resource: "kv-northwind-prod", type: "Key vault", subscription: "Production", severity: "Medium", points: 5, standard: "Azure CIS 2.0.0", status: "Active", icon: "⚿" },
  { id: "https-app", title: "App Service apps should only be accessible over HTTPS", resource: "web-portal-prod", type: "App Service", subscription: "Production", severity: "Medium", points: 5, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▱" },
  { id: "mfa", title: "MFA should be enabled on accounts with owner permissions", resource: "sub-engineering-01", type: "Subscription", subscription: "Engineering", severity: "Medium", points: 4, standard: "Azure CIS 2.0.0", status: "Active", icon: "♙" },
  { id: "disk-encryption", title: "Virtual machines should encrypt temporary disks and data caches", resource: "vm-build-agent-04", type: "Virtual machine", subscription: "Engineering", severity: "Medium", points: 4, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▣" },
  { id: "defender-sql", title: "Microsoft Defender for SQL should be enabled", resource: "sql-dev-shared", type: "SQL database", subscription: "Engineering", severity: "Medium", points: 3, standard: "Azure CIS 2.0.0", status: "Active", icon: "▦" },
  { id: "private-endpoint", title: "Key vaults should use private endpoints", resource: "kv-apps-shared", type: "Key vault", subscription: "Engineering", severity: "Medium", points: 3, standard: "Microsoft cloud security benchmark", status: "Active", icon: "⚿" },
  { id: "diagnostics", title: "Diagnostic logs in Key Vault should be enabled", resource: "kv-sandbox-lab", type: "Key vault", subscription: "Sandbox", severity: "Low", points: 2, standard: "Azure CIS 2.0.0", status: "Active", icon: "⚿" },
  { id: "container-vuln", title: "Container images should have vulnerability findings resolved", resource: "acr-apps-shared", type: "Container registry", subscription: "Engineering", severity: "Low", points: 2, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▧" },
  { id: "storage-encryption", title: "Storage accounts should use customer-managed keys", resource: "stnwarchive01", type: "Storage account", subscription: "Sandbox", severity: "Low", points: 2, standard: "Azure CIS 2.0.0", status: "Active", icon: "▤" },
  { id: "arc-endpoint", title: "Endpoint protection should be installed on Azure Arc-enabled servers", resource: "arc-edge-web-01", type: "Arc-enabled server", subscription: "Hybrid", severity: "High", points: 7, standard: "Microsoft cloud security benchmark", status: "Active", icon: "▣" }
];

const standards = [
  { name: "Microsoft cloud security benchmark", short: "M", controls: 24, unhealthy: 6, percent: 76, color: "blue", description: "Microsoft's comprehensive cloud security guidance, covering infrastructure, data, identity, and operations." },
  { name: "Azure CIS 2.0.0", short: "A", controls: 18, unhealthy: 5, percent: 76, color: "purple", description: "Security configuration recommendations from the Center for Internet Security for Azure." }
];
const resources = [
  ["stnwproddata01", "Storage account", "Production", "West US 2", "Unhealthy"],
  ["sql-customer-prod", "SQL database", "Production", "East US", "Unhealthy"],
  ["vm-api-prod-02", "Virtual machine", "Production", "West US 2", "Unhealthy"],
  ["kv-northwind-prod", "Key vault", "Production", "East US", "Unhealthy"],
  ["web-portal-prod", "App Service", "Production", "West US 2", "Unhealthy"],
  ["vm-build-agent-04", "Virtual machine", "Engineering", "East US", "Unhealthy"],
  ["sql-dev-shared", "SQL database", "Engineering", "East US", "Unhealthy"],
  ["kv-apps-shared", "Key vault", "Engineering", "West US 2", "Unhealthy"],
  ["kv-sandbox-lab", "Key vault", "Sandbox", "Central US", "Unhealthy"],
  ["acr-apps-shared", "Container registry", "Engineering", "East US", "Unhealthy"],
  ["stnwarchive01", "Storage account", "Sandbox", "Central US", "Unhealthy"],
  ["arc-edge-web-01", "Arc-enabled server", "Hybrid", "On-premises · London", "Unhealthy"],
  ["arc-finance-srv-02", "Arc-enabled server", "Hybrid", "On-premises · Singapore", "Healthy"],
  ["vm-web-prod-01", "Virtual machine", "Production", "West US 2", "Healthy"],
  ["func-order-events", "Function app", "Production", "East US", "Healthy"],
  ["cosmos-orders-dev", "Cosmos DB", "Engineering", "East US", "Healthy"],
  ["stnwlogsprod01", "Storage account", "Production", "West US 2", "Healthy"],
  ["vm-runner-sbx-01", "Virtual machine", "Sandbox", "Central US", "Healthy"]
];
const initialScore = 68;
let recommendations = structuredClone(initialRecommendations);
let selectedIds = new Set();
let scope = "all";
let currentGuideStep = 0;
let guideTimer;
let narrationEnabled = false;

const guideSteps = [
  { chapter: "WELCOME", title: "Welcome to Defender for Cloud", description: "This is a hands-on tour of a fictional Northwind Group tenant. The console is interactive: you can change scope, inspect findings, and remediate a sample issue. None of these actions reach Azure.", view: "overview", focus: null },
  { chapter: "01 · SECURITY POSTURE", title: "Start with your security posture", description: "The secure score summarizes how well your environment aligns with security recommendations. A higher score means more recommended actions have been completed. The score in this lab is sample data, not a live assessment.", view: "overview", focus: ".score-card" },
  { chapter: "01 · SECURITY POSTURE", title: "Find and prioritize recommendations", description: "Recommendations connect a security issue to affected resources and remediation guidance. Review severity and scope before choosing an action. Try the severity filter, then continue to the hybrid estate.", view: "recommendations", focus: "#severity-filter" },
  { chapter: "02 · HYBRID ESTATE", title: "Bring hybrid assets into view", description: "Defender for Cloud can give you a security view of Azure and connected non-Azure resources. This fictional inventory includes Azure Arc-enabled servers. Switch the scope to Hybrid estate to explore the two sample machines.", view: "inventory", scope: "hybrid", focus: "#inventory-table", action: "Switch to Hybrid estate", actionId: "hybrid-scope" },
  { chapter: "02 · HYBRID ESTATE", title: "Act on a server recommendation", description: "This simulated Arc-enabled server has an endpoint-protection recommendation. Select Remediate on its row to practice responding to a finding. The change is local to the demo and does not install software or change a real server.", view: "recommendations", scope: "hybrid", focus: '[data-remediate="arc-endpoint"]', gate: "arc-endpoint" },
  { chapter: "03 · REMEDIATE & VERIFY", title: "Verify the change in inventory", description: "The sample server now shows as healthy because its recommendation was marked resolved in the lab. In a real environment, Defender for Cloud reassesses resource configurations and security posture; this demo only simulates that feedback.", view: "inventory", scope: "hybrid", focus: '[data-resource="arc-edge-web-01"]', gate: "arc-endpoint" },
  { chapter: "03 · REMEDIATE & VERIFY", title: "Map posture to security standards", description: "Regulatory compliance maps assessments to requirements in enabled standards. Unhealthy controls are linked to recommendations, helping teams track both technical fixes and their compliance impact.", view: "standards", scope: "all", focus: "#standards-list" },
  { chapter: "FINISH", title: "Your hybrid cloud security loop", description: "You have explored posture, brought a hybrid asset into scope, resolved a sample finding, and checked the compliance view. Reset the simulation at any time to restore the original fictional data.", view: "overview", scope: "all", focus: null }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const activeScopeRecommendations = () => recommendations.filter((item) => item.status === "Active" && (scope === "all" || item.subscription.toLowerCase() === scope));
const severityClass = (severity) => severity.toLowerCase();

function renderRecommendationRows(items, includeCheckbox = false) {
  if (!items.length) return `<div class="empty-state">No recommendations match these filters.</div>`;
  const rows = items.map((item) => `<tr>
    ${includeCheckbox ? `<td class="check-cell"><input class="row-check" type="checkbox" aria-label="Select ${escapeHtml(item.title)}" data-id="${item.id}" ${selectedIds.has(item.id) ? "checked" : ""} ${item.status === "Fixed" ? "disabled" : ""}></td>` : ""}
    <td><span class="rec-name"><span class="rec-icon">${item.icon}</span>${escapeHtml(item.title)}</span></td>
    <td><span class="severity-pill ${severityClass(item.severity)}">${item.severity}</span></td>
    <td><span data-resource="${escapeHtml(item.resource)}">${escapeHtml(item.resource)}</span></td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.subscription)}</td>
    <td><span class="status-pill ${item.status.toLowerCase()}">${item.status}</span></td>
    <td><button class="table-action" data-remediate="${item.id}">${item.status === "Fixed" ? "Resolved" : "Remediate"}</button></td>
  </tr>`).join("");
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${includeCheckbox ? `<th class="check-cell"><input class="select-all" type="checkbox" aria-label="Select all active recommendations" ${items.length && items.every((item) => item.status === "Fixed" || selectedIds.has(item.id)) ? "checked" : ""}></th>` : ""}
    <th>RECOMMENDATION</th><th>SEVERITY</th><th>AFFECTED RESOURCE</th><th>TYPE</th><th>SCOPE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderStandards() {
  $("#standards-list").innerHTML = standards.map((standard) => {
    const fixed = recommendations.filter((item) => item.status === "Fixed" && item.standard === standard.name).length;
    const percent = Math.min(99, standard.percent + Math.round(fixed / standard.controls * 100));
    const unhealthy = Math.max(0, standard.unhealthy - fixed);
    return `<article class="standard-card"><div class="standard-card-top"><div class="standard-icon ${standard.color}">${standard.short}</div><div><h3>${standard.name}</h3><p>${standard.description}</p></div><div class="ring ${standard.color === "purple" ? "purple-ring" : ""}" style="--progress:${percent}"><span>${percent}%</span></div></div><div class="standard-progress"><span style="width:${percent}%"></span></div><div class="standard-meta"><span>${standard.controls} controls assessed</span><strong>${unhealthy} unhealthy</strong></div></article>`;
  }).join("");
}

function renderInventory() {
  const filtered = resources.filter((resource) => scope === "all" || resource[2].toLowerCase() === scope);
  const resourceCounts = { all: 44, production: 18, engineering: 16, sandbox: 8, hybrid: 2 };
  $("#resource-count").textContent = resourceCounts[scope];
  $("#inventory-scope-summary").textContent = scope === "all" ? "across 3 subscriptions + hybrid" : scope === "hybrid" ? "in hybrid estate" : "in this subscription";
  $("#unhealthy-count").textContent = filtered.filter((resource) => resource[4] === "Unhealthy" && recommendations.some((item) => item.resource === resource[0] && item.status === "Active")).length;
  $("#inventory-table").innerHTML = `<div class="table-wrap"><table class="data-table"><thead><tr><th>RESOURCE NAME</th><th>TYPE</th><th>SCOPE</th><th>LOCATION</th><th>HEALTH</th></tr></thead><tbody>${filtered.map((resource) => {
    const finding = recommendations.find((item) => item.resource === resource[0]);
    const health = finding?.status === "Fixed" ? "Healthy" : resource[4];
    return `<tr><td><span class="rec-name"><span class="rec-icon">◇</span><span data-resource="${escapeHtml(resource[0])}">${escapeHtml(resource[0])}</span></span></td><td>${escapeHtml(resource[1])}</td><td>${escapeHtml(resource[2])}</td><td>${escapeHtml(resource[3])}</td><td><span class="status-pill ${health.toLowerCase()}">${health}</span></td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function updateDashboard() {
  const active = activeScopeRecommendations();
  const fixedCount = recommendations.filter((item) => item.status === "Fixed" && (scope === "all" || item.subscription.toLowerCase() === scope)).length;
  const high = active.filter((item) => item.severity === "High").length;
  const medium = active.filter((item) => item.severity === "Medium").length;
  const score = Math.min(99, initialScore + recommendations.filter((item) => item.status === "Fixed").reduce((sum, item) => sum + item.points, 0));
  $("#score-value").textContent = score;
  $("#score-progress").style.width = `${score}%`;
  $("#active-count").textContent = active.length;
  $("#nav-recommendation-count").textContent = active.length;
  $("#high-priority-count").textContent = high;
  $("#recommendation-scope-summary").textContent = scope === "all" ? "Across 3 subscriptions + hybrid" : `In ${scope === "hybrid" ? "Hybrid estate" : scope[0].toUpperCase() + scope.slice(1)}`;
  $("#assessment-count").textContent = Math.max(0, 24 - fixedCount);
  $("#compliance-value").textContent = Math.round(standards.reduce((sum, standard) => {
    const fixedForStandard = recommendations.filter((item) => item.status === "Fixed" && item.standard === standard.name).length;
    return sum + Math.min(99, standard.percent + Math.round(fixedForStandard / standard.controls * 100));
  }, 0) / standards.length);
  $("#list-high-count").textContent = high;
  $("#list-medium-count").textContent = medium;
  $("#list-fixed-count").textContent = fixedCount;
  $("#scope-label").textContent = scope === "all" ? "Northwind Group" : scope === "hybrid" ? "Hybrid estate" : `${scope[0].toUpperCase()}${scope.slice(1)} subscription`;
  $("#recommendations-table").innerHTML = renderRecommendationRows(active, true);
  $("#top-recommendations").innerHTML = renderRecommendationRows(active.slice(0, 4));
  renderInventory();
  renderStandards();
  updateSelection();
}

function getFilteredRecommendations() {
  const search = $("#search-input").value.trim().toLowerCase();
  const severity = $("#severity-filter").value;
  const status = $("#status-filter").value;
  return recommendations.filter((item) => (scope === "all" || item.subscription.toLowerCase() === scope)
    && (status === "all" || item.status.toLowerCase() === status)
    && (severity === "all" || item.severity === severity)
    && (!search || `${item.title} ${item.resource} ${item.type} ${item.subscription} ${item.standard}`.toLowerCase().includes(search)));
}

function renderRecommendationsView() {
  $("#recommendations-table").innerHTML = renderRecommendationRows(getFilteredRecommendations(), true);
  updateSelection();
}

function updateSelection() {
  const visibleActiveIds = getFilteredRecommendations().filter((item) => item.status === "Active").map((item) => item.id);
  selectedIds = new Set([...selectedIds].filter((id) => recommendations.some((item) => item.id === id && item.status === "Active")));
  $("#selected-count").textContent = selectedIds.size;
  $("#bulk-bar").classList.toggle("visible", selectedIds.size > 0);
  const selectAll = $(".select-all", $("#recommendations-table"));
  if (selectAll) selectAll.checked = visibleActiveIds.length > 0 && visibleActiveIds.every((id) => selectedIds.has(id));
}

function openView(view) {
  $$(".view").forEach((element) => element.classList.toggle("active", element.id === `${view}-view`));
  $$(".nav-item[data-view]").forEach((element) => element.classList.toggle("active", element.dataset.view === view));
  const labels = { overview: "Overview", recommendations: "Recommendations", standards: "Regulatory compliance", inventory: "Inventory" };
  $("#breadcrumb-current").textContent = labels[view];
  $("#page-title").textContent = view === "overview" ? "Security posture" : labels[view];
  $("#page-subtitle").textContent = view === "overview" ? "A unified view of your cloud security posture across the organization." : view === "recommendations" ? "Review findings, prioritize risk, and simulate remediation at scale." : view === "standards" ? "Assess your environment against recognized cloud security standards." : "Explore the resources represented in this fictional cloud environment.";
  if (view === "recommendations") renderRecommendationsView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let toastTimeout;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

function simulateRemediation(ids) {
  const selected = recommendations.filter((item) => ids.includes(item.id) && item.status === "Active");
  if (!selected.length) return;
  const scoreGain = selected.reduce((sum, item) => sum + item.points, 0);
  selected.forEach((item) => { item.status = "Fixed"; });
  selectedIds.clear();
  updateDashboard();
  renderRecommendationsView();
  $("#dialog-message").textContent = `${selected.length} ${selected.length === 1 ? "recommendation was" : "recommendations were"} resolved in the Northwind Group training environment.`;
  $("#dialog-score").textContent = `+${scoreGain} ${scoreGain === 1 ? "point" : "points"}`;
  $("#dialog-fixed").textContent = `${selected.length} ${selected.length === 1 ? "recommendation" : "recommendations"}`;
  $("#remediation-dialog").showModal();
  refreshGuideGate();
}

function stopGuidePlayback() {
  clearInterval(guideTimer);
  guideTimer = undefined;
  $("#play-tour").textContent = "▶";
  $("#play-tour").setAttribute("aria-label", "Play guided tour");
  $("#play-tour").title = "Play guided tour";
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function canEnterGuideStep(index) {
  const gatedStep = guideSteps.findIndex((step) => step.gate && recommendations.some((item) => item.id === step.gate && item.status === "Active"));
  return gatedStep === -1 || index <= gatedStep;
}

function refreshGuideGate() {
  if (!document.body.classList.contains("tour-active")) return;
  const step = guideSteps[currentGuideStep];
  const blocked = Boolean(step.gate && recommendations.some((item) => item.id === step.gate && item.status === "Active"));
  $("#previous-step").disabled = currentGuideStep === 0;
  $("#next-step").disabled = blocked || currentGuideStep === guideSteps.length - 1;
  $("#step-seek").max = String(blocked ? currentGuideStep : guideSteps.length - 1);
  if (currentGuideStep === 4 && !blocked) {
    $("#tour-description").textContent = "Great work. The hybrid-server finding is now resolved in this simulation. Continue to the inventory to confirm the sample machine's updated health.";
    $("#tour-action-wrap").innerHTML = `<span class="tour-success">✓ Sample recommendation resolved</span>`;
  }
}

function speakCurrentGuideStep() {
  if (!narrationEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${guideSteps[currentGuideStep].title}. ${guideSteps[currentGuideStep].description}`);
  const voice = getPreferredNarrationVoice();
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = "en-IN";
  window.speechSynthesis.speak(utterance);
}

function getPreferredNarrationVoice(voices = window.speechSynthesis?.getVoices() || []) {
  const indianEnglish = voices.filter((voice) => /^en[-_]IN$/i.test(voice.lang));
  const hindiVoices = voices.filter((voice) => /^hi[-_]IN$/i.test(voice.lang));
  const indianVoices = voices.filter((voice) => /[-_]IN$/i.test(voice.lang));
  const feminineVoiceName = /female|woman|girl|heera|neerja|aditi|priya|swara|kajal|veena|raveena|tara|sangeeta|kalpana|pallavi|lekha|geeta|gita|piya|soumya|vani|pooja/i;
  return indianEnglish.find((voice) => feminineVoiceName.test(voice.name))
    || hindiVoices.find((voice) => feminineVoiceName.test(voice.name))
    || indianVoices.find((voice) => feminineVoiceName.test(voice.name))
    || null;
}

function updateNarrationHint(isOn = narrationEnabled) {
  if (!window.speechSynthesis) return;
  const action = isOn ? "Turn off narration" : "Turn on narration";
  const voice = getPreferredNarrationVoice();
  if (voice && /^en[-_]IN$/i.test(voice.lang)) {
    $("#toggle-narration").title = `${action} · ${voice.name}, feminine-sounding Indian English voice`;
    $("#toggle-narration").setAttribute("aria-label", `${action} with ${voice.name}, a feminine-sounding Indian English voice`);
  } else if (voice) {
    $("#toggle-narration").title = `${action} · ${voice.name}, an Indian voice; English India pronunciation requested`;
    $("#toggle-narration").setAttribute("aria-label", `${action} with the Indian voice ${voice.name}; English India pronunciation requested`);
  } else {
    $("#toggle-narration").title = `${action} · Indian English requested; no feminine-sounding Indian voice is available`;
    $("#toggle-narration").setAttribute("aria-label", `${action}; requests Indian English pronunciation because no feminine-sounding Indian voice is available`);
  }
}

function renderScriptSteps() {
  $("#script-steps").innerHTML = guideSteps.map((step, index) => `<button class="script-step ${index === currentGuideStep ? "current" : ""}" data-script-step="${index}" ${canEnterGuideStep(index) ? "" : "disabled"}><span>${String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.chapter)}</small></span>${index === currentGuideStep ? `<i>●</i>` : ""}</button>`).join("");
}

function setGuideStep(index, keepPlaying = false) {
  if (index < 0 || index >= guideSteps.length) return;
  if (!canEnterGuideStep(index)) {
    if (!keepPlaying) stopGuidePlayback();
    showToast("Complete the hybrid-server remediation before continuing.");
    return;
  }
  stopGuidePlayback();
  currentGuideStep = index;
  const step = guideSteps[index];
  scope = step.scope || "all";
  $("#scope-select").value = scope;
  $("#search-input").value = "";
  $("#severity-filter").value = "all";
  $("#status-filter").value = "active";
  updateDashboard();
  openView(step.view);
  $("#tour-step-label").textContent = `STEP ${String(index + 1).padStart(2, "0")} OF ${guideSteps.length}`;
  $("#tour-chapter-label").textContent = step.chapter;
  $("#tour-title").textContent = step.title;
  $("#tour-description").textContent = step.description;
  $("#tour-action-wrap").innerHTML = step.action ? `<button class="tour-action" data-guide-action="${step.actionId}">${step.action} →</button>` : "";
  $("#player-title").textContent = step.title;
  $("#step-time").textContent = String(index + 1).padStart(2, "0");
  $("#step-seek").value = index;
  $$(".script-step").forEach((button) => button.classList.toggle("current", Number(button.dataset.scriptStep) === index));
  $$(".tour-target").forEach((element) => element.classList.remove("tour-target"));
  if (step.focus) {
    const focus = $(".view.active")?.querySelector(step.focus) || $(step.focus);
    const target = focus?.closest("tr") || focus;
    target?.classList.add("tour-target");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  refreshGuideGate();
  renderScriptSteps();
  speakCurrentGuideStep();
}

function startGuide(index = 0) {
  document.body.classList.remove("guide-welcome");
  document.body.classList.add("tour-active");
  $("#tour-caption").hidden = false;
  $("#tour-controls").hidden = false;
  $("#script-panel").hidden = !$("#toggle-script").classList.contains("active");
  setGuideStep(index);
}

function toggleTourPlayback() {
  if (guideTimer) {
    stopGuidePlayback();
    return;
  }
  $("#play-tour").textContent = "Ⅱ";
  $("#play-tour").setAttribute("aria-label", "Pause guided tour");
  $("#play-tour").title = "Pause guided tour";
  speakCurrentGuideStep();
  guideTimer = setInterval(() => {
    const nextIndex = currentGuideStep + 1;
    if (nextIndex >= guideSteps.length || !canEnterGuideStep(nextIndex)) {
      stopGuidePlayback();
      return;
    }
    setGuideStep(nextIndex, true);
    if (currentGuideStep === guideSteps.length - 1 || !canEnterGuideStep(currentGuideStep + 1)) stopGuidePlayback();
  }, 9000);
}

function exitGuide() {
  stopGuidePlayback();
  document.body.classList.remove("tour-active");
  $("#tour-caption").hidden = true;
  $("#tour-controls").hidden = true;
  $("#script-panel").hidden = true;
  $$(".tour-target").forEach((element) => element.classList.remove("tour-target"));
}

document.addEventListener("click", (event) => {
  const start = event.target.closest("[data-start-guide]");
  if (start) startGuide(Number(start.dataset.startGuide));
  if (event.target.closest("#explore-console")) document.body.classList.remove("guide-welcome");
  const nav = event.target.closest("[data-view]");
  if (nav) openView(nav.dataset.view);
  const route = event.target.closest("[data-go]");
  if (route) openView(route.dataset.go);
  const remediate = event.target.closest("[data-remediate]");
  if (remediate) simulateRemediation([remediate.dataset.remediate]);
  const guideAction = event.target.closest("[data-guide-action]");
  if (guideAction?.dataset.guideAction === "hybrid-scope") {
    $("#scope-select").value = "hybrid";
    scope = "hybrid";
    updateDashboard();
    showToast("Scope changed to the fictional Hybrid estate.");
  }
  const scriptStep = event.target.closest("[data-script-step]");
  if (scriptStep && !scriptStep.disabled) setGuideStep(Number(scriptStep.dataset.scriptStep));
});

$("#scope-select").addEventListener("change", (event) => {
  scope = event.target.value;
  selectedIds.clear();
  updateDashboard();
  if ($("#recommendations-view").classList.contains("active")) renderRecommendationsView();
});

["search-input", "severity-filter", "status-filter"].forEach((id) => $(`#${id}`).addEventListener(id === "search-input" ? "input" : "change", renderRecommendationsView));

$("#recommendations-table").addEventListener("change", (event) => {
  if (event.target.matches(".select-all")) {
    const ids = getFilteredRecommendations().filter((item) => item.status === "Active").map((item) => item.id);
    if (event.target.checked) ids.forEach((id) => selectedIds.add(id));
    else ids.forEach((id) => selectedIds.delete(id));
  } else if (event.target.matches(".row-check")) {
    if (event.target.checked) selectedIds.add(event.target.dataset.id);
    else selectedIds.delete(event.target.dataset.id);
  } else return;
  updateSelection();
});

$("#clear-selection").addEventListener("click", () => { selectedIds.clear(); renderRecommendationsView(); });
$("#remediate-selected").addEventListener("click", () => simulateRemediation([...selectedIds]));
$("#dialog-done").addEventListener("click", () => $("#remediation-dialog").close());
$("#refresh-button").addEventListener("click", () => showToast("Assessment refreshed. This demo uses fictional data."));
$("#reset-button").addEventListener("click", () => {
  recommendations = structuredClone(initialRecommendations);
  selectedIds.clear();
  updateDashboard();
  showToast("Simulation reset to its original training state.");
});

$("#previous-step").addEventListener("click", () => setGuideStep(currentGuideStep - 1));
$("#next-step").addEventListener("click", () => setGuideStep(currentGuideStep + 1));
$("#play-tour").addEventListener("click", toggleTourPlayback);
$("#step-seek").addEventListener("input", (event) => setGuideStep(Number(event.target.value)));
$("#exit-guide").addEventListener("click", exitGuide);
$("#finish-guide").addEventListener("click", exitGuide);
$("#toggle-script").addEventListener("click", () => {
  const button = $("#toggle-script");
  button.classList.toggle("active");
  $("#script-panel").hidden = !button.classList.contains("active");
  if (button.classList.contains("active")) renderScriptSteps();
});
$("#close-script").addEventListener("click", () => {
  $("#toggle-script").classList.remove("active");
  $("#script-panel").hidden = true;
});
$("#toggle-narration").addEventListener("click", () => {
  if (!window.speechSynthesis) {
    showToast("Narration is not supported by this browser. You can still follow the guide script.");
    return;
  }
  narrationEnabled = !narrationEnabled;
  $("#toggle-narration").classList.toggle("active", narrationEnabled);
  if (narrationEnabled) {
    updateNarrationHint(true);
    if (!getPreferredNarrationVoice()) {
      showToast("No feminine-sounding Indian voice is available in this browser. Narration requests English India pronunciation; install an Indian English female voice for the requested voice.");
    }
    speakCurrentGuideStep();
  } else {
    updateNarrationHint(false);
    window.speechSynthesis.cancel();
  }
});
$("#toggle-fullscreen").addEventListener("click", () => {
  const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
  request?.catch(() => showToast("Full screen is unavailable in this browser context."));
});
$("#remediation-dialog").addEventListener("close", refreshGuideGate);
document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  $("#toggle-fullscreen").setAttribute("aria-label", isFullscreen ? "Exit full screen" : "Enter full screen");
  $("#toggle-fullscreen").title = isFullscreen ? "Exit full screen" : "Full screen";
});

renderScriptSteps();
updateDashboard();
if (window.speechSynthesis) {
  updateNarrationHint();
  window.speechSynthesis.addEventListener("voiceschanged", updateNarrationHint);
}
