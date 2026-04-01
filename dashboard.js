// 🚀 Full Admin Dashboard Script
let submissionsData = [];
let companiesData = [];
let charts = {};

const leadStatuses = [
    'New Lead', 'Transferred', 'Accepted', 'Rejected',
    'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

window.switchView = function (view) {
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
    const accepted = submissionsData.filter(s => s.leadStatus === 'Accepted').length;
    const rejected = submissionsData.filter(s => s.leadStatus === 'Rejected').length;

    if (document.getElementById('dashboardTotal')) {
        document.getElementById('dashboardTotal').innerText = total;
    }
    if (document.getElementById('dashboardConvRate')) {
        document.getElementById('dashboardConvRate').innerText = total > 0 ? ((accepted / total) * 100).toFixed(1) + '%' : '0%';
    }
    if (document.getElementById('dashboardRejected')) {
        document.getElementById('dashboardRejected').innerText = rejected;
    }
    if (document.getElementById('dashboardActive')) {
        document.getElementById('dashboardActive').innerText = companiesData.length; // Active companies
    }

    initCharts(submissionsData);
}

function initCharts(data) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');

    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();

    // Line chart
    if (ctxFlow) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let monthlyCounts = Array(12).fill(0);
        data.forEach(item => {
            if (item.timestamp) {
                const date = new Date(item.timestamp);
                monthlyCounts[date.getMonth()]++;
            }
        });
        charts.flow = new Chart(ctxFlow, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{ label: 'Leads per Month', data: monthlyCounts, borderColor: '#2563eb', tension: 0.4 }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Doughnut
    if (ctxStatus) {
        charts.status = new Chart(ctxStatus, { type: 'doughnut', data: { labels: leadStatuses, datasets: [{ data: leadStatuses.map(s => data.filter(x => x.leadStatus === s).length), backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'] }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%' } });
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
        companiesData.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id; opt.innerText = c.name;
            companySelect.appendChild(opt);
        });
    }
}

window.renderFilteredLeads = function () {
    const statusFilter = document.getElementById('filterStatus')?.value || 'All';
    const companyFilter = document.getElementById('filterCompany')?.value || 'All';

    const filtered = submissionsData.filter(item => {
        let matchStatus = statusFilter === 'All' || item.leadStatus === statusFilter;
        let matchCompany = companyFilter === 'All' || String(item.assigned_company_id || '') === String(companyFilter);
        return matchStatus && matchCompany;
    });

    renderTable(filtered);
};


function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        const tr = document.createElement("tr");

        let companyOptions = `<option value="">Unassigned</option>` + companiesData.map(c => `<option value="${c.id}" ${String(item.assigned_company_id) === String(c.id) ? 'selected' : ''}>${c.name}</option>`).join('');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name || "---"}</strong></td>
            <td>${item.phone || "---"}</td>
            <td>${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td>
            <td><select class="status-select" onchange="window.handleFieldUpdate('${item.id}', 'assigned_company_id', this.value)">${companyOptions}</select></td>
            <td><select class="status-select" onchange="window.handleFieldUpdate('${item.id}', 'leadStatus', this.value)">${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
            <td style="display:flex; gap:5px;">
                <button class="btn-action" style="padding:6px 10px;" onclick="window.openViewModal('${item.id}')">👁️</button>
                <button class="btn-action" style="padding:6px 10px;" onclick="window.openEditModal('${item.id}')">✏️</button>
                <button class="btn-action" style="padding:6px 10px;" onclick="window.exportDocx('${item.id}')">📄</button>
            </td>`;
        tbody.appendChild(tr);
    });
}

window.handleFieldUpdate = async function (id, fieldName, value) {
    try {
        const updateParams = { id };
        updateParams[fieldName] = value;
        await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateParams) });
        // Update local state without full refetch
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) lead[fieldName] = value;
        if(fieldName === 'leadStatus') calculateDashboardStats();
    } catch (e) { console.error(e); }
};

window.openViewModal = function (id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    let html = '<div style="max-height:60vh; overflow-y:auto; padding:10px;">';
    Object.keys(item).forEach(k => {
        if (k !== 'id') {
            html += `<div style="margin-bottom:10px;"><label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${k.replace(/_/g, ' ')}</label><div style="padding:10px; background:#f8fafc; border-radius:8px; white-space:pre-wrap;">${item[k] || '---'}</div></div>`;
        }
    });
    document.getElementById('modalBox').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>View Details</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}</div>`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditModal = function (id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;

    let html = '<div style="max-height:60vh; overflow-y:auto; padding:10px;" id="editFormContainer">';
    
    // Allow editing major fields. For brevity, assuming top-level str fields
    ['name', 'phone', 'email', 'leadSource', 'notes'].forEach(k => {
        // We'll treat notes as a textarea
        if (k === 'notes') {
            html += `<div style="margin-bottom:10px;"><label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${k}</label>
                     <textarea class="edit-input" data-field="${k}" rows="5" placeholder="Add timestamped notes here...">${item[k] || ''}</textarea></div>`;
        } else {
             html += `<div style="margin-bottom:10px;"><label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${k}</label>
                     <input type="text" class="edit-input" data-field="${k}" value="${item[k] || ''}"></div>`;
        }
    });
    
    html += `</div>
             <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-action" style="background:var(--primary); color:white;" onclick="window.saveLeadEdits('${item.id}')">Save Changes</button>
             </div>`;

    document.getElementById('modalBox').innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2>Edit Lead / Notes</h2><button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button></div>${html}`;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveLeadEdits = async function(id) {
    const container = document.getElementById('editFormContainer');
    const inputs = container.querySelectorAll('.edit-input');
    const updates = { id };
    
    inputs.forEach(inp => {
        updates[inp.getAttribute('data-field')] = inp.value;
    });

    try {
        await fetch('/api/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
        // update local
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) Object.assign(lead, updates);
        
        document.getElementById('modalOverlay').style.display='none';
        renderFilteredLeads();
    } catch(e) {
        console.error("Save Error", e);
    }
};

window.exportDocx = function(id) {
    window.open('/api/export-docx?id=' + id, '_blank');
};

window.exportExcel = function() {
    // Collect applied filters
    const status = document.getElementById('filterStatus')?.value || 'All';
    const company = document.getElementById('filterCompany')?.value || 'All';
    window.open('/api/export-xlsx?status=' + status + '&company=' + company, '_blank');
};


// VERY BASIC COMPANIES MOCK TO SUPPORT DB RENDER
window.renderCompanies = function() {
    const tbody = document.querySelector("#companyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesData.forEach((c) => {
        tbody.innerHTML += `<tr><td><strong>${c.name}</strong></td><td>${c.type || 'Firm'}</td><td>${c.contact || '--'}</td><td>${c.postcode || '--'}</td><td>Active</td><td><button class="btn-action">Edit</button></td></tr>`;
    });
};

window.openAddCompanyModal = function() {
     document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>Add Firm</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <input type="text" id="newCompanyName" placeholder="Company Name" class="edit-input">
        <input type="text" id="newCompanyContact" placeholder="Contact Details" class="edit-input">
        <input type="text" id="newCompanyPostcode" placeholder="Postcode" class="edit-input">
        <button class="btn-action" style="margin-top:15px; background:var(--primary); color:white; width:100%;" onclick="window.saveNewCompany()">Add Company</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveNewCompany = async function() {
    const name = document.getElementById('newCompanyName').value;
    const contact = document.getElementById('newCompanyContact').value;
    const postcode = document.getElementById('newCompanyPostcode').value;
    
    try {
        const res = await fetch('/api/companies', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name, contact, postcode, type:'Solicitor'})});
        const saved = await res.json();
        companiesData.push(saved);
        document.getElementById('modalOverlay').style.display='none';
        initFilters();
        renderCompanies();
    } catch(e) { console.error(e); }
};


window.initDashboard = async function () {
    try {
        // Fetch Submissions
        const resSub = await fetch('/api/submissions');
        if (resSub.ok) {
            submissionsData = JSON.parse(await resSub.text());
        }

        // Fetch Companies
        const resComp = await fetch('/api/companies');
        if (resComp.ok) {
            companiesData = JSON.parse(await resComp.text());
        }
    } catch (e) {
        console.error("Sync Error - You are likely running this locally instead of via Vercel:", e);
        alert('Warning: API connection failed. You might be running this file locally instead of on your live site.');
    } finally {
        initFilters();
        calculateDashboardStats();
        switchView('dashboard');
    }
};