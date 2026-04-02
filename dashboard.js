// 🚀 Stable Admin Dashboard Script (Leads Only)
let submissionsData = [];
let charts = {};

const leadStatuses = [
  'New Lead', 'Transferred', 'Accepted', 'Rejected', 
  'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

const leadViewOrder = [
  'name', 'email', 'phone', 'dateOfBirth', 'address', 'postcode',
  'tenantType', 'tenancyDuration', 'hasDampMould', 'dampLocation', 'roomsAffected',
  'affectedSurface', 'issueDuration', 'issueCause', 'damageBelongings', 'healthProblems',
  'hasLeaks', 'leakLocation', 'leakSource', 'leakStart', 'leakOngoing', 'leakDamage',
  'cracksDamage', 'faultyElectrics', 'heatingIssues', 'structuralDamage', 'reportedOverMonth',
  'rentalArrears', 'arrearsAmount', 'additionalNotes', 'leadStatus', 'timestamp'
];

const leadFieldLabels = {
  name: 'Name',
  email: 'Email Address',
  phone: 'Phone Number',
  dateOfBirth: 'Date of Birth (DOB)',
  address: 'Address',
  postcode: 'Postcode',
  tenantType: 'Council/Housing Association Tenant?',
  tenancyDuration: 'How long living in property?',
  hasDampMould: 'Any damp or mould?',
  dampLocation: 'Where is damp/mould located?',
  roomsAffected: 'How many rooms affected?',
  affectedSurface: 'Wall/Ceiling/Floor?',
  issueDuration: 'How long issue present?',
  issueCause: 'Cause (leak/rain/pipe/roof)?',
  damageBelongings: 'Belongings damaged?',
  healthProblems: 'Health problems caused?',
  hasLeaks: 'Any leaks?',
  leakLocation: 'Leak coming from?',
  leakSource: 'From roof/ceiling/pipe/bathroom/kitchen?',
  leakStart: 'When did leak start?',
  leakOngoing: 'Is leak still ongoing?',
  leakDamage: 'Damage to walls/ceiling/floor?',
  cracksDamage: 'Cracks or structural damage?',
  faultyElectrics: 'Faulty electrics?',
  heatingIssues: 'Heating/Boiler issues?',
  structuralDamage: 'Cracks/structural damage?',
  reportedOverMonth: 'Reported over a month ago without fix?',
  rentalArrears: 'Rental arrears (<£1000)?',
  arrearsAmount: 'Arrears amount',
  additionalNotes: 'Additional Notes',
  leadStatus: 'Lead Status',
  timestamp: 'Created At'
};

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
        tr.innerHTML = `<td>${index+1}</td><td><strong>${item.name || "---"}</strong></td><td>${item.phone || "---"}</td><td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td><td><select class="status-select" onchange="window.handleStatusUpdate('${item.id}', this)">${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><button class="btn-action" onclick="window.openViewModal('${item.id}')">View</button> <button class="btn-action" onclick="window.openEditModal('${item.id}')">Edit</button></td>`;
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
    leadViewOrder.forEach(k => {
        if (k === 'id') return;
        const label = leadFieldLabels[k] || k;
        let value = item[k];
        if (value === undefined && k === 'dateOfBirth') value = item.dob || item.birthDate;
        if (value === undefined && k === 'tenantType') value = item.councilTenant || item.housingAssociation;
        if (value === undefined && k === 'affectedSurface') value = item.onWalls || item.onCeiling || item.onFloor;
        html += `<div style="margin-bottom:10px;"><label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${label}</label><div style="padding:10px; background:#f8fafc; border-radius:8px;">${value || '---'}</div></div>`;
    });
    html += '</div>';
    const modalHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2>Lead Details</h2>
        <div>
          <button class="btn-action" onclick="window.openEditModal('${id}')" style="margin-right:10px;">Edit</button>
          <button class="btn-action" onclick="document.getElementById('modalOverlay').style.display='none'">Close</button>
        </div>
      </div>
      ${html}`;
    document.getElementById('modalBox').innerHTML = modalHtml;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let html = '<div style="max-height:420px; overflow-y:auto; padding:10px;">';
    leadViewOrder.forEach(k => {
        if (k === 'id') return;
        const label = leadFieldLabels[k] || k;
        const value = item[k] || '';
        html += `<div style="margin-bottom:10px;"><label style="font-size:11px; font-weight:700; color:#334155;">${label}</label><input class="edit-input" id="edit-${k}" value="${String(value).replace(/"/g, '&quot;')}" /></div>`;
    });
    html += '</div>';
    const modalHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2>Edit Lead</h2>
        <button class="btn-action" onclick="document.getElementById('modalOverlay').style.display='none'">Close</button>
      </div>
      ${html}
      <div style="text-align:right;"><button class="btn-action" style="background:#10b981;color:#fff;" onclick="window.saveLeadEdits('${id}')">Save Changes</button></div>`;
    document.getElementById('modalBox').innerHTML = modalHtml;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveLeadEdits = async function(id) {
    const updates = {};
    leadViewOrder.forEach(k => {
        if (k === 'id') return;
        const el = document.getElementById(`edit-${k}`);
        if (el) updates[k] = el.value;
    });
    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates })
        });
        if (!res.ok) throw new Error('Update failed');
        const updated = await res.json();
        const idx = submissionsData.findIndex(s => String(s.id) === String(id));
        if (idx > -1) submissionsData[idx] = { ...submissionsData[idx], ...updated };
        window.openViewModal(id);
        renderTable(submissionsData);
    } catch (err) {
        alert('Update error: ' + err.message);
    }
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