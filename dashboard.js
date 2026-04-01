// 🛡️ Enterprise-Grade Secured Dashboard & CRM Script
let submissionsData = [];
let companiesData = [];
let currentCompanyId = null;
let currentCompanyName = "";
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
    } else if (view === 'companies') {
        document.getElementById('companiesView').classList.add('active');
        navItems[1].classList.add('active');
        window.fetchCompanies();
    } else if (view === 'leads') {
        document.getElementById('leadsView').classList.add('active');
        navItems[2].classList.add('active');
        renderTable(submissionsData);
    } else if (view === 'members') {
        document.getElementById('membersView').classList.add('active');
        navItems[1].classList.add('active');
    }
};

window.fetchCompanies = async function() {
    try {
        const res = await fetch('/api/companies');
        if (!res.ok) throw new Error("Sync failure.");
        companiesData = await res.json();
        renderCompaniesTable();
    } catch (e) { console.error("Fetch Error:", e); }
};

function renderCompaniesTable() {
    const tbody = document.querySelector("#companyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesData.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${c.name}</strong></td><td>${c.type || '---'}</td><td>${c.main_contact || '---'}</td><td>${c.postcode || '---'}</td><td><span class="status-btn ${c.is_active ? 'status-accepted' : 'status-rejected'}" style="font-size:10px; padding:4px 8px;">${c.is_active ? 'Active' : 'Inactive'}</span></td><td><div class="action-btn-group"><button class="btn-action" onclick="window.openCompanyMembers('${c.id}', '${c.name.replace(/'/g, "\\'")}')">Team</button><button class="btn-action" onclick="window.openEditCompanyModal('${c.id}')">Edit</button></div></td>`;
        tbody.appendChild(tr);
    });
}

window.openAddCompanyModal = function() {
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Register New Company</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; max-height:450px; overflow-y:auto; padding:10px;">
            <div><label>Company Name</label><input type="text" id="c_name" class="edit-input" required></div>
            <div><label>Company Type</label><input type="text" id="c_type" class="edit-input"></div>
            <div><label>Main Contact</label><input type="text" id="c_contact" class="edit-input"></div>
            <div><label>Website</label><input type="text" id="c_website" class="edit-input"></div>
            <div><label>Address</label><input type="text" id="c_address" class="edit-input"></div>
            <div><label>Town</label><input type="text" id="c_town" class="edit-input"></div>
            <div><label>County</label><input type="text" id="c_county" class="edit-input"></div>
            <div><label>Postcode</label><input type="text" id="c_postcode" class="edit-input"></div>
            <div style="grid-column: span 2;"><label><input type="checkbox" id="c_active" checked> Active Solicitor Firm</label></div>
        </div>
        <button onclick="window.saveCompany()" style="width:100%; margin-top:20px; padding:14px; background:#2563eb; color:white; border-radius:12px; font-weight:700; border:none; cursor:pointer;">Save Firm Details</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveCompany = async function(id = null) {
    const payload = { id, name: document.getElementById('c_name').value, type: document.getElementById('c_type').value, main_contact: document.getElementById('c_contact').value, website: document.getElementById('c_website').value, address: document.getElementById('c_address').value, town: document.getElementById('c_town').value, county: document.getElementById('c_county').value, postcode: document.getElementById('c_postcode').value, is_active: document.getElementById('c_active').checked };
    try {
        const res = await fetch('/api/companies', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if (res.ok) { document.getElementById('modalOverlay').style.display = 'none'; window.fetchCompanies(); alert("Success: Company registration finalized."); }
        else { const err = await res.json(); alert("Save Failure: " + (err.error || "Access Denied.")); }
    } catch (e) { alert("Connectivity Error."); }
};

window.openEditCompanyModal = function(id) {
    const c = companiesData.find(x => x.id === id);
    if (!c) return;
    window.openAddCompanyModal();
    document.querySelector('#modalBox h2').innerText = 'Edit Company Details';
    document.getElementById('c_name').value = c.name || '';
    document.querySelector('button[onclick="window.saveCompany()"]').setAttribute('onclick', `window.saveCompany('${id}')`);
};

window.openCompanyMembers = async function(companyId, companyName) {
    currentCompanyId = companyId;
    currentCompanyName = companyName;
    document.getElementById('membersViewTitle').innerText = `${companyName} - Team Members`;
    switchView('members');
    window.fetchMembers();
};

window.fetchMembers = async function() {
    try {
        const res = await fetch(`/api/members?company_id=${currentCompanyId}`);
        const members = await res.json();
        renderMembersTable(members);
    } catch (e) { console.error(e); }
};

function renderMembersTable(members) {
    const tbody = document.querySelector("#membersTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    members.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${m.first_name} ${m.last_name}</strong></td><td>${m.job_title}</td><td>${m.email}</td><td>${m.mobile}</td><td>${m.landline}</td><td><button class="btn-action" onclick="window.deleteMember('${m.id}')">Remove</button></td>`;
        tbody.appendChild(tr);
    });
}

window.openAddMemberModal = function() {
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Add Team Member</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; padding:10px;">
            <div><label>First Name</label><input type="text" id="m_first" class="edit-input" required></div>
            <div><label>Last Name</label><input type="text" id="m_last" class="edit-input" required></div>
            <div><label>Job Title</label><input type="text" id="m_job" class="edit-input"></div>
            <div><label>Email Address</label><input type="text" id="m_email" class="edit-input"></div>
            <div><label>Mobile Number</label><input type="text" id="m_mobile" class="edit-input"></div>
            <div><label>Landline</label><input type="text" id="m_land" class="edit-input"></div>
        </div>
        <button onclick="window.saveMember()" style="width:100%; margin-top:20px; padding:14px; background:#10b981; color:white; border-radius:12px; font-weight:700; border:none; cursor:pointer;">Finalize Registration</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveMember = async function() {
    const payload = { company_id: currentCompanyId, first_name: document.getElementById('m_first').value, last_name: document.getElementById('m_last').value, job_title: document.getElementById('m_job').value, email: document.getElementById('m_email').value, mobile: document.getElementById('m_mobile').value, landline: document.getElementById('m_land').value };
    try {
        const res = await fetch('/api/members', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
        if (res.ok) { document.getElementById('modalOverlay').style.display = 'none'; window.fetchMembers(); alert("Member added!"); }
        else { alert("Registration Error."); }
    } catch (e) { alert("Connectivity Error."); }
};

window.deleteMember = async function(id) {
    if (!confirm('Permanent Removal?')) return;
    try { await fetch('/api/members', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, action: 'delete' }) }); window.fetchMembers(); } catch (e) { console.error(e); }
};

function calculateDashboardStats() {
    if (!submissionsData.length) return;
    const total = submissionsData.length;
    document.getElementById('dashboardTotal').innerText = total;
    initCharts(submissionsData);
}

function initCharts(data) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');
    if (!ctxFlow || !ctxStatus) return;
    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();
    charts.flow = new Chart(ctxFlow, { type: 'line', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [{ label: 'Lead Flow', data: new Array(12).fill(0), borderColor: '#3b82f6', tension: 0.4, fill: true }] }, options: { responsive: true, maintainAspectRatio: false } });
}

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${index+1}</td><td><strong>${item.name || "---"}</strong></td><td>${item.phone || "---"}</td><td>${item.solicitorName || "---"}</td><td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td><td><select class="status-select" onchange="window.handleStatusUpdate('${item.id}', this)">${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><button class="btn-action" onclick="window.openViewModal('${item.id}')">View</button></td>`;
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
    console.log("🚀 System Booting...");
    try {
        const res = await fetch('/api/submissions');
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Connection Blocked.");
        }
        submissionsData = await res.json();
        console.log("📦 Leads Loaded:", submissionsData.length);
        calculateDashboardStats();
        switchView('dashboard');
    } catch (e) { 
        alert("System Startup Alert: " + e.message);
        console.error(e); 
    }
};