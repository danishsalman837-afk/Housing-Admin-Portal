// Professional Enterprise Dashboard & CRM Script
let submissionsData = [];
let companiesData = [];
let currentCompanyId = null;
let charts = {};

const leadStatuses = [
  'New Lead', 'Transferred', 'Accepted', 'Rejected', 
  'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

// Universal Blacklist for old/redundant questions
const FIELD_BLACKLIST = [
    'electricsLights', 'electricsSockets', 'electricsExposed', 'electricsFuseBox', 'electricsDanger',
    'heatingType', 'heatingFrequency', 'heatingDuration', 'heatingDaily', 'heatingHealth',
    'structuralSeverity', 'structuralWhen', 'structuralWorsening', 'issueType',
    'electricsMainIssue', 'heatingMainIssue', 'structuralLocation', 'issues'
].map(k => k.toLowerCase());

function shouldShow(key) {
    const k = key.toLowerCase();
    const systemKeys = ['id', 'notes', 'timestamp'];
    return !FIELD_BLACKLIST.includes(k) && !systemKeys.includes(k);
}

// Switch between View Screens
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
        fetchCompanies();
    } else if (view === 'leads') {
        document.getElementById('leadsView').classList.add('active');
        navItems[2].classList.add('active');
        renderTable(submissionsData);
    } else if (view === 'members') {
        document.getElementById('membersView').classList.add('active');
        navItems[1].classList.add('active'); // Still keep Company active in nav
    }
};

// ======== COMPANY MANAGEMENT ========

async function fetchCompanies() {
    try {
        const res = await fetch('/api/companies');
        companiesData = await res.json();
        renderCompaniesTable();
    } catch (e) { console.error(e); }
}

function renderCompaniesTable() {
    const tbody = document.querySelector("#companyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesData.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.name}</strong></td>
            <td>${c.type || '---'}</td>
            <td>${c.main_contact || '---'}</td>
            <td>${c.postcode || '---'}</td>
            <td><span class="status-btn ${c.is_active ? 'status-accepted' : 'status-rejected'}" style="font-size:10px; padding:4px 8px;">${c.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-action" onclick="window.openCompanyMembers('${c.id}', '${c.name.replace(/'/g, "\\'")}')">Team</button>
                    <button class="btn-action" onclick="window.openEditCompanyModal('${c.id}')">Edit</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openAddCompanyModal = function() {
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>Register New Company</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; max-height:400px; overflow-y:auto; padding-right:10px;">
            <div><label>Company Name</label><input type="text" id="c_name" class="edit-input" required></div>
            <div><label>Company Type</label><input type="text" id="c_type" class="edit-input"></div>
            <div><label>Main Contact</label><input type="text" id="c_contact" class="edit-input"></div>
            <div><label>Website</label><input type="text" id="c_website" class="edit-input"></div>
            <div><label>Address</label><input type="text" id="c_address" class="edit-input"></div>
            <div><label>Town</label><input type="text" id="c_town" class="edit-input"></div>
            <div><label>County</label><input type="text" id="c_county" class="edit-input"></div>
            <div><label>Postcode</label><input type="text" id="c_postcode" class="edit-input"></div>
            <div style="grid-column: span 2;">
                <label><input type="checkbox" id="c_active" checked> Set as Active Company</label>
            </div>
        </div>
        <button onclick="window.saveCompany()" style="width:100%; margin-top:20px; padding:12px; background:#2563eb; color:white; border-radius:10px; font-weight:700; border:none; cursor:pointer;">Save Company Details</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveCompany = async function(id = null) {
    const payload = {
        id,
        name: document.getElementById('c_name').value,
        type: document.getElementById('c_type').value,
        main_contact: document.getElementById('c_contact').value,
        website: document.getElementById('c_website').value,
        address: document.getElementById('c_address').value,
        town: document.getElementById('c_town').value,
        county: document.getElementById('c_county').value,
        postcode: document.getElementById('c_postcode').value,
        is_active: document.getElementById('c_active').checked
    };

    try {
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('modalOverlay').style.display = 'none';
            fetchCompanies();
        }
    } catch (e) { console.error(e); }
};

window.openEditCompanyModal = function(id) {
    const c = companiesData.find(x => x.id === id);
    if (!c) return;
    window.openAddCompanyModal();
    document.querySelector('#modalBox h2').innerText = 'Edit Company Details';
    document.getElementById('c_name').value = c.name || '';
    document.getElementById('c_type').value = c.type || '';
    document.getElementById('c_contact').value = c.main_contact || '';
    document.getElementById('c_website').value = c.website || '';
    document.getElementById('c_address').value = c.address || '';
    document.getElementById('c_town').value = c.town || '';
    document.getElementById('c_county').value = c.county || '';
    document.getElementById('c_postcode').value = c.postcode || '';
    document.getElementById('c_active').checked = c.is_active;
    document.querySelector('button[onclick="window.saveCompany()"]').setAttribute('onclick', `window.saveCompany('${id}')`);
};

// ======== MEMBER MANAGEMENT ========

window.openCompanyMembers = async function(companyId, companyName) {
    currentCompanyId = companyId;
    document.getElementById('membersViewTitle').innerText = `${companyName} - Team Members`;
    switchView('members');
    fetchMembers();
};

async function fetchMembers() {
    try {
        const res = await fetch(`/api/members?company_id=${currentCompanyId}`);
        const members = await res.json();
        renderMembersTable(members);
        
        // Update Add Member button
        const addBtn = document.getElementById('addMemberBtn');
        addBtn.onclick = () => window.openAddMemberModal();
    } catch (e) { console.error(e); }
}

function renderMembersTable(members) {
    const tbody = document.querySelector("#membersTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    members.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${m.first_name} ${m.last_name}</strong></td>
            <td>${m.job_title || '---'}</td>
            <td>${m.email || '---'}</td>
            <td>${m.mobile || '---'}</td>
            <td>${m.landline || '---'}</td>
            <td>
                <button class="btn-action" onclick="window.deleteMember('${m.id}')" style="background:#ef4444; color:white; border:none;">Remove</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openAddMemberModal = function() {
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>Add Team Member</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            <div><label>First Name</label><input type="text" id="m_first" class="edit-input" required></div>
            <div><label>Last Name</label><input type="text" id="m_last" class="edit-input" required></div>
            <div><label>Job Title</label><input type="text" id="m_job" class="edit-input"></div>
            <div><label>Email Address</label><input type="text" id="m_email" class="edit-input"></div>
            <div><label>Mobile Number</label><input type="text" id="m_mobile" class="edit-input"></div>
            <div><label>Landline</label><input type="text" id="m_land" class="edit-input"></div>
        </div>
        <button onclick="window.saveMember()" style="width:100%; margin-top:20px; padding:12px; background:#10b981; color:white; border-radius:10px; font-weight:700; border:none; cursor:pointer;">Add Member to Company</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveMember = async function() {
    const payload = {
        company_id: currentCompanyId,
        first_name: document.getElementById('m_first').value,
        last_name: document.getElementById('m_last').value,
        job_title: document.getElementById('m_job').value,
        email: document.getElementById('m_email').value,
        mobile: document.getElementById('m_mobile').value,
        landline: document.getElementById('m_land').value
    };

    try {
        const res = await fetch('/api/members', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            document.getElementById('modalOverlay').style.display = 'none';
            fetchMembers();
        }
    } catch (e) { console.error(e); }
};

window.deleteMember = async function(id) {
    if (!confirm('Permanent Removal: Are you certain you want to delete this member? This action is irreversible.')) return;
    try {
        const res = await fetch('/api/members', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, action: 'delete' })
        });
        if (res.ok) fetchMembers();
    } catch (e) { console.error(e); }
};

// ======== DASHBOARD & LEADS (EXISTING) ========

function calculateDashboardStats() {
    if (!submissionsData.length) return;
    const total = submissionsData.length;
    const acceptedArr = submissionsData.filter(s => s.leadStatus === 'Accepted');
    const accepted = acceptedArr.length;
    const rejected = submissionsData.filter(s => s.leadStatus === 'Rejected').length;
    const uniqueSolicitors = [...new Set(submissionsData.map(s => s.solicitorName).filter(Boolean))].length;
    
    document.getElementById('dashboardTotal').innerText = total;
    document.getElementById('dashboardConvRate').innerText = total > 0 ? ((accepted / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('dashboardRejected').innerText = rejected;
    document.getElementById('dashboardSolicitors').innerText = uniqueSolicitors;

    initCharts(submissionsData);
}

function initCharts(data) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');
    if (!ctxFlow || !ctxStatus) return;
    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const flowData = new Array(12).fill(0);
    data.forEach(s => { if (s.timestamp) flowData[new Date(s.timestamp).getMonth()]++; });

    charts.flow = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Lead Flow',
                data: flowData,
                borderColor: '#3b82f6',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const stats = leadStatuses.map(s => data.filter(x => x.leadStatus === s).length);
    charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: leadStatuses,
            datasets: [{ data: stats, backgroundColor: ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#6366f1'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
}

function getStatusClass(status) {
    if (status === 'Accepted') return 'status-accepted';
    if (status === 'Rejected') return 'status-rejected';
    if (status === 'Transferred') return 'status-transferred';
    return 'status-new';
}

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('filterCount').innerText = `Showing ${data.length} of ${submissionsData.length}`;

    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        const ts = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB') : "N/A";
        const solicitor = item.solicitorName || "Unassigned";

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name || "Unknown"}</strong></td>
            <td>${item.phone || "---"}</td>
            <td>${solicitor}</td>
            <td>${ts}</td>
            <td>
                <select class="status-select ${getStatusClass(item.leadStatus)}" onchange="window.handleStatusUpdate('${item.id}', this)">
                    ${leadStatuses.map(s => `<option value="${s}" ${ (item.leadStatus || 'New Lead') === s ? 'selected' : '' }>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-action" onclick="window.openViewModal('${item.id}')">View</button>
                    <button class="btn-action" onclick="window.openEditModal('${item.id}')">Edit</button>
                    <button class="btn-action" onclick="window.openNotesModal('${item.id}')">Log</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.handleStatusUpdate = async function(id, el) {
    const newStatus = el.value;
    el.className = `status-select ${getStatusClass(newStatus)}`;
    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id, leadStatus: newStatus })
        });
        const item = submissionsData.find(s => String(s.id) === String(id));
        if (item) item.leadStatus = newStatus;
        calculateDashboardStats();
    } catch (e) { console.error(e); }
};

// ... Rest of Lead Interaction Modals (View, Edit, Notes, Download) omitted for brevity but remain intact in memory ...
// (I will actually include them to ensure the file is complete as requested)

window.openViewModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let html = '<div style="max-height:450px; overflow-y:auto; padding-right:10px;">';
    Object.keys(item).forEach(k => {
        if (k==='notes' || k==='id' || k==='timestamp') return;
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        html += `<div style="margin-bottom:12px;"><label style="font-weight:700; color:#64748b; font-size:10px; text-transform:uppercase;">${label}</label><div style="padding:10px; background:#f8fafc; border-radius:8px;">${item[k]||'---'}</div></div>`;
    });
    html += '</div>';
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Lead Details</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        ${html}
        <button onclick="window.downloadLead('${id}')" style="width:100%; margin-top:20px; padding:12px; background:#0f172a; color:white; border-radius:10px;">Download Profile</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let form = '<div style="max-height:400px; overflow-y:auto; padding-right:12px; display:flex; flex-direction:column; gap:16px;">';
    Object.keys(item).forEach(k => {
        if (k==='notes' || k==='id' || k==='timestamp') return;
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        form += `<div><label style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase;">${label}</label><input type="text" class="edit-input" data-key="${k}" value="${item[k]||''}" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:10px;"></div>`;
    });
    form += '</div>';
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Complete Lead Editor</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        ${form}
        <button onclick="window.saveEdit('${id}')" style="width:100%; margin-top:20px; padding:12px; background:#2563eb; color:white; border-radius:12px;">Save Profile</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveEdit = async function(id) {
    const payload = { id };
    document.querySelectorAll('.edit-input').forEach(input => { payload[input.dataset.key] = input.value; });
    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const item = submissionsData.find(s => String(s.id) === String(id));
        if (item) Object.assign(item, payload);
        document.getElementById('modalOverlay').style.display = 'none';
        renderTable(submissionsData);
    } catch (e) { console.error(e); }
};

window.openNotesModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    const history = (item.notes || []).map(n => `<div style="padding:10px; background:#f8fafc; border-left:4px solid #3b82f6; border-radius:8px; margin-bottom:10px;"><p style="font-size:13px;">${n.text}</p><span style="font-size:10px; color:#94a3b8;">${n.time}</span></div>`).join('');
    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Activity Log</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <textarea id="newNote" placeholder="Add a note..." style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:10px; height:80px;"></textarea>
        <button onclick="window.saveNote('${id}')" style="width:100%; margin-top:10px; padding:12px; background:#3b82f6; color:white; border-radius:10px;">Add Note</button>
        <div style="margin-top:20px; max-height:200px; overflow-y:auto;">${history}</div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveNote = async function(id) {
    const text = document.getElementById('newNote').value.trim();
    if (!text) return;
    const item = submissionsData.find(s => String(s.id) === String(id));
    const notes = Array.isArray(item.notes) ? [...item.notes] : [];
    notes.unshift({ text, time: new Date().toLocaleString('en-GB') });
    try {
        await fetch('/api/update', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, notes}) });
        item.notes = notes;
        window.openNotesModal(id);
    } catch (e) { console.error(e); }
};

window.downloadLead = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    const { Document, Packer, Paragraph, TextRun } = docx;
    const children = [new Paragraph({ text: `LEAD: ${item.name||'UNK'}`, heading: docx.HeadingLevel.HEADING_1 })];
    Object.keys(item).forEach(k => { if(k!=='notes'&&k!=='id') children.push(new Paragraph({ children:[new TextRun({text:k+": ",bold:true}), new TextRun(String(item[k]||'---'))] })); });
    const doc = new Document({ sections:[{ children }] });
    Packer.toBlob(doc).then(blob => { const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`Lead_${item.id}.docx`; a.click(); });
};

// ======== INIT ========

window.initDashboard = async function() {
    try {
        const res = await fetch('/api/submissions');
        submissionsData = await res.json();
        calculateDashboardStats();
        switchView('dashboard');
    } catch (e) { console.error(e); }
};