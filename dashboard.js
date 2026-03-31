// Professional Dashboard Script with Dedicated Notes Button
let submissionsData = [];

const leadStatuses = [
  'New Lead', 'Transferred', 'Accepted', 'Rejected', 
  'Not Yet Invoiced', 'Invoice Raised', 'Paid', 'Test Lead'
];

function getStatusClass(status) {
  if (!status) return 'status-new';
  const map = {
    'New Lead': 'status-new',
    'Transferred': 'status-transferred',
    'Accepted': 'status-accepted',
    'Rejected': 'status-rejected',
    'Not Yet Invoiced': 'status-not-yet-invoiced',
    'Invoice Raised': 'status-invoice-raised',
    'Paid': 'status-paid',
    'Test Lead': 'status-test'
  };
  return map[status] || 'status-new';
}

const readonlyFields = ['id', 'timestamp', 'created_at', 'notes'];

window.showToast = function(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
};

window.closeModal = function() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('active');
};

function updateStats() {
    const statTotal = document.getElementById('statTotal');
    const statUnassigned = document.getElementById('statUnassigned');
    if (statTotal) statTotal.textContent = submissionsData.length;
    if (statUnassigned) {
        const unassigned = submissionsData.filter(s => !s.solicitorName).length;
        statUnassigned.textContent = unassigned;
    }
}

// ======== FILTERING ========

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
        const matchesSearch = !search || 
            (item.name || '').toLowerCase().includes(search) || 
            (item.phone || '').toLowerCase().includes(search);
        if (!matchesSearch) return false;
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

function findItem(id) {
    return submissionsData.find((s, idx) => {
        const sId = (s.id !== undefined && s.id !== null) ? String(s.id) : String(idx);
        return sId === String(id);
    });
}

// ======== TABLE ========

function renderTable(data) {
    const tbody = document.querySelector("#submissionTable tbody");
    if (!tbody) return;
    tbody.innerHTML = '';
    
    document.getElementById('filterCount').textContent = `Showing ${data.length} of ${submissionsData.length}`;

    data.forEach((item, index) => {
        const tr = document.createElement("tr");
        const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A";
        const solicitor = item.solicitorName ? `<strong>${item.solicitorName}</strong>` : `<em>Unassigned</em>`;
        const buttonId = (item.id !== undefined && item.id !== null) ? item.id : index;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.name || "N/A"}</td>
            <td>${item.phone || "N/A"}</td>
            <td>${item.tenantType || "N/A"}</td>
            <td>${ts}</td>
            <td>${solicitor}</td>
            <td>
                <select class="status-select ${getStatusClass(item.leadStatus)}" onchange="window.handleStatusUpdate('${buttonId}', this)">
                    ${leadStatuses.map(s => `<option value="${s}" ${ (item.leadStatus || 'New Lead') === s ? 'selected' : '' }>${s}</option>`).join('')}
                </select>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-view" onclick="window.openViewModal('${buttonId}')">👁 View</button>
                    <button class="btn-edit" onclick="window.openEditModal('${buttonId}')">✍ Edit</button>
                    <button class="btn-notes" onclick="window.openNotesModal('${buttonId}')">📝 Notes</button>
                    <button class="btn-download-single" onclick="window.downloadLead('${buttonId}')">📥 Doc</button>
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
            const item = findItem(id);
            if (item) item.leadStatus = newStatus;
            updateStats();
        }
    } catch (e) {
        window.showToast("Error updating status", "error");
    }
};

// ======== MODALS ========

window.openViewModal = function(id) {
    const item = findItem(id);
    if (!item) return;
    const modal = document.getElementById('modalBox');
    
    let fieldsHtml = '';
    const mainKeys = ['name', 'phone', 'email', 'tenantType', 'solicitorName', 'leadStatus'];
    const otherKeys = Object.keys(item).filter(k => !mainKeys.includes(k) && k !== 'notes');
    
    [...mainKeys, ...otherKeys].forEach(key => {
        if (!item.hasOwnProperty(key)) return;
        let val = item[key];
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        fieldsHtml += `<div class="modal-field readonly"><label>${label}</label><input type="text" value="${val || ''}" readonly></div>`;
    });

    modal.innerHTML = `
        <div class="modal-header"><h2>Lead Details</h2><button class="modal-close" onclick="window.closeModal()">&times;</button></div>
        <div class="modal-body">${fieldsHtml}</div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.closeModal()">Close</button>
            <button class="btn btn-primary" onclick="window.downloadLead('${id}')">📥 Download Profile</button>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
};

window.openEditModal = function(id) {
    const item = findItem(id);
    if (!item) return;
    const modal = document.getElementById('modalBox');
    
    let fieldsHtml = '';
    Object.keys(item).forEach(key => {
        if (key === 'notes') return;
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        if (readonlyFields.includes(key)) {
            fieldsHtml += `<div class="modal-field readonly"><label>${label}</label><input type="text" value="${item[key] || ''}" readonly></div>`;
        } else {
            fieldsHtml += `<div class="modal-field"><label>${label}</label><input type="text" name="${key}" value="${item[key] || ''}"></div>`;
        }
    });

    modal.innerHTML = `
        <div class="modal-header"><h2>Edit Lead</h2><button class="modal-close" onclick="window.closeModal()">&times;</button></div>
        <div class="modal-body"><form id="editForm">${fieldsHtml}</form></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="window.closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="window.saveEdit('${id}')">Save Changes</button>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
};

// ======== DEDICATED NOTES MODAL ========

window.openNotesModal = function(id) {
    const item = findItem(id);
    if (!item) return;
    const modal = document.getElementById('modalBox');
    
    function buildNotesHtml(notes) {
        if (!notes || !Array.isArray(notes) || notes.length === 0) return '';
        return notes.map(n => `
            <div class="note-item">
                <p class="note-text">${n.text}</p>
                <span class="note-meta">${n.time}</span>
            </div>
        `).join('');
    }

    modal.innerHTML = `
        <div class="modal-header">
            <h2>Activity Log for ${item.name || 'this Lead'}</h2>
            <button class="modal-close" onclick="window.closeModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="add-note-box">
                <textarea id="newNoteInput" placeholder="Add a new update or note here..." class="modal-field" style="width:100%"></textarea>
                <button class="btn btn-primary" style="margin-top:10px" onclick="window.saveNote('${id}')">Add Note</button>
            </div>
            <div class="notes-section">
                <div class="notes-title">Past Updates</div>
                <div class="notes-history">${buildNotesHtml(item.notes)}</div>
            </div>
        </div>
        <div class="modal-footer"><button class="btn btn-secondary" onclick="window.closeModal()">Close</button></div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
};

window.saveNote = async function(id) {
    const noteEl = document.getElementById('newNoteInput');
    if (!noteEl || !noteEl.value.trim()) {
        alert("Please enter a note!");
        return;
    }
    
    const item = findItem(id);
    const currentNotes = Array.isArray(item.notes) ? [...item.notes] : [];
    const newNote = {
        text: noteEl.value.trim(),
        time: new Date().toLocaleString('en-GB')
    };
    currentNotes.unshift(newNote);

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, notes: currentNotes })
        });
        if (res.ok) {
            window.showToast("Note added successfully!");
            item.notes = currentNotes; // Update local data
            window.openNotesModal(id); // Refresh modal view
        }
    } catch (e) {
        window.showToast("Error saving note", "error");
    }
};

// ======== LEAD EXPORT ENGINE ========

window.downloadLead = function(id) {
    const item = findItem(id);
    if (!item) return;

    const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A";
    let content = `HOUSING LEAD PROFILE: ${item.name || 'UNKNOWN'}\n`;
    content += `========================================================\n`;
    content += `SUBMITTED: ${ts}\n`;
    content += `STATUS: ${item.leadStatus || 'New Lead'}\n`;
    content += `SOLICITOR: ${item.solicitorName || 'Unassigned'}\n\n`;

    content += `CLIENT DATA\n`;
    content += `--------------------------------------------------------\n`;
    Object.keys(item).forEach(key => {
        if (key === 'notes' || key === 'id' || key === 'timestamp') return;
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
        content += `${label}: ${item[key] || 'N/A'}\n`;
    });

    content += `\nACTIVITY LOG / NOTES\n`;
    content += `--------------------------------------------------------\n`;
    if (item.notes && Array.isArray(item.notes)) {
        item.notes.forEach(n => {
            content += `[${n.time}] ${n.text}\n`;
        });
    } else {
        content += `No notes available.\n`;
    }

    content += `\n========================================================\n`;
    content += `Generated via Admin Portal on ${new Date().toLocaleString()}\n`;

    const blob = new Blob([content], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Lead_Profile_${(item.name || 'Unknown').replace(/\s+/g,'_')}.doc`;
    a.click();
};

window.saveEdit = async function(id) {
    const formData = new FormData(document.getElementById('editForm'));
    const updates = { id };
    formData.forEach((v, k) => updates[k] = v);

    try {
        const res = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (res.ok) {
            window.showToast("Saved!");
            location.reload();
        }
    } catch (e) {
        window.showToast("Error saving", "error");
    }
};

// ======== INIT ========

(async function init() {
    try {
        const res = await fetch('/api/submissions');
        submissionsData = await res.json();
        updateStats();
        renderTable(submissionsData);
    } catch (e) {
        console.error(e);
    }
})();

// CSV Logo Logic
const overlay = document.getElementById('modalOverlay');
if (overlay) overlay.onclick = (e) => (e.target === overlay) && window.closeModal();

const downloadBtn = document.getElementById('downloadCsvBtn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
        const headers = Object.keys(submissionsData[0]);
        const csv = [headers.join(','), ...submissionsData.map(s => headers.map(h => `"${String(s[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Leads_Report.csv';
        a.click();
    });
}