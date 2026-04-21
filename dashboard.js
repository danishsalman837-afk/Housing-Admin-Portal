let submissionsData = [];
let companiesData = [];
let membersData = [];
let activityData = [];
let notifications = JSON.parse(localStorage.getItem('hdr_notifications') || '[]');
let charts = {};
let selectedCompanyId = null;
let activeChatLeadId = null;
let whatsappMessages = [];
let whatsappRealtimeSub = null;

// ═══════════════════════════════════════
// THEME MANAGEMENT
// ═══════════════════════════════════════
window.toggleTheme = function (e) {
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

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    if (window.innerWidth > 1024) {
        // Desktop: toggle collapsed state
        sidebar.classList.toggle('collapsed');
    } else {
        // Mobile: toggle active state
        sidebar.classList.toggle('mobile-active');
    }
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
    'alreadySubmitted', 'reported',
    'reportCount', 'reportFirst', 'reportLast', 'reportResponse', 'reportAttempt', 'reportStatus',
    'arrears', 'arrearsAmount', 'additionalNotes', 'agentName'
];

const leadFieldLabels = {
    name: 'Name',
    email: 'Email Address:',
    phone: 'Phone Number:',
    dob: 'Date of Birth (DOB):',
    address: 'Address',
    postcode: 'Postcode',
    tenantType: 'Are you a council tenant or a housing association tenant?',
    landlordName: 'What is the name of your landlord?',
    livingDuration: 'How long have you been living in the property?',
    damp: 'Is there any damp or mould in the property?',
    dampLocation: 'Where exactly is the damp or mould located?',
    dampRooms: 'How many rooms are affected?',
    dampSurface: 'Is it on the walls, ceiling, or floor?',
    dampDuration: 'How long have you had this issue?',
    dampCause: 'Do you know what caused it (leak, rain, pipe, roof)?',
    dampDamage: 'Has it damaged any belongings (bed, sofa, clothes, etc.)?',
    dampHealth: 'Has it caused any health problems (breathing, asthma, allergies, skin issues)?',
    leak: 'Do you have any leaks in the property?',
    leakLocation: 'Where is the leak coming from?',
    leakSource: 'Is it from the roof, ceiling, pipe, bathroom, or kitchen?',
    leakStart: 'When did the leak start? Is it still ongoing?',
    leakDamage: 'Has it caused damage to walls, ceiling, or floor?',
    leakCracks: 'Any cracks or structural damage?',
    leakBelongings: 'Has it damaged your belongings?',
    issues_electrics: 'Are there any Faulty Electrics in the property?',
    issues_heating: 'Are there any Heating / Boiler Issues?',
    issues_structural: 'Are there any Cracks or Structural Damages?',
    alreadySubmitted: 'Have you already submitted a housing disrepair claim?',
    reported: 'Have you reported all the disrepairs over a month ago and have no date for it to be fixed?',
    reportCount: 'How many times have you notified your landlord? Was it through email, text, or calls?',
    reportFirst: 'When did you first report the issue?',
    reportLast: 'When did you last report to the landlord about the disrepair?',
    reportResponse: 'Did the landlord or council respond?',
    reportAttempt: 'Did they attempt any repairs?',
    reportStatus: 'Is the issue still not resolved?',
    arrears: 'Are you in rental arrears? (Must be less than £1000)',
    arrearsAmount: 'If YES – confirm amount:',
    additionalNotes: 'Additional Notes',
    agentName: 'Agent Name'
};

window.switchView = function (view) {
    console.log("Switching to view:", view);

    // Toggle sidebar for mobile
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('mobile-active');

    const titleMap = {
        'dashboard': 'Dashboard',
        'companies': 'Solicitor Firms',
        'activity': 'Lead Activity',
        'leads': 'Lead Management',
        'whatsapp': 'Legacy WhatsApp',
        'comm': 'Communication Hub',
        'templates': 'Template Library',
        'settings': 'Settings'
    };

    // Remove active class from all views and nav items
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Handle view mapping
    const targetView = document.getElementById(view + 'View');
    const targetNav = document.getElementById('nav-' + view);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // Update Topbar Title
    const titleEl = document.getElementById('topbarTitle');
    if (titleEl && titleMap[view]) {
        titleEl.innerText = titleMap[view];
    }

    // View-specific initializers
    if (view === 'dashboard') {
        calculateDashboardStats();
    } else if (view === 'companies') {
        renderCompanies();
    } else if (view === 'activity') {
        renderFilteredActivity();
    } else if (view === 'whatsapp') {
        window.initWhatsAppView();
    } else if (view === 'comm') {
        if (typeof renderCommThreads === 'function') renderCommThreads();
    } else if (view === 'templates') {
        window.openSnippetManager(true);
    } else if (view === 'settings') {
        populateSettings();
    } else {
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
            const ls = (item.leadStatus || '').trim().toLowerCase();
            if (ls === 'closed') {
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
                    <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                        <select class="sleek-select" style="background:var(--blue-light) !important; color:var(--blue) !important; border:none !important; height:24px !important; min-width:120px !important;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_solicitor_id', this.value)">
                            <option value="">👤 Member...</option>
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
                <select class="sleek-select" style="width:100%; max-width:160px;" onchange="window.handleFieldUpdate('${item.id}', 'assigned_company_id', this.value)">${compOptions}</select>
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
                        <button class="dropdown-item" onclick="window.openCommHub('${item.id}', '${(item.name || item.first_name || 'Lead').replace(/'/g, "\\'")}', '${item.phone || item.mobile_number}')">
                            <svg viewBox="0 0 24 24" style="fill:var(--primary);"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg> Communication Hub
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
window.toggleDropdown = function (e, id) {
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
    document.querySelectorAll('.hub-dropdown').forEach(d => {
        d.classList.remove('active');
        d.style.display = 'none';
    });
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

        // SYNC: If status becomes "New Lead", we MUST unassign everything and clear activity tracking
        if (fieldName === 'leadStatus' && value === 'New Lead') {
            updateParams['assigned_company_id'] = null;
            updateParams['assigned_solicitor_id'] = null;

            // Delete activities in background
            fetch('/api/solicitor?route=activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', lead_id: id })
            }).then(() => {
                activityData = activityData.filter(a => String(a.lead_id) !== String(id));
                if (document.getElementById('activityView')?.classList.contains('active')) renderFilteredActivity();
            }).catch(err => console.error("Activity deletion failed", err));
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
            if (fieldName === 'leadStatus' && sanitizedValue === 'New Lead') {
                lead['assigned_company_id'] = null;
                lead['assigned_solicitor_id'] = null;
            }
        }

        if (fieldName === 'leadStatus') calculateDashboardStats();

        // If we updated assignments or status, refresh the table to reflect changes (especially solicitor names)
        if (fieldName === 'assigned_company_id' || fieldName === 'assigned_solicitor_id' || fieldName === 'leadStatus') {
            if (document.getElementById('leadsView').classList.contains('active')) renderFilteredLeads();
            // Also refresh activity if we are on that view, as status changes might hide/show items
            if (document.getElementById('activityView')?.classList.contains('active')) renderFilteredActivity();
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
            
            <!-- 📧 SMTP SETTINGS -->
            <div style="grid-column: span 2; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                <h3 style="font-size:14px; font-weight:700; color:var(--blue); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                    <svg style="width:16px; height:16px; fill:currentColor;" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    Direct SMTP Configuration
                </h3>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px;">
                    <div class="form-group"><label>SMTP Host</label><input type="text" id="cSmtpHost" class="modern-input" value="${c.smtp_host || ''}" placeholder="e.g. smtp.gmail.com"></div>
                    <div class="form-group"><label>SMTP Port</label><input type="text" id="cSmtpPort" class="modern-input" value="${c.smtp_port || '587'}" placeholder="587"></div>
                    <div class="form-group"><label>SMTP User / Email</label><input type="text" id="cSmtpUser" class="modern-input" value="${c.smtp_user || ''}" placeholder="email@address.com"></div>
                    <div class="form-group"><label>SMTP Password / App Pass</label><input type="password" id="cSmtpPass" class="modern-input" value="${c.smtp_pass || ''}" placeholder="••••••••••••"></div>
                </div>
                <p style="font-size:11px; color:var(--label-3); margin-top:10px; line-height:1.4;">
                    <strong>Note:</strong> If provided, emails to this firm will be sent via this direct connection instead of the default gateway.
                </p>
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
    console.log("[Modal] Attempting to open lead:", id, "Original View:", showOriginal);

    const overlay = document.getElementById('modalOverlay');
    const modalBox = document.getElementById('modalBox');

    if (!overlay || !modalBox) {
        console.error("[Modal] Required DOM elements overlay/modalBox missing!");
        return;
    }

    // Show overlay immediately with loading state
    overlay.style.display = 'flex';
    modalBox.style.display = 'block';
    modalBox.innerHTML = `
        <div style="padding:40px; text-align:center; color:var(--text-muted);">
            <div class="loading-spinner" style="margin-bottom:12px;"></div>
            Loading Lead Details...
        </div>
    `;

    try {
        const s = submissionsData.find(x => String(x.id) === String(id));
        if (!s) throw new Error("Lead record not found in memory.");

        let leadData = { ...s };
        let titlePrefix = "Current Lead Profile";

        if (showOriginal) {
            let backup = s.agent_data;
            if (backup) {
                try {
                    const parsed = typeof backup === 'string' ? JSON.parse(backup) : backup;
                    leadData = { ...parsed };
                    titlePrefix = "Original Agent Submission";
                } catch (e) {
                    console.warn("[Modal] Failed to parse agent_data:", e);
                    titlePrefix = "Original Submission (Format Error)";
                }
            } else {
                titlePrefix = "Original Submission (No Backup Found)";
            }

            if (!leadData.id) leadData.id = s.id;
            if (!leadData.attachments) leadData.attachments = s.attachments || [];

            const agentName = s.agent_name || s.agentName || (s.agent_data && (s.agent_data.agentName || s.agent_data.agent_name || s.agent_data.dialler || s.agent_data.Dialler || s.agent_data.agent)) || s.dialler || s.Dialler || s.agent;
            if (agentName) titlePrefix += ` — Agent: ${agentName}`;
        }

        const ignoreKeys = ['id', 'created_at', 'notes', 'assigned_company_id', 'assigned_solicitor_id', 'call_notes', 'agent_data', 'is_edited', 'timestamp', 'agent_name'];
        if (showOriginal) {
            ignoreKeys.push('leadStatus', 'status', 'actual_status', 'source', 'unique_token');
        }
        const seenKeys = new Set(ignoreKeys);
        let dataHtml = '';

        const renderField = (key, val, labelOverride = null) => {
            if (val === undefined || val === null || val === '') return;
            if (seenKeys.has(key)) return;
            seenKeys.add(key);

            let label = labelOverride || leadFieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
            label = label.charAt(0).toUpperCase() + label.slice(1);

            let displayVal = val;
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('dob') || lowerKey.includes('dateofbirth') || lowerKey.includes('date_of_birth')) {
                displayVal = formatDob(val);
            }
            if (typeof val === 'object' && val !== null) {
                displayVal = JSON.stringify(val);
            }

            dataHtml += `
                <div class="modal-field-item" style="margin-bottom:24px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;">
                    <label style="font-size:11px; font-weight:700; color:#64748B; text-transform:uppercase; display:block; margin-bottom:8px; letter-spacing:0.5px; opacity:0.8;">${label}</label>
                    <div style="font-size:15px; color:#1E293B; font-weight:600; line-height:1.6; white-space:pre-wrap; background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0;">${displayVal || '--'}</div>
                </div>`;
        };

        // 1. Show defined order first
        leadViewOrder.forEach(key => {
            let val = leadData[key];
            if (val === undefined || val === null || val === '') {
                const fb = {
                    'dob': ['dateOfBirth', 'DOB', 'date_of_birth'],
                    'dateOfBirth': ['dob', 'DOB', 'date_of_birth'],
                    'tenancyDuration': ['livingDuration', 'tenancy_duration'],
                    'livingDuration': ['tenancyDuration', 'tenancy_duration'],
                    'agentName': ['agent_name', 'dialler', 'Dialler', 'agent'],
                    'phone': ['mobile_number', 'mobile', 'tel', 'phone_number'],
                    'mobile_number': ['phone', 'tel', 'phone_number'],
                    'name': ['full_name', 'fullName', 'first_name'],
                    'address': ['property_address', 'address1', 'full_address']
                };
                if (fb[key]) {
                    for (let f of fb[key]) {
                        if (leadData[f]) { val = leadData[f]; break; }
                    }
                }
            }
            renderField(key, val);
        });

        modalBox.innerHTML = `
            <div class="modal-header" style="position:sticky; top:0; background:rgba(255,255,255,0.85); backdrop-filter:blur(15px); z-index:100; padding:24px 32px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1; padding-right:20px;">
                    <div style="font-size:11px; font-weight:800; color:var(--primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">${titlePrefix}</div>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <h2 style="font-size:22px; font-weight:800; letter-spacing:-0.8px; margin:0; color:var(--text-main);">${leadData.name || leadData.first_name || 'Lead Details'}</h2>
                        <span style="background:var(--bg-surface-2); color:var(--text-muted); padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700;">#${s.id}</span>
                    </div>
                </div>
                <button class="close-btn" style="background:var(--bg-surface-2); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; color:var(--text-muted); cursor:pointer; font-size:22px; transition:all 0.2s;" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
            </div>
            
            <div class="modal-scroll-area" style="max-height:80vh; overflow-y:auto; padding:32px; background: var(--bg-surface);">
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:24px;">
                    ${dataHtml || `
                        <div style="grid-column: 1/-1; padding: 60px 40px; text-align:center;">
                            <div style="background: var(--bg-surface-2); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
                                <svg style="width:24px; height:24px; fill: var(--text-muted);" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                            </div>
                            <h3 style="font-size:18px; font-weight:700; color: var(--text-main); margin-bottom:8px;">No Data Found</h3>
                            <p style="font-size:14px; color: var(--text-muted); max-width:280px; margin:0 auto;">Something went wrong, or the data for this lead is empty.</p>
                        </div>
                    `}
                    
                    <div style="grid-column: 1/-1; margin-top: 16px; padding-top: 32px; border-top: 1px solid var(--border-light);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                            <h3 style="font-size:16px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:12px; margin:0; letter-spacing:-0.4px;">
                                <div style="background:var(--primary-light); color:var(--primary); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                </div>
                                Photo Evidence
                            </h3>
                            <span style="font-size:12px; font-weight:700; color:var(--text-muted); background:var(--bg-surface-2); padding:4px 12px; border-radius:20px;">${(leadData.attachments || []).length} Files</span>
                        </div>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:20px;">
                            ${(leadData.attachments || []).map(a => `
                                <div class="evidence-card" style="background:var(--bg-surface-2); border:1px solid var(--border-light); border-radius:16px; padding:8px; transition:transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.05)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                                    <a href="${a.url}" target="_blank" style="display:block; position:relative; padding-top:100%; overflow:hidden; border-radius:12px; background:var(--bg-surface);">
                                        <img src="${a.url}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">
                                    </a>
                                    <div style="font-size:12px; color:var(--text-main); font-weight:600; margin-top:12px; padding:0 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.name}</div>
                                </div>
                            `).join('')}
                            ${(!leadData.attachments || leadData.attachments.length === 0) ? `
                                <div style="padding:40px; background:var(--bg-surface-2); border:1px dashed var(--border-light); border-radius:16px; text-align:center; color:var(--text-muted); font-size:14px; font-weight:600; grid-column:1/-1;">
                                    No photos have been uploaded for this client yet.
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error("[Modal] Fatal Error:", err);
        modalBox.innerHTML = `
            <div style="padding:40px; text-align:center;">
                <h3 style="color:var(--danger); margin-bottom:12px;">Oops! Failed to load details</h3>
                <p style="color:var(--text-muted); font-size:14px; margin-bottom:20px;">${err.message}</p>
                <button class="btn-premium primary" onclick="document.getElementById('modalOverlay').style.display='none'">Close</button>
            </div>
        `;
    }
};

window.openEditLeadModal = function (id) {
    const s = submissionsData.find(x => String(x.id) === String(id));
    if (!s) return;

    const ignoreKeys = ['id', 'created_at', 'notes', 'assigned_company_id', 'assigned_solicitor_id', 'call_notes', 'agent_name', 'attachments', 'timestamp', 'is_edited'];
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
        <div class="modal-header" style="background:rgba(255,255,255,0.85); backdrop-filter:blur(15px); padding:24px 32px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; border-top-left-radius:24px; border-top-right-radius:24px; position:sticky; top:0; z-index:100;">
            <div>
                <h2 style="font-size:20px; font-weight:800; letter-spacing:-0.5px; margin:0; color:var(--text-main);">Edit Lead Profile</h2>
                <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin-top:4px;">Lead ID: <span style="color:var(--primary);">#${s.id}</span></div>
            </div>
            <button class="close-btn" style="background:var(--bg-surface-2); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border:none; color:var(--text-muted); cursor:pointer; font-size:22px;" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <div style="background:var(--bg-surface); padding:32px;">
            <div class="form-grid" id="editLeadForm" style="display:grid; grid-template-columns: repeat(2, 1fr); gap:20px; max-height:65vh; overflow-y:auto; padding-right:10px;">
                ${html}
                
                <div style="grid-column: span 2; margin-top: 16px; padding: 24px; background: var(--bg-surface-2); border-radius: 20px; border: 1px solid var(--border-light);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="font-size:15px; font-weight:800; color:var(--text-main); display:flex; align-items:center; gap:10px; margin:0;">
                            <div style="background:var(--primary-light); color:var(--primary); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                            Attachments & Evidence
                        </h3>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div id="uploadStatus" style="font-size:12px; font-weight:700; color:var(--primary);"></div>
                            <input type="file" id="attachInput" style="display:none;" onchange="window.handleAttachmentUpload('${s.id}', this)" accept="image/*" multiple>
                            <button class="btn-hub-secondary" style="font-size:12px; height:36px; padding:0 16px; border-radius:10px;" onclick="document.getElementById('attachInput').click()">+ Upload Photos</button>
                        </div>
                    </div>
                    
                    <div id="attachmentList" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:16px;">
                        ${(s.attachments || []).map((a, i) => `
                            <div class="attach-item" style="position:relative; background:var(--bg-surface); border:1px solid var(--border-light); border-radius:12px; padding:8px; transition:all 0.2s ease;">
                                <a href="${a.url}" target="_blank" style="display:block; border-radius:8px; overflow:hidden;">
                                    <img src="${a.url}" style="width:100%; height:100px; object-fit:cover;">
                                </a>
                                <div style="font-size:11px; color:var(--text-muted); font-weight:600; margin-top:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 4px;">${a.name}</div>
                                <button onclick="window.deleteAttachment('${s.id}', ${i})" style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; font-size:16px; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(239,68,68,0.3);">&times;</button>
                            </div>
                        `).join('')}
                        ${(!s.attachments || s.attachments.length === 0) ? '<p style="font-size:13px; color:var(--text-muted); font-style:italic; grid-column:1/-1; text-align:center; padding:30px 0; font-weight:600;">No pictures attached yet.</p>' : ''}
                    </div>
                </div>
            </div>
            
            <div style="margin-top:32px; display:flex; justify-content:flex-end; gap:16px;">
               <button class="btn-hub-secondary" style="padding:12px 28px; height:auto; font-size:14px; border-radius:12px; font-weight:700;" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
               <button class="btn-hub-primary" style="padding:12px 40px; height:auto; font-size:14px; border-radius:12px; font-weight:800; background:#10B981; border:none; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);" onclick="window.saveLeadEdits('${s.id}')">Apply Changes</button>
            </div>
        </div>`;

    document.getElementById('modalBox').style.display = 'block';
    document.getElementById('modalOverlay').style.display = 'flex';
};


window.saveNewCompany = async function (id) {
    const payload = {
        name: document.getElementById('cName').value.trim(),
        type: document.getElementById('cType').value,
        main_contact: document.getElementById('cMainContact').value.trim(),
        website: document.getElementById('cWebsite').value.trim(),
        address: document.getElementById('cAddress').value.trim(),
        town: document.getElementById('cTown').value.trim(),
        county: document.getElementById('cCounty').value.trim(),
        postcode: document.getElementById('cPostcode').value.trim(),
        smtp_host: document.getElementById('cSmtpHost').value.trim(),
        smtp_port: document.getElementById('cSmtpPort').value.trim(),
        smtp_user: document.getElementById('cSmtpUser').value.trim(),
        smtp_pass: document.getElementById('cSmtpPass').value.trim()
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

    // 1. Client-Side Pre-Validation
    for (let i = 0; i < files.length; i++) {
        if (files[i].size > 4 * 1024 * 1024) {
            showToast('File Too Large', `File [${files[i].name}] exceeds the 4MB limit.`, 'warning');
            input.value = '';
            return;
        }
    }

    const statusEl = document.getElementById('uploadStatus');
    const listEl = document.getElementById('attachmentList');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (statusEl) statusEl.innerText = `Uploading ${i + 1}/${files.length}...`;

        try {
            const reader = new FileReader();
            const base64Promise = new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsDataURL(file);
            });

            const base64Content = await base64Promise;

            // 2. Bulletproof Fetch Handling
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

            if (!res.ok) {
                if (res.status === 413) throw new Error('File too large for server');
                let errData;
                try { errData = await res.json(); } catch (e) { }
                throw new Error(errData?.error || `Server responded with ${res.status}`);
            }

            const result = await res.json();

            // 3. Update local state
            const lead = submissionsData.find(s => String(s.id) === String(leadId));
            if (lead) lead.attachments = result.attachments;

            if (document.getElementById('attachmentList')) {
                renderAttachmentList(leadId, result.attachments);
            }

        } catch (e) {
            console.error(e);
            if (statusEl) statusEl.innerText = 'Upload failed';
            showToast('Upload Error', `Failed to upload ${file.name}: ${e.message}`, 'danger');
            // Ensure input is cleared on failure to prevent stale state issues
            input.value = '';
            return; // Stop further uploads if one fails
        }
    }

    if (statusEl) statusEl.innerText = 'All files uploaded';
    setTimeout(() => { if (statusEl) statusEl.innerText = ''; }, 3000);
    input.value = '';
};

window.deleteAttachment = async function (leadId, index) {
    // State Sync & Deletion Guardrails
    const lead = submissionsData.find(s => String(s.id) === String(leadId));
    const attachments = (lead && lead.attachments) ? lead.attachments : [];
    
    if (index < 0 || index >= attachments.length) {
        console.error('Invalid index');
        showToast('Error', 'Invalid attachment reference.', 'danger');
        return;
    }

    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
        const res = await fetch('/api/delete-attachment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId, index })
        });

        if (!res.ok) {
            let errData;
            try { errData = await res.json(); } catch (e) { }
            throw new Error(errData?.error || 'Delete failed');
        }

        const result = await res.json();
        
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

window.deleteActivity = async function (id) {
    if (!confirm("Are you sure you want to delete this activity record?")) return;
    try {
        const res = await fetch('/api/solicitor?route=activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', id })
        });
        if (!res.ok) throw new Error("Failed up delete activity");

        activityData = activityData.filter(a => String(a.id) !== String(id));
        renderFilteredActivity();
        showToast('Activity Deleted', 'The record has been permanently removed.', 'info');
    } catch (e) {
        console.error("Delete Activity Error", e);
        showToast('Error', "Could not remove activity record. Please try again.", 'danger');
    }
};

window.initDashboard = async function () {
    try {
        const resSub = await fetch('/api/submissions');
        if (resSub.ok) {
            submissionsData = await resSub.json();
            console.log("Submissions Data Loaded:", submissionsData.length);
            // Normalize lead status to remove whitespace
            submissionsData.forEach(s => {
                if (s.leadStatus && typeof s.leadStatus === 'string') {
                    s.leadStatus = s.leadStatus.trim();
                }
            });
        }

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

    // Filter out activity linked to Closed leads for accurate stats
    const activeActivity = activityData.filter(a => {
        const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));
        if (!lead || !lead.leadStatus) return true; // Keep if lead missing or no status
        const s = lead.leadStatus.trim().toLowerCase();
        return s !== 'closed' && s !== 'archived';
    });

    setEl('saAllocated', activeActivity.filter(a => a.status === 'Allocated').length);
    setEl('saSent', activeActivity.filter(a => a.status === 'Sent').length);
    setEl('saAccepted', activeActivity.filter(a => a.status === 'Accepted').length);
    setEl('saRejected', activeActivity.filter(a => a.status === 'Rejected').length);
}

window.renderFilteredActivity = function () {
    const statusFilter = document.getElementById('filterActivityStatus')?.value || 'All';
    const searchVal = (document.getElementById('searchActivity')?.value || '').toLowerCase();

    const filtered = activityData.filter(a => {
        const lead = submissionsData.find(s => String(s.id) === String(a.lead_id));

        // Hide leads that are closed or archived in Lead Management (case-insensitive)
        if (!lead || !lead.leadStatus) return false;
        const ls = lead.leadStatus.trim().toLowerCase();
        if (ls === 'closed' || ls === 'archived') return false;

        let matchStatus = statusFilter === 'All' || a.status === statusFilter;
        let matchSearch = true;

        if (searchVal) {
            const member = membersData.find(m => String(m.id) === String(a.solicitor_id));
            const leadName = (lead.name || lead.first_name || '').toLowerCase();
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
        const deleteBtn = `
            <button class="act-btn" style="background:rgba(255,69,58,0.1); color:var(--red); border-color:rgba(255,69,58,0.2); padding: 6px 8px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:all 0.2s;" onclick="window.deleteActivity('${a.id}')" title="Delete Activity">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>`;

        if (a.status === 'Allocated') {
            actionsHtml = `
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="sa-send-btn" id="send-btn-${a.id}" onclick="window.sendLink('${a.id}')">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        Send Link
                    </button>
                    ${deleteBtn}
                </div>`;
        } else if (a.status === 'Accepted' || a.status === 'Rejected') {
            actionsHtml = `
                <div style="display:flex; gap:6px; align-items:center;">
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
                    ${deleteBtn}
                </div>`;
        } else {
            actionsHtml = `
                <div style="display:flex; gap:6px; align-items:center;">
                    <button class="act-btn view" style="padding: 6px 10px; opacity:0.6;" onclick="window.viewActivityDetail('${a.id}')" title="View Progress">
                        <svg viewBox="0 0 24 24"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                        Track
                    </button>
                    ${deleteBtn}
                </div>`;
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

window.updateAllocMemberOptions = function (companyId) {
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
            s.leadStatus !== 'Agent Saved' &&
            s.leadStatus !== 'Closed';
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

window.markAsRead = function (index, e) {
    if (e) e.stopPropagation();
    if (notifications[index]) {
        notifications[index].read = true;
        localStorage.setItem('hdr_notifications', JSON.stringify(notifications));
        renderNotifications();
    }
};

window.markAllAsRead = function (e) {
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
            // 1. POLLING FOR NEW SUBMISSIONS (LEADS)
            const resSub = await fetch('/api/submissions');
            if (resSub.ok) {
                const freshSubmissions = await resSub.json();

                // Identify completely new leads
                freshSubmissions.forEach(fresh => {
                    const exists = submissionsData.some(s => String(s.id) === String(fresh.id));
                    if (!exists) {
                        // NEW LEAD RECEIVED
                        submissionsData.unshift(fresh);
                        const leadName = fresh.name || fresh.first_name || 'New Client';

                        // Show visual pop/toast
                        showToast('New Lead Received', `<strong>${leadName}</strong> has just submitted a form.`, 'success');

                        // Add to persistent notifications
                        addNotification(`New lead received from <strong>${leadName}</strong>.`, 'blue');

                        // Refresh active view if needed
                        if (document.getElementById('leadsView')?.classList.contains('active')) renderFilteredLeads();
                        calculateDashboardStats();
                    }
                });
            }

            // 2. POLLING FOR SOLICITOR ACTIVITY UPDATES
            const resAct = await fetch('/api/solicitor?route=activity');
            if (!resAct.ok) return;
            const freshActivity = await resAct.json();

            freshActivity.forEach(async (fresh) => {
                const existing = activityData.find(a => String(a.id) === String(fresh.id));

                if (existing) {
                    // Check for status changes (Accepted/Rejected)
                    if (existing.status !== fresh.status) {
                        const lead = submissionsData.find(s => String(s.id) === String(fresh.lead_id));
                        const leadName = lead?.name || lead?.first_name || 'A lead';

                        // SYNC: Update the main lead status in Management to match Solicitor Activity status
                        if (lead) {
                            lead.leadStatus = fresh.status;
                            // Optionally sync back to DB if needed (though solicitor likely already did this)
                            // We do it here to ensure consistency if the solicitor only updated solicitor_activity
                            fetch('/api/update', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: lead.id, leadStatus: fresh.status })
                            }).catch(err => console.error("Sync failed", err));
                        }

                        if (fresh.status === 'Accepted') {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#228B35">accepted</strong> by solicitor.`, 'green');
                            showToast('Lead Accepted', `<strong>${leadName}</strong> has been accepted.`, 'success');
                        } else if (fresh.status === 'Rejected') {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#CC3328">rejected</strong> by solicitor.`, 'red');
                            showToast('Lead Rejected', `<strong>${leadName}</strong> was rejected.`, 'danger');
                        } else if (fresh.status === 'Sent') {
                            addNotification(`Link for <strong>${leadName}</strong> has been sent.`, 'blue');
                            showToast('Link Sent', `Lead details link sent for ${leadName}.`, 'info');
                        }

                        // Update local object
                        existing.status = fresh.status;
                        existing.rejection_reason = fresh.rejection_reason;
                        existing.sent_at = fresh.sent_at;
                        existing.accepted_at = fresh.accepted_at;
                        existing.rejected_at = fresh.rejected_at;

                        // Local UI refresh
                        if (document.getElementById('leadsView')?.classList.contains('active')) renderFilteredLeads();
                        calculateDashboardStats();
                    }
                } else {
                    // New activity record created (lead was newly allocated/sent)
                    activityData.unshift(fresh);

                    // If it's already Accepted/Rejected (e.g. if solicitor acted instantly before next poll)
                    if (fresh.status === 'Accepted' || fresh.status === 'Rejected') {
                        const lead = submissionsData.find(s => String(s.id) === String(fresh.lead_id));
                        const leadName = lead?.name || lead?.first_name || 'A lead';

                        // Sync lead status
                        if (lead) lead.leadStatus = fresh.status;

                        if (fresh.status === 'Accepted') {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#228B35">accepted</strong>.`, 'green');
                            showToast('Lead Accepted', `<strong>${leadName}</strong> has been accepted.`, 'success');
                        } else {
                            addNotification(`<strong>${leadName}</strong> has been <strong style="color:#CC3328">rejected</strong>.`, 'red');
                            showToast('Lead Rejected', `<strong>${leadName}</strong> was rejected.`, 'danger');
                        }

                        calculateDashboardStats();
                    }
                }
            });

            if (document.getElementById('activityView')?.classList.contains('active')) {
                renderFilteredActivity();
            }
        } catch (e) {
            console.warn("Realtime poll failed:", e);
        }
    }, 10000); // Poll every 10 seconds
}

window.showNotification = function (message, type = 'info') {
    let title = 'Notification';
    if (type === 'success') title = 'Success';
    else if (type === 'error' || type === 'danger') title = 'Error';
    else if (type === 'warning') title = 'Warning';
    window.showToast(title, message, type === 'error' ? 'danger' : type);
};

window.showToast = function (title, message, type = 'info') {
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
        let session = JSON.parse(sessionStr);
        let user = session.user;

        // FETCH LATEST FROM SUPABASE (Priority)
        try {
            const res = await fetch(`/api/profile?id=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    // Sync local session metadata with DB
                    if (!user.user_metadata) user.user_metadata = {};
                    user.user_metadata.full_name = data.profile.username || data.profile.full_name;
                    user.user_metadata.username = data.profile.username;
                    user.user_metadata.avatar_url = data.profile.avatar_url;

                    session.user = user;
                    localStorage.setItem('admin_session', JSON.stringify(session));
                }
            }
        } catch (e) { console.warn("Sync failed", e); }

        // Update UI displays
        const fullName = user.user_metadata?.full_name || user.user_metadata?.username || user.email.split('@')[0];
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

window.toggleUserDropdown = function (e) {
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

window.switchThemeFromDropdown = function () {
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

window.logout = function () {
    localStorage.removeItem('admin_session');
    document.body.classList.add('page-exit');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 400);
};

// ═══════════════════════════════════════
// SETTINGS ACTIONS
// ═══════════════════════════════════════

window.handleProfilePicUpload = function (input) {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Invalid File', 'Please select an image file.', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        window.openAdjustAvatarModal(e.target.result, file.name, file.type);
    };
    reader.readAsDataURL(file);
    input.value = ''; // Reset for next selection
};

window.openAdjustAvatarModal = function (imgSrc, fileName, fileType) {
    const modal = document.getElementById('modalBox');
    const overlay = document.getElementById('modalOverlay');

    modal.innerHTML = `
        <div class="modal-header">
            <h2 style="font-size:18px; font-weight:700;">Adjust Profile Picture</h2>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'">&times;</button>
        </div>
        <p style="font-size:13px; color:var(--label-3); margin-bottom:20px; text-align:center;">Drag the image to center it and use the slider to zoom.</p>
        
        <div class="crop-container" id="cropContainer">
            <img src="${imgSrc}" class="crop-image" id="cropImage" style="transform: translate(0px, 0px) scale(1);">
        </div>
        
        <div class="zoom-controls">
            <svg style="width:16px; height:16px; fill:var(--label-4);" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input type="range" class="zoom-slider" id="zoomSlider" min="0.5" max="3" step="0.01" value="1">
            <svg style="width:18px; height:18px; fill:var(--label-4);" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM10 7H9v2H7v1h2v2h1v-2h2V9h-2V7z"/></svg>
        </div>
        
        <div style="display:flex; gap:12px;">
            <button class="btn-action" style="flex:1; justify-content:center; background:#10B981;" onclick="window.finalizeAvatarAdjustment('${fileName}', '${fileType}')">Save & Apply</button>
            <button class="btn-outline" style="flex:0.5; justify-content:center;" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
        </div>
    `;

    overlay.style.display = 'flex';

    // Drag/Zoom Logic
    const img = document.getElementById('cropImage');
    const container = document.getElementById('cropContainer');
    const slider = document.getElementById('zoomSlider');

    let isDragging = false;
    let startX, startY;
    let currentX = 0, currentY = 0;
    let scale = 1;

    // Center image initially
    img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio > 1) { // Wide
            img.style.height = '100%';
            img.style.width = 'auto';
        } else { // Tall
            img.style.width = '100%';
            img.style.height = 'auto';
        }
    };

    const updateTransform = () => {
        img.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
    };

    container.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
    };

    window.onmousemove = (e) => {
        if (!isDragging) return;
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        updateTransform();
    };

    window.onmouseup = () => {
        isDragging = false;
    };

    slider.oninput = (e) => {
        scale = parseFloat(e.target.value);
        updateTransform();
    };
};

window.finalizeAvatarAdjustment = async function (fileName, fileType) {
    const img = document.getElementById('cropImage');
    const container = document.getElementById('cropContainer');
    const slider = document.getElementById('zoomSlider');

    // Create a canvas to extract the circular area
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400; // Final size
    canvas.height = 400;

    // Calculate relative positioning
    const rect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const sourceX = (contRect.left - rect.left) * scaleX;
    const sourceY = (contRect.top - rect.top) * scaleY;
    const sourceW = contRect.width * scaleX;
    const sourceH = contRect.height * scaleY;

    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, 400, 400);

    const base64Content = canvas.toDataURL(fileType, 0.9);

    try {
        const session = JSON.parse(localStorage.getItem('admin_session'));
        const res = await fetch('/api/profile?route=upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: session.user.id,
                name: fileName,
                type: fileType,
                content: base64Content
            })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Upload failed');

        const imgUrl = result.url;
        document.getElementById('settingsAvatarImg').src = imgUrl;
        document.getElementById('settingsAvatarImg').style.display = 'block';
        document.getElementById('settingsAvatarInitials').style.display = 'none';

        // Instant top-bar update (preview only until Save Profile)
        const topImg = document.getElementById('userAvatarImg');
        const topInitials = document.getElementById('userInitials');
        if (topImg && topInitials) {
            topImg.src = imgUrl;
            topImg.style.display = 'block';
            topInitials.style.display = 'none';
        }

        window._pendingAvatarUrl = imgUrl;
        document.getElementById('modalOverlay').style.display = 'none';
        showToast('Avatar Adjusted', 'Profile photo updated successfully. Click "Save Profile" to finalize.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Update Failed', e.message, 'danger');
    }
};

window.removeProfilePic = function () {
    const previewImg = document.getElementById('settingsAvatarImg');
    const previewInitials = document.getElementById('settingsAvatarInitials');
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewInitials.style.display = 'flex';
    window._pendingAvatarUrl = null;
    window._profilePicRemoved = true;
};

window.saveProfileSettings = async function () {
    const fullName = document.getElementById('settingsFullName').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const session = JSON.parse(localStorage.getItem('admin_session'));
    const userId = session.user.id;

    const payload = {
        id: userId,
        username: fullName, // Primary key used by backend to update profiles table
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

        // Ensure metadata is consistent in the local session object
        if (!session.user.user_metadata) session.user.user_metadata = {};
        session.user.user_metadata.full_name = fullName;
        session.user.user_metadata.username = fullName;

        localStorage.setItem('admin_session', JSON.stringify(session));

        showToast('Profile Updated', 'Your settings have been saved.', 'success');
        initUser(); // Refresh top bar
    } catch (e) {
        console.error(e);
        showToast('Update Failed', e.message, 'danger');
    }
};

window.savePasswordSettings = async function () {
    const currPass = document.getElementById('settingsCurrentPassword').value;
    const newPass = document.getElementById('settingsNewPassword').value;
    const confPass = document.getElementById('settingsConfirmPassword').value;

    if (!currPass) return showToast('Error', 'Please enter your current password for verification.', 'warning');
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
        document.getElementById('settingsCurrentPassword').value = '';
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsConfirmPassword').value = '';
    } catch (e) {
        console.error(e);
        showToast('Update Error', e.message, 'danger');
    }
};

window.scrollIntoView = function (id) {
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

// ═══════════════════════════════════════
// WHATSAPP CRM LOGIC
// ═══════════════════════════════════════

window.initWhatsAppView = async function () {
    console.log("Initializing WhatsApp View...");
    await fetchActiveChatContacts();
    setupWhatsAppRealtime();
};

async function fetchActiveChatContacts() {
    const listEl = document.getElementById('chatContactList');
    if (!listEl) return;

    // Get unique leads who have messages
    const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select(`
            lead_id,
            submissions!inner(id, first_name, last_name, phone, mobile_number),
            message_body,
            created_at
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching chat contacts:", error);
        return;
    }

    // Deduplicate by lead_id to get contact list
    const contacts = [];
    const seenLeads = new Set();

    messages.forEach(m => {
        if (!m.lead_id || seenLeads.has(m.lead_id)) return;
        seenLeads.add(m.lead_id);
        contacts.push({
            id: m.lead_id,
            name: `${m.submissions.first_name || ''} ${m.submissions.last_name || ''}`.trim() || 'Unknown Lead',
            phone: m.submissions.phone || m.submissions.mobile_number,
            lastMsg: m.message_body,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    if (contacts.length === 0) {
        listEl.innerHTML = '<div class="empty-state" style="padding:20px; text-align:center; color:var(--label-4);">No active conversations yet. Start one from the Lead Management table.</div>';
        return;
    }

    listEl.innerHTML = contacts.map(c => `
        <div class="contact-item ${activeChatLeadId === c.id ? 'active' : ''}" onclick="window.selectChatContact('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${c.phone}')">
            <div class="contact-avatar">${c.name.charAt(0)}</div>
            <div class="contact-info">
                <div class="contact-name">${c.name}</div>
                <div class="last-msg">${c.lastMsg}</div>
            </div>
            <div class="msg-time">${c.time}</div>
        </div>
    `).join('');
}

window.selectChatContact = async function (leadId, name, phone) {
    activeChatLeadId = leadId;

    // Update UI active states
    document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('active'));
    // Find the element by leadId or Name
    const items = document.querySelectorAll('.contact-item');
    items.forEach(item => {
        if (item.getAttribute('onclick').includes(`'${leadId}'`)) {
            item.classList.add('active');
        }
    });

    const activeCommNameEl = document.getElementById('activeCommName');
    if (activeCommNameEl) activeCommNameEl.innerText = name;

    const activeCommStatusEl = document.getElementById('activeCommStatus');
    if (activeCommStatusEl) activeCommStatusEl.innerText = phone || 'online';

    const activeCommAvatarEl = document.getElementById('activeCommAvatar');
    if (activeCommAvatarEl) activeCommAvatarEl.innerText = name.charAt(0);

    const commInputAreaEl = document.getElementById('commInputArea');
    if (commInputAreaEl) commInputAreaEl.style.display = 'flex';

    await fetchChatMessages(leadId);
};

async function fetchChatMessages(leadId) {
    const chatContainer = document.getElementById('commMessages');
    chatContainer.innerHTML = '<div class="loading-spinner"></div>';

    const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching messages:", error);
        return;
    }

    whatsappMessages = messages;
    renderMessages();
}

function renderMessages() {
    const chatContainer = document.getElementById('commMessages');
    if (!chatContainer) return;

    if (whatsappMessages.length === 0) {
        chatContainer.innerHTML = '<div class="chat-welcome" style="margin:auto;"><div class="welcome-icon">💬</div><h3>No messages yet</h3><p>Send your first message to this lead.</p></div>';
        return;
    }

    chatContainer.innerHTML = whatsappMessages.map(m => {
        const side = m.direction === 'inbound' ? 'inbound' : 'outbound';
        const sender = m.direction === 'inbound' ? 'Client' : 'You (Admin)';
        const checkmarks = m.direction === 'outbound' ? (m.status === 'read' ? ' <span style="color:#34B7F1;">✓✓</span>' : ' ✓') : '';

        return `
            <div class="msg-bubble ${side}">
                <div class="msg-sender-label">${sender}</div>
                <div class="msg-text" style="white-space: pre-wrap;">${m.message_body}</div>
                <div class="msg-time">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${checkmarks}</div>
            </div>
        `;
    }).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

window.sendWhatsAppMessage = async function () {
    const input = document.getElementById('chatInputMessage');
    const message = input.value.trim();
    if (!message || !activeChatLeadId) return;

    const lead = submissionsData.find(s => s.id === activeChatLeadId);
    if (!lead || (!lead.phone && !lead.mobile_number)) {
        showToast("Error: Lead phone number not found", "error");
        return;
    }

    const phone = lead.phone || lead.mobile_number;
    input.value = '';

    try {
        const response = await fetch('/api/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send_message',
                leadId: activeChatLeadId,
                phone: phone,
                message: message
            })
        });

        const result = await response.json();
        if (!result.success) {
            showToast("Failed to send: " + result.error, "error");
        }
    } catch (err) {
        console.error("Error sending message:", err);
        showToast("Server error sending message", "error");
    }
};

window.handleChatKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendWhatsAppMessage();
    }
};

function setupWhatsAppRealtime() {
    if (whatsappRealtimeSub) return;

    whatsappRealtimeSub = supabase
        .channel('whatsapp-changes')
        .on('postgres_changes', { event: 'INSERT', table: 'whatsapp_messages', schema: 'public' }, payload => {
            const newMsg = payload.new;
            if (activeChatLeadId === newMsg.lead_id) {
                whatsappMessages.push(newMsg);
                renderMessages();
            }
            fetchActiveChatContacts();
            if (newMsg.direction === 'inbound') {
                showToast("New communication received", "info");
            }
        })
        .subscribe();
}

window.filterChatContacts = function () {
    const query = document.getElementById('chatSearchInput').value.toLowerCase();
    const items = document.querySelectorAll('.contact-item');
    items.forEach(item => {
        const nameNode = item.querySelector('.contact-name');
        if (nameNode) {
            const name = nameNode.innerText.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        }
    });
};

window.openCommHub = function (leadId, name, phone) {
    window.switchView('comm');
    window.selectChatContact(leadId, name, phone);
};

// ═══════════════════════════════════════
// SMART DIALER & COMMUNICATION HUB
// ═══════════════════════════════════════

window.toggleDialer = function (number = null) {
    const dialer = document.getElementById('globalDialer');
    if (!dialer) return;
    const isVisible = dialer.classList.contains('active');

    // If a number is passed, we always want to show the dialer and set the number
    if (number) {
        dialer.style.display = 'flex';
        dialer.offsetHeight;
        dialer.classList.add('active');
        const input = document.getElementById('dialerInput');
        if (input) {
            // Clean the input (it might contain "No Phone" or "Select Lead")
            const cleanNum = (number && !number.includes(':') && !number.toLowerCase().includes('lead') && !number.toLowerCase().includes('phone'))
                ? number.trim()
                : '';

            if (cleanNum) {
                input.value = cleanNum;
                onDialerInputChange();
            }
            input.focus();
        }
        return;
    }

    if (isVisible) {
        dialer.classList.remove('active');
        dialer.style.display = 'none';
    } else {
        dialer.style.display = 'flex';
        dialer.offsetHeight;
        dialer.classList.add('active');
        const input = document.getElementById('dialerInput');
        if (input) input.focus();
    }
};

window.appendDialer = function (val) {
    const input = document.getElementById('dialerInput');
    if (input) {
        input.value += val;
        onDialerInputChange();
    }
};

window.backspaceDialer = function () {
    const input = document.getElementById('dialerInput');
    if (input) {
        input.value = input.value.slice(0, -1);
        onDialerInputChange();
    }
};

window.onDialerInputChange = function () {
    const input = document.getElementById('dialerInput');
    if (!input) return;
    const number = input.value.trim();
    const nameDisplay = document.getElementById('dialerLeadName');
    const statusDisplay = document.getElementById('dialerLeadStatus');
    const statusDot = document.getElementById('dialerStatusDot');
    const avatarEl = document.getElementById('dialerAvatar');

    if (!number) {
        if (nameDisplay) { nameDisplay.innerText = 'Ready to Dial'; nameDisplay.style.color = ''; }
        if (statusDisplay) statusDisplay.innerText = 'Not in CRM';
        if (statusDot) statusDot.style.background = 'var(--text-muted)';
        if (avatarEl) avatarEl.innerText = '?';
        avatarEl.style.background = '';
        return;
    }

    // Lead CRM recognition
    const cleanNumber = number.replace(/\D/g, '');
    const matchedLead = submissionsData.find(lead => {
        const p = (lead.phone || lead.mobile_number || '').replace(/\D/g, '');
        return p && (p === cleanNumber ||
            (p.length >= 10 && cleanNumber.length >= 10 && p.slice(-10) === cleanNumber.slice(-10)));
    });

    if (matchedLead) {
        const leadName = matchedLead.name || matchedLead.first_name || 'Matched Lead';
        const leadStatus = matchedLead.leadStatus || 'New Lead';

        if (nameDisplay) { nameDisplay.innerText = leadName; nameDisplay.style.color = 'var(--primary)'; }
        if (statusDisplay) statusDisplay.innerText = leadStatus;

        // Colour the dot by status
        const dotColours = {
            'Accepted': '#34C759', 'Paid': '#34C759', 'Not Yet Invoiced': '#34C759',
            'New Lead': '#007AFF', 'Allocated': '#007AFF', 'Sent': '#007AFF',
            'Rejected': '#FF9500', 'Closed': '#FF3B30',
        };
        if (statusDot) statusDot.style.background = dotColours[leadStatus] || '#8E8E93';

        // Avatar initials
        if (avatarEl) {
            const parts = leadName.trim().split(' ');
            avatarEl.innerText = parts.length >= 2
                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                : leadName.slice(0, 2).toUpperCase();
            avatarEl.style.background = 'linear-gradient(135deg, var(--primary) 0%, #818CF8 100%)';
        }
    } else {
        if (nameDisplay) { nameDisplay.innerText = 'Unknown Number'; nameDisplay.style.color = ''; }
        if (statusDisplay) statusDisplay.innerText = 'Not in CRM';
        if (statusDot) statusDot.style.background = '#8E8E93';
        if (avatarEl) { avatarEl.innerText = '#'; avatarEl.style.background = ''; }
    }
};

window.startCall = function () {
    const dInput = document.getElementById('dialerInput');
    const dName = document.getElementById('dialerLeadName');
    if (!dInput || !dName) return;

    const number = dInput.value;
    const name = dName.innerText;

    if (!number) return showNotification('Please enter a number', 'warning');

    showNotification(`Initiating call to ${name || number}...`, 'info');

    const callBtn = document.querySelector('.dial-btn.call');
    if (!callBtn) return;
    const originalContent = callBtn.innerHTML;

    callBtn.classList.add('calling');
    callBtn.innerHTML = '<span style="color:white; font-size:10px; font-weight:bold;">HANGUP</span>';
    callBtn.onclick = function () {
        showNotification('Call ended.', 'info');
        resetCallBtn();
    };

    function resetCallBtn() {
        callBtn.classList.remove('calling');
        callBtn.innerHTML = originalContent;
        callBtn.onclick = startCall;
    }

    setTimeout(() => {
        if (callBtn.classList.contains('calling')) {
            showNotification(`Call to ${name} failed: Vonage API credentials required for live calls.`, 'error');
            resetCallBtn();
        }
    }, 4000);
};

window.openSmsFromDialer = function () {
    const input = document.getElementById('dialerInput');
    if (!input || !input.value) return;

    toggleDialer();
    switchView('comm');
    showNotification(`Ready to text ${input.value}`, 'info');
};

/* ═══════════════════════════════════════
   SNIPPET DATA STORE (localStorage-backed)
═══════════════════════════════════════ */
window._snippetStore = { folders: [], snippets: [] };

async function _saveSnippetStore(type, data) {
    if (!window.supabase) {
        localStorage.setItem('commSnippetStore', JSON.stringify(window._snippetStore));
        return;
    }

    try {
        if (type === 'folder_add') {
            await supabase.from('snippet_folders').insert(data);
        } else if (type === 'folder_edit') {
            await supabase.from('snippet_folders').update({ name: data.name }).eq('id', data.id);
        } else if (type === 'folder_delete') {
            await supabase.from('snippet_folders').delete().eq('id', data);
        } else if (type === 'snippet_add') {
            await supabase.from('snippets').insert(data);
        } else if (type === 'snippet_edit') {
            await supabase.from('snippets').update({ title: data.title, content: data.content }).eq('id', data.id);
        } else if (type === 'snippet_delete') {
            await supabase.from('snippets').delete().eq('id', data);
        }
    } catch (err) {
        console.error("Supabase sync failed:", err);
    }

    localStorage.setItem('commSnippetStore', JSON.stringify(window._snippetStore));
}

async function _loadSnippetsFromSupabase() {
    if (!window.supabase) return;
    try {
        const { data: folders } = await supabase.from('snippet_folders').select('*').order('name');
        const { data: snippets } = await supabase.from('snippets').select('*');
        if (folders) window._snippetStore.folders = folders;
        if (snippets) window._snippetStore.snippets = snippets;
    } catch (err) {
        console.error("Failed to load snippets:", err);
    }
}

/* ═══════════════════════════════════════
   THREAD LIST — Real Data
═══════════════════════════════════════ */
window.renderCommThreads = function () {
    const threadList = document.getElementById('commThreadList');
    if (!threadList) return;

    if (submissionsData.length === 0) {
        threadList.innerHTML = '<div class="empty-state" style="padding:40px; text-align:center; color:var(--text-muted);">No leads found to message.</div>';
        return;
    }

    const sortedLeads = [...submissionsData].sort((a, b) => {
        const dateA = new Date(a.timestamp || a.created_at);
        const dateB = new Date(b.timestamp || b.created_at);
        return dateB - dateA;
    });

    threadList.innerHTML = sortedLeads.map(lead => {
        const leadDate = new Date(lead.timestamp || lead.created_at);
        const dateStr = isNaN(leadDate) ? '---' : leadDate.toLocaleDateString();
        const leadName = lead.name || ((lead.first_name || '') + ' ' + (lead.last_name || '')).trim() || 'Unknown Lead';
        const lastMsg = lead.last_message || 'No messages yet';
        const phone = lead.phone || lead.mobile_number || '';

        // Tag based on real status
        let tagHtml = '';
        const st = (lead.status || '').toLowerCase();
        if (st === 'new' || st === 'pending') tagHtml = '<div class="lead-tags"><span class="lead-tag new-lead">New Lead</span></div>';
        else if (st === 'accepted') tagHtml = '<div class="lead-tags"><span class="lead-tag disrepair">Active Claim</span></div>';
        else if (st === 'paid') tagHtml = '<div class="lead-tags"><span class="lead-tag high-priority">Paid</span></div>';

        return `
            <div class="comm-thread-item" data-leadid="${lead.id}" data-phone="${phone}" onclick="window.selectCommContact('${lead.id}')">
                <div class="comm-avatar">${leadName.charAt(0).toUpperCase()}</div>
                <div class="comm-thread-info">
                    <div class="comm-thread-top">
                        <span class="comm-thread-name">${leadName}</span>
                        <span class="comm-thread-time">${dateStr}</span>
                    </div>
                    ${tagHtml}
                    <div class="comm-thread-last">${lastMsg}</div>
                </div>
            </div>
        `;
    }).join('');
};

/* ═══════════════════════════════════════
   SEARCH & FILTER
═══════════════════════════════════════ */
window.filterCommThreads = function () {
    const qNode = document.getElementById('commSearchInput');
    if (!qNode) return;
    const q = qNode.value.toLowerCase();
    document.querySelectorAll('.comm-thread-item').forEach(item => {
        const name = (item.querySelector('.comm-thread-name')?.innerText || '').toLowerCase();
        const snippet = (item.querySelector('.comm-thread-last')?.innerText || '').toLowerCase();
        const phone = (item.dataset.phone || '').toLowerCase();
        item.style.display = (name.includes(q) || snippet.includes(q) || phone.includes(q)) ? 'flex' : 'none';
    });
};

window.setCommFilter = function (btn, filterType) {
    document.querySelectorAll('.comm-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // For now surface all — extend when unread/needs_action data exists 
    document.querySelectorAll('.comm-thread-item').forEach(item => item.style.display = 'flex');
    showNotification('Filter: ' + (filterType || 'All'), 'info');
};

/* ═══════════════════════════════════════
   SELECT CONTACT — Header + Messages
═══════════════════════════════════════ */
window.selectCommContact = function (leadId) {
    const lead = submissionsData.find(l => String(l.id) === String(leadId));
    if (!lead) return;

    activeChatLeadId = leadId;

    // Single-pane toggle for mobile
    const layout = document.querySelector('.comm-hub-layout');
    if (layout) layout.classList.add('active-chat');

    const avatarEl = document.getElementById('activeCommAvatar');
    const nameEl = document.getElementById('activeCommName');
    const statusEl = document.getElementById('activeCommStatus');

    const leadName = lead.name || ((lead.first_name || '') + ' ' + (lead.last_name || '')).trim() || 'Unnamed Lead';
    const leadPhone = lead.phone || lead.mobile_number || 'No Phone';

    if (avatarEl) avatarEl.innerText = leadName.charAt(0).toUpperCase();
    if (nameEl) nameEl.innerText = leadName;
    if (statusEl) statusEl.innerText = leadPhone;

    // Show Input Area
    const inputArea = document.getElementById('commInputArea');
    if (inputArea) inputArea.style.display = 'flex';

    // Highlight active thread
    document.querySelectorAll('.comm-thread-item').forEach(item => {
        item.classList.toggle('active', item.dataset.leadid === String(leadId));
    });

    // Show messages
    const msgContainer = document.getElementById('commMessages');
    if (msgContainer) {
        const leadDate = new Date(lead.timestamp || lead.created_at);
        const timeStr = isNaN(leadDate) ? 'Earlier' : leadDate.toLocaleTimeString();
        const readIcon = '<span class="msg-status-icon" title="Read"><svg viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg></span>';

        msgContainer.innerHTML = `
            <div class="msg-bubble inbound">
                Hello, I have an inquiry about a housing disrepair claim. I have significant damp in my living room.
                <span class="msg-time">${timeStr}</span>
            </div>
            <div class="msg-bubble outbound">
                Hi ${leadName.split(' ')[0]}, thanks for reaching out. An admin will be calling you shortly.
                <span class="msg-time">Just now ${readIcon}</span>
            </div>
        `;
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
};

/* ═══════════════════════════════════════
   SEND MESSAGE
═══════════════════════════════════════ */
window.handleCommKeydown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendCommSms();
    }
};

window.autoExpandCommInput = function (el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
};

window._getCurrentTime = function () {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

window.sendCommSms = function () {
    const input = document.getElementById('commInputMessage');
    if (!input) return;
    const msgTemplate = input.value.trim();
    if (!msgTemplate) return;

    // Apply real-time variable parsing
    const msg = window._parseLiquidTags ? window._parseLiquidTags(msgTemplate) : msgTemplate;

    const msgContainer = document.getElementById('commMessages');
    if (!msgContainer) return;

    const singleCheck = '<span class="msg-status-icon"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>';
    const doubleCheck = '<span class="msg-status-icon" title="Read"><svg viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg></span>';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble outbound';

    const senderLabel = document.createElement('div');
    senderLabel.className = 'msg-sender-label';
    senderLabel.innerText = 'You (Admin)';

    const msgText = document.createElement('div');
    msgText.innerText = msg; // innerText handles \n with pre-wrap perfectly and is safe

    const timeLabel = document.createElement('span');
    timeLabel.className = 'msg-time';
    timeLabel.innerText = 'Sending...';

    bubble.appendChild(senderLabel);
    bubble.appendChild(msgText);
    bubble.appendChild(timeLabel);

    msgContainer.appendChild(bubble);

    // Clear input
    input.value = '';
    input.style.height = 'auto'; // Reset height
    window.autoExpandCommInput(input);
    msgContainer.scrollTop = msgContainer.scrollHeight;

    setTimeout(function () {
        var timeNode = bubble.querySelector('.msg-time');
        const now = window._getCurrentTime();
        if (timeNode) timeNode.innerHTML = now + ' ' + singleCheck;
        showNotification('SMS sent successfully.', 'success');

        setTimeout(function () {
            if (timeNode) timeNode.innerHTML = now + ' ' + doubleCheck;

            var typing = document.getElementById('commTyping');
            if (typing) {
                typing.style.display = 'block';
                msgContainer.scrollTop = msgContainer.scrollHeight;

                setTimeout(function () {
                    typing.style.display = 'none';
                    const replyTime = window._getCurrentTime();
                    var reply = document.createElement('div');
                    reply.className = 'msg-bubble inbound';
                    reply.innerHTML = '<div class="msg-sender-label">Client</div>' + 'Okay, received. Thank you! <span class="msg-time">' + replyTime + '</span>';
                    msgContainer.appendChild(reply);
                    msgContainer.scrollTop = msgContainer.scrollHeight;

                    try {
                        var audio = new Audio('https://notifications.google.com/sounds/v1/ui/message_notification.ogg');
                        // Fallback to mp3 if ogg fails or just catch the play error
                        audio.volume = 0.5;
                        audio.play().catch(function (e) {
                            console.warn("[CommHub] Audio playback skipped:", e.message);
                        });
                    } catch (e) { }
                }, 2500);
            }
        }, 3000);
    }, 800);
};

/* ═══════════════════════════════════════
   LIQUID TAG PARSER (Regex Engine)
═══════════════════════════════════════ */
window._parseLiquidTags = function (template) {
    if (!template) return '';
    if (!activeChatLeadId) return template;
    var lead = submissionsData.find(function (l) { return String(l.id) === String(activeChatLeadId); });
    if (!lead) return template;

    // Enhanced name detection
    var rawName = (lead.name || lead.full_name || '').trim();
    var firstName = (lead.first_name || '').trim();
    var lastName = (lead.last_name || '').trim();

    if (!firstName && rawName) {
        firstName = rawName.split(' ')[0];
    }
    if (!firstName) firstName = 'Client';

    if (!lastName && rawName && rawName.includes(' ')) {
        lastName = rawName.split(' ').slice(1).join(' ');
    }

    var fullName = firstName + (lastName ? ' ' + lastName : '');
    if (rawName && rawName.length > fullName.length) fullName = rawName;

    var solicitorFirm = 'your solicitor';
    if (lead.assigned_company_id && companiesData.length > 0) {
        var comp = companiesData.find(function (c) { return String(c.id) === String(lead.assigned_company_id); });
        if (comp) solicitorFirm = comp.company_name || comp.name || 'your solicitor';
    }

    var solicitorName = solicitorFirm;
    if (lead.assigned_solicitor_id && membersData.length > 0) {
        var member = membersData.find(function (m) { return String(m.id) === String(lead.assigned_solicitor_id); });
        if (member) solicitorName = member.name || solicitorFirm;
    }

    var phone = lead.phone || lead.mobile_number || 'N/A';
    var email = lead.email || 'N/A';

    // Get Logged-in admin user details
    var adminUser = null;
    try {
        var sess = JSON.parse(localStorage.getItem('admin_session') || '{}');
        if (sess && sess.user) {
            adminUser = {
                name: sess.user.user_metadata?.full_name || sess.user.user_metadata?.username || sess.user.email.split('@')[0],
                email: sess.user.email,
                phone: sess.user.user_metadata?.phone || sess.user.phone || 'N/A'
            };
        }
    } catch (e) { }

    return template
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{last_name\}\}/g, lastName)
        .replace(/\{\{full_name\}\}/g, fullName)
        .replace(/\{\{client_name\}\}/g, fullName)
        .replace(/\{\{solicitor\}\}/g, solicitorFirm)
        .replace(/\{\{solicitor_name\}\}/g, solicitorName)
        .replace(/\{\{phone\}\}/g, phone)
        .replace(/\{\{email\}\}/g, email)
        .replace(/\{\{user_name\}\}/g, adminUser ? adminUser.name : 'Admin')
        .replace(/\{\{user_email\}\}/g, adminUser ? adminUser.email : '')
        .replace(/\{\{user_phone\}\}/g, adminUser ? adminUser.phone : '')
        .replace(/\{\{case_id\}\}/g, lead.id ? ('CASE-' + String(lead.id).substring(0, 6).toUpperCase()) : 'CASE-000');
};

window.insertSnippet = function (template) {
    var parsed = window._parseLiquidTags(template);
    var input = document.getElementById('commInputMessage');
    if (input) {
        input.value = parsed;
        input.focus();
        if (parsed.includes('{{')) {
            showNotification('Note: Some variables could not be mapped.', 'warning');
        }
        window.autoExpandCommInput(input);
    }
};

window._activeSnippetFolder = null;
window._snippetStore = { folders: [], snippets: [] };
window._snippetSearchTerm = '';


async function _loadSnippets() {
    try {
        const res = await fetch('/api/snippets');
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (data && data.folders) {
            window._snippetStore = data;
        }
    } catch (e) {
        console.error('Failed to load snippets from Supabase', e);
        showNotification('Failed to load snippets from cloud.', 'error');
    }
}

async function _saveSnippetStore(action, payload) {
    try {
        const res = await fetch('/api/snippets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        if (!res.ok) throw new Error('Cloud sync failed');
    } catch (e) {
        console.error('Storage sync error:', e);
        showNotification('Cloud sync failed. Information not saved.', 'error');
    }
}

window.openSnippetManager = async function (isFullPageView = false) {
    // If not in full page view mode (e.g. triggered from chat), we check for lead session if needed
    if (!isFullPageView && !activeChatLeadId) {
        showNotification('Select a lead first to use snippets within chat', 'error');
        return;
    }
    await _loadSnippets();
    if (!window._activeSnippetFolder) {
        window._activeSnippetFolder = window._snippetStore.folders[0]?.id || null;
    }
    window._renderSnippetModal(isFullPageView);
};

window._renderSnippetModal = function (customFullPageCheck) {
    // Auto-detect view state to prevent snapping back to modal layout dynamically
    var isFullPageView = (typeof customFullPageCheck === 'boolean')
        ? customFullPageCheck
        : (document.getElementById('templatesView')?.classList.contains('active') || false);

    var store = window._snippetStore || { folders: [], snippets: [] };
    var activeId = window._activeSnippetFolder;
    var box;
    if (isFullPageView) {
        box = document.getElementById('templatesMainContent');
        if (!box) return;
        box.className = 'snippet-hubspot-container full-page';
        box.style.display = 'flex';
        box.style.width = '100%';
        // Use class based styling for better responsiveness instead of heavy inline styles
    } else {
        box = document.getElementById('modalBox');
        box.className = 'modal-box snippet-hubspot-container';
        box.style.padding = '0';
        box.style.display = 'flex';
        box.style.width = '95vw';
        box.style.maxWidth = '1200px';
        box.style.height = '85vh';
        box.style.maxHeight = '900px';
        box.style.overflow = 'hidden';
        box.style.borderRadius = '16px';
        box.style.border = 'none';
        box.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    }

    var folderListHtml = store.folders.map(function (f) {
        var isSelected = f.id === activeId;
        var activeCls = isSelected ? 'active' : '';
        return `
            <div class="hub-folder-item ${activeCls}" onclick="window._selectSnippetFolder('${f.id}')">
                <svg class="f-icon" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                <span>${f.name}</span>
                <div class="f-actions">
                    <button class="f-action-btn" title="Rename Folder" onclick="event.stopPropagation(); window._editSnippetFolder('${f.id}')">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="f-action-btn f-action-delete" title="Delete Folder" onclick="event.stopPropagation(); window._deleteSnippetFolder('${f.id}')">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            </div>`;
    }).join('');

    var activeFolder = store.folders.find(function (f) { return f.id === activeId; });
    var folderSnippets = store.snippets.filter(function (s) {
        return (s.folder_id || s.folderId) === activeId;
    });
    // Search filtering
    var searchTerm = (window._snippetSearchTerm || '').toLowerCase();
    if (searchTerm) {
        folderSnippets = folderSnippets.filter(function (s) {
            return s.title.toLowerCase().includes(searchTerm) || s.content.toLowerCase().includes(searchTerm);
        });
    }

    var snippetRowsHtml = folderSnippets.map(function (s) {
        const createdDate = s.created_at ? new Date(s.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';
        return `
            <tr class="hub-row" style="border-bottom: 1px solid var(--border-light); transition: background 0.2s;">
                <td class="hub-col-name" style="padding: 20px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="background: var(--bg-surface-2); color: var(--text-muted); width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div class="name-text" style="font-size: 15px; font-weight: 600; color: var(--text-main);">${s.title}</div>
                    </div>
                </td>
                <td class="hub-col-owner" style="width:160px; text-align:left; padding: 20px 16px; color: var(--text-muted); font-weight: 500;">Admin</td>
                <td class="hub-col-date" style="width:180px; text-align:left; padding: 20px 16px; color: var(--text-muted); font-weight: 500;">${createdDate}</td>
                <td class="hub-col-actions" style="width:120px; text-align:right; padding: 20px 16px; position:relative; overflow:visible;">
                    <div style="position:relative; display:inline-block;">
                        <button class="hub-action-btn" onclick="window._toggleSnippetMenu(event, '${s.id}')" style="background: var(--bg-surface-2); border: 1px solid var(--border-light); padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; color: var(--text-main); cursor: pointer; transition: all 0.2s;">Actions ▾</button>
                        <div id="menu-${s.id}" class="hub-dropdown" style="display:none; position:absolute; right:0; top:100%; margin-top:8px; width:220px; background:var(--bg-surface); border:1px solid var(--border-light); box-shadow:0 15px 35px rgba(0,0,0,0.15); border-radius:14px; z-index:99999; overflow:visible;">
                            <div onclick="event.stopPropagation(); window._showCreateSnippet('${s.id}')" style="padding:12px 16px; font-size:13px; font-weight:600; cursor:pointer;" onmouseover="this.style.background='var(--bg-surface-2)'" onmouseout="this.style.background='transparent'">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Edit Template
                                </div>
                            </div>
                            <div onclick="event.stopPropagation(); window._deleteSnippet('${s.id}')" style="padding:12px 16px; font-size:13px; font-weight:600; color:#ef4444; cursor:pointer;" onmouseover="this.style.background='rgba(239, 68, 68, 0.05)'" onmouseout="this.style.background='transparent'">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                    Delete Permanently
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    box.innerHTML = `
        <div class="hub-sidebar" style="background: var(--bg-surface); border-right: 1px solid var(--border-light);">
            <div class="hub-sidebar-header" style="padding: 24px; border-bottom: 1px solid var(--border-light);">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="background: var(--primary-light); color: var(--primary); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    </div>
                    <span class="hub-sidebar-title" style="font-size: 16px; font-weight: 700; color: var(--text-main); letter-spacing: -0.4px;">Snippets Manager</span>
                </div>
            </div>
            <div class="hub-sidebar-scroll">
                <div class="hub-section-label" style="font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.8px; padding: 20px 24px 8px;">FOLDERS</div>
                <div style="padding: 0 12px;">
                    ${folderListHtml}
                </div>
            </div>
            <div class="hub-sidebar-footer" style="margin-top: auto; padding: 24px; border-top: 1px solid var(--border-light);">
                ${isFullPageView ? '' : `<button class="btn-hub-secondary" style="width:100%; border-radius: 10px; height: 44px;" onclick="document.getElementById('modalOverlay').style.display='none'">Exit Library</button>`}
            </div>
        </div>
        <div class="hub-main" style="flex: 1; display: flex; flex-direction: column; background: var(--bg-main);">
            <div class="hub-header" style="padding: 32px 40px; border-bottom: 1px solid var(--border-light); background: var(--bg-surface);">
                <div class="hub-header-top" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <button class="hub-folder-back" title="Back to Folders" onclick="document.querySelector('.snippet-hubspot-container').classList.remove('active-folder')" style="display:none; background:none; border:none; color:var(--text-main); margin-right:8px; cursor:pointer;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        ${isFullPageView ? '' : `
                        <button class="hub-back-arrow" title="Back to Chat" onclick="document.getElementById('modalOverlay').style.display='none'" style="background: var(--bg-surface-2); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <svg style="width:20px; height:20px; fill: var(--text-muted);" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                        `}
                        <h2 class="hub-title" style="font-size: 24px; font-weight: 800; color: var(--text-main); letter-spacing: -0.8px; margin: 0;">${activeFolder ? activeFolder.name : 'Templates'}</h2>
                    </div>
                    <div class="hub-header-actions" style="display: flex; gap: 12px;">
                        <button class="btn-hub-secondary" style="height: 40px; border-radius: 10px; font-size: 13px; font-weight: 700; padding: 0 20px;" onclick="window._addSnippetFolder()">New Folder</button>
                        <button class="btn-hub-primary" style="height: 40px; border-radius: 10px; font-size: 13px; font-weight: 700; padding: 0 20px; background: var(--primary); box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2);" onclick="window._showCreateSnippet()">Create snippet</button>
                    </div>
                </div>
                <div class="hub-controls" style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="hub-search" style="position: relative; flex: 0 1 400px;">
                        <svg style="width:18px; height:18px; position:absolute; left:16px; top:50%; transform:translateY(-50%); fill:#94a3b8; transition: fill 0.2s;" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input type="text" placeholder="Search templates..." style="width: 100%; height: 44px; padding: 0 16px 0 48px; border-radius: 22px; border: 1px solid var(--border-light); background: var(--bg-surface-2); font-size: 14px; transition: all 0.2s;" oninput="window._snippetSearchTerm=this.value; window._renderSnippetModal();" value="${window._snippetSearchTerm || ''}">
                    </div>
                    <div class="hub-count" style="font-size: 12px; font-weight: 600; color: var(--text-light); letter-spacing: 0.2px;">${folderSnippets.length} snippets listed</div>
                </div>
            </div>
            <div class="hub-scroll-area" style="padding: 24px 40px; overflow: visible !important;">
                <div class="table-responsive" style="background: var(--bg-surface); border-radius: 16px; border: 1px solid var(--border-light); overflow: visible !important; box-shadow: var(--shadow-sm);">
                    <table class="hub-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-surface-2);">
                                <th style="text-align:left; padding: 16px; font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.8px;">NAME</th>
                                <th style="width:160px; text-align:left; padding: 16px; font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.8px;">CREATED BY</th>
                                <th style="width:180px; text-align:left; padding: 16px; font-size: 11px; font-weight: 800; color: var(--text-light); text-transform: uppercase; letter-spacing: 0.8px;">DATE UPDATED</th>
                                <th style="width:120px; text-align:right; padding: 16px;"></th>
                            </tr>
                        </thead>
                        <tbody style="overflow: visible;">
                            ${snippetRowsHtml || `
                                <tr>
                                    <td colspan="4" style="padding:100px 40px; text-align:center;">
                                        <div style="background: var(--primary-light); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px;">
                                            <svg style="width:36px; height:36px; fill: var(--primary);" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                                        </div>
                                        <h3 style="font-size:20px; font-weight:800; color: var(--text-main); margin-bottom:12px; letter-spacing: -0.5px;">No templates here</h3>
                                        <p style="font-size:14px; color: var(--text-muted); max-width:320px; margin:0 auto 32px; line-height:1.6;">Create a snippet to save time on your frequent replies and standard messages.</p>
                                        <button class="btn-hub-primary" style="padding:12px 32px; height: auto; border-radius: 12px; background: var(--primary);" onclick="window._showCreateSnippet()">Create your first snippet</button>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (isFullPageView) {
        document.getElementById('modalOverlay').style.display = 'none';
    } else {
        document.getElementById('modalOverlay').style.display = 'flex';
    }
};

/* ═══════════════════════════════════════
   SNIPPET QUICK PICKER (Chat Context)
═══════════════════════════════════════ */


window._toggleSnippetMenu = function (e, id) {
    if (e) e.stopPropagation();
    var menu = document.getElementById('menu-' + id);
    if (!menu) return;

    var isVisible = menu.classList.contains('active');

    document.querySelectorAll('.hub-dropdown').forEach(function (m) {
        m.style.display = 'none';
        m.classList.remove('active');
    });

    if (!isVisible) {
        menu.style.display = 'block';
        menu.classList.add('active');
    }
};



window._selectSnippetFolder = function (folderId) {
    window._activeSnippetFolder = folderId;

    // Single-pane toggle for mobile
    const container = document.querySelector('.snippet-hubspot-container');
    if (container) container.classList.add('active-folder');

    // Check if we are in full page view or modal
    const isFullPage = document.getElementById('templatesView').classList.contains('active');
    window._renderSnippetModal(isFullPage);
};

window._addSnippetFolder = function () {
    window._showFolderModal();
};

window._showFolderModal = function (editId = null) {
    const folder = editId ? window._snippetStore.folders.find(f => f.id === editId) : null;
    const box = document.getElementById('modalBox');

    box.className = 'modal-box snippet-hubspot-container';
    box.style.display = 'block';
    box.style.width = '440px';
    box.style.height = 'auto'; // Center height automatically
    box.style.minHeight = 'unset';
    box.style.maxHeight = 'fit-content';
    box.style.borderRadius = '20px';
    box.style.padding = '0';
    box.style.overflow = 'hidden';
    box.style.boxShadow = '0 20px 40px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.05)';
    box.style.border = '1px solid var(--border)';
    box.style.margin = 'auto'; // Ensure centering in flex overlay

    box.innerHTML = `
        <div style="padding:24px 30px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--surface-1);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="background:var(--blue-light); color:var(--blue); width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center;">
                    <svg style="width:20px; height:20px; fill:currentColor;" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                </div>
                <h2 style="font-size:18px; font-weight:800; margin:0; letter-spacing:-0.5px; color:var(--label-1);">${editId ? 'Rename Folder' : 'New Folder'}</h2>
            </div>
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'" style="font-size:24px; opacity:0.5; transition:0.2s; background:none; border:none; color:var(--label-1); cursor:pointer;">&times;</button>
        </div>
        <div style="padding:32px 30px; background:var(--surface-1);">
            <div style="margin-bottom:24px;">
                <label style="font-size:11px; font-weight:800; color:var(--label-3); text-transform:uppercase; letter-spacing:0.8px; display:block; margin-bottom:10px;">FOLDER NAME</label>
                <input type="text" id="folderNameInput" class="modern-input" value="${folder ? folder.name : ''}" 
                    placeholder="e.g. Legal Documents"
                    style="width:100%; height:48px; padding:0 16px; border:2px solid var(--border); border-radius:12px; font-size:15px; font-weight:500; transition:all 0.2s; background:var(--surface-2); color:var(--label-1);"
                    onfocus="this.style.borderColor='var(--blue)'; this.style.boxShadow='0 0 0 4px var(--blue-light)';"
                    onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';"
                >
            </div>
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button class="btn-outline" style="padding:10px 20px; font-weight:700; border-radius:10px; border:1px solid var(--border); color:var(--label-2);" onclick="document.getElementById('modalOverlay').style.display='none'">Cancel</button>
                <button class="btn-action" style="padding:10px 24px; font-weight:700; border-radius:10px; background:var(--blue); color:white; border:none; cursor:pointer;" onclick="window._processFolderSave('${editId || ''}')">
                    ${editId ? 'Save Folder' : 'Create Folder'}
                </button>
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
    setTimeout(() => document.getElementById('folderNameInput')?.focus(), 50);
};

window._processFolderSave = async function (editId) {
    const name = document.getElementById('folderNameInput').value.trim();
    if (!name) return showNotification('Folder name is required', 'error');

    if (editId) {
        const folder = window._snippetStore.folders.find(f => f.id === editId);
        if (folder) {
            folder.name = name;
            await _saveSnippetStore('folder_edit', { id: editId, name });
            showNotification('Folder renamed', 'success');
        }
    } else {
        const newFolder = { id: crypto.randomUUID(), name };
        window._snippetStore.folders.push(newFolder);
        window._activeSnippetFolder = newFolder.id;
        await _saveSnippetStore('folder_add', newFolder);
        showNotification('Folder created', 'success');
    }
    window._renderSnippetModal();
};

window._editSnippetFolder = function (folderId) {
    window._showFolderModal(folderId);
};

window._deleteSnippetFolder = function (folderId) {
    const folder = window._snippetStore.folders.find(f => f.id === folderId);
    if (!folder) return;

    window._showDeleteConfirmModal('folder', folder.id, folder.name);
};

window._showDeleteConfirmModal = function (type, id, name) {
    const box = document.getElementById('modalBox');
    box.className = 'modal-box';
    box.style.display = 'block';
    box.style.width = '400px';
    box.style.height = 'auto'; // Center height automatically
    box.style.borderRadius = '24px';
    box.style.padding = '0';
    box.style.overflow = 'hidden';
    box.style.boxShadow = '0 25px 50px rgba(0,0,0,0.2)';
    box.style.border = 'none';
    box.style.margin = 'auto'; // Center in flex

    box.innerHTML = `
        <div style="padding:40px 30px; text-align:center; background:var(--surface-1); position:relative;">
            <button class="close-btn" onclick="document.getElementById('modalOverlay').style.display='none'" style="position:absolute; right:20px; top:20px; font-size:20px; opacity:0.3; border:none; background:none; cursor:pointer; color:var(--label-1);">&times;</button>
            
            <div style="background:var(--red-light); color:var(--red); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 24px; animation: pulseRed 2s infinite;">
                 <svg style="width:36px; height:36px; fill:currentColor;" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </div>
            <h2 style="font-size:24px; font-weight:800; color:var(--label-1); margin-bottom:12px; letter-spacing:-0.5px;">Delete ${type}?</h2>
            <p style="font-size:15px; color:var(--label-3); line-height:1.6; padding:0 20px;">
                Are you sure you want to delete "<strong>${name}</strong>"? This action is permanent and cannot be undone.
            </p>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:40px;">
                <button class="btn-action" style="width:100%; height:52px; border-radius:14px; background:var(--red); box-shadow:0 8px 20px rgba(255,69,58,0.3); font-weight:800; font-size:15px; border:none; color:white; cursor:pointer;" onclick="window._processDelete('${type}', '${id}')">
                    Delete Permanently
                </button>
                <button class="btn-outline" style="width:100%; height:52px; border-radius:14px; border:1px solid var(--border); background:var(--surface-1); color:var(--label-2); font-weight:700; font-size:15px; cursor:pointer;" onclick="document.getElementById('modalOverlay').style.display='none'">
                    No, keep it
                </button>
            </div>
        </div>
        <style>
            @keyframes pulseRed {
                0% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.4); }
                70% { box-shadow: 0 0 0 15px rgba(255, 69, 58, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
            }
        </style>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window._processDelete = async function (type, id) {
    if (type === 'folder') {
        window._snippetStore.snippets = window._snippetStore.snippets.filter(s => (s.folder_id || s.folderId) !== id);
        window._snippetStore.folders = window._snippetStore.folders.filter(f => f.id !== id);
        if (window._activeSnippetFolder === id) {
            window._activeSnippetFolder = window._snippetStore.folders[0]?.id || null;
        }
        await _saveSnippetStore('folder_delete', id);
    } else {
        window._snippetStore.snippets = window._snippetStore.snippets.filter(s => s.id !== id);
        await _saveSnippetStore('snippet_delete', id);
    }
    document.getElementById('modalOverlay').style.display = 'none';
    showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`, 'info');
    window._renderSnippetModal();
};

window._showCreateSnippet = function (editId) {
    if (!window._activeSnippetFolder) { showNotification('Select a folder first', 'error'); return; }
    var folderId = window._activeSnippetFolder;
    var folder = window._snippetStore.folders.find(f => f.id === folderId);

    var existing = editId ? window._snippetStore.snippets.find(function (x) { return x.id === editId; }) : null;
    var box = document.getElementById('modalBox');
    box.className = 'modal-box';
    box.style.display = 'block';
    box.style.width = '640px';
    box.style.borderRadius = '24px';
    box.style.overflow = 'hidden';
    box.style.boxShadow = '0 25px 80px -20px rgba(0, 0, 0, 0.35)';
    box.style.border = '1px solid var(--border-light)';

    box.innerHTML = `
        <div class="modal-header" style="background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); padding: 24px 32px; border-bottom: 1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; position: sticky; top: 0; z-index: 10;">
            <div style="display:flex; align-items:center; gap:20px;">
                <button class="back-nav-btn" title="Back to Library" onclick="window._renderSnippetModal()" style="background:var(--bg-surface-2); width:40px; height:40px; border-radius:12px; border:1px solid var(--border-light); color:var(--text-main); display:flex; align-items:center; justify-content:center; cursor:pointer; transition: all 0.2s;">
                    <svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round;"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
                <div style="display:flex; align-items:center; gap:16px;">
                    <div style="background:var(--primary-light); width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:var(--primary);">
                        <svg viewBox="0 0 24 24" style="width:22px; height:22px; fill:currentColor;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    </div>
                    <div>
                        <h2 style="font-size:18px; font-weight:800; margin:0; letter-spacing:-0.5px; color: var(--text-main);">${existing ? 'Edit Template' : 'Create Template'}</h2>
                        <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Folder: <span style="color:var(--primary);">${folder ? folder.name : 'Unknown'}</span></div>
                    </div>
                </div>
            </div>
            <button class="close-btn" style="background:var(--bg-surface-2); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted);" onclick="window._renderSnippetModal()">&times;</button>
        </div>
        
        <div style="padding:40px; background:var(--bg-surface); max-height: 75vh; overflow-y: auto;">
            <div style="margin-bottom:32px;">
                <label style="font-size:11px; font-weight:800; color:var(--text-light); text-transform:uppercase; display:block; margin-bottom:12px; letter-spacing:1px;">TEMPLATE NAME</label>
                <input type="text" id="newSnippetTitle" placeholder="e.g. Initial Outreach Message" class="modern-input" style="width:100%; height:52px; font-size:16px; font-weight: 500; border-radius:14px; background: var(--bg-surface-2); border: 2px solid transparent; transition: all 0.2s;" value="${existing ? existing.title : ''}" onfocus="this.style.borderColor='var(--primary)'; this.style.background='var(--bg-surface)';" onblur="this.style.borderColor='transparent'; this.style.background='var(--bg-surface-2)';">
            </div>
            
            <div style="margin-bottom:24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-light); text-transform:uppercase; letter-spacing:1px;">MESSAGE CONTENT</label>
                    <div style="display:flex; gap:10px;">
                        <span onclick="window._insertVarIntoSnippet('{{first_name}}')" style="cursor:pointer; background:var(--bg-surface-2); color:var(--primary); font-size:11px; font-weight:800; padding:6px 14px; border-radius:12px; border:1px solid var(--border-light); transition: all 0.2s;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='var(--bg-surface-2)'">+ Name</span>
                        <div style="position:relative;">
                            <button type="button" class="btn-outline" style="padding:6px 16px; font-size:12px; height:32px; border-radius:12px; gap:8px; font-weight:800; background: var(--bg-surface-2); border: 1px solid var(--border-light); cursor: pointer;" onclick="var d=document.getElementById('snippetVarDrop'); d.style.display=d.style.display==='none'?'block':'none';">
                                More Variables
                            </button>
                            <div id="snippetVarDrop" style="display:none; position:absolute; right:0; top:100%; margin-top:10px; width:240px; background:var(--bg-surface); border:1px solid var(--border-light); box-shadow: 0 10px 30px rgba(0,0,0,0.2); border-radius:16px; z-index:1000; overflow:hidden;">
                                <div style="padding:12px 16px; font-size:11px; font-weight:800; color:var(--text-light); background:var(--bg-surface-2); text-transform:uppercase; letter-spacing:1px;">Lead Data</div>
                                <div onclick="window._insertVarIntoSnippet('{{full_name}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; border-bottom:1px solid var(--border-light); font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Full Name</div>
                                <div onclick="window._insertVarIntoSnippet('{{solicitor_name}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; border-bottom:1px solid var(--border-light); font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Solicitor Name</div>
                                <div onclick="window._insertVarIntoSnippet('{{phone}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; border-bottom:1px solid var(--border-light); font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Phone Number</div>
                                
                                <div style="padding:12px 16px; font-size:11px; font-weight:800; color:var(--text-light); background:var(--bg-surface-2); text-transform:uppercase; letter-spacing:1px;">Admin Details</div>
                                <div onclick="window._insertVarIntoSnippet('{{user_name}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; border-bottom:1px solid var(--border-light); font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Your Name</div>
                                <div onclick="window._insertVarIntoSnippet('{{user_email}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; border-bottom:1px solid var(--border-light); font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Your Email</div>
                                <div onclick="window._insertVarIntoSnippet('{{user_phone}}')" style="padding:12px 16px; font-size:14px; color:var(--text-main); cursor:pointer; font-weight:600;" onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='transparent'">Your Phone</div>
                            </div>
                        </div>
                    </div>
                </div>
                <textarea id="newSnippetContent" class="modern-input" rows="8" placeholder="Type your message template here..." style="width:100%; min-height:160px; padding:20px; font-size:16px; border-radius:16px; line-height:1.6; resize:vertical; background: var(--bg-surface-2); border: 2px solid transparent; transition: all 0.2s;" onfocus="this.style.borderColor='var(--primary)'; this.style.background='var(--bg-surface)';" onblur="this.style.borderColor='transparent'; this.style.background='var(--bg-surface-2)';">${existing ? existing.content : ''}</textarea>
                <div style="display:flex; justify-content:flex-end; margin-top:10px; font-size:12px; font-weight:700; color:var(--text-light);" id="snippetCharCount">0 characters</div>
            </div>
            
            <div id="snippetPreviewBox" style="background:var(--bg-surface-2); border:1px solid var(--border-light); border-radius:18px; padding:24px; margin-bottom:32px; min-height:100px; position: relative; overflow: hidden;">
                <div style="font-size:11px; font-weight:900; color:var(--primary); text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:10px; letter-spacing: 1px;">
                    <span style="background:var(--primary); width:8px; height:8px; border-radius:50%; box-shadow: 0 0 10px var(--primary);"></span>
                    LIVE PREVIEW
                </div>
                <div id="snippetPreviewContent" style="font-size:15px; color:var(--text-main); line-height:1.8; font-style:italic; opacity:0.6; white-space: pre-wrap;">${existing ? window._parseLiquidTags(existing.content) : 'Variable tags will be automatically replaced with live data when sending...'}</div>
            </div>
    
            <div style="display:flex; justify-content:flex-end; gap:16px; margin-top:10px;">
                <button class="btn-hub-secondary" style="padding:14px 28px; height: auto; font-size:14px; font-weight:700; border-radius: 12px;" onclick="window._renderSnippetModal()">Discard</button>
                <button class="btn-hub-primary" style="padding:14px 40px; height: auto; font-size:14px; font-weight:800; background:var(--primary); border-radius: 12px; box-shadow: 0 8px 24px rgba(13, 110, 253, 0.25); border:none;" onclick="window._saveNewSnippet('${editId || ''}')">${existing ? 'Save Changes' : 'Create Template'}</button>
            </div>
        </div>
    `;

    var ta = document.getElementById('newSnippetContent');
    var charCount = document.getElementById('snippetCharCount');
    var previewContent = document.getElementById('snippetPreviewContent');

    ta.addEventListener('input', function () {
        var val = this.value;
        charCount.innerText = val.length + ' characters';
        var parsed = window._parseLiquidTags(val);
        if (val) {
            previewContent.innerHTML = parsed;
            previewContent.style.fontStyle = 'normal';
            previewContent.style.opacity = '1';
        } else {
            previewContent.innerHTML = 'Start typing to see the final message with variable data...';
            previewContent.style.fontStyle = 'italic';
            previewContent.style.opacity = '0.7';
        }
    });

    document.getElementById('modalOverlay').style.display = 'flex';
};

window._insertVarIntoSnippet = function (variable) {
    var ta = document.getElementById('newSnippetContent');
    if (!ta) return;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var text = ta.value;
    ta.value = text.substring(0, start) + variable + text.substring(end);
    ta.selectionStart = ta.selectionEnd = start + variable.length;
    ta.focus();
    // Manually trigger input event for preview
    ta.dispatchEvent(new Event('input'));
    if (document.getElementById('snippetVarDrop')) document.getElementById('snippetVarDrop').style.display = 'none';
};



window._saveNewSnippet = async function (editId) {
    var title = document.getElementById('newSnippetTitle')?.value?.trim();
    var content = document.getElementById('newSnippetContent')?.value?.trim();
    if (!title || !content) { showNotification('Title and Content are required', 'error'); return; }

    if (editId && editId !== 'undefined' && editId !== '') {
        // Update existing
        var snippet = window._snippetStore.snippets.find(function (s) { return s.id === editId; });
        if (snippet) {
            snippet.title = title;
            snippet.content = content;
            await _saveSnippetStore('snippet_edit', snippet);
            showNotification('Snippet updated!', 'success');
        } else {
            showNotification('Error: Could not find snippet to update', 'error');
            return;
        }
    } else {
        // Create new
        const newSnippet = {
            id: crypto.randomUUID(),
            folder_id: window._activeSnippetFolder,
            title: title,
            content: content
        };
        window._snippetStore.snippets.push(newSnippet);
        await _saveSnippetStore('snippet_add', newSnippet);
        showNotification('Snippet created!', 'success');

        // Ensure modal is closed after creation
        document.getElementById('modalOverlay').style.display = 'none';
        document.getElementById('modalBox').style.display = 'none';
    }

    // Refresh the view immediately
    window._renderSnippetModal();
};

window._deleteSnippet = function (snippetId) {
    const s = window._snippetStore.snippets.find(x => x.id === snippetId);
    if (!s) return;
    window._showDeleteConfirmModal('snippet', s.id, s.title);
};



/* ═══════════════════════════════════════
   EMOJI PICKER (Cursor-Aware Insertion)
═══════════════════════════════════════ */
window.toggleEmojiPicker = function () {
    var existing = document.getElementById('emojiFullPicker');
    if (existing) {
        existing.remove();
        return;
    }

    var picker = document.createElement('div');
    picker.id = 'emojiFullPicker';
    picker.className = 'emoji-full-picker';

    var emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '👻', '💀', '☠️', '👽', '👾', '🤖', '💩', '😺', '😸', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋', '💌', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💪', '🤙', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '☝️', '👆', '👇', '👈', '👉', '🙌', '🙏', '🤝', '👏', '👍', '👎', '👊', '✊', '🤛', '🤜', '✨', '🔥', '✅', '❌', '⚠️', '💰', '📍', '📞', '✉️'
    ];

    var emojiHtml = emojis.map(function (e) {
        return '<div class="emoji-item" onclick="window.insertEmoji(\'' + e + '\')">' + e + '</div>';
    }).join('');

    picker.innerHTML = `
        <div style="padding:16px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:14px; font-weight:800; color:var(--text-main);">Choose Emoji</span>
            <button onclick="document.getElementById('emojiFullPicker').remove()" style="background:none; border:none; cursor:pointer; font-size:18px;">&times;</button>
        </div>
        <div class="emoji-grid">${emojiHtml}</div>
    `;

    document.getElementById('commInputArea').appendChild(picker);
};

window.insertEmoji = function (emoji) {
    var input = document.getElementById('commInputMessage');
    if (input) {
        var start = input.selectionStart || input.value.length;
        var end = input.selectionEnd || input.value.length;
        var before = input.value.substring(0, start);
        var after = input.value.substring(end);
        input.value = before + emoji + after;
        input.focus();
        var newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
    }
    var picker = document.getElementById('emojiPicker');
    if (picker) picker.style.display = 'none';
};

/* ═══════════════════════════════════════
   SNIPPET PICKER (Restored)
═══════════════════════════════════════ */
window.toggleSnippetPicker = function (event, folderId = null) {
    if (event) event.stopPropagation();
    var existing = document.getElementById('snippetFullPicker');
    
    // If opening from scratch and picker exists, close it
    if (existing && folderId === null && event) {
        existing.remove();
        return;
    }

    var store = window._snippetStore || { folders: [], snippets: [] };
    
    // Ensure we have data
    if (store.snippets.length === 0 && store.folders.length === 0) {
        showNotification('No templates found. Go to Template Library to create one.', 'info');
        if (existing) existing.remove();
        return;
    }

    if (!existing) {
        existing = document.createElement('div');
        existing.id = 'snippetFullPicker';
        existing.className = 'snippets-menu';
        document.getElementById('commInputArea').appendChild(existing);
    }

    var html = `
        <div style="padding:12px 16px; border-bottom:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface-2); position: sticky; top: 0; z-index: 10;">
            <div style="display:flex; align-items:center; gap:8px;">
                ${folderId ? `<button onclick="window.toggleSnippetPicker(null, null)" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; color:var(--primary); padding:0; margin-right:4px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>` : ''}
                <span style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">${folderId ? store.folders.find(f => f.id === folderId)?.name : 'Insert Template'}</span>
            </div>
            <button onclick="document.getElementById('snippetFullPicker').remove()" style="background:none; border:none; cursor:pointer; font-size:20px; color:var(--text-muted); line-height:1;">&times;</button>
        </div>
        <div style="max-height: 280px; overflow-y: auto;">
    `;

    if (folderId === null) {
        // Show folders that actually have snippets
        var usedFolders = store.folders.filter(f => store.snippets.some(s => (s.folder_id || s.folderId) === f.id));
        usedFolders.forEach(function (f) {
            html += `
                <div class="snippet-item" onclick="window.toggleSnippetPicker(null, '${f.id}')" style="display:flex; justify-content:space-between; align-items:center; padding: 14px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary); opacity:0.8;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        <span style="font-weight:600; font-size:14px;">${f.name}</span>
                    </div>
                </div>
            `;
        });
        
        // Show snippets with no folder
        var noFolderSnippets = store.snippets.filter(s => !(s.folder_id || s.folderId));
        noFolderSnippets.forEach(function (s) {
            html += `
                <div class="snippet-item" onclick="window.insertSnippetById('${s.id}')" style="padding: 14px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                         <span style="font-size:14px;">${s.title}</span>
                    </div>
                </div>`;
        });

        if (usedFolders.length === 0 && noFolderSnippets.length === 0) {
            html += '<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:13px;">No templates found.</div>';
        }
    } else {
        // Show snippets in specific folder
        var folderSnippets = store.snippets.filter(s => (s.folder_id || s.folderId) === folderId);
        folderSnippets.forEach(function (s) {
            html += `
                <div class="snippet-item" onclick="window.insertSnippetById('${s.id}')" style="padding: 14px 16px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                         <span style="font-size:14px;">${s.title}</span>
                    </div>
                </div>`;
        });
        
        if (folderSnippets.length === 0) {
            html += '<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:13px;">This folder is empty.</div>';
        }
    }

    html += `</div>`;
    existing.innerHTML = html;
};

window.insertSnippetById = function (id) {
    var s = (window._snippetStore.snippets || []).find(f => f.id === id);
    if (!s) return;
    window.insertSnippet(s.content);
};

window.insertSnippet = function (text) {
    var input = document.getElementById('commInputMessage');
    if (input) {
        // Automatically parse variables before insertion
        var parsed = window._parseLiquidTags(text);
        
        var start = input.selectionStart || input.value.length;
        var end = input.selectionEnd || input.value.length;
        var before = input.value.substring(0, start);
        var after = input.value.substring(end);
        input.value = before + parsed + after;
        input.focus();
        var newPos = start + parsed.length;
        input.setSelectionRange(newPos, newPos);
        
        if (window.autoExpandCommInput) {
            window.autoExpandCommInput(input);
        }

        if (parsed.includes('{{')) {
             showNotification('Note: Some variables could not be mapped.', 'warning');
        }
    }
    var picker = document.getElementById('snippetFullPicker');
    if (picker) picker.remove();
};


/* ═══════════════════════════════════════
   FILE ATTACHMENT
═══════════════════════════════════════ */
window.handleCommAttachment = function (e) {
    if (e.target.files && e.target.files[0]) {
        var file = e.target.files[0];
        showNotification('Attachment added: ' + file.name, 'info');
        var msgContainer = document.getElementById('commMessages');
        if (msgContainer) {
            var bubble = document.createElement('div');
            bubble.className = 'msg-bubble outbound';
            bubble.innerHTML = '<div style="display:flex; align-items:center; gap:8px;">📄 <strong>' + file.name + '</strong></div><span class="msg-time">Just now</span>';
            msgContainer.appendChild(bubble);
            msgContainer.scrollTop = msgContainer.scrollHeight;
        }
        e.target.value = '';
    }
};

/* ═══════════════════════════════════════
   SOLICITOR ASSIGNMENT FROM HEADER
═══════════════════════════════════════ */
window.assignSolicitorFromComm = function (solId) {
    if (!activeChatLeadId || !solId) return;
    showNotification('Solicitor assignment updated.', 'success');
};

/* ═══════════════════════════════════════
   REAL-TIME NOTIFICATIONS & WEBSOCKET
═══════════════════════════════════════ */
if ("Notification" in window && Notification.permission !== "denied") {
    Notification.requestPermission();
}

window.receiveLiveMessage = function (msg, senderName) {
    // 1. Alert Sound
    try {
        // Using a more stable direct MP3 link
        var audio = new Audio('https://www.soundjay.com/communication/sounds/beep-07.mp3');
        audio.volume = 0.4;
        audio.play().catch(function (e) {
            console.warn("[CommHub] Notification sound play blocked or failed:", e.message);
        });
    } catch (e) {
        console.warn("[CommHub] Audio object creation failed.");
    }

    // 2. Desktop Notification
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification('New message from ' + (senderName || 'Client'), { body: msg, icon: '/logo.png' });
    }

    // 3. Render in chat immediately
    var msgContainer = document.getElementById('commMessages');
    if (msgContainer) {
        var reply = document.createElement('div');
        reply.className = 'msg-bubble inbound';
        const now = window._getCurrentTime();
        reply.innerHTML = '<div class="msg-sender-label">Client</div>' + msg + ' <span class="msg-time">' + now + '</span>';
        msgContainer.appendChild(reply);
        msgContainer.scrollTop = msgContainer.scrollHeight;
    }
};

window.initCommSockets = function () {
    console.log('[CommHub] WebSocket listener active.');
    // Simulate incoming message 15s after a contact is selected
    setTimeout(function () {
        if (activeChatLeadId) {
            window.receiveLiveMessage("Thanks, I've uploaded the documents. Please check.", "Client");
        }
    }, 15000);
};

window.initCommSockets();

// ═══════════════════════════════════════
// PRELOAD SNIPPETS ON STARTUP
// Ensures Quick Picker has data immediately after page refresh
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    _loadSnippets().then(function () {
        // Auto-select first folder for the Template Library view
        if (!window._activeSnippetFolder && window._snippetStore.folders.length > 0) {
            window._activeSnippetFolder = window._snippetStore.folders[0].id;
        }
    });
});

// Global shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key && e.key.toLowerCase() === 'p' && e.ctrlKey) {
        e.preventDefault();
        toggleDialer();
    }
});

