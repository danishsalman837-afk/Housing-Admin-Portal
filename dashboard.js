// Professional Dashboard Script with Advanced Filtering
let submissionsData = [];

// Lead status options
const leadStatuses = [
  'New Lead',
  'Transferred',
  'Accepted',
  'Rejected',
  'Not Yet Invoiced',
  'Invoice Raised',
  'Paid'
];

// Map status to CSS class
function getStatusClass(status) {
  if (!status) return 'status-new';
  const map = {
    'New Lead': 'status-new',
    'Transferred': 'status-transferred',
    'Accepted': 'status-accepted',
    'Rejected': 'status-rejected',
    'Not Yet Invoiced': 'status-not-yet-invoiced',
    'Invoice Raised': 'status-invoice-raised',
    'Paid': 'status-paid'
  };
  return map[status] || 'status-new';
}

const readonlyFields = ['id', 'timestamp', 'created_at', 'solicitorName', 'leadStatus'];

// Make functions global for HTML buttons
window.showToast = function(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
};

window.closeModal = function() {
  document.getElementById('modalOverlay').classList.remove('active');
};

// Update count stats in header
function updateStats() {
    const statTotal = document.getElementById('statTotal');
    const statUnassigned = document.getElementById('statUnassigned');
    if (statTotal) statTotal.textContent = submissionsData.length;
    if (statUnassigned) {
        const unassigned = submissionsData.filter(s => !s.solicitorName).length;
        statUnassigned.textContent = unassigned;
    }
}

// ======== FILTERING LOGIC ========

const filterBy = document.getElementById('filterBy');
const filterValue = document.getElementById('filterValue');
const searchInput = document.getElementById('searchInput');

if (filterBy) {
    filterBy.addEventListener('change', () => {
        const type = filterBy.value;
        filterValue.innerHTML = '<option value="">Select...</option>';
        
        if (!type) {
            filterValue.classList.remove('visible');
        } else {
            filterValue.classList.add('visible');
            if (type === 'status') {
                leadStatuses.forEach(s => {
                    filterValue.innerHTML += `<option value="${s}">${s}</option>`;
                });
            } else if (type === 'solicitor') {
                const solicitors = [...new Set(submissionsData.map(s => s.solicitorName).filter(Boolean))].sort();
                filterValue.innerHTML += `<option value="__unassigned__">Unassigned</option>`;
                solicitors.forEach(s => {
                    filterValue.innerHTML += `<option value="${s}">${s}</option>`;
                });
            }
        }
        applyFilters();
    });
}

function applyFilters() {
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const type = filterBy ? filterBy.value : '';
    const val = filterValue ? filterValue.value : '';

    const filtered = submissionsData.filter(item => {
        // Search
        const matchesSearch = !search || 
            (item.name || '').toLowerCase().includes(search) || 
            (item.phone || '').toLowerCase().includes(search);
        
        if (!matchesSearch) return false;

        // Dropdown Filter
        if (type === 'status' && val) {
            const currentStatus = item.leadStatus || 'New Lead';
            if (currentStatus !== val) return false;
        }
        if (type === 'solicitor' && val) {
            if (val === '__unassigned__') {
                if (item.solicitorName) return false;
            } else if (item.solicitorName !== val) {
                return false;
            }
        }

        return true;
    });

    renderTable(filtered);
}

if (searchInput) searchInput.addEventListener('input', applyFilters);
if (filterValue) filterValue.addEventListener('change', applyFilters);

window.clearFilters = function() {
    if (searchInput) searchInput.value = '';
    if (filterBy) filterBy.value = '';
    if (filterValue) {
        filterValue.value = '';
        filterValue.classList.remove('visible');
    }
    applyFilters();
};

// ======== RENDER TABLE ========

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const countEl = document.getElementById('filterCount');
    if (countEl) countEl.textContent = `Showing ${data.length} of ${submissionsData.length}`;

    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A";
        const solicitor = item.solicitorName ? `<strong>${item.solicitorName}</strong>` : `<span style="color:#999">Unassigned</span>`;
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name || "N/A"}</td>
            <td>${item.phone || "N/A"}</td>
            <td>${item.tenantType || "N/A"}</td>
            <td>${ts}</td>
            <td>${solicitor}</td>
            <td>
                <select class="status-select ${getStatusClass(item.leadStatus)}" onchange="window.handleStatusUpdate('${item.id}', this)">
                    ${leadStatuses.map(s => `<option value="${s}" ${ (item.leadStatus || 'New Lead') === s ? 'selected' : '' }>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-view" onclick="window.openViewModal('${item.id}')">View</button>
                    <button class="btn-edit" onclick="window.openEditModal('${item.id}')">Edit</button>
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
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, leadStatus: newStatus })
        });
        if (res.ok) {
            window.showToast("Status updated");
            const item = submissionsData.find(s => s.id === id);
            if (item) item.leadStatus = newStatus;
            updateStats();
        }
    } catch (e) {
        window.showToast("Error updating status", "error");
    }
};

// ======== MODALS ========

window.openViewModal = function(id) {
    const item = submissionsData.find(s => s.id === id);
    if (!item) return;
    const modal = document.getElementById('modalBox');
    if (!modal) return;
    
    let fieldsHtml = '';
    // Custom order: show main fields first
    const mainKeys = ['name', 'phone', 'email', 'tenantType', 'solicitorName', 'leadStatus'];
    const otherKeys = Object.keys(item).filter(k => !mainKeys.includes(k));
    
    [...mainKeys, ...otherKeys].forEach(key => {
        if (!item.hasOwnProperty(key)) return;
        let val = item[key];
        if (Array.isArray(val)) val = val.join(", ");
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        fieldsHtml += `<div class="modal-field readonly"><label>${label}</label><input type="text" value="${val || ''}" readonly></div>`;
    });

    modal.innerHTML = `
        <div class="modal-header">
            <h2>Lead Details</h2>
            <button class="modal-close" onclick="window.closeModal()">&times;</button>
        </div>
        <div class="modal-body">${fieldsHtml}</div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
};

window.openEditModal = function(id) {
    const item = submissionsData.find(s => s.id === id);
    if (!item) return;
    const modal = document.getElementById('modalBox');
    if (!modal) return;
    
    let fieldsHtml = '';
    
    // Core selection fields
    fieldsHtml += `
        <div class="solicitor-section">
            <div class="modal-field">
                <label>Assigned Solicitor</label>
                <input type="text" name="solicitorName" value="${item.solicitorName || ''}" placeholder="Enter name...">
            </div>
            <div class="modal-field">
                <label>Lead Status</label>
                <select name="leadStatus" class="filter-select" style="width:100%">
                    ${leadStatuses.map(s => `<option value="${s}" ${ (item.leadStatus || 'New Lead') === s ? 'selected' : '' }>${s}</option>`).join('')}
                </select>
            </div>
        </div>
    `;

    // Rest of fields
    Object.keys(item).forEach(key => {
        if (key === 'solicitorName' || key === 'leadStatus') return;
        
        if (readonlyFields.includes(key)) {
            fieldsHtml += `<div class="modal-field readonly"><label>${key}</label><input type="text" value="${item[key] || ''}" readonly></div>`;
        } else {
            fieldsHtml += `<div class="modal-field"><label>${key}</label><input type="text" name="${key}" value="${item[key] || ''}"></div>`;
        }
    });

    modal.innerHTML = `
        <div class="modal-header">
            <h2>Edit Lead</h2>
            <button class="modal-close" onclick="window.closeModal()">&times;</button>
        </div>
        <div class="modal-body"><form id="editForm">${fieldsHtml}</form></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="window.saveEdit('${id}')">Save Changes</button>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
};

window.saveEdit = async function(id) {
    const form = document.getElementById('editForm');
    const formData = new FormData(form);
    const updates = { id };
    formData.forEach((value, key) => updates[key] = value);

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (res.ok) {
            window.showToast("Saved successfully");
            setTimeout(() => location.reload(), 1000);
        }
    } catch (e) {
        window.showToast("Error saving", "error");
    }
};

// Close modal when clicking overlay background
const overlay = document.getElementById('modalOverlay');
if (overlay) {
    overlay.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) window.closeModal();
    });
}

// ======== INIT ========

(async function init() {
    try {
        const res = await fetch('/api/submissions');
        submissionsData = await res.json();
        updateStats();
        renderTable(submissionsData);
    } catch (e) {
        console.error(e);
        const tbody = document.querySelector("#submissionTable tbody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:red;">Error loading data</td></tr>';
    }
})();

// CSV Logic
const downloadBtn = document.getElementById('downloadCsvBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        if (!submissionsData.length) return;
        const headers = Object.keys(submissionsData[0]).join(',');
        const rows = submissionsData.map(s => Object.values(s).map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Leads_Report.csv';
        a.click();
    });
}