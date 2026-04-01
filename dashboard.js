// 🚀 Stable Admin Dashboard Script (Leads Only)
let submissionsData = [];
let charts = {};

const leadStatuses = [
  'New Lead', 'Transferred', 'Accepted', 'Rejected', 
  'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

window.switchView = function(view) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItems = document.querySelectorAll('.nav-item');
    if (view === 'dashboard') {
        document.getElementById('dashboardView').classList.add('active');
        navItems[0].classList.add('active');
        calculateDashboardStats();
    } else {
        document.getElementById('leadsView').classList.add('active');
        navItems[1].classList.add('active');
        renderTable(submissionsData);
    }
};

function calculateDashboardStats() {
    if (!submissionsData.length) return;
    const total = submissionsData.length;
    const accepted = submissionsData.filter(s => s.leadStatus === 'Accepted').length;
    const rejected = submissionsData.filter(s => s.leadStatus === 'Rejected').length;
    document.getElementById('dashboardTotal').innerText = total;
    document.getElementById('dashboardConvRate').innerText = total > 0 ? ((accepted / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('dashboardRejected').innerText = rejected;
    initCharts(submissionsData);
}

function initCharts(data) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');
    if (!ctxFlow || !ctxStatus) return;
    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();
    
    charts.status = new Chart(ctxStatus, { type: 'doughnut', data: { labels: leadStatuses, datasets: [{ data: leadStatuses.map(s => data.filter(x => x.leadStatus === s).length), backgroundColor: ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1'] }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%' } });
}

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${index+1}</td><td><strong>${item.name || "---"}</strong></td><td>${item.phone || "---"}</td><td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td><td><select class="status-select" onchange="window.handleStatusUpdate('${item.id}', this)">${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><button class="btn-action" onclick="window.openViewModal('${item.id}')">View</button></td>`;
        tbody.appendChild(tr);
    });
}

window.handleStatusUpdate = async function(id, el) {
    try { await fetch('/api/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, leadStatus: el.value }) }); } catch (e) { console.error(e); }
};

window.openViewModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let html = '<div style="max-height:400px; overflow-y:auto; padding:10px;">';
    Object.keys(item).forEach(k => { if(k!=='notes'&&k!=='id') html += `<div style="margin-bottom:10px;"><label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${k.toUpperCase()}</label><div style="padding:10px; background:#f8fafc; border-radius:8px;">${item[k]||'---'}</div></div>`; });
    document.getElementById('modalBox').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Lead Details</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.initDashboard = async function() {
    try {
        const res = await fetch('/api/submissions');
        const text = await res.text();

        if (!res.ok) {
            console.error(`API Error ${res.status}:`, text);
            return;
        }

        try {
            submissionsData = JSON.parse(text);
        } catch (parseErr) {
            console.error("Invalid JSON from API:", parseErr, "raw:", text);
            return;
        }

        calculateDashboardStats();
        switchView('dashboard');
    } catch (e) {
        console.error("Sync Error:", e);
    }
};