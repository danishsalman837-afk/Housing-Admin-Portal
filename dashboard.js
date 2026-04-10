let submissionsData = [];
let companiesData = [];
let membersData = [];
let activityData = [];
let notifications = JSON.parse(localStorage.getItem('hdr_notifications') || '[]');
let charts = {};
let selectedCompanyId = null;

// ═══════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════
window.toggleTheme = function(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    // Re-init charts to update grid/label colors
    calculateDashboardStats();
};

function syncThemeToggle() {
    const theme = localStorage.getItem('theme');
    const dropdownToggle = document.getElementById('dropdownThemeToggle');
    if (dropdownToggle) {
        dropdownToggle.checked = (theme === 'dark');
    }
}


const leadStatuses = [
    'New Lead', 'Allocated', 'Sent', 'Accepted', 'Rejected', 'Transferred',
    'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead', 'Closed'
];

function getStatusColor(status) {
    if (!status || typeof status !== 'string') return 'gray';
    const s = status.trim();
    if (s === 'New Lead') return 'new';
    if (s === 'Accepted') return 'success';
    if (s === 'Paid') return 'paid';
    if (s === 'Rejected') return 'orange';
    if (s === 'Closed') return 'danger';
    if (s === 'Transferred') return 'purple';
    if (s === 'Not Yet Invoiced') return 'brown';
    if (s === 'Invoice Raised') return 'pink';
    if (s === 'Allocated') return 'allocated';
    if (s === 'Sent') return 'sent';
    if (s === 'Test Lead' || s === 'test') return 'gray';
    return 'gray';
}

const leadViewOrder = [
    'name', 'email', 'phone', 'dob', 'address', 'postcode',
    'tenantType', 'landlordName', 'livingDuration',
    'damp', 'dampLocation', 'dampRooms', 'dampSurface', 'dampDuration', 'dampCause', 'dampDamage', 'dampHealth',
    'leak', 'leakLocation', 'leakSource', 'leakStart', 'leakDamage', 'leakCracks', 'leakBelongings',
    'issues_electrics', 'issues_heating', 'issues_structural',
    'reported', 'reportCount', 'reportFirst', 'reportLast', 'reportResponse', 'reportAttempt', 'reportStatus',
    'arrears', 'arrearsAmount', 'alreadySubmitted', 'additionalNotes', 'agentName'
];

const leadFieldLabels = {
    name: 'Name',
    email: 'Email Address',
    phone: 'Phone Number',
    dob: 'Date of Birth',
    address: 'Address',
    postcode: 'Postcode',
    tenantType: 'Tenant Type',
    landlordName: 'Name of Landlord',
    livingDuration: 'Tenancy Duration',
    damp: 'Damp or Mould?',
    dampLocation: 'Damp/Mould Location',
    dampRooms: 'Rooms Affected',
    dampSurface: 'Affected Surfaces',
    dampDuration: 'Issue Duration',
    dampCause: 'Issue Cause',
    dampDamage: 'Damaged Belongings (Damp)',
    dampHealth: 'Health Problems',
    leak: 'Leaks?',
    leakLocation: 'Leak Location',
    leakSource: 'Leak Source',
    leakStart: 'Leak Start / Ongoing?',
    leakDamage: 'Leak Damage',
    leakCracks: 'Cracks/Structural Damage (Leaks)',
    leakBelongings: 'Damaged Belongings (Leaks)',
    issues_electrics: 'Faulty Electrics?',
    issues_heating: 'Heating / Boiler Issues?',
    issues_structural: 'Cracks or Structural Damages?',
    reported: 'Reported >1 Month Ago?',
    reportCount: 'Notification Count',
    reportFirst: 'First Reported Date',
    reportLast: 'Last Reported to Landlord',
    reportResponse: 'Landlord Response',
    reportAttempt: 'Repair Attempted?',
    reportStatus: 'Issue Still Unresolved?',
    arrears: 'Rental Arrears?',
    arrearsAmount: 'Arrears Amount',
    alreadySubmitted: 'Already Submitted Claim?',
    additionalNotes: 'Additional Notes',
    agentName: 'Agent Name'
};

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
    } else if (view === 'activity') {
        document.getElementById('activityView').classList.add('active');
        navItems[2].classList.add('active');
        renderFilteredActivity();
    } else if (view === 'settings') {
        document.getElementById('settingsView').classList.add('active');
        navItems[4].classList.add('active');
        populateSettings();
    } else {
        document.getElementById('leadsView').classList.add('active');
        navItems[3].classList.add('active');
        renderFilteredLeads();
    }
};

function populateSettings() {
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const user = session.user;

    const fullName = user.user_metadata?.full_name || user.user_metadata?.username || user.email.split('@')[0];
    
    document.getElementById('settingsFullName').value = fullName;
    document.getElementById('settingsEmail').value = user.email;

    // Avatar preview
    const avatarUrl = user.user_metadata?.avatar_url;
    const initialsEl = document.getElementById('settingsAvatarInitials');
    const imgEl = document.getElementById('settingsAvatarImg');
    
    if (avatarUrl) {
        initialsEl.style.display = 'none';
        imgEl.src = avatarUrl;
        imgEl.style.display = 'block';
    } else {
        initialsEl.style.display = 'flex';
        imgEl.style.display = 'none';
        // Generate initials
        let initials = 'AD';
        const parts = fullName.trim().split(/[\s_\.-]+/);
        if (parts.length >= 2) initials = (parts[0][0] + parts[1][0]).toUpperCase();
        else if (fullName.length >= 2) initials = fullName.substring(0, 2).toUpperCase();
        initialsEl.innerText = initials;
    }
}

function calculateDashboardStats() {
    const total = submissionsData.length;
    const acceptedCount = submissionsData.filter(s => s.leadStatus === 'Accepted').length;
    const paidCount = submissionsData.filter(s => s.leadStatus === 'Paid').length;
    const rejectedCount = submissionsData.filter(s => s.leadStatus === 'Rejected').length;

    // Update text references
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('dashboardTotal', total);
    setEl('dashboardTotalDonut', total);
    setEl('dashboardActive', companiesData.length);
    setEl('dashboardSolicitorsCount', membersData.length);
    setEl('dashboardAccepted', acceptedCount);
    setEl('dashboardRejected', rejectedCount);

    const activeCompaniesCount = companiesData.filter(c => c.active !== false).length;
    setEl('dashboardActive', activeCompaniesCount);

    // Update Paid Leads count (top box)
    setEl('dashboardPaidLeads', paidCount);

    // Update Conversion Rate (Donut Gauge)
    let convRate = total > 0 ? ((paidCount / total) * 100).toFixed(1) : '0';
    setEl('dashboardConvRateDonut', convRate + '%');

    initCharts(submissionsData, paidCount, total);
}

function initCharts(data, paidCount, totalCount) {
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
            if (item.timestamp) { const date = new Date(item.timestamp); if (!isNaN(date)) monthlyCounts[date.getMonth()]++; }
        });
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : '#F2F3F5';
        const textColor = isDark ? '#8E8E93' : '#636366';

        charts.flow = new Chart(ctxFlow, {
            type: 'bar',
            data: { labels: months, datasets: [{ label: 'Leads Received', data: monthlyCounts, backgroundColor: '#0A84FF', borderRadius: 4 }] },
            options: {
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                    x: { grid: { display: false }, ticks: { color: textColor } }, 
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } } 
                }
            }
        });
    }

    if (ctxStatus) {
        // Colors mapping for leadStatuses:
        // 'New Lead', 'Allocated', 'Sent', 'Accepted', 'Rejected', 'Transferred', 'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead', 'Closed'
        const statusColors = [
            '#0EA5E9', // New Lead (light blue)
            '#1E40AF', // Allocated (dark blue)
            '#EAB308', // Sent (yellow)
            '#10B981', // Accepted (light green)
            '#EA580C', // Rejected (orange)
            '#9333EA', // Transferred (purple)
            '#78350F', // Not Yet Invoiced (brown)
            '#DB2777', // Invoice Raised (pink)
            '#166534', // Paid (dark green)
            '#94A3B8', // Test Lead (gray)
            '#EF4444'  // Closed (red)
        ];

        charts.status = new Chart(ctxStatus, {
            type: 'doughnut',
            data: { 
                labels: leadStatuses, 
                datasets: [{ 
                    data: leadStatuses.map(s => data.filter(x => x.leadStatus === s).length), 
                    backgroundColor: statusColors, 
                    borderWidth: 0 
                }] 
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false } } }
        });
    }

    if (ctxConv) {
        let remainder = totalCount - paidCount;
        if (totalCount === 0) remainder = 1; 
        charts.conv = new Chart(ctxConv, {
            type: 'doughnut',
            data: { datasets: [{ data: [paidCount, remainder], backgroundColor: ['#30D158', '#E5E6EB'], borderWidth: 0 }] },
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
        // Clear all except first option if re-initializing. Only include active companies.
        companySelect.innerHTML = '<option value="All">All Solicitors</option>';
        companiesData.filter(c => c.active !== false).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = c.name || c.company_name || 'Unnamed Solicitor';
            companySelect.appendChild(opt);
        });
    }
}

window.renderFilteredLeads = function () {
    const statusFilter = document.getElementById('filterStatus')?.value || 'All';
    const companyFilter = document.getElementById('filterCompany')?.value || 'All';
    const searchVal = (document.getElementById('searchLead')?.value || '').toLowerCase();
    const showClosed = document.getElementById('showClosedCheck')?.checked || false;

    const filtered = submissionsData.filter(item => {
        let matchStatus = false;
        if (statusFilter === 'All') {
            // By default, 'All' hides 'Closed' unless the checkbox is checked
            if (item.leadStatus === 'Closed') {
                matchStatus = showClosed;
            } else {
                matchStatus = true;
            }
        } else {
            matchStatus = (item.leadStatus === statusFilter);
        }

        let matchCompany = companyFilter === 'All' || String(item.assigned_company_id || '') === String(companyFilter);
        let matchSearch = true;

        if (searchVal) {
            const textToSearch = `${item.name || ''} ${item.email || ''} ${item.phone || ''}`.toLowerCase();
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
        tr.className = 'lead-row';
        tr.onclick = (e) => {
            // Don't open modal if clicking on select or buttons
            if (e.target.closest('select') || e.target.closest('.action-container')) return;
            window.openViewModal(item.id, false);
        };

        // Build company options
        let compOptions = '<option value="">Unassigned</option>';
        const activeCompanies = companiesData.filter(c => c.active !== false);
        compOptions += activeCompanies.map(c => {
            let cName = c.name || c.company_name || 'Unnamed Solicitor';
            if (cName === 'undefined' || cName.includes('undefined')) cName = 'Unnamed Solicitor';
            return `<option value="${c.id}" ${String(item.assigned_company_id) === String(c.id) ? 'selected' : ''}>${cName}</option>`;
        }).join('');
        // If this lead is currently assigned to a company that is now inactive, show it (so users can see current assignment).
        if (item.assigned_company_id && !activeCompanies.find(a => String(a.id) === String(item.assigned_company_id))) {
            const assignedCompany = companiesData.find(c => String(c.id) === String(item.assigned_company_id));
            if (assignedCompany) {
                let aName = assignedCompany.name || assignedCompany.company_name || 'Unnamed Solicitor';
                if (aName === 'undefined' || aName.includes('undefined')) aName = 'Unnamed Solicitor';
                compOptions += `<option value="${assignedCompany.id}" selected>${aName} (Inactive)</option>`;
            }
        }

        const statusSelectTheme = getStatusColor(item.leadStatus || 'New Lead');

        // Solicitor Display logic — Interactive Dropdown
        let solicitorDisplay = '';
        if (item.assigned_company_id) {
            // Find all authorized members for this specific firm
            const firmMembers = membersData.filter(m => String(m.company_id) === String(item.assigned_company_id) && m.can_receive_emails !== false);
            
            if (firmMembers.length > 0) {
                const solOptions = firmMembers.map(m => {
                    const mName = ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || 'Unnamed';
                    return `<option value="${m.id}" ${String(item.assigned_solicitor_id) === String(m.id) ? 'selected' : ''}>${mName}</option>`;
                }).join('');
                
                solicitorDisplay = `
                    <div style="display:flex; align-items:center; gap:5px; margin-top:6px; padding-left:2px;">
                        <span style="font-size:11px; opacity:0.8;">👤</span>
                        <select class="modern-select" style="padding: 2px 20px 2px 6px; font-size: 10px; border:none; background:var(--blue-light); color:var(--blue); font-weight:700; width:auto; min-width:130px; border-radius:6px; cursor:pointer;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_solicitor_id', this.value)">
                            <option value="">Select Solicitor...</option>
                            ${solOptions}
                        </select>
                    </div>`;
            } else {
                solicitorDisplay = `<div style="font-size:10px; color:var(--label-4); margin-top:6px; font-style:italic; padding-left:18px;">No authorized solicitors</div>`;
            }
        }

        tr.innerHTML = `
            <td style="color:var(--label-4); font-weight:600;">#${index + 1}</td>
            <td><strong>${item.name || item.first_name || "---"}</strong></td>
            <td style="color:var(--label-3);">${item.phone || item.mobile_number || "---"}</td>
            <td style="color:var(--label-3);">${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : '---'}</td>
            <td>
                <select class="modern-select" style="padding: 6px 30px 6px 12px; font-size: 11px; width:100%; max-width:180px;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_company_id', this.value)">${compOptions}</select>
                ${solicitorDisplay}
            </td>
            <td>
                <select class="status-pill" data-color="${statusSelectTheme}" onchange="window.handleFieldUpdate('${item.id}', 'leadStatus', this.value); this.setAttribute('data-color', getStatusColor(this.value));">
                    ${leadStatuses.map(s => `<option value="${s}" ${item.leadStatus === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </td>
            <td style="text-align:right;">
                <div class="action-container">
                    <button class="btn-more" onclick="window.toggleDropdown(event, 'drop-${item.id}')" title="Actions">
                        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                    <div id="drop-${item.id}" class="dropdown-menu">
                        ${item.is_edited ? `
                        <button class="dropdown-item" onclick="window.openViewModal('${item.id}', false)">
                            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> Admin Edits
                        </button>
                        <button class="dropdown-item" onclick="window.openViewModal('${item.id}', true)">
                            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> Agent Form
                        </button>` : `
                        <button class="dropdown-item" onclick="window.openViewModal('${item.id}', true)">
                            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg> Agent Form
                        </button>`}
                        <button class="dropdown-item" onclick="window.openEditLeadModal('${item.id}')">
                            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg> Edit Lead
                        </button>
                        <button class="dropdown-item" onclick="window.openNotesModal('${item.id}')">
                            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> View Notes
                        </button>
                        <button class="dropdown-item" onclick="window.exportDocx('${item.id}')">
                            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> Download Word
                        </button>
                        <div style="border-top:1px solid var(--border); margin:4px 0;"></div>
                        <button class="dropdown-item danger" onclick="window.archiveLead('${item.id}')">
                            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Archive Lead
                        </button>
                    </div>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

// DROPDOWN LOGIC
window.toggleDropdown = function(e, id) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('active');
    
    // Close all others
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));
    
    if (!isOpen) dropdown.classList.add('active');
};

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.user-dropdown').forEach(d => d.classList.remove('active'));
});

window.handleFieldUpdate = async function (id, fieldName, value) {
    try {
        const updateParams = { id };
        
        // Convert empty strings to null for database compatibility (UUID/Int fields)
        let sanitizedValue = (value === "" || value === "null" || value === undefined) ? null : value;
        updateParams[fieldName] = sanitizedValue;

        // SYNC: If we unassign a company, we MUST also unassign the solicitor member
        if (fieldName === 'assigned_company_id' && sanitizedValue === null) {
            updateParams['assigned_solicitor_id'] = null;
        }

        const res = await fetch('/api/update', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(updateParams) 
        });
        
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Update failed");
        
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) {
            lead[fieldName] = sanitizedValue;
            if (fieldName === 'assigned_company_id' && sanitizedValue === null) {
                lead['assigned_solicitor_id'] = null;
            }
        }
        
        if (fieldName === 'leadStatus') calculateDashboardStats();
        
        // If we updated assignments or status, refresh the table to reflect changes (especially solicitor names)
        if (fieldName === 'assigned_company_id' || fieldName === 'assigned_solicitor_id' || fieldName === 'leadStatus') {
            if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
        }
        
        showToast('Update Successful', `The ${fieldName.replace(/_/g, ' ')} has been updated.`, 'success');
    } catch (e) { 
        console.error(e); 
        showToast('Update Error', e.message, 'danger');
    }
};

window.exportDocx = function (id) { window.open('/api/export-docx?id=' + id, '_blank'); };
window.exportExcel = function () {
    const status = document.getElementById('filterStatus')?.value || 'All';
    const company = document.getElementById('filterCompany')?.value || 'All';
    window.open('/api/export-xlsx?status=' + status + '&company=' + company, '_blank');
};


// 🏢 COMPANY CRM
window.viewCompanyEditModal = function (id) {
    const c = companiesData.find(x => String(x.id) === String(id));
    if (!c) return;
    openAddCompanyModal(c);
};

window.renderCompanies = function () {
    const tbody = document.querySelector("#companyTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    companiesData.forEach((c) => {
        let nameDisp = c.name || c.company_name || 'Unnamed Solicitor';
        if (nameDisp === 'undefined' || nameDisp.includes('undefined')) nameDisp = 'Unnamed Solicitor';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${nameDisp}</strong></td>
            <td>${c.type || '--'}</td>
            <td style="text-align:center;">
                <div style="display:flex; align-items:center; gap:10px; justify-content:center;">
                    <div style="font-weight:700; color:${c.active === false ? '#94A3B8' : '#0B74FF'}; font-size:12px;">${c.active === false ? 'Inactive' : 'Active'}</div>
                    <label class="theme-switch" style="width:34px; height:18px;">
                        <input type="checkbox" aria-label="Toggle active" ${c.active === false ? '' : 'checked'} onchange="window.toggleCompanyActive('${c.id}', this.checked)" />
                        <div class="slider" style="border-radius:20px;"></div>
                    </label>
                </div>
            </td>
            <td>${c.main_contact || '--'}</td>
            <td>${c.postcode || '--'}</td>
            <td>${c.website ? `<a href="${c.website}" target="_blank" style="color:var(--blue);text-decoration:none;">Link</a>` : '--'}</td>
            <td>
                <div class="action-group">
                    <button class="act-btn edit" onclick="window.viewCompanyEditModal('${c.id}')" title="Edit Company">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg> Edit
                    </button>
                    <button class="act-btn view" onclick="window.viewCompanyMembers('${c.id}')">
                        <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> Members
                    </button>
                    <button class="act-btn" style="background:var(--red-light);color:var(--red);border-color:rgba(255,69,58,.1);" onclick="window.deleteCompany('${c.id}')" title="Delete Company">
                        <svg viewBox="0 0 24 24" style="fill:currentColor; width:14px; height:14px;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg> Del
                    </button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('companyMembersSection').style.display = 'none';
};

window.openAddCompanyModal = function (existingCompany = null) {
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
            <div class="form-group" style="display:flex; align-items:center; gap:12px;">
                <label style="min-width:90px;">Active</label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" id="cActive" ${c.active === false ? '' : 'checked'} />
                    <span style="color:#64748b; font-size:13px;">Mark company as active</span>
                </div>
            </div>
        </div>
        <button class="btn-action" style="margin-top:20px; width:100%; justify-content:center;" onclick="window.saveNewCompany('${c.id || ''}')">Save Company</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

// --- MODERN MODAL LOGIC ---
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function formatDob(val) {
    if (!val || typeof val !== 'string') return val || '--';
    if (val === '0000-00-00' || val.includes('00 / 00')) return '--';

    let d, m, y;
    if (val.includes('/')) {
        const p = val.split('/').map(x => x.trim());
        d = p[0]; m = p[1]; y = p[2];
    } else if (val.includes('-')) {
        const p = val.split('-');
        if (p[0].length === 4) { // YYYY-MM-DD
            y = p[0]; m = p[1]; d = p[2];
        } else { // DD-MM-YYYY
            d = p[0]; m = p[1]; y = p[2];
        }
    } else return val;

    if (y === '0000' || m === '00' || d === '00') return '--';

    const mIdx = parseInt(m) - 1;
    if (mIdx >= 0 && mIdx < 12 && d && y) {
        return `${parseInt(d)} ${months[mIdx]} ${y}`;
    }
    return val;
}

window.openViewModal = function (id, showOriginal = false) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if (!s) return;

    let leadData = s;
    let titlePrefix = "Current Lead Profile";

    if (showOriginal && s.agent_data) {
        // Apply normalizeLead logic if it's not already normalized (it likely isn't if stored raw)
        // But since normalizeLead overwrites, we should clone it
        leadData = JSON.parse(JSON.stringify(s.agent_data));
        
        // Ensure some fields from the main record are available if missing in backup
        if (!leadData.attachments && s.attachments) leadData.attachments = s.attachments;
        if (!leadData.id) leadData.id = s.id;
        
        // We need to normalize it since it's raw DB row
        // In this environment normalizeLead is not global, but we can replicate it or just use it if possible
        // Wait, normalizeLead is available in the API, but here in dashboard.js it's not.
        // However, dashboard.js has its own display mappings.
        titlePrefix = "Original Agent Submission";
    } else if (showOriginal) {
        titlePrefix = "Original Submission (No Edits)";
    }

    const ignoreKeys = ['id', 'created_at', 'notes', 'assigned_company_id', 'assigned_solicitor_id', 'call_notes', 'agent_data', 'is_edited'];
    let dataHtml = '';

    // 1. Show fields in the predefined order
    leadViewOrder.forEach(key => {
        if (ignoreKeys.includes(key)) return;
        
        // Handle potential snake_case vs camelCase if leadData is raw
        let val = leadData[key];
        if (val === undefined || val === null) {
            // Try common snake_case mappings
            if (key === 'dateOfBirth') val = leadData['dob'];
            else if (key === 'tenancyDuration') val = leadData['livingDuration'];
            else if (key === 'name') val = leadData['first_name'];
            else if (key === 'phone') val = leadData['mobile_number'];
            else if (key === 'agentName') val = leadData['agent_name'];
            // ... and so on. Better yet, just check if val is still undefined.
        }

        if (val === undefined || val === null) return;

        let label = leadFieldLabels[key] || key.replace(/_/g, ' ');

        if (key === 'dob' || key === 'dateOfBirth') val = formatDob(val);
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);

        dataHtml += `
            <div style="margin-bottom:18px;">
                <label style="font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; display:block; margin-bottom:4px;">${label}</label>
                <div style="font-size:14px; color:#1E293B; font-weight:600; line-height:1.4; white-space:pre-wrap;">${val || '--'}</div>
            </div>`;
    });

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header">
            <div>
                <div style="font-size:11px; font-weight:700; color:var(--blue); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${titlePrefix}</div>
                <h2 style="font-size:20px; font-weight:800; letter-spacing:-0.5px;">${leadData.name || leadData.first_name || 'Client'}</h2>
            </div>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:24px; padding:0 8px; max-height:75vh; overflow-y:auto;">
            ${dataHtml}
            
            <!-- 📎 PHOTO EVIDENCE -->
            <div style="grid-column: span 2; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                <h3 style="font-size:15px; font-weight:700; color:var(--label-1); display:flex; align-items:center; gap:8px; margin-bottom:16px;">
                    <svg style="width:18px; height:18px; fill:var(--blue);" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V5c0-2.21-1.79-4-4-4S9 2.79 9 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                    Photo Evidence
                </h3>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:12px;">
                    ${(leadData.attachments || []).map(a => `
                        <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:6px; box-shadow:var(--shadow-xs);">
                            <a href="${a.url}" target="_blank">
                                <img src="${a.url}" style="width:100%; height:85px; object-fit:cover; border-radius:6px;">
                            </a>
                            <div style="font-size:9px; color:var(--label-3); margin-top:4px; text-align:center; overflow:hidden; text-overflow:ellipsis;">${a.name}</div>
                        </div>
                    `).join('')}
                    ${(!leadData.attachments || leadData.attachments.length === 0) ? '<p style="font-size:13px; color:var(--label-4); font-style:italic; grid-column:1/-1; text-align:center;">No pictures attached.</p>' : ''}
                </div>
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.openEditLeadModal = function (id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if (!s) return;

    const ignoreKeys = ['id', 'created_at', 'notes', 'assigned_company_id', 'assigned_solicitor_id', 'call_notes'];
    let html = '';
    const shownKeys = new Set();

    const createFieldHtml = (k, val) => {
        let displayValue = (val === null || val === undefined) ? '' : val;

        // Clear zeroed dates so they don't block input
        if (displayValue === '0000-00-00' || displayValue === '00 / 00 / 0000') displayValue = '';

        if (typeof displayValue === 'object') displayValue = JSON.stringify(displayValue);

        let safeValue = String(displayValue).replace(/"/g, '&quot;');
        let label = leadFieldLabels[k] || k.replace(/_/g, ' ');

        // If it's a long field or specific type, use textarea
        const isLongField = String(displayValue).length > 60 ||
            k.toLowerCase().includes('notes') ||
            k.toLowerCase().includes('address') ||
            k.toLowerCase().includes('damage') ||
            k.toLowerCase().includes('issue');

        if (isLongField) {
            return `<div class="form-group full" style="grid-column: span 2;">
                        <label style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase; margin-bottom:6px; display:block;">${label}</label>
                        <textarea class="modern-input edit-inp" data-field="${k}" rows="3" style="width:100%; min-height:80px;">${displayValue}</textarea>
                     </div>`;
        } else {
            return `<div class="form-group">
                        <label style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase; margin-bottom:6px; display:block;">${label}</label>
                        <input type="text" class="modern-input edit-inp" data-field="${k}" value="${safeValue}" style="width:100%;">
                     </div>`;
        }
    };

    // 1. Show fields in order
    leadViewOrder.forEach(key => {
        if (ignoreKeys.includes(key)) return;
        shownKeys.add(key);
        html += createFieldHtml(key, s[key]);
    });



    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header">
            <h2 style="font-size:20px; font-weight:800; letter-spacing:-0.5px;">Edit Full Lead Data</h2>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <div class="form-grid" id="editLeadForm" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; padding:0 8px; max-height:75vh; overflow-y:auto;">
            ${html}
            
            <!-- 📎 ATTACHMENTS SECTION -->
            <div style="grid-column: span 2; margin-top: 24px; padding-top: 24px; border-top: 2px dashed var(--border); background: var(--surface-2); border-radius: 12px; padding: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="font-size:15px; font-weight:700; color:var(--label-1); display:flex; align-items:center; gap:8px; margin:0;">
                        <svg style="width:18px; height:18px; fill:var(--blue);" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V5c0-2.21-1.79-4-4-4S9 2.79 9 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                        Case Evidences & Pictures
                    </h3>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div id="uploadStatus" style="font-size:12px; font-weight:600; color:var(--label-3);"></div>
                        <input type="file" id="attachInput" style="display:none;" onchange="window.handleAttachmentUpload('${s.id}', this)" accept="image/*" multiple>
                        <button class="btn-action" style="font-size:12px; padding:7px 14px; background:var(--blue-light); color:var(--blue); border:1px solid var(--blue-ring); box-shadow:none;" onclick="document.getElementById('attachInput').click()">+ Add Photos</button>
                        <button class="btn-action" style="font-size:12px; padding:7px 14px; background:var(--green); color:white; border:none; box-shadow:var(--shadow-sm);" onclick="window.saveLeadEdits('${s.id}')">Save Pictures / Update</button>
                    </div>
                </div>
                
                <div id="attachmentList" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px;">
                    ${(s.attachments || []).map((a, i) => `
                        <div class="attach-item" style="position:relative; background:var(--surface-1); border:1px solid var(--border); border-radius:10px; padding:8px; transition:all 0.2s ease; box-shadow:var(--shadow-xs);">
                            <a href="${a.url}" target="_blank" style="display:block;">
                                <img src="${a.url}" style="width:100%; height:90px; object-fit:cover; border-radius:6px; background:var(--surface-2);">
                            </a>
                            <div style="font-size:10px; color:var(--label-3); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 4px;">${a.name}</div>
                            <button onclick="window.deleteAttachment('${s.id}', ${i})" style="position:absolute; top:-6px; right:-6px; background:var(--red); color:white; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(255,69,58,0.3);">&times;</button>
                        </div>
                    `).join('')}
                    ${(!s.attachments || s.attachments.length === 0) ? '<p style="font-size:12px; color:var(--label-4); font-style:italic; grid-column:1/-1; text-align:center; padding:20px 0;">No pictures attached yet.</p>' : ''}
                </div>
            </div>
        </div>
        <div style="margin-top:32px; display:flex; justify-content:flex-end; gap:12px; padding:0 8px;">
           <button class="btn-outline" style="padding:10px 24px; font-weight:700;" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
           <button class="btn-action" style="padding:10px 32px; font-weight:700; background:#10B981;" onclick="window.saveLeadEdits('${s.id}')">Apply Changes</button>
        </div>`;
    document.getElementById('modalOverlay').style.display = 'flex';
};


window.saveNewCompany = async function (id) {
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
    // include active flag (default true if checkbox not present)
    try {
        const chk = document.getElementById('cActive');
        payload.active = chk ? chk.checked : true;
    } catch (e) { payload.active = true; }
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const saved = await res.json();

        if (!res.ok || saved.error) { 
            throw new Error(saved.error || "Failed to save to database");
        }

        if (id) {
            const index = companiesData.findIndex(x => String(x.id) === String(id));
            if (index > -1) companiesData[index] = saved;
            showToast('Company Updated', `Firm "${saved.name || saved.company_name}" saved.`, 'success');
        } else {
            companiesData.push(saved);
            showToast('Company Added', `Firm "${saved.name || saved.company_name}" created.`, 'success');
        }

        document.getElementById('modalOverlay').style.display = 'none';
        renderCompanies();
        calculateDashboardStats();
    } catch (e) { 
        console.error(e); 
        showToast('Error', e.message, 'danger');
    }
};

window.toggleCompanyActive = async function (id, isActive) {
    try {
        const res = await fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: isActive }) });
        const updated = await res.json();
        if (!res.ok || updated.error) { throw new Error(updated.error || 'Unknown error'); }
        const idx = companiesData.findIndex(c => String(c.id) === String(id));
        if (idx > -1) companiesData[idx] = updated;
        
        showToast('Status Updated', `Company is now ${isActive ? 'Active' : 'Inactive'}.`, 'info');
        renderCompanies();
        calculateDashboardStats();
    } catch (e) { 
        console.error(e); 
        showToast('Update Failed', e.message, 'danger');
    }
};

window.deleteCompany = async function (id) {
    if (!confirm("Are you sure you want to delete this company? This will remove the firm from the system.")) return;
    try {
        const res = await fetch('/api/companies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action: 'delete' })
        });
        if (res.ok) {
            companiesData = companiesData.filter(c => String(c.id) !== String(id));
            renderCompanies();
            initFilters(); // update solicitor dropdowns
            calculateDashboardStats();
            showToast('Deleted', 'Company successfully removed.', 'success');
        } else {
            throw new Error("Failed to delete from server");
        }
    } catch (e) {
        console.error(e);
        showToast('Error', 'Failed to delete company.', 'danger');
    }
};

window.viewCompanyMembers = function (companyId) {
    selectedCompanyId = companyId;
    const company = companiesData.find(c => String(c.id) === String(companyId));
    document.getElementById('companyMembersSection').style.display = 'block';

    let compName = company?.name || 'Unknown Solicitor';
    document.getElementById('membersSectionTitle').innerText = 'Members for ' + compName;

    const tbody = document.querySelector("#membersTable tbody");
    tbody.innerHTML = '';

    const relatedMembers = membersData.filter(m => String(m.company_id) === String(companyId));
    if (relatedMembers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color:#94A3B8;">No members assigned to this company yet.</td></tr>';
        return;
    }

    relatedMembers.forEach(m => {
        let mName = ((m.first_name || '') + ' ' + (m.last_name || '')).trim();
        if (!mName || mName.includes('undefined')) mName = 'Unknown Member';

        tbody.innerHTML += `<tr>
            <td><strong>${mName}</strong></td>
            <td>${m.job_title || '--'}</td>
            <td>${m.email || '--'}</td>
            <td style="text-align:center;">
                ${m.can_receive_emails !== false ? 
                    '<span class="badge badge-success">Authorized</span>' : 
                    '<span class="badge badge-gray">No Email</span>'}
            </td>
            <td>${m.mobile || '--'}</td>
            <td>${m.landline || '--'}</td>
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

window.openAddMemberModal = function (editId = null) {
    if (!selectedCompanyId) return alert('Select a company first');
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
            <div class="form-group full" style="margin-top: 8px; padding: 20px; background: var(--surface-2); border-radius: var(--r-lg); border: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 14px; font-weight: 700; color: var(--label-1); letter-spacing: -0.2px;">Email Authorization</span>
                    <span style="font-size: 12px; color: var(--label-3); line-height: 1.4; max-width: 420px;">Authorize this member to receive lead notifications and secure links via email.</span>
                </div>
                <label class="theme-switch" style="flex-shrink: 0;">
                    <input type="checkbox" id="mCanReceiveEmails" ${m.can_receive_emails !== false ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        <button class="btn-action" style="margin-top:24px; width:100%; justify-content:center; padding:12px;" onclick="window.saveNewMember('${m.id || ''}')">Save Member</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
}

window.saveNewMember = async function (id) {
    if (!selectedCompanyId || selectedCompanyId === 'null' || selectedCompanyId === 'undefined') {
        return showToast('Error', 'Please select a company first by clicking "Members" on a firm.', 'danger');
    }

    // Secondary Check: Verify the company actually exists in our local list
    const exists = companiesData.some(c => String(c.id) === String(selectedCompanyId));
    if (!exists) {
        return showToast('Error', 'The selected company no longer exists. Please refresh the page.', 'danger');
    }

    const payload = {
        company_id: selectedCompanyId,
        first_name: document.getElementById('mFirstName').value.trim(),
        last_name: document.getElementById('mLastName').value.trim(),
        mobile: document.getElementById('mMobile').value.trim(),
        landline: document.getElementById('mLandline').value.trim(),
        job_title: document.getElementById('mJobTitle').value.trim(),
        email: document.getElementById('mEmail').value.trim(),
        can_receive_emails: document.getElementById('mCanReceiveEmails').checked
    };

    if (!payload.first_name) return showToast('Error', 'First name is required.', 'warning');
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const saved = await res.json();

        if (!res.ok || saved.error) throw new Error(saved.error || "Save failed");

        if (id) {
            const index = membersData.findIndex(x => String(x.id) === String(id));
            if (index > -1) membersData[index] = saved;
            showToast('Solicitor Saved', 'Member details updated.', 'success');
        } else {
            membersData.push(saved);
            showToast('Solicitor Added', 'New member successfully created.', 'success');
        }

        document.getElementById('modalOverlay').style.display = 'none';
        initFilters();
        viewCompanyMembers(selectedCompanyId);
        calculateDashboardStats();
        if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
    } catch (e) { console.error(e); alert("Network Error: " + e.message); }
};

window.deleteMember = async function (id) {
    if (!confirm("Are you sure you want to delete this member?")) return;
    try {
        const res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'delete' }) });
        if (!res.ok) throw new Error("Delete failed");
        membersData = membersData.filter(m => String(m.id) !== String(id));
        initFilters();
        viewCompanyMembers(selectedCompanyId);
        if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
        showToast('Member Removed', 'Solicitor has been deleted.', 'success');
    } catch (e) { 
        console.error(e); 
        showToast('Error', 'Failed to delete member.', 'danger');
    }
};

window.saveLeadEdits = async function (id) {
    const inputs = document.querySelectorAll('#editLeadForm .edit-inp');
    const updates = { id };
    inputs.forEach(inp => updates[inp.getAttribute('data-field')] = inp.value);

    // Note: Attachments are handled via standalone functions to keep things responsive
    // but we can also ensure they're part of the payload if needed. 
    // They are already merged into memory after successful upload.

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Server error " + res.status);

        // Merge the DB response back into memory
        const lead = submissionsData.find(s => String(s.id) === String(id));
        if (lead) {
            Object.assign(lead, updates);
            if (result && typeof result === 'object' && result.id) {
                // Keep attachments if they weren't in the updates but are in the memory
                const existingAttachments = lead.attachments;
                Object.assign(lead, result);
                if (!result.attachments && existingAttachments) lead.attachments = existingAttachments;
            }
        }
        document.getElementById('modalOverlay').style.display = 'none';
        renderFilteredLeads();
        showToast('Changes Saved', 'Lead data has been updated successfully.', 'success');
    } catch (e) {
        console.error("Save Error", e);
        showToast('Save Failed', e.message, 'danger');
    }
};

// 📎 ATTACHMENT HANDLERS
window.handleAttachmentUpload = async function (leadId, input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    const statusEl = document.getElementById('uploadStatus');
    const listEl = document.getElementById('attachmentList');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        statusEl.innerText = `Uploading ${i + 1}/${files.length}...`;

        try {
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            const base64Content = await base64Promise;

            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leadId: leadId,
                    name: file.name,
                    type: file.type,
                    content: base64Content
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Upload failed');

            // Update local state
            const lead = submissionsData.find(s => String(s.id) === String(leadId));
            if (lead) lead.attachments = result.attachments;

            // Re-render only the attachment section if modal is still open
            if (document.getElementById('attachmentList')) {
                renderAttachmentList(leadId, result.attachments);
            }

        } catch (e) {
            console.error(e);
            showToast('Upload Error', `Failed to upload ${file.name}: ${e.message}`, 'danger');
        }
    }

    statusEl.innerText = 'All files uploaded';
    setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 3000);
    input.value = '';
};

window.deleteAttachment = async function (leadId, index) {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
        const res = await fetch('/api/delete-attachment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId, index })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Delete failed');

        const lead = submissionsData.find(s => String(s.id) === String(leadId));
        if (lead) lead.attachments = result.attachments;

        renderAttachmentList(leadId, result.attachments);
        showToast('Attachment Deleted', 'The file has been removed.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Delete Failed', e.message, 'danger');
    }
};

function renderAttachmentList(leadId, attachments) {
    const listEl = document.getElementById('attachmentList');
    if (!listEl) return;

    if (!attachments || attachments.length === 0) {
        listEl.innerHTML = '<p style="font-size:12px; color:var(--label-4); font-style:italic; grid-column:1/-1; text-align:center; padding:20px 0;">No pictures attached yet.</p>';
        return;
    }

    listEl.innerHTML = attachments.map((a, i) => `
        <div class="attach-item" style="position:relative; background:var(--surface-1); border:1px solid var(--border); border-radius:10px; padding:8px; transition:all 0.2s ease; box-shadow:var(--shadow-xs);">
            <a href="${a.url}" target="_blank" style="display:block;">
                <img src="${a.url}" style="width:100%; height:90px; object-fit:cover; border-radius:6px; background:var(--surface-2);">
            </a>
            <div style="font-size:10px; color:var(--label-3); margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 4px;">${a.name}</div>
            <button onclick="window.deleteAttachment('${leadId}', ${i})" style="position:absolute; top:-6px; right:-6px; background:var(--red); color:white; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(255,69,58,0.3);">&times;</button>
        </div>
    `).join('');
}

window.openNotesModal = function (id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if (!s) return;

    let notesArray = [];
    if (s.notes) {
        if (Array.isArray(s.notes)) notesArray = s.notes;
        else if (typeof s.notes === 'string') { try { notesArray = JSON.parse(s.notes); } catch (e) { notesArray = [{ note: s.notes, date: new Date().toISOString() }]; } }
        else if (typeof s.notes === 'object') { notesArray = [s.notes]; }
    }
    if (!Array.isArray(notesArray)) notesArray = [];

    let notesHtml = notesArray.map((n, idx) => `
        <div id="note-block-${idx}" style="background:#F9FAFB; border:1px solid #E5E7EB; padding:12px; border-radius:8px; margin-bottom:8px; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                <div style="font-size:11px; color:#6B7280;">${new Date(n.date || Date.now()).toLocaleString()}</div>
                <div style="display:flex; gap:12px;">
                    <button onclick="window.editNote('${id}', ${idx})" style="background:none; border:none; cursor:pointer; color:#3B82F6; font-size:11px; font-weight:700; padding:0; text-transform:uppercase;">Edit</button>
                    <button onclick="window.deleteNote('${id}', ${idx})" style="background:none; border:none; cursor:pointer; color:#EF4444; font-size:11px; font-weight:700; padding:0; text-transform:uppercase;">Delete</button>
                </div>
            </div>
            <div id="note-text-${idx}" style="font-size:13px; color:#111827; white-space:pre-wrap;">${n.note || (typeof n === 'string' ? n : JSON.stringify(n))}</div>
        </div>
    `).join('');
    if (notesArray.length === 0) notesHtml = `<div style="font-size:13px; color:#9CA3AF; font-style:italic; padding:20px; text-align:center;">No internal notes yet.</div>`;

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

window.saveNewNote = async function (id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if (!s) return;
    const txt = document.getElementById('newNoteEditor').value.trim();
    if (!txt) return showToast('Empty Note', "Please type a note first.", 'warning');

    let notesArray = [];
    if (s.notes) {
        if (Array.isArray(s.notes)) notesArray = [...s.notes];
        else if (typeof s.notes === 'string') { try { notesArray = JSON.parse(s.notes); } catch (e) { notesArray = [{ note: s.notes, date: new Date().toISOString() }]; } }
    }

    notesArray.push({ note: txt, date: new Date().toISOString() });
    await updateNotesInDb(s, notesArray);
};

window.editNote = function (leadId, noteIndex) {
    const block = document.getElementById(`note-block-${noteIndex}`);
    const textDiv = document.getElementById(`note-text-${noteIndex}`);
    if (!block || !textDiv) return;

    const currentText = textDiv.innerText;
    textDiv.innerHTML = `
        <textarea id="editNoteEditor-${noteIndex}" style="width:100%; min-height:60px; padding:8px; border-radius:4px; border:1px solid #3B82F6; outline:none; font-family:inherit; resize:vertical; font-size:13px; margin-top:8px;">${currentText}</textarea>
        <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="btn-action" style="padding:4px 12px; font-size:12px; background:#10B981;" onclick="window.saveEditedNote('${leadId}', ${noteIndex})">Save</button>
            <button class="btn-outline" style="padding:4px 12px; font-size:12px;" onclick="window.openNotesModal('${leadId}')">Cancel</button>
        </div>
    `;
    // Hide the original actions
    const actionRow = block.querySelector('div > div:last-child');
    if (actionRow) actionRow.style.display = 'none';
};

window.saveEditedNote = async function (leadId, noteIndex) {
    const s = submissionsData.find(x => String(x.id) === String(leadId));
    if (!s) return;

    const newText = document.getElementById(`editNoteEditor-${noteIndex}`).value.trim();
    if (!newText) return showToast('Empty Note', "Note cannot be empty.", 'warning');

    let notesArray = [];
    try {
        notesArray = Array.isArray(s.notes) ? [...s.notes] : JSON.parse(s.notes);
    } catch (e) { console.error("Parse error", e); }

    if (notesArray[noteIndex]) {
        notesArray[noteIndex].note = newText;
        notesArray[noteIndex].updatedAt = new Date().toISOString();
        await updateNotesInDb(s, notesArray);
    }
};

window.deleteNote = async function (leadId, noteIndex) {
    if (!confirm("Are you sure you want to delete this note?")) return;
    const s = submissionsData.find(x => String(x.id) === String(leadId));
    if (!s) return;

    let notesArray = [];
    try {
        notesArray = Array.isArray(s.notes) ? [...s.notes] : JSON.parse(s.notes);
    } catch (e) { console.error("Parse error", e); }

    notesArray.splice(noteIndex, 1);
    await updateNotesInDb(s, notesArray);
};

async function updateNotesInDb(lead, notesArray) {
    const originalNotes = lead.notes;
    const jsonNotes = JSON.stringify(notesArray);
    lead.notes = notesArray; // Keep as array in memory for consistency
    window.openNotesModal(lead.id); // visually update immediately

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lead.id, notes: jsonNotes })
        });
        if (!res.ok) throw new Error("Server rejected update");
        showToast('Sync Successful', 'Notes updated on server.', 'success');
    } catch (e) {
        console.error(e);
        lead.notes = originalNotes; // revert mapping
        showToast('Sync Error', "Failed to save changes to server.", 'danger');
        window.openNotesModal(lead.id);
    }
}

window.archiveLead = async function (id) {
    if (!confirm("Are you sure you want to delete this lead from the dashboard?\n\n(It will be removed from this view but remain archived in the database)")) return;
    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, leadStatus: 'Archived' })
        });
        if (!res.ok) throw new Error("Failed to archive lead");

        submissionsData = submissionsData.filter(s => String(s.id) !== String(id));
        renderFilteredLeads();
        calculateDashboardStats();
        showToast('Archived', 'Lead has been removed from active view.', 'info');
    } catch (e) {
        console.error("Archive Error", e);
        showToast('Error', "Could not update lead status. Please try again.", 'danger');
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

        const resActivity = await fetch('/api/solicitor?route=activity');
        if (resActivity.ok) activityData = JSON.parse(await resActivity.text());

    } catch (e) {
        console.error("Setup running locally:", e);
    } finally {
        syncThemeToggle();
        initFilters();
        calculateDashboardStats();
        switchView('dashboard');
        renderNotifications();
        initRealtimeSubscription();
    }
};

// ═══════════════════════════════════════
// SOLICITOR ACTIVITY — RENDERING
// ═══════════════════════════════════════

function updateActivityStats() {
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
    setEl('saAllocated', activityData.filter(a => a.status === 'Allocated').length);
    setEl('saSent', activityData.filter(a => a.status === 'Sent').length);
    setEl('saAccepted', activityData.filter(a => a.status === 'Accepted').length);
    setEl('saRejected', activityData.filter(a => a.status === 'Rejected').length);
}

window.renderFilteredActivity = function () {
    const statusFilter = document.getElementById('filterActivityStatus')?.value || 'All';
    const searchVal = (document.getElementById('searchActivity')?.value || '').toLowerCase();

    const filtered = activityData.filter(a => {
        let matchStatus = statusFilter === 'All' || a.status === statusFilter;
        let matchSearch = true;

        if (searchVal) {
            const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));
            const member = membersData.find(m => String(m.id) === String(a.solicitor_id));
            const leadName = (lead?.name || lead?.first_name || '').toLowerCase();
            const memberName = ((member?.first_name || '') + ' ' + (member?.last_name || '')).toLowerCase();
            matchSearch = leadName.includes(searchVal) || memberName.includes(searchVal);
        }

        return matchStatus && matchSearch;
    });

    renderActivityTable(filtered);
    updateActivityStats();
};

function renderActivityTable(data) {
    const tbody = document.querySelector('#activityTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--label-4); font-style:italic;">No solicitor activity records yet. Click "Allocate Lead" to get started.</td></tr>';
        return;
    }

    data.forEach((a, idx) => {
        const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));
        const member = membersData.find(m => String(m.id) === String(a.solicitor_id));
        const company = member ? companiesData.find(c => String(c.id) === String(member.company_id)) : null;

        const leadName = lead?.name || lead?.first_name || '---';
        const memberName = member ? ((member.first_name || '') + ' ' + (member.last_name || '')).trim() : '---';
        const companyName = company?.name || company?.company_name || '---';
        const statusLower = (a.status || 'allocated').toLowerCase();
        const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString() : '---';

        let actionsHtml = '';
        if (a.status === 'Allocated') {
            actionsHtml = `<button class="sa-send-btn" id="send-btn-${a.id}" onclick="window.sendLink('${a.id}')">
                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                Send Link
            </button>`;
        } else if (a.status === 'Accepted' || a.status === 'Rejected') {
            actionsHtml = `
                <div style="display:flex; gap:6px;">
                    <button class="act-btn view" style="padding: 6px 10px;" onclick="window.viewActivityDetail('${a.id}')" title="View Details">
                        <svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                        Details
                    </button>
                    ${a.status === 'Rejected' ? `
                        <button class="act-btn" style="background:var(--blue-light); color:var(--blue); border-color:var(--blue-ring); padding: 6px 10px;" onclick="window.openAllocateModal('${a.lead_id}')" title="Reallocate Lead">
                            <svg viewBox="0 0 24 24" style="width:12px; height:12px; margin-right:4px;"><path d="M17 16l4-4-4-4M3 12h18"/></svg>
                            Reallocate
                        </button>
                    ` : ''}
                </div>`;
        } else {
            actionsHtml = `<button class="act-btn view" style="padding: 6px 10px; opacity:0.6;" onclick="window.viewActivityDetail('${a.id}')" title="View Progress">
                    <svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                    Track
                </button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${leadName}</strong></td>
            <td>${memberName}</td>
            <td>${companyName}</td>
            <td><span class="sa-badge ${statusLower}">${a.status}</span></td>
            <td>${dateStr}</td>
            <td>${actionsHtml}</td>`;
        tbody.appendChild(tr);
    });
}

// ═══════════════════════════════════════
// SOLICITOR ACTIVITY — ALLOCATE MODAL
// ═══════════════════════════════════════

window.updateAllocMemberOptions = function(companyId) {
    const memberSelect = document.getElementById('allocMemberSelect');
    const memberGroup = document.getElementById('allocMemberGroup');
    if (!memberSelect || !memberGroup) return;

    if (!companyId) {
        memberGroup.style.display = 'none';
        return;
    }

    const members = membersData.filter(m => String(m.company_id) === String(companyId) && m.can_receive_emails !== false);
    
    if (members.length === 0) {
        memberSelect.innerHTML = '<option value="" disabled selected>No authorized members found for this firm</option>';
    } else {
        let options = '<option value="" disabled selected>Select an authorized person…</option>';
        members.forEach(m => {
            const mName = ((m.first_name || '') + ' ' + (m.last_name || '')).trim() || 'Unknown';
            options += `<option value="${m.id}">${mName}</option>`;
        });
        memberSelect.innerHTML = options;
    }
    memberGroup.style.display = 'block';
};

window.openAllocateModal = function (preSelectedLeadId = null) {
    const allocatedLeadIds = activityData
        .filter(a => a.status === 'Allocated' || a.status === 'Sent')
        .map(a => String(a.lead_id));

    const availableLeads = submissionsData.filter(s => {
        if (preSelectedLeadId) {
            return String(s.id) === String(preSelectedLeadId);
        }
        return !allocatedLeadIds.includes(String(s.id)) &&
               s.leadStatus !== 'Archived' &&
               s.leadStatus !== 'Agent Saved';
    });

    const modalTitle = preSelectedLeadId ? 'Reallocate Lead' : 'Allocate Lead to Solicitor';

    let leadOptions = `<option value="" disabled ${!preSelectedLeadId ? 'selected' : ''}>Select a lead…</option>`;
    availableLeads.forEach(s => {
        const n = s.name || s.first_name || 'Unknown';
        const isSelected = String(s.id) === String(preSelectedLeadId);
        leadOptions += `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${n} — ${s.phone || s.email || 'No contact'}</option>`;
    });

    let firmOptions = '<option value="" disabled selected>Select a firm…</option>';
    const activeCompanies = companiesData.filter(c => c.active !== false);
    activeCompanies.forEach(c => {
        const cName = c.name || c.company_name || 'Unnamed Firm';
        firmOptions += `<option value="${c.id}">${cName}</option>`;
    });

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header">
            <h2 style="font-size:20px; font-weight:800; letter-spacing:-0.5px;">${modalTitle}</h2>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <div class="form-grid">
            <div class="form-group full">
                <label>Select Lead</label>
                <select id="allocLeadSelect" class="modern-select">${leadOptions}</select>
            </div>
            <div class="form-group full">
                <label>Assign to Firm</label>
                <select id="allocCompanySelect" class="modern-select" onchange="window.updateAllocMemberOptions(this.value)">${firmOptions}</select>
            </div>
            <div class="form-group full" id="allocMemberGroup" style="display:none; transition: all 0.3s ease;">
                <label>Select Authorized Person</label>
                <select id="allocMemberSelect" class="modern-select"></select>
            </div>
        </div>
        <button class="btn-action" style="margin-top:24px; width:100%; justify-content:center; padding:12px;" onclick="window.submitAllocate()">${preSelectedLeadId ? 'Reallocate Lead' : 'Allocate Lead'}</button>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.submitAllocate = async function () {
    const leadId = document.getElementById('allocLeadSelect')?.value;
    const solId = document.getElementById('allocMemberSelect')?.value;

    if (!leadId || !solId) return showToast('Selection Required', 'Please select both a lead and a solicitor.', 'warning');

    try {
        // 1. Create activity record
        const res = await fetch('/api/solicitor?route=activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lead_id: leadId, solicitor_id: solId, status: 'Allocated' })
        });

        const saved = await res.json();
        if (!res.ok || saved.error) throw new Error(saved.error || 'Failed to allocate.');

        activityData.unshift(saved);

        // 2. Determine company ID to sync with Lead Management
        const member = membersData.find(m => String(m.id) === String(solId));
        const companyId = member ? member.company_id : null;

        // 3. Update main lead status and assignment in one go
        await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: leadId, 
                leadStatus: 'Allocated',
                assigned_company_id: companyId,
                assigned_solicitor_id: solId
            })
        });

        // 4. Update local memory for immediate UI refresh
        const lead = submissionsData.find(s => String(s.id) === String(leadId));
        if (lead) {
            lead.leadStatus = 'Allocated';
            lead.assigned_company_id = companyId;
            lead.assigned_solicitor_id = solId;
        }

        const mName = member ? ((member.first_name || '') + ' ' + (member.last_name || '')).trim() : 'Solicitor';
        const comp = member ? companiesData.find(c => String(c.id) === String(member.company_id)) : null;
        const compName = comp?.name || comp?.company_name || '';
        const displayTarget = compName ? `${compName} — ${mName}` : mName;

        showToast('Success', `Lead successfully allocated to ${displayTarget}.`, 'success');

        document.getElementById('modalOverlay').style.display = 'none';
        renderFilteredActivity();
        if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
        calculateDashboardStats();
        calculateDashboardStats();
    } catch (e) {
        console.error(e);
        showToast('Allocation Error', 'Network Error: ' + e.message, 'danger');
    }
};

// ═══════════════════════════════════════
// SOLICITOR ACTIVITY — SEND LINK
// ═══════════════════════════════════════

window.sendLink = async function (activityId) {
    const btn = document.getElementById('send-btn-' + activityId);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="font-size:10px;">Sending…</span>';
    }

    try {
        const res = await fetch('/api/solicitor?route=send-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_id: activityId })
        });

        const result = await res.json();
        if (!res.ok || result.error) throw new Error(result.error || 'Failed to send.');

        activityData.find(a => String(a.id) === String(activityId)).status = 'Sent';

        renderFilteredActivity();
        showToast('Link Sent', 'The lead link has been sent to the solicitor.', 'success');
        addNotification('Link sent successfully', 'blue');

    } catch (e) {
        console.error('Send Link Error:', e);
        showToast('Send Failed', e.message, 'danger');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg> Send Link';
        }
    }
};

window.viewRejectionReason = function (activityId) {
    const a = activityData.find(x => String(x.id) === String(activityId));
    if (!a) return;

    const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));
    const leadName = lead?.name || lead?.first_name || 'Unknown';

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header">
            <h2 style="font-size:18px; font-weight:700;">Rejection Reason</h2>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <div style="margin-bottom:16px;">
            <label style="font-size:11px; font-weight:700; color:#636366; text-transform:uppercase; letter-spacing:0.5px;">Lead</label>
            <div style="font-size:15px; font-weight:600; color:#1C1C1E; margin-top:4px;">${leadName}</div>
        </div>
        <div style="background:#FEF2F2; border:1px solid rgba(255,69,58,0.2); border-radius:12px; padding:16px;">
            <label style="font-size:11px; font-weight:700; color:#CC3328; text-transform:uppercase; letter-spacing:0.5px;">Reason for Rejection</label>
            <div style="font-size:14px; color:#1C1C1E; margin-top:8px; line-height:1.6; white-space:pre-wrap;">${a.rejection_reason || 'No reason provided.'}</div>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.viewActivityDetail = function (activityId) {
    const a = activityData.find(x => String(x.id) === String(activityId));
    if (!a) return;

    const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));
    const member = membersData.find(m => String(m.id) === String(a.solicitor_id));
    const company = member ? companiesData.find(c => String(c.id) === String(member.company_id)) : null;

    const leadName = lead?.name || lead?.first_name || '---';
    const memberName = member ? ((member.first_name || '') + ' ' + (member.last_name || '')).trim() : '---';
    const companyName = company?.name || company?.company_name || '---';
    
    // Professional date/time formatting
    const dtOptions = { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    
    const sentAt = a.sent_at ? new Date(a.sent_at).toLocaleString('en-GB', dtOptions) : 'Pending / Not Sent';
    const acceptedAt = a.accepted_at ? new Date(a.accepted_at).toLocaleString('en-GB', dtOptions) : (a.status === 'Accepted' ? 'Timestamp Unavailable' : 'Awaiting Solicitor Response');
    const rejectedAt = a.rejected_at ? new Date(a.rejected_at).toLocaleString('en-GB', dtOptions) : (a.status === 'Rejected' ? 'Timestamp Unavailable' : 'N/A');

    const isRejected = a.status === 'Rejected';
    const finalEventTitle = isRejected ? 'Solicitor Digital Rejection' : 'Solicitor Digital Acceptance';
    const finalEventTime = isRejected ? rejectedAt : acceptedAt;
    const finalEventColor = isRejected ? 'var(--red)' : (a.status === 'Accepted' ? 'var(--green)' : 'var(--surface-3)');

    document.getElementById('modalBox').innerHTML = `
        <div class="modal-header">
            <div>
                <div style="font-size:11px; font-weight:700; color:var(--blue); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Solicitor Compliance</div>
                <h2 style="font-size:20px; font-weight:800; letter-spacing:-0.5px;">Lead Activity Detail</h2>
            </div>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:20px; padding:8px 0;">
            <!-- Info Card -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; background:var(--surface-2); padding:20px; border-radius:16px; border:1px solid var(--border);">
                <div>
                    <label style="font-size:10px; font-weight:700; color:var(--label-4); text-transform:uppercase; letter-spacing:0.8px;">Client Profile</label>
                    <div style="font-size:15px; font-weight:700; color:var(--label-1); margin-top:4px;">${leadName}</div>
                </div>
                 <div>
                    <label style="font-size:10px; font-weight:700; color:var(--label-4); text-transform:uppercase; letter-spacing:0.8px;">Current Status</label>
                    <div style="margin-top:6px;"><span class="sa-badge ${a.status.toLowerCase()}">${a.status}</span></div>
                </div>
                <div style="grid-column: span 2; border-top:1px solid var(--border); margin-top:4px; padding-top:12px;"></div>
                <div>
                    <label style="font-size:10px; font-weight:700; color:var(--label-4); text-transform:uppercase; letter-spacing:0.8px;">Assigned Representative</label>
                    <div style="font-size:14px; font-weight:700; color:var(--label-1); margin-top:4px;">${memberName}</div>
                </div>
                <div>
                    <label style="font-size:10px; font-weight:700; color:var(--label-4); text-transform:uppercase; letter-spacing:0.8px;">Solicitor Firm</label>
                    <div style="font-size:14px; font-weight:700; color:var(--label-1); margin-top:4px;">${companyName}</div>
                </div>
                
                ${isRejected && a.rejection_reason ? `
                    <div style="grid-column: span 2; margin-top:12px; padding:16px; background:#FFF1F0; border:1px solid #FFA39E; border-radius:12px;">
                        <label style="font-size:10px; font-weight:700; color:#CF1322; text-transform:uppercase; letter-spacing:0.8px;">Reason for Rejection</label>
                        <div style="font-size:13px; color:#1C1C1E; margin-top:8px; line-height:1.6; white-space:pre-wrap;">${a.rejection_reason}</div>
                    </div>
                ` : ''}
            </div>

            <!-- Workflow Timeline -->
            <div style="padding:4px 8px;">
                <h3 style="font-size:14px; font-weight:800; color:var(--label-1); margin-bottom:20px; display:flex; align-items:center; gap:10px;">
                     <svg style="width:20px; height:20px; fill:var(--blue); opacity:0.8;" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                    Process Timeline
                </h3>
                
                <div style="display:flex; flex-direction:column; gap:0; border-left:2px dashed var(--border); margin-left:10px; padding-left:24px;">
                    <!-- Sent Event -->
                    <div style="position:relative; padding-bottom:32px;">
                        <div style="position:absolute; left:-31px; top:0; width:12px; height:12px; border-radius:50%; background:${a.sent_at ? 'var(--blue)' : 'var(--surface-3)'}; border:3px solid var(--surface-1); box-shadow:0 0 0 1px ${a.sent_at ? 'var(--blue)' : 'var(--border)'};"></div>
                        <div style="font-size:13px; font-weight:700; color:var(--label-1);">Lead Link Forwarded</div>
                        <div style="font-size:11px; font-weight:500; color:var(--label-3); margin-top:4px; display:flex; align-items:center; gap:5px;">
                            <svg style="width:12px; height:12px; fill:currentColor;" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            ${sentAt}
                        </div>
                    </div>
                    
                    <!-- Final Event (Accept/Reject) -->
                    <div style="position:relative;">
                        <div style="position:absolute; left:-31px; top:0; width:12px; height:12px; border-radius:50%; background:${finalEventColor}; border:3px solid var(--surface-1); box-shadow:0 0 0 1px ${finalEventColor !== 'var(--surface-3)' ? finalEventColor : 'var(--border)'};"></div>
                        <div style="font-size:13px; font-weight:700; color:var(--label-1);">${finalEventTitle}</div>
                        <div style="font-size:11px; font-weight:500; color:var(--label-3); margin-top:4px; display:flex; align-items:center; gap:5px;">
                            <svg style="width:12px; height:12px; fill:currentColor;" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                            ${finalEventTime}
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="btn-action" style="margin-top:12px; width:100%; justify-content:center; padding:14px; background:var(--surface-1); color:var(--label-1); border:1px solid var(--border-med); box-shadow:none; font-weight:700; letter-spacing:0.2px;" onclick="document.getElementById('modalOverlay').style.display='none'">Close Activity Review</button>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

// ═══════════════════════════════════════
// NOTIFICATION SYSTEM
// ═══════════════════════════════════════

function addNotification(message, color) {
    color = color || 'blue';
    notifications.unshift({ msg: message, color: color, time: new Date(), read: false });
    if (notifications.length > 50) notifications.pop();
    localStorage.setItem('hdr_notifications', JSON.stringify(notifications));
    renderNotifications();
}

function renderNotifications() {
    const list = document.getElementById('notifList');
    const countEl = document.getElementById('notifCount');
    if (!list || !countEl) return;

    if (notifications.length === 0) {
        list.innerHTML = '<div class="notif-empty">No new notifications</div>';
        countEl.classList.remove('visible');
        return;
    }

    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        countEl.textContent = unreadCount;
        countEl.classList.add('visible');
    } else {
        countEl.textContent = '0';
        countEl.classList.remove('visible');
    }

    list.innerHTML = notifications.map((n, idx) => {
        const timeStr = n.time ? new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="notif-item ${n.read ? '' : 'unread'}" onclick="markAsRead(${idx}, event)">
            <div class="notif-dot ${n.color}"></div>
            <div class="notif-text">
                <div class="notif-msg">${n.msg}</div>
                <div class="notif-time">${timeStr} ${n.read ? '' : '<span style="color:var(--blue); font-size:9px; margin-left:8px; font-weight:700;">● NEW</span>'}</div>
            </div>
        </div>`;
    }).join('');
}

window.markAsRead = function(index, e) {
    if (e) e.stopPropagation();
    if (notifications[index]) {
        notifications[index].read = true;
        localStorage.setItem('hdr_notifications', JSON.stringify(notifications));
        renderNotifications();
    }
};

window.markAllAsRead = function(e) {
    if (e) e.stopPropagation();
    notifications.forEach(n => n.read = true);
    localStorage.setItem('hdr_notifications', JSON.stringify(notifications));
    renderNotifications();
};

window.toggleNotifDropdown = function () {
    const dd = document.getElementById('notifDropdown');
    if (dd) dd.classList.toggle('open');
};

window.clearNotifications = function (e) {
    if (e) e.stopPropagation();
    notifications = [];
    localStorage.removeItem('hdr_notifications');
    renderNotifications();
};

// Close notification dropdown when clicking outside
document.addEventListener('click', function (e) {
    const bell = document.getElementById('notifBell');
    if (bell && !bell.contains(e.target)) {
        const dd = document.getElementById('notifDropdown');
        if (dd) dd.classList.remove('open');
    }
});

// ═══════════════════════════════════════
// REALTIME POLLING SUBSCRIPTION
// ═══════════════════════════════════════

function initRealtimeSubscription() {
    setInterval(async () => {
        try {
            const res = await fetch('/api/solicitor?route=activity');
            if (!res.ok) return;
            const freshData = await res.json();

            freshData.forEach(async (fresh) => {
                const existing = activityData.find(a => String(a.id) === String(fresh.id));
                if (existing) {
                    if (existing.status !== fresh.status) {
                        const lead = submissionsData.find(s => String(s.id) === String(fresh.lead_id));
                        const leadName = lead?.name || lead?.first_name || 'A lead';

                        // SYNC: Update the main lead status in Management to match Solicitor Activity status
                        if (lead) {
                            lead.leadStatus = fresh.status;
                            fetch('/api/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: lead.id, leadStatus: fresh.status })
                            }).catch(err => console.error("Sync failed", err));
                        }

                        if (fresh.status === 'Accepted') {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#228B35">accepted</strong>.`, 'green');
                            showToast('Lead Accepted', `${leadName} has been accepted by the solicitor.`, 'success');
                        } else if (fresh.status === 'Rejected') {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#CC3328">rejected</strong>.`, 'red');
                            showToast('Lead Rejected', `${leadName} was rejected by the solicitor.`, 'danger');
                        } else if (fresh.status === 'Sent') {
                            addNotification(`Link for <strong>${leadName}</strong> has been sent.`, 'blue');
                            showToast('Link Sent', `Lead details link sent for ${leadName}.`, 'info');
                        }

                        existing.status = fresh.status;
                        existing.rejection_reason = fresh.rejection_reason;

                        // Local UI refresh
                        if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
                        calculateDashboardStats();
                    }
                } else {
                    activityData.unshift(fresh);
                }
            });

            if (document.getElementById('activityView')?.classList.contains('active')) {
                renderFilteredActivity();
            }
        } catch (e) {
            // Silently fail — next poll will retry
        }
    }, 10000);
}

window.showToast = function(title, message, type = 'info') {
    let container = document.getElementById('app-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app-toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast-${type}`;
    
    const icons = {
        success: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
        info: '<svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>',
        warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        danger: '<svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>'
    };

    toast.innerHTML = `
        <div class="app-toast-icon">${icons[type] || icons.info}</div>
        <div class="app-toast-content">
            <div class="app-toast-title">${title}</div>
            <div class="app-toast-msg">${message}</div>
        </div>
        <button class="app-toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
};

// ═══════════════════════════════════════
// USER PROFILE & SESSION MANAGEMENT
// ═══════════════════════════════════════
async function initUser() {
    const sessionStr = localStorage.getItem('admin_session');
    if (!sessionStr) {
        // Redirection logic
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('signup.html')) {
             window.location.href = '/login.html';
        }
        return;
    }
    
    try {
        const session = JSON.parse(sessionStr);
        const user = session.user;
        
        // Get full name from metadata (stored as full_name during our new signup)
        let fullName = user.user_metadata?.full_name || user.user_metadata?.username || user.email.split('@')[0];
        
        // Update UI displays
        const nameEl = document.getElementById('usernameDisplay');
        const emailEl = document.getElementById('userEmailDisplay');
        const roleEl = document.getElementById('userRoleDisplay');
        const avatarEl = document.getElementById('userAvatar');
        const initialsEl = document.getElementById('userInitials');
        const imgEl = document.getElementById('userAvatarImg');
        
        if (nameEl) nameEl.innerText = fullName;
        if (emailEl) emailEl.innerText = user.email;
        
        // Avatar logic
        const avatarUrl = user.user_metadata?.avatar_url;
        if (avatarUrl && imgEl && initialsEl) {
            initialsEl.style.display = 'none';
            imgEl.src = avatarUrl;
            imgEl.style.display = 'block';
        } else if (avatarEl) {
            if (imgEl) imgEl.style.display = 'none';
            if (initialsEl) initialsEl.style.display = 'inline';
            
            let initials = 'AD'; 
            const parts = fullName.trim().split(/[\s_\.-]+/);
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (fullName.length >= 2) {
                initials = fullName.substring(0, 2).toUpperCase();
            } else {
                initials = fullName.substring(0, 1).toUpperCase();
            }
            if (initialsEl) initialsEl.innerText = initials;
        }

        syncThemeToggle();
    } catch (e) {
        console.error("Session init failed", e);
    }
}

window.toggleUserDropdown = function(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('active');
    
    // Close other notification dropdowns if open
    const notifDropdown = document.getElementById('notifDropdown');
    if (notifDropdown) notifDropdown.classList.remove('active');
    // Close table dropdowns
    document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('active'));
    
    if (!isOpen) dropdown.classList.add('active');
    else dropdown.classList.remove('active');
};

window.switchThemeFromDropdown = function() {
    const theme = localStorage.getItem('theme') || 'light';
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    }
    
    syncThemeToggle();
    calculateDashboardStats();
};

window.logout = function() {
    localStorage.removeItem('admin_session');
    document.body.classList.add('page-exit');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 400);
};

// ═══════════════════════════════════════
// SETTINGS ACTIONS
// ═══════════════════════════════════════

window.handleProfilePicUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });

        const base64Content = await base64Promise;
        const session = JSON.parse(localStorage.getItem('admin_session'));

        // Use the dedicated profile pic upload endpoint
        const res = await fetch('/api/profile?route=upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: session.user.id,
                name: file.name,
                type: file.type,
                content: base64Content
            })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Upload failed');

        const imgUrl = result.url;
        
        const previewImg = document.getElementById('settingsAvatarImg');
        const previewInitials = document.getElementById('settingsAvatarInitials');
        previewImg.src = imgUrl;
        previewImg.style.display = 'block';
        previewInitials.style.display = 'none';

        // Store temporary avatar URL to be saved with profile
        window._pendingAvatarUrl = imgUrl;
        showToast('Avatar Uploaded', 'Click "Save Changes" to apply.', 'success');

    } catch (e) {
        console.error(e);
        showToast('Upload Error', e.message, 'danger');
    }
};

window.removeProfilePic = function() {
    const previewImg = document.getElementById('settingsAvatarImg');
    const previewInitials = document.getElementById('settingsAvatarInitials');
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewInitials.style.display = 'flex';
    window._pendingAvatarUrl = null;
    window._profilePicRemoved = true;
};

window.saveProfileSettings = async function() {
    const fullName = document.getElementById('settingsFullName').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const session = JSON.parse(localStorage.getItem('admin_session'));
    const userId = session.user.id;

    const payload = {
        id: userId,
        username: fullName,
        email: email
    };

    if (window._pendingAvatarUrl) {
        payload.avatar_url = window._pendingAvatarUrl;
    } else if (window._profilePicRemoved) {
        payload.avatar_url = null;
    }

    try {
        const res = await fetch('/api/profile?route=update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update profile');

        // Update local session
        session.user = result.user;
        localStorage.setItem('admin_session', JSON.stringify(session));

        showToast('Profile Updated', 'Your settings have been saved.', 'success');
        initUser(); // Refresh top bar
    } catch (e) {
        console.error(e);
        showToast('Update Failed', e.message, 'danger');
    }
};

window.savePasswordSettings = async function() {
    const newPass = document.getElementById('settingsNewPassword').value;
    const confPass = document.getElementById('settingsConfirmPassword').value;

    if (!newPass) return showToast('Error', 'Please enter a new password.', 'warning');
    if (newPass !== confPass) return showToast('Mismatch', 'Passwords do not match.', 'danger');
    if (newPass.length < 6) return showToast('Weak Password', 'Password should be at least 6 characters.', 'warning');

    const session = JSON.parse(localStorage.getItem('admin_session'));
    const userId = session.user.id;

    try {
        const res = await fetch('/api/profile?route=update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, password: newPass })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to update password');

        showToast('Password Updated', 'Your password has been changed successfully.', 'success');
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
    } catch (e) {
        console.error(e);
        showToast('Update Error', e.message, 'danger');
    }
};

window.scrollIntoView = function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Update active state in settings nav
    document.querySelectorAll('.settings-nav-item').forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`'${id}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
};

// Initialize user on load
initUser();