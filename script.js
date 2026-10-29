
const $ = id => document.getElementById(id);

const STORAGE_KEY = "usabilitylab-project-v1";

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.plans) &&
        Array.isArray(saved.sessions) &&
        Array.isArray(saved.observations)) return saved;
  } catch (error) {
    console.warn("Could not load saved project data.");
  }
  return { plans: [], sessions: [], observations: [] };
}

let data = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showList(id, items, emptyMessage, template) {
  $(id).innerHTML = items.length
    ? items.map(template).join("")
    : `<p class="empty">${escapeHTML(emptyMessage)}</p>`;
}

function openPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("hidden", section.id !== page);
  });

  document.querySelectorAll(".nav").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => openPage(button.dataset.go));
});

$("planForm").addEventListener("submit", event => {
  event.preventDefault();

  data.plans.push({
    id: Date.now().toString(),
    title: $("planTitle").value.trim(),
    product: $("productName").value.trim(),
    objective: $("objective").value.trim(),
    audience: $("targetUsers").value.trim(),
    method: $("method").value,
    scenario: $("scenario").value.trim(),
    criteria: $("criteria").value.trim(),
    date: new Date().toLocaleDateString()
  });

  event.target.reset();
  saveData();
  alert("Test plan saved successfully!");
});

$("sessionForm").addEventListener("submit", event => {
  event.preventDefault();

  if (!data.plans.some(plan => plan.id === $("sessionPlan").value)) {
    alert("Please create a test plan first.");
    return;
  }

  data.sessions.push({
    id: Date.now().toString(),
    participant: $("participantId").value.trim(),
    planId: $("sessionPlan").value,
    task: $("taskName").value.trim(),
    time: Number($("taskTime").value),
    result: $("taskResult").value,
    errors: Number($("errorCount").value),
    rating: Number($("rating").value),
    notes: $("sessionNotes").value.trim(),
    date: new Date().toLocaleDateString()
  });

  event.target.reset();
  $("errorCount").value = 0;
  saveData();
  alert("Testing session saved successfully!");
});

$("observationForm").addEventListener("submit", event => {
  event.preventDefault();

  data.observations.push({
    id: Date.now().toString(),
    participant: $("obsParticipant").value.trim(),
    title: $("issueTitle").value.trim(),
    severity: $("severity").value,
    evidence: $("evidence").value.trim(),
    suggestion: $("suggestion").value.trim(),
    date: new Date().toLocaleDateString()
  });

  event.target.reset();
  saveData();
  alert("Observation saved successfully!");
});

function removeItem(type, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  if (type === "plan") {
    data.plans = data.plans.filter(item => item.id !== id);
    data.sessions = data.sessions.filter(item => item.planId !== id);
  }

  if (type === "session") {
    data.sessions = data.sessions.filter(item => item.id !== id);
  }

  if (type === "observation") {
    data.observations = data.observations.filter(item => item.id !== id);
  }

  saveData();
}

function render() {
  const successful = data.sessions.filter(s => s.result === "success").length;
  const attempted = data.sessions.length;
  const rate = attempted ? Math.round(successful / attempted * 100) : 0;
  const avgTime = attempted
    ? Math.round(data.sessions.reduce((sum, s) => sum + s.time, 0) / attempted)
    : 0;
  const errors = data.sessions.reduce((sum, s) => sum + s.errors, 0);
  const avgRating = attempted
    ? (data.sessions.reduce((sum, s) => sum + s.rating, 0) / attempted).toFixed(1)
    : "0.0";

  $("planCount").textContent = data.plans.length;
  $("participantCount").textContent =
    new Set(data.sessions.map(s => s.participant)).size;
  $("taskCount").textContent = attempted;
  $("successRate").textContent = rate + "%";
  $("reportSuccess").textContent = rate + "%";
  $("averageTime").textContent = avgTime + " sec";
  $("totalErrors").textContent = errors;
  $("averageRating").textContent = avgRating + "/5";
  $("progressBar").style.width = rate + "%";
  $("reportProgress").style.width = rate + "%";
  $("progressText").textContent = attempted
    ? `${successful} of ${attempted} tasks completed successfully.`
    : "No tasks recorded yet.";
  $("reportText").textContent = attempted
    ? `${successful} successful tasks out of ${attempted} attempted.`
    : "Record testing sessions to calculate your results.";

  showList("recentPlans", [...data.plans].reverse().slice(0, 4),
    "No plans yet. Create your first test plan.",
    plan => `<div class="record">
      <strong>${escapeHTML(plan.title)}</strong>
      <span class="pill">${escapeHTML(plan.method)}</span>
      <p>${escapeHTML(plan.product)} · ${escapeHTML(plan.date)}</p>
    </div>`);

  showList("allPlans", [...data.plans].reverse(), "Your saved plans will appear here.",
    plan => `<div class="record">
      <strong>${escapeHTML(plan.title)}</strong>
      <p>${escapeHTML(plan.objective)}</p>
      <p><b>Product:</b> ${escapeHTML(plan.product)}</p>
      <p><b>Scenario:</b> ${escapeHTML(plan.scenario)}</p>
      <p><b>Success criteria:</b> ${escapeHTML(plan.criteria)}</p>
      <button class="secondary" onclick="removeItem('plan','${plan.id}')">Delete plan</button>
    </div>`);

  const selectedPlan = $("sessionPlan").value;
  $("sessionPlan").innerHTML = `<option value="">Select a test plan</option>` +
    data.plans.map(plan =>
      `<option value="${escapeHTML(plan.id)}">${escapeHTML(plan.title)}</option>`
    ).join("");

  if (data.plans.some(plan => plan.id === selectedPlan)) {
    $("sessionPlan").value = selectedPlan;
  }

  showList("sessionList", [...data.sessions].reverse(), "No sessions recorded yet.",
    session => {
      const plan = data.plans.find(p => p.id === session.planId);
      return `<div class="record">
        <strong>${escapeHTML(session.task)}</strong>
        <span class="pill">${escapeHTML(session.participant)}</span>
        <span class="pill">${session.result === "success" ? "Successful" : "Unsuccessful"}</span>
        <p>${escapeHTML(plan?.title || "Deleted plan")} · ${session.time} sec · ${session.errors} errors · Rating ${session.rating}/5</p>
        <p>${escapeHTML(session.notes)}</p>
        <button class="secondary" onclick="removeItem('session','${session.id}')">Delete session</button>
      </div>`;
    });

  showList("observationList", [...data.observations].reverse(),
    "No observations yet.",
    observation => `<div class="record">
      <strong>${escapeHTML(observation.title)}</strong>
      <span class="pill">${escapeHTML(observation.severity)}</span>
      <span class="pill">${escapeHTML(observation.participant)}</span>
      <p><b>Evidence:</b> ${escapeHTML(observation.evidence)}</p>
      <p><b>Suggested improvement:</b> ${escapeHTML(observation.suggestion)}</p>
      <button class="secondary" onclick="removeItem('observation','${observation.id}')">Delete observation</button>
    </div>`);

  const recommendations = [];

  if (attempted && rate < 80) {
    recommendations.push("High priority: Review the tasks users could not complete. Simplify confusing steps and make the next action clearer.");
  }

  if (attempted && avgTime > 60) {
    recommendations.push("Medium priority: Review tasks with longer completion times. Improve navigation, labels, and the visibility of important actions.");
  }

  if (attempted && errors > 0) {
    recommendations.push("Medium priority: Investigate the recorded errors and add clearer instructions, validation, or helpful error messages.");
  }

  if (attempted && Number(avgRating) < 3.5) {
    recommendations.push("High priority: Review user feedback to identify frustrating interactions and improve the overall experience.");
  }

  if (data.observations.length) {
    const critical = data.observations.filter(o => o.severity === "Critical").length;
    const major = data.observations.filter(o => o.severity === "Major").length;

    if (critical) recommendations.push(`High priority: Review ${critical} critical usability issue(s) and address them first.`);
    if (major) recommendations.push(`Medium priority: Investigate ${major} major usability issue(s) and validate the proposed fixes.`);
    recommendations.push("Review the recorded observations below and prioritize improvements based on their impact on users.");
  }

  if (!attempted && !data.observations.length) {
    recommendations.push("Record testing sessions and observations to generate evidence-based recommendations.");
  }

  $("findings").innerHTML = recommendations.map(text =>
    `<div class="record">${escapeHTML(text)}</div>`
  ).join("");

  $("reportOutput").innerHTML = "";
}

$("sampleBtn").addEventListener("click", () => {
  if (!confirm("Load fictional demonstration data? Existing data will be kept.")) return;

  const planId = "demo-plan-" + Date.now();

  data.plans.push({
    id: planId,
    title: "Online Shopping Usability Test",
    product: "Sample shopping website",
    objective: "Evaluate product discovery and checkout usability.",
    audience: "College students",
    method: "Think-aloud testing",
    scenario: "Find a product and add it to the cart.",
    criteria: "Participant successfully adds the product to the cart.",
    date: new Date().toLocaleDateString()
  });

  const samples = [
    ["P01", "Find a product", 35, "success", 0, 5, "Found the product quickly."],
    ["P02", "Add item to cart", 62, "success", 1, 4, "Needed time to find the cart button."],
    ["P03", "Find a product", 95, "failure", 2, 2, "Could not locate the search feature."],
    ["P04", "Complete checkout", 80, "success", 1, 4, "Was unsure about the checkout button."],
    ["P05", "Add item to cart", 45, "success", 0, 5, "Completed the task without difficulty."]
  ];

  samples.forEach((s, index) => data.sessions.push({
    id: "demo-session-" + Date.now() + "-" + index,
    participant: s[0], planId, task: s[1], time: s[2],
    result: s[3], errors: s[4], rating: s[5],
    notes: s[6] + " (Fictional demo observation.)",
    date: new Date().toLocaleDateString()
  }));

  data.observations.push({
    id: "demo-observation-" + Date.now(),
    participant: "P03",
    title: "Search feature is difficult to find",
    severity: "Major",
    evidence: "Fictional demo finding: P03 struggled to locate search.",
    suggestion: "Make the search bar more visible and use a clear search icon.",
    date: new Date().toLocaleDateString()
  });

  saveData();
  alert("Demo data added. These are fictional results, not real user research.");
});

$("reportBtn").addEventListener("click", () => {
  const successful = data.sessions.filter(s => s.result === "success").length;
  const total = data.sessions.length;
  const rate = total ? Math.round(successful / total * 100) : 0;
  const avgTime = total
    ? Math.round(data.sessions.reduce((sum, s) => sum + s.time, 0) / total)
    : 0;
  const avgRating = total
    ? (data.sessions.reduce((sum, s) => sum + s.rating, 0) / total).toFixed(1)
    : "0.0";

  $("reportOutput").innerHTML = `
    <article class="panel">
      <h2>Usability Testing Report</h2>
      <p><b>Generated:</b> ${escapeHTML(new Date().toLocaleString())}</p>
      <h3>1. Research overview</h3>
      <p>Test plans: ${data.plans.length}. Testing sessions: ${total}.
      Unique participants: ${new Set(data.sessions.map(s => s.participant)).size}.</p>
      <h3>2. Usability metrics</h3>
      <p>Task success rate: ${rate}% (${successful}/${total} successful tasks).</p>
      <p>Average task completion time: ${avgTime} seconds.</p>
      <p>Total errors: ${data.sessions.reduce((sum, s) => sum + s.errors, 0)}.</p>
      <p>Average satisfaction: ${avgRating}/5.</p>
      <h3>3. Key observations</h3>
      <p>${data.observations.length} usability issues recorded.</p>
      ${data.observations.map(o => `<p><b>${escapeHTML(o.severity)}:</b> ${escapeHTML(o.title)}. ${escapeHTML(o.evidence)}</p>`).join("")}
      <h3>4. Design improvements</h3>
      ${$("findings").innerHTML}
      <h3>5. Conclusion</h3>
      <p>Review the recorded evidence, prioritize the most impactful issues, improve the design, and conduct another testing round to measure whether usability has improved.</p>
      <p><i>Note: Results reflect the data currently saved in this project. Demo data is fictional.</i></p>
    </article>`;

  $("reportOutput").scrollIntoView({ behavior: "smooth" });
});

$("printBtn").addEventListener("click", () => {
  openPage("analysis");
  if (!$("reportOutput").innerText.trim()) {
    alert("Please click Generate report first.");
    return;
  }
  window.print();
});

render();
