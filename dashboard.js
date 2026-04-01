let submissionsData = [];
let companiesData = [];
let membersData = [];
let charts = {};
let selectedCompanyId = null;

const leadStatuses = [
    'New Lead', 'Transferred', 'Accepted', 'Rejected',
    'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

function getStatusColor(status) {
    if (status === 'New Lead') return 'new';
    if (status === 'Accepted' || status === 'Paid') return 'success';
    if (status === 'Rejected') return 'danger';
    if (status === 'Transferred') return 'purple';
    if (status === 'Invoice Raised' || status === 'Not Yet Invoiced') return 'warning';
    return 'gray';
}

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
        renderCompanies();
    } else {
        document.getElementById('leadsView').classList.add('active');
        navItems[2].classList.add('active');
        renderFilteredLeads();
    }
};

function calculateDashboardStats() {
    const total = submissionsData.length;
    const acceptedCount = submissionsData.filter(s => s.leadStatus === 'Accepted').length;
    const rejectedCount = submissionsData.filter(s => s.leadStatus === 'Rejected').length;
    
    // Update text references
    if (document.getElementById('dashboardTotal')) document.getElementById('dashboardTotal').innerText = total;
    if (document.getElementById('dashboardActive')) document.getElementById('dashboardActive').innerText = companiesData.length;
    if (document.getElementById('dashboardSolicitorsCount')) document.getElementById('dashboardSolicitorsCount').innerText = membersData.length;
    
    if (document.getElementById('dashboardAccepted')) document.getElementById('dashboardAccepted').innerText = acceptedCount;
    if (document.getElementById('dashboardRejected')) document.getElementById('dashboardRejected').innerText = rejectedCount;

    let convRate = total > 0 ? ((acceptedCount / total) * 100).toFixed(1) : '0';
    if (document.getElementById('dashboardConvRate')) document.getElementById('dashboardConvRate').innerText = convRate + '%';
    
    initCharts(submissionsData, acceptedCount, total);
}

function initCharts(data, acceptedCount, totalCount) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');
    const ctxConv = document.getElementById('conversionDonutChart');

    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();
    if (charts.conv) charts.conv.destroy();

    if (ctxFlow) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let monthlyCounts = Array(12).fill(0);
        data.forEach(item => {
            if (item.timestamp) { const date = new Date(item.timestamp); if(!isNaN(date)) monthlyCounts[date.getMonth()]++; }
        });
        charts.flow = new Chart(ctxFlow, {
            type: 'bar', // Highlevel "Funnel" / Opportunity Value style
            data: { labels: months, datasets: [{ label: 'Leads Received', data: monthlyCounts, backgroundColor: '#3B82F6', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#F2F3F5' } } }
            }
        });
    }

    if (ctxStatus) {
        charts.status = new Chart(ctxStatus, {
            type: 'doughnut',
            data: { labels: leadStatuses, datasets: [{ data: leadStatuses.map(s => data.filter(x => x.leadStatus === s).length), backgroundColor: ['#3B82F6', '#6D28D9', '#10B981', '#F53F3F', '#F59E0B', '#F59E0B', '#00B42A', '#9CA3AF'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false } } }
        });
    }

    if (ctxConv) {
        let remainder = totalCount - acceptedCount;
        if(totalCount === 0) remainder = 1; // So we can show a grey circle when empty
        charts.conv = new Chart(ctxConv, {
            type: 'doughnut',
            data: { datasets: [{ data: [acceptedCount, remainder], backgroundColor: ['#10B981', '#E5E6EB'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
}

function initFilters() {
    const statusSelect = document.getElementById('filterStatus');
    const companySelect = document.getElementById('filterCompany');

    if (statusSelect && statusSelect.options.length <= 1) {
        leadStatuses.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s; opt.innerText = s;
            statusSelect.appendChild(opt);
        });
    }

    if (companySelect && companySelect.options.length <= 1) {
        membersData.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id; opt.innerText = m.name || (m.first_name + ' ' + m.last_name);
            companySelect.appendChild(opt);
        });
    }
}

window.renderFilteredLeads = function() {
    const statusFilter = document.getElementById('filterStatus')?.value || 'All';
    const companyFilter = document.getElementById('filterCompany')?.value || 'All';
    const searchVal = (document.getElementById('searchLead')?.value || '').toLowerCase();

    const filtered = submissionsData.filter(item => {
        let matchStatus = statusFilter === 'All' || item.leadStatus === statusFilter;
        let matchCompany = companyFilter === 'All' || String(item.assigned_company_id || '') === String(companyFilter);
        let matchSearch = true;
        
        if(searchVal) {
            const textToSearch = `${item.name||''} ${item.email||''} ${item.phone||''}`.toLowerCase();
            matchSearch = textToSearch.includes(searchVal);
        }
        
        return matchStatus && matchCompany && matchSearch;
    });

    renderTable(filtered);
};

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // SVG icons replace emojis
    const viewIcon = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
    const editIcon = `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    const docxIcon = `<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`;

    data.forEach((item, index) => {
        const tr = document.createElement("tr");

        let memberOptions = `<option value="">Unassigned</option>` + membersData.map(m => {
            const mName = m.name || (m.first_name + ' ' + m.last_name);
            return `<option value="${m.id}" ${String(item.assigned_company_id) === String(m.id) ? 'selected' : ''}>${mName}</option>`;
        }).join('');

        const statusSelectTheme = getStatusColor(item.leadStatus || 'New Lead');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name || "---"}</strong></td>
            <td>${item.phone || "---"}</td>
            <td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td>
            <td><select class="modern-select" style="padding: 6px 12px; font-size: 13px; width: 100%; border-radius:20px;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_company_id', this.value)">${memberOptions}</select></td>
            <td>
                <select class="status-badge" data-color="${statusSelectTheme}" onchange="window.handleFieldUpdate('${item.id}', 'leadStatus', this.value); this.setAttribute('data-color', getStatusColor(this.value));">
                    ${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
            <td style="display:flex; gap:8px;">
                <button class="icon-btn" onclick="window.openViewModal('${item.id}')" title="View Details">${viewIcon}</button>
                <button class="icon-btn" onclick="window.openEditModal('${item.id}')" title="Edit & Notes">${editIcon}</button>
                <button class="icon-btn" onclick="window.exportDocx('${item.id}')" title="Download Word Doc">${docxIcon}</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

window.handleFieldUpdate = async function(id, fieldName, value) {
    try {
        const updateParams = { id };
        updateParams[fieldName] = value;
        await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateParams) });
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) lead[fieldName] = value;
        if(fieldName === 'leadStatus') calculateDashboardStats();
    } catch (e) { console.error(e); }
};

window.openViewModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let html = '<div class="form-grid">';
    Object.keys(item).forEach(k => {
        if (k !== 'id') {
            html += `<div class="form-group ${k === 'notes' ? 'full' : ''}"><label>${k.replace(/_/g, ' ')}</label><div style="padding:12px; background:#F9FAFB; border-radius:8px; border: 1px solid var(--border); font-size: 14px; white-space:pre-wrap;">${item[k] || '---'}</div></div>`;
        }
    });
    document.getElementById('modalBox').innerHTML = `<div class="modal-header"><h2>View Details</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}</div>`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;

    let html = '<div class="form-grid" id="editFormContainer">';
    
    ['name', 'phone', 'email', 'leadSource', 'notes'].forEach(k => {
        if (k === 'notes') {
            html += `<div class="form-group full"><label>${k}</label>
                     <textarea class="search-input" data-field="${k}" rows="5" placeholder="Add timestamped notes here...">${item[k] || ''}</textarea></div>`;
        } else {
             html += `<div class="form-group"><label>${k}</label>
                     <input type="text" class="search-input" data-field="${k}" value="${item[k] || ''}"></div>`;
        }
    });
    
    html += `</div>
             <div style="margin-top:30px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-action btn-secondary" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
                <button class="btn-action" onclick="window.saveLeadEdits('${item.id}')">Save Changes</button>
             </div>`;

    document.getElementById('modalBox').innerHTML = `<div class="modal-header"><h2>Edit Lead / Notes</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveLeadEdits = async function(id) {
    const container = document.getElementById('editFormContainer');
    const inputs = container.querySelectorAll('.search-input');
    const updates = { id };
    
    inputs.forEach(inp => updates[inp.getAttribute('data-field')] = inp.value);

    try {
        await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) Object.assign(lead, updates);
        document.getElementById('modalOverlay').style.display='none';
        renderFilteredLeads();
    } catch(e) { console.error("Save Error", e); }
};

window.exportDocx = function(id) { window.open('/api/export-docx?id=' + id, '_blank'); };
window.exportExcel = function() {
    const status = document.getElementById('filterStatus')?.value || 'All';
    const company = document.getElementById('filterCompany')?.value || 'All';
    window.open('/api/export-xlsx?status=' + status + '&company=' + company, '_blank');
};


// 🏢 COMPANY CRM
window.viewCompanyEditModal = function(id) {
    const c = companiesData.find(x => String(x.id) === String(id));
    if(!c) return;
    openAddCompanyModal(c);
};

window.renderCompanies = function() {
    const tbody = document.querySelector("#companyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesData.forEach((c) => {
        let nameDisp = c.name || c.company_name || 'Unnamed Company';
        if (nameDisp === 'undefined' || nameDisp.includes('undefined')) nameDisp = 'Unnamed Company';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${nameDisp}</strong></td><td>${c.type || '--'}</td><td>${c.main_contact || '--'}</td><td>${c.email || '--'}</td><td>${c.contact || '--'}</td>
            <td style="display:flex; gap:8px;">
                <button class="icon-btn" onclick="window.viewCompanyEditModal('${c.id}')" title="Edit Company"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="btn-action btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="window.viewCompanyMembers('${c.id}')">View Members</button>
            </td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('companyMembersSection').style.display = 'none';
};

window.openAddCompanyModal = function(existingCompany = null) {
    const isEdit = !!existingCompany;
    const c = existingCompany || {};
    
     document.getElementById('modalBox').innerHTML = `
        <div class="modal-header"><h2>${isEdit ? 'Edit Company' : 'Add Company'}</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div class="form-grid">
            <div class="form-group full"><label>Company Name</label><input type="text" id="cName" class="search-input" value="${c.name || ''}" placeholder="Enter company name"></div>
            <div class="form-group">
                <label>Company Type</label>
                <select id="cType" class="modern-select">
                    <option value="" disabled ${!c.type ? 'selected' : ''}>Select a type...</option>
                    <option value="Solicitor" ${c.type === 'Solicitor' ? 'selected' : ''}>Solicitor</option>
                    <option value="Surveyor" ${c.type === 'Surveyor' ? 'selected' : ''}>Surveyor</option>
                    <option value="Claims Management" ${c.type === 'Claims Management' ? 'selected' : ''}>Claims Management</option>
                    <option value="Other" ${c.type === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-group"><label>Main Contact Name</label><input type="text" id="cMainContact" class="search-input" value="${c.main_contact || ''}"></div>
            <div class="form-group"><label>Email Address</label><input type="text" id="cEmail" class="search-input" value="${c.email || ''}"></div>
            <div class="form-group"><label>Phone Number</label><input type="text" id="cPhone" class="search-input" value="${c.contact || c.phone || ''}"></div>
            <div class="form-group full"><label>Office Address</label><input type="text" id="cAddress" class="search-input" value="${c.address || ''}"></div>
        </div>
        <button class="btn-action" style="margin-top:20px; width:100%; justify-content:center;" onclick="window.saveNewCompany('${c.id || ''}')">Save Company</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveNewCompany = async function(id) {
    const payload = {
        name: document.getElementById('cName').value,
        type: document.getElementById('cType').value,
        main_contact: document.getElementById('cMainContact').value,
        email: document.getElementById('cEmail').value,
        contact: document.getElementById('cPhone').value,
        address: document.getElementById('cAddress').value
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/companies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const saved = await res.json();
        
        if (id) {
            const index = companiesData.findIndex(x => String(x.id) === String(id));
            if(index > -1) companiesData[index] = saved;
        } else {
            companiesData.push(saved);
        }
        
        document.getElementById('modalOverlay').style.display='none';
        renderCompanies();
    } catch(e) { console.error(e); }
};

window.viewCompanyMembers = function(companyId) {
    selectedCompanyId = companyId;
    const company = companiesData.find(c => String(c.id) === String(companyId));
    document.getElementById('companyMembersSection').style.display = 'block';
    
    let compName = company?.name || 'Unknown Company';
    if(compName.includes('undefined')) compName = 'Unknown Company';
    document.getElementById('membersSectionTitle').innerText = 'Members for ' + compName;
    
    const tbody = document.querySelector("#membersTable tbody");
    tbody.innerHTML = '';
    
    const relatedMembers = membersData.filter(m => String(m.company_id) === String(companyId));
    if(relatedMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94A3B8;">No members assigned to this company yet.</td></tr>';
        return;
    }
    
    relatedMembers.forEach(m => {
        let mName = m.name || ((m.first_name || '') + ' ' + (m.last_name || '')).trim();
        if (!mName || mName === 'undefined undefined' || mName.includes('undefined')) mName = 'Unknown Member';
        
        tbody.innerHTML += `<tr><td><strong>${mName}</strong></td><td>${m.email || '--'}</td><td>${m.phone || '--'}</td><td>${m.role || 'Member'}</td>
            <td style="display:flex; gap: 8px;">
                <button class="icon-btn" title="Edit Member" onclick="window.openAddMemberModal('${m.id}')"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="icon-btn danger" title="Delete Member" onclick="window.deleteMember('${m.id}')"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
            </td></tr>`;
    });
};

window.openAddMemberModal = function(editId = null) {
    if(!selectedCompanyId) return alert('Select a company first');
    const m = membersData.find(x => String(x.id) === String(editId)) || {};

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header"><h2>${editId ? 'Edit Member' : 'Add Member'}</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div class="form-grid">
            <div class="form-group"><label>First Name</label><input type="text" id="mFirstName" class="search-input" value="${m.first_name || ''}"></div>
            <div class="form-group"><label>Last Name</label><input type="text" id="mLastName" class="search-input" value="${m.last_name || ''}"></div>
            <div class="form-group"><label>Email Address</label><input type="text" id="mEmail" class="search-input" value="${m.email || ''}"></div>
            <div class="form-group"><label>Phone Number</label><input type="text" id="mPhone" class="search-input" value="${m.phone || ''}"></div>
            <div class="form-group full"><label>Role / Title</label><input type="text" id="mRole" class="search-input" value="${m.role || 'Member'}"></div>
        </div>
        <button class="btn-action" style="margin-top:20px; width:100%; justify-content:center;" onclick="window.saveNewMember('${m.id || ''}')">Save Member</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
}

window.saveNewMember = async function(id) {
    const payload = {
        company_id: selectedCompanyId,
        first_name: document.getElementById('mFirstName').value,
        last_name: document.getElementById('mLastName').value,
        name: (document.getElementById('mFirstName').value + ' ' + document.getElementById('mLastName').value).trim(),
        email: document.getElementById('mEmail').value,
        phone: document.getElementById('mPhone').value,
        role: document.getElementById('mRole').value
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/members', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const saved = await res.json();
        
        if (id) {
            const index = membersData.findIndex(x => String(x.id) === String(id));
            if(index > -1) membersData[index] = saved;
        } else {
            membersData.push(saved);
        }
        
        document.getElementById('modalOverlay').style.display='none';
        initFilters();
        viewCompanyMembers(selectedCompanyId);
        if(document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
    } catch(e) { console.error(e); }
};

window.deleteMember = async function(id) {
    if(!confirm("Are you sure you want to delete this member?")) return;
    try {
        await fetch('/api/members', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, action: 'delete' })});
        membersData = membersData.filter(m => String(m.id) !== String(id));
        initFilters();
        viewCompanyMembers(selectedCompanyId);
        if(document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
    } catch(e) { console.error(e); }
};

window.initDashboard = async function () {
    try {
        const resSub = await fetch('/api/submissions');
        if (resSub.ok) submissionsData = JSON.parse(await resSub.text());

        const resComp = await fetch('/api/companies');
        if (resComp.ok) companiesData = JSON.parse(await resComp.text());
        
        const resMembers = await fetch('/api/members');
        if (resMembers.ok) membersData = JSON.parse(await resMembers.text());
        
    } catch (e) {
        console.error("Setup running locally:", e);
    } finally {
        initFilters();
        calculateDashboardStats();
        switchView('dashboard');
    }
};