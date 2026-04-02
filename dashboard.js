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
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('dashboardTotal',           total);
    setEl('dashboardTotalDonut',      total);
    setEl('dashboardActive',          companiesData.length);
    setEl('dashboardSolicitorsCount', membersData.length);
    setEl('dashboardAccepted',        acceptedCount);
    setEl('dashboardRejected',        rejectedCount);

    let convRate = total > 0 ? ((acceptedCount / total) * 100).toFixed(1) : '0';
    setEl('dashboardConvRate',       convRate + '%');
    setEl('dashboardConvRateDonut',  convRate + '%');
    
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
        // Clear all except first option if re-initializing
        companySelect.innerHTML = '<option value="All">All Solicitors</option>';
        companiesData.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; 
            opt.innerText = c.name || c.company_name || 'Unnamed Solicitor';
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

    data.forEach((item, index) => {
        const tr = document.createElement("tr");

        let compOptions = `<option value="">Unassigned</option>` + companiesData.map(c => {
            let cName = c.name || c.company_name || 'Unnamed Solicitor';
            if (cName.includes('undefined')) cName = 'Unnamed Solicitor';
            return `<option value="${c.id}" ${String(item.assigned_company_id) === String(c.id) ? 'selected' : ''}>${cName}</option>`;
        }).join('');

        const statusSelectTheme = getStatusColor(item.leadStatus || 'New Lead');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name || item.first_name || "---"}</strong></td>
            <td>${item.phone || item.mobile_number || "---"}</td>
            <td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td>
            <td><select class="modern-select" style="padding: 6px 30px 6px 12px; font-size: 12px; width:175px; text-overflow: ellipsis; white-space: nowrap;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_company_id', this.value)">${compOptions}</select></td>
            <td>
                <select class="status-badge" data-color="${statusSelectTheme}" onchange="window.handleFieldUpdate('${item.id}', 'leadStatus', this.value); this.setAttribute('data-color', getStatusColor(this.value));">
                    ${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="action-group">
                    <button class="act-btn view" onclick="window.openViewModal('${item.id}')" title="View Profile">
                        <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> View
                    </button>
                    <button class="act-btn edit" onclick="window.openEditLeadModal('${item.id}')" title="Edit Data">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Edit
                    </button>
                    <button class="act-btn notes" onclick="window.openNotesModal('${item.id}')" title="Internal Notes">
                        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> Notes
                    </button>
                    <button class="act-btn dl" onclick="window.exportDocx('${item.id}')" title="Download Word Doc">
                        <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> Download
                    </button>
                </div>
            </td>`;
        tr.innerHTML = `<td>${index+1}</td><td><strong>${item.name || "---"}</strong></td><td>${item.phone || "---"}</td><td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td><td><select class="status-select" onchange="window.handleStatusUpdate('${item.id}', this)">${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><button class="btn-action" onclick="window.openViewModal('${item.id}')">View</button> <button class="btn-action" onclick="window.openEditModal('${item.id}')">Edit</button></td>`;
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
        let nameDisp = c.name || c.company_name || 'Unnamed Solicitor';
        if (nameDisp === 'undefined' || nameDisp.includes('undefined')) nameDisp = 'Unnamed Solicitor';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>${nameDisp}</strong></td><td>${c.type || '--'}</td><td>${c.main_contact || '--'}</td><td>${c.postcode || '--'}</td><td>${c.website || '--'}</td>
            <td>
                <div class="action-group">
                    <button class="act-btn edit" onclick="window.viewCompanyEditModal('${c.id}')" title="Edit Company">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> Edit
                    </button>
                    <button class="act-btn view" onclick="window.viewCompanyMembers('${c.id}')">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> Members
                    </button>
                </div>
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
            <div class="form-group"><label>Company Name</label><input type="text" id="cName" class="modern-input" value="${c.name || ''}" placeholder="Name"></div>
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
            <div class="form-group"><label>Main Contact First/Last</label><input type="text" id="cMainContact" class="modern-input" value="${c.main_contact || ''}"></div>
            <div class="form-group"><label>Website</label><input type="text" id="cWebsite" class="modern-input" value="${c.website || ''}"></div>
            <div class="form-group full"><label>Address Line</label><input type="text" id="cAddress" class="modern-input" value="${c.address || ''}"></div>
            <div class="form-group"><label>Town / City</label><input type="text" id="cTown" class="modern-input" value="${c.town || ''}"></div>
            <div class="form-group"><label>County</label><input type="text" id="cCounty" class="modern-input" value="${c.county || ''}"></div>
            <div class="form-group"><label>Postcode</label><input type="text" id="cPostcode" class="modern-input" value="${c.postcode || ''}"></div>
        </div>
        <button class="btn-action" style="margin-top:20px; width:100%; justify-content:center;" onclick="window.saveNewCompany('${c.id || ''}')">Save Company</button>
    `;
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

window.saveNewCompany = async function(id) {
    const payload = {
        name: document.getElementById('cName').value,
        type: document.getElementById('cType').value,
        main_contact: document.getElementById('cMainContact').value,
        address: document.getElementById('cAddress').value,
        town: document.getElementById('cTown').value,
        county: document.getElementById('cCounty').value,
        postcode: document.getElementById('cPostcode').value,
        website: document.getElementById('cWebsite').value
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/companies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const saved = await res.json();
        
        if (!res.ok || saved.error) { return alert("Database Error: " + (saved.error || "Failed to save to Supabase. Check schema.")); }
        
        if (id) {
            const index = companiesData.findIndex(x => String(x.id) === String(id));
            if(index > -1) companiesData[index] = saved;
        } else {
            companiesData.push(saved);
        }
        
        document.getElementById('modalOverlay').style.display='none';
        renderCompanies();
        calculateDashboardStats();
    } catch(e) { console.error(e); alert("Network Error: " + e.message); }
};

window.viewCompanyMembers = function(companyId) {
    selectedCompanyId = companyId;
    const company = companiesData.find(c => String(c.id) === String(companyId));
    document.getElementById('companyMembersSection').style.display = 'block';
    
    let compName = company?.name || 'Unknown Solicitor';
    document.getElementById('membersSectionTitle').innerText = 'Members for ' + compName;
    
    const tbody = document.querySelector("#membersTable tbody");
    tbody.innerHTML = '';
    
    const relatedMembers = membersData.filter(m => String(m.company_id) === String(companyId));
    if(relatedMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#94A3B8;">No members assigned to this company yet.</td></tr>';
        return;
    }
    
    relatedMembers.forEach(m => {
        let mName = ((m.first_name || '') + ' ' + (m.last_name || '')).trim();
        if (!mName || mName.includes('undefined')) mName = 'Unknown Member';
        
        tbody.innerHTML += `<tr><td><strong>${mName}</strong></td><td>${m.job_title || '--'}</td><td>${m.email || '--'}</td><td>${m.mobile || '--'}</td><td>${m.landline || '--'}</td>
            <td>
                <div class="action-group">
                    <button class="act-btn edit" title="Edit Member" onclick="window.openAddMemberModal('${m.id}')">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg> Edit
                    </button>
                    <button class="act-btn" style="background:rgba(255,69,58,.10);color:#CC3328;border-color:rgba(255,69,58,.20);" title="Delete Member" onclick="window.deleteMember('${m.id}')">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Delete
                    </button>
                </div>
            </td></tr>`;
    });
};

window.openAddMemberModal = function(editId = null) {
    if(!selectedCompanyId) return alert('Select a company first');
    const m = membersData.find(x => String(x.id) === String(editId)) || {};

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header"><h2>${editId ? 'Edit Member' : 'Add Member'}</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div class="form-grid">
            <div class="form-group"><label>First Name</label><input type="text" id="mFirstName" class="modern-input" value="${m.first_name || ''}"></div>
            <div class="form-group"><label>Last Name</label><input type="text" id="mLastName" class="modern-input" value="${m.last_name || ''}"></div>
            <div class="form-group"><label>Email Address</label><input type="text" id="mEmail" class="modern-input" value="${m.email || ''}"></div>
            <div class="form-group"><label>Job Title</label><input type="text" id="mJobTitle" class="modern-input" value="${m.job_title || ''}"></div>
            <div class="form-group"><label>Mobile Base</label><input type="text" id="mMobile" class="modern-input" value="${m.mobile || ''}"></div>
            <div class="form-group"><label>Landline</label><input type="text" id="mLandline" class="modern-input" value="${m.landline || ''}"></div>
        </div>
        <button class="btn-action" style="margin-top:24px; width:100%; justify-content:center; padding:12px;" onclick="window.saveNewMember('${m.id || ''}')">Save Member</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
}

window.saveNewMember = async function(id) {
    const payload = {
        company_id: selectedCompanyId,
        first_name: document.getElementById('mFirstName').value,
        last_name: document.getElementById('mLastName').value,
        mobile: document.getElementById('mMobile').value,
        landline: document.getElementById('mLandline').value,
        job_title: document.getElementById('mJobTitle').value,
        email: document.getElementById('mEmail').value
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/members', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        const saved = await res.json();
        
        if (!res.ok || saved.error) return alert("Database Error: " + (saved.error || "Check database schema."));

        if (id) {
            const index = membersData.findIndex(x => String(x.id) === String(id));
            if(index > -1) membersData[index] = saved;
        } else {
            membersData.push(saved);
        }
        
        document.getElementById('modalOverlay').style.display='none';
        initFilters();
        viewCompanyMembers(selectedCompanyId);
        calculateDashboardStats();
        if(document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
    } catch(e) { console.error(e); alert("Network Error: " + e.message); }
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

// --- LEADS EDIT & NOTES logic ---
window.openViewModal = function(id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if(!s) return;
    
    let dataHtml = '';
    const ignoreKeys = ['id', 'created_at', 'notes', 'leadStatus', 'assigned_company_id', 'assigned_solicitor_id'];
    Object.keys(s).forEach(key => {
        if(ignoreKeys.includes(key)) return;
        if(typeof s[key] === 'object' && s[key] !== null) {
            dataHtml += `<div style="margin-bottom:12px;"><label style="font-size:11px; color:#6B7280; text-transform:uppercase;">${key.replace(/_/g, ' ')}</label><div style="font-size:14px; color:#111827; font-weight:500;">${JSON.stringify(s[key])}</div></div>`;
        } else {
            dataHtml += `<div style="margin-bottom:12px;"><label style="font-size:11px; color:#6B7280; text-transform:uppercase;">${key.replace(/_/g, ' ')}</label><div style="font-size:14px; color:#111827; font-weight:500;">${s[key] || '--'}</div></div>`;
        }
    });

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header"><h2>Lead Profile: ${s.name || s.first_name || 'Client'}</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div style="column-count: 2; column-gap: 32px;">
            ${dataHtml}
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditLeadModal = function(id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if(!s) return;

    // Show all data fields except for system/internal elements
    const ignoreKeys = ['id', 'created_at', 'notes', 'leadStatus', 'assigned_company_id', 'assigned_solicitor_id', 'timestamp'];
    let html = '<div class="form-grid" id="editLeadForm">';
    
    Object.keys(s).forEach(k => {
        if(ignoreKeys.includes(k)) return;
        
        let displayValue = s[k] === null || s[k] === undefined ? '' : s[k];
        if(typeof displayValue === 'object') {
            displayValue = JSON.stringify(displayValue);
        }
        
        // Escape characters for HTML
        displayValue = String(displayValue).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        
        // If text is long, use an auto-scaling text area
        if (displayValue.length > 50 || k.length > 30) {
            html += `<div class="form-group full"><label>${k.replace(/_/g, ' ')}</label>
                     <textarea class="modern-input edit-inp" data-field="${k}" rows="3">${displayValue}</textarea></div>`;
        } else {
            html += `<div class="form-group"><label>${k.replace(/_/g, ' ')}</label>
                     <input type="text" class="modern-input edit-inp" data-field="${k}" value="${displayValue}"></div>`;
        }
    });
    
    html += `</div>
             <div style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-outline" style="padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:600;" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
                <button class="btn-action" onclick="window.saveLeadEdits('${s.id}')">Save Changes</button>
             </div>`;

    document.getElementById('modalBox').innerHTML = `<div class="modal-header"><h2>Edit Lead Data</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveLeadEdits = async function(id) {
    const inputs = document.querySelectorAll('#editLeadForm .edit-inp');
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

window.openNotesModal = function(id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if(!s) return;

    let notesArray = [];
    if(s.notes) {
        if(Array.isArray(s.notes)) notesArray = s.notes;
        else if(typeof s.notes === 'string') { try { notesArray = JSON.parse(s.notes); } catch(e) { notesArray = [{ note: s.notes, date: new Date().toISOString() }]; } }
        else if(typeof s.notes === 'object') { notesArray = [s.notes]; }
    }
    if(!Array.isArray(notesArray)) notesArray = [];
    
    let notesHtml = notesArray.map(n => `
        <div style="background:#F9FAFB; border:1px solid #E5E7EB; padding:12px; border-radius:8px; margin-bottom:8px;">
            <div style="font-size:11px; color:#6B7280; margin-bottom:4px;">${new Date(n.date || Date.now()).toLocaleString()}</div>
            <div style="font-size:13px; color:#111827; white-space:pre-wrap;">${n.note || JSON.stringify(n)}</div>
        </div>
    `).join('');
    if(notesArray.length === 0) notesHtml = `<div style="font-size:13px; color:#9CA3AF; font-style:italic; padding:20px; text-align:center;">No internal notes yet.</div>`;

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header"><h2>Internal Notes: ${s.name || s.first_name || 'Client'}</h2><button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>
        <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="max-height: 350px; overflow-y:auto; background:#FFF; border:1px solid #E2E8F0; padding:16px; border-radius:8px;">
                ${notesHtml}
            </div>
            <div>
                <textarea id="newNoteEditor" placeholder="Type a new internal note..." style="width:100%; height:100px; padding:12px; border-radius:8px; border:1px solid #E2E8F0; outline:none; font-family:inherit; resize:vertical; background:#F8FAFC;"></textarea>
                <button class="btn-action" style="margin-top:12px; width:100%; justify-content:center;" onclick="window.saveNewNote('${s.id}')">Add Note</button>
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveNewNote = async function(id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if(!s) return;
    const txt = document.getElementById('newNoteEditor').value.trim();
    if(!txt) return alert("Please type a note first.");

    let notesArray = [];
    if(s.notes) {
        if(Array.isArray(s.notes)) notesArray = [...s.notes];
        else if(typeof s.notes === 'string') { try { notesArray = JSON.parse(s.notes); } catch(e) { notesArray = [{ note: s.notes, date: new Date().toISOString() }]; } }
    }
    
    notesArray.push({ note: txt, date: new Date().toISOString() });
    
    const originalNotes = s.notes;
    s.notes = JSON.stringify(notesArray); // Fallback until db commits
    window.openNotesModal(id); // visually update immediately
    
    try {
        await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: s.id, notes: JSON.stringify(notesArray) })
        });
    } catch(e) {
        console.error(e);
        s.notes = originalNotes; // revert mapping
        alert("Failed to save note to server.");
    }
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