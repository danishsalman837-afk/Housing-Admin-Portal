// Professional Enterprise Dashboard & CRM Script
let submissionsData = [];
let charts = {};

const leadStatuses = [
  'New Lead', 'Transferred', 'Accepted', 'Rejected', 
  'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

// Switch between View Screens
window.switchView = function(view) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (view === 'dashboard') {
        document.getElementById('dashboardView').classList.add('active');
        document.querySelectorAll('.nav-item')[0].classList.add('active');
        calculateDashboardStats();
    } else if (view === 'leads') {
        document.getElementById('leadsView').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
        renderTable(submissionsData);
    }
};

// Calculate & Display Authentic Dashboard Stats
function calculateDashboardStats() {
    if (!submissionsData.length) return;

    const total = submissionsData.length;
    const acceptedArr = submissionsData.filter(s => s.leadStatus === 'Accepted');
    const accepted = acceptedArr.length;
    const rejected = submissionsData.filter(s => s.leadStatus === 'Rejected').length;
    const uniqueSolicitors = [...new Set(submissionsData.map(s => s.solicitorName).filter(Boolean))].length;

    // --- Month-over-Month Comparison ---
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthLeads = submissionsData.filter(s => {
        const d = new Date(s.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const lastMonthLeads = submissionsData.filter(s => {
        const d = new Date(s.timestamp);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    // Calculate Leads Trend
    let leadTrendHtml = '';
    if (lastMonthLeads > 0) {
        const diff = ((thisMonthLeads - lastMonthLeads) / lastMonthLeads) * 100;
        const colorClass = diff >= 0 ? 'plus' : 'minus';
        const arrow = diff >= 0 ? '↑' : '↓';
        leadTrendHtml = `<span class="trend ${colorClass}">${arrow} ${Math.abs(diff).toFixed(1)}% from last month</span>`;
    } else {
        leadTrendHtml = `<span class="trend plus">New growth this month</span>`;
    }

    // Display basic stats
    document.getElementById('dashboardTotal').innerText = total;
    document.getElementById('dashboardConvRate').innerText = total > 0 ? ((accepted / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('dashboardRejected').innerText = rejected;
    document.getElementById('dashboardSolicitors').innerText = uniqueSolicitors;

    // Update Trend UI in Dashboard Cards
    const trendContainers = document.querySelectorAll('.stat-card .trend');
    if (trendContainers[0]) trendContainers[0].innerHTML = leadTrendHtml;
    // (You can add more specific trend logic for conversion/rejection if desired)

    initCharts(submissionsData);
}

// Initialize Charts using Chart.js
function initCharts(data) {
    const ctxFlow = document.getElementById('leadsFlowChart');
    const ctxStatus = document.getElementById('statusDonutChart');

    if (!ctxFlow || !ctxStatus) return;

    // Cleanup existing charts if they exist
    if (charts.flow) charts.flow.destroy();
    if (charts.status) charts.status.destroy();

    // 1. Line Chart: Lead Flow (Simulated/Calculated by Month from timestamps)
    // We'll group by month name
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const flowData = new Array(12).fill(0);
    
    data.forEach(s => {
        if (s.timestamp) {
            const m = new Date(s.timestamp).getMonth();
            flowData[m]++;
        }
    });

    charts.flow = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Lead Inbound Volume',
                data: flowData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 2. Donut Chart: Status Distribution
    const statusCounts = leadStatuses.map(status => data.filter(s => s.leadStatus === status).length);
    
    charts.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: leadStatuses,
            datasets: [{
                data: statusCounts,
                backgroundColor: [
                    '#3b82f6', '#f59e0b', '#10b981', '#ef4444', 
                    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
            }
        }
    });
}

// ======== DATA RENDERING ========

function getStatusClass(status) {
    if (!status) return 'status-new';
    if (status === 'Accepted') return 'status-accepted';
    if (status === 'Rejected') return 'status-rejected';
    if (status === 'Transferred') return 'status-transferred';
    if (status === 'Test Lead') return 'status-test';
    if (status === 'Paid') return 'status-paid';
    if (status.includes('Invoice')) return 'status-invoice';
    return 'status-new';
}

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const totalCount = document.getElementById('filterCount');
    if (totalCount) totalCount.innerText = `Showing ${data.length} of ${submissionsData.length}`;

    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        const ts = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB') : "N/A";
        const solicitor = item.solicitorName || "Unassigned";
        const buttonId = item.id || index;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${item.name || "Unknown"}</strong></td>
            <td>${item.phone || "---"}</td>
            <td>${solicitor}</td>
            <td>${ts}</td>
            <td>
                <select class="status-select ${getStatusClass(item.leadStatus)}" onchange="window.handleStatusUpdate('${buttonId}', this)">
                    ${leadStatuses.map(s => `<option value="${s}" ${ (item.leadStatus || 'New Lead') === s ? 'selected' : '' }>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="action-btn-group">
                    <button class="btn-action" onclick="window.openViewModal('${buttonId}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        View
                    </button>
                    <button class="btn-action" onclick="window.openEditModal('${buttonId}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Edit
                    </button>
                    <button class="btn-action" onclick="window.openNotesModal('${buttonId}')">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        Log
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ======== FILTERS ========

const filterSolicitor = document.getElementById('filterSolicitor');
const filterStatus = document.getElementById('filterStatus');
const searchInput = document.getElementById('searchInput');

function populateFilters() {
    if (filterStatus) {
        filterStatus.innerHTML = '<option value="">Filter by Status...</option>';
        leadStatuses.forEach(s => {
            filterStatus.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
    if (filterSolicitor) {
        const solicitors = [...new Set(submissionsData.map(s => s.solicitorName).filter(Boolean))].sort();
        filterSolicitor.innerHTML = `
            <option value="">Filter by Solicitor...</option>
            <option value="__unassigned__">Unassigned Leads</option>
            ${solicitors.map(s => `<option value="${s}">${s}</option>`).join('')}
        `;
    }
}

function applyFilters() {
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const solVal = filterSolicitor ? filterSolicitor.value : '';
    const statVal = filterStatus ? filterStatus.value : '';

    const filtered = submissionsData.filter(item => {
        const matchesSearch = !search || 
            (item.name || '').toLowerCase().includes(search) || 
            (item.phone || '').toLowerCase().includes(search);
        if (!matchesSearch) return false;

        if (solVal) {
            if (solVal === '__unassigned__') {
                if (item.solicitorName) return false;
            } else if (item.solicitorName !== solVal) {
                return false;
            }
            if (statVal && (item.leadStatus || 'New Lead') !== statVal) return false;
        }
        return true;
    });
    renderTable(filtered);
}

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (filterSolicitor) {
    filterSolicitor.addEventListener('change', () => {
        if (filterSolicitor.value) filterStatus.classList.remove('hidden');
        else { filterStatus.classList.add('hidden'); filterStatus.value = ''; }
        applyFilters();
    });
}
if (filterStatus) filterStatus.addEventListener('change', applyFilters);

window.clearAllFilters = function() {
    if (searchInput) searchInput.value = '';
    if (filterSolicitor) filterSolicitor.value = '';
    if (filterStatus) { filterStatus.value = ''; filterStatus.classList.add('hidden'); }
    applyFilters();
};

// ======== DATABASE UPDATES ========

window.handleStatusUpdate = async function(id, el) {
    const newStatus = el.value;
    // Update color class instantly
    el.className = `status-select ${getStatusClass(newStatus)}`;
    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, leadStatus: newStatus })
        });
        if (res.ok) {
            const item = submissionsData.find(s => String(s.id) === String(id));
            if (item) item.leadStatus = newStatus;
            calculateDashboardStats();
        }
    } catch (e) {
        console.error(e);
    }
};

// Re-implementing View Modal Logic
window.openViewModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;
    
    let fieldsHtml = '';
    const mainKeys = ['name', 'phone', 'email', 'tenantType', 'solicitorName', 'leadStatus'];
    const otherKeys = Object.keys(item).filter(k => !mainKeys.includes(k) && k !== 'notes');
    
    [...mainKeys, ...otherKeys].forEach(key => {
        if (!item.hasOwnProperty(key)) return;
        let val = item[key];
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        fieldsHtml += `<div style="margin-bottom:12px; font-size:13px;"><label style="font-weight:700; color:#64748b; font-size:10px; text-transform:uppercase; display:block;">${label}</label><div style="padding:10px; background:#f8fafc; border-radius:8px; margin-top:4px;">${val || '---'}</div></div>`;
    });

    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>Lead Details</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="max-height: 450px; overflow-y: auto; padding-right:10px;">${fieldsHtml}</div>
        <div style="margin-top:20px; display:flex; gap:10px;">
            <button onclick="window.downloadLead('${id}')" style="flex:1; padding:12px; background:#0f172a; color:white; border-radius:10px; font-weight:700; border:none; cursor:pointer;">Download Profile</button>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border-radius:10px; font-weight:700; border:none; cursor:pointer;">Close</button>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

// Edit Full Lead Details Modal (Dynamic for all Questions)
window.openEditModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;

    let formHtml = '';
    const ignore = ['id', 'notes', 'timestamp', 'solicitorName', 'leadStatus'];
    
    // First: Important Fields
    const priority = ['name', 'phone', 'email', 'tenantType', 'solicitorName'];
    const otherFields = Object.keys(item).filter(k => !priority.includes(k) && !ignore.includes(k));

    [...priority, ...otherFields].forEach(key => {
        if (!item.hasOwnProperty(key)) return;
        const val = item[key] || '';
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        formHtml += `
            <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">${label}</label>
                <input type="text" class="edit-input" data-key="${key}" value="${val}" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; outline:none; background:#fdfdfd;">
            </div>
        `;
    });

    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="font-size:18px; font-weight:800; color:#1e293b;">Complete Lead Editor</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer; color:#94a3b8;">&times;</button>
        </div>
        <div style="max-height:400px; overflow-y:auto; padding-right:12px; display:flex; flex-direction:column; gap:16px;">
            ${formHtml}
        </div>
        <div style="margin-top:20px; display:flex; gap:12px; padding-top:15px; border-top:1px solid #f1f5f9;">
            <button onclick="window.saveEdit('${id}')" style="flex:1.5; padding:12px; background:#2563eb; color:white; border-radius:12px; font-weight:700; border:none; cursor:pointer; font-size:14px; box-shadow:0 4px 6px rgba(37, 99, 235, 0.2);">Save Full Lead Profile</button>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="flex:1; padding:12px; background:#f1f5f9; color:#64748b; border-radius:12px; font-weight:700; border:none; cursor:pointer; font-size:14px;">Dismiss</button>
        </div>
    `;
    document.getElementById('modalOverlay').style.display = 'flex';
};

window.saveEdit = async function(id) {
    const payload = { id };
    const inputs = document.querySelectorAll('.edit-input');
    
    inputs.forEach(input => {
        payload[input.dataset.key] = input.value;
    });

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const item = submissionsData.find(s => String(s.id) === String(id));
            if (item) {
                Object.keys(payload).forEach(k => {
                    if (k !== 'id') item[k] = payload[k];
                });
            }
            document.getElementById('modalOverlay').style.display = 'none';
            applyFilters(); 
            calculateDashboardStats();
        }
    } catch (e) { console.error(e); }
};

// Activity Log / Notes Modal
window.openNotesModal = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;

    const notesHistory = (item.notes || []).map(n => `
        <div style="padding:12px; background:#f8fafc; border-left:4px solid #3b82f6; border-radius:8px; margin-bottom:10px;">
            <p style="font-size:13px; color:#1e293b;">${n.text}</p>
            <span style="font-size:10px; color:#94a3b8; font-weight:700;">${n.time}</span>
        </div>
    `).join('') || '<p style="color:#94a3b8; font-size:13px;">No updates found.</p>';

    document.getElementById('modalBox').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>Activity Log</h2>
            <button onclick="document.getElementById('modalOverlay').style.display='none'" style="border:none; background:none; font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <div style="margin-bottom:20px;">
            <textarea id="newNote" placeholder="Add a status update or internal note..." style="width:100%; padding:12px; border:1px solid #e2e8f0; border-radius:10px; height:80px;"></textarea>
            <button onclick="window.saveNote('${id}')" style="margin-top:10px; width:100%; padding:12px; background:#3b82f6; color:white; border-radius:10px; font-weight:700; border:none; cursor:pointer;">Add Note</button>
        </div>
        <div style="max-height:250px; overflow-y:auto;">${notesHistory}</div>
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
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, notes })
        });
        if (res.ok) {
            item.notes = notes;
            window.openNotesModal(id);
        }
    } catch (e) { console.error(e); }
};

// Professional .docx Document Engine
window.downloadLead = function(id) {
    const item = submissionsData.find(s => String(s.id) === String(id));
    if (!item) return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

    const children = [
        new Paragraph({
            text: `LEAD PROFILE: ${item.name || 'UNKNOWN'}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Generated on: ", bold: true }),
                new TextRun(new Date().toLocaleString('en-GB')),
            ],
            spacing: { after: 400 }
        })
    ];

    // --- Dynamic Q&A Injection ---
    const mainKeys = ['name', 'phone', 'email', 'tenantType', 'solicitorName', 'leadStatus'];
    const otherFields = Object.keys(item).filter(k => !mainKeys.includes(k) && !['id', 'notes', 'timestamp'].includes(k));

    [...mainKeys, ...otherFields].forEach(key => {
        if (!item.hasOwnProperty(key)) return;
        const val = item[key] || '---';
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        
        children.push(new Paragraph({
            children: [
                new TextRun({ text: `${label}: `, bold: true }),
                new TextRun(val),
            ],
            spacing: { before: 100 }
        }));
    });

    // --- Activity Log Section ---
    if (item.notes && item.notes.length > 0) {
        children.push(new Paragraph({
            text: "ACTIVITY LOG / CASE NOTES",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 600, after: 200 }
        }));

        item.notes.forEach(n => {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `[${n.time}] `, bold: true, color: "666666", size: 18 }),
                    new TextRun({ text: n.text, size: 20 }),
                ],
                spacing: { after: 100 }
            }));
        });
    }

    const doc = new Document({
        sections: [{ properties: {}, children }]
    });

    Packer.toBlob(doc).then(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `Lead_${(item.name || 'Unknown').replace(/\s+/g,'_')}.docx`;
        a.click();
    });
};

window.exportData = function() {
    const headers = Object.keys(submissionsData[0]).filter(k => k !== 'notes');
    const csv = [headers.join(','), ...submissionsData.map(s => headers.map(h => `"${String(s[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Leads_Report.csv';
    a.click();
};

// ======== INIT ========

(async function init() {
    try {
        const res = await fetch('/api/submissions');
        submissionsData = await res.json();
        
        // Populate and Calculate
        populateFilters();
        calculateDashboardStats();
        
        // Show default view
        switchView('dashboard');
    } catch (e) { console.error("Initialization Error:", e); }
})();