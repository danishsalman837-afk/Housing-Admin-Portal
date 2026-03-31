// Dashboard script with View & Edit functionality
let submissionsData = [];

// Fields that should not be editable
const readonlyFields = ['id', 'timestamp', 'created_at'];

// Show a toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

// Close the modal
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// Open View modal (read-only)
function openViewModal(item) {
  const modal = document.getElementById('modalBox');
  let html = `
    <div class="modal-header">
      <h2>Submission Details</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>`;

  // Solicitor section at the top
  html += `<div class="solicitor-section">
    <label>Assigned Solicitor</label>
    <p style="margin:5px 0; font-size:16px; font-weight:600; color: ${item.solicitorName ? '#28a745' : '#888'};">
      ${item.solicitorName || 'Unassigned'}
    </p>
  </div>`;

  // All fields as read-only display
  for (const key in item) {
    if (key === 'solicitorName') continue;
    let val = item[key];
    if (Array.isArray(val)) val = val.join(", ");
    else if (typeof val === "object" && val !== null) val = JSON.stringify(val);
    if (val === undefined || val === null) val = "";

    // Format the label nicely
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    html += `<div class="modal-field readonly">
      <label>${label}</label>
      <input type="text" value="${String(val).replace(/"/g, '&quot;')}" readonly>
    </div>`;
  }

  html += `<div class="modal-actions">
    <button class="btn-cancel" onclick="closeModal()">Close</button>
    <button class="btn-save" onclick="closeModal(); openEditModal(submissionsData.find(s => s.id === '${item.id}'));">Edit This Submission</button>
  </div>`;

  modal.innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
}

// Open Edit modal (editable fields)
function openEditModal(item) {
  const modal = document.getElementById('modalBox');
  let html = `
    <div class="modal-header">
      <h2>Edit Submission</h2>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <form id="editForm">`;

  // Solicitor section at the top (editable)
  html += `<div class="solicitor-section">
    <label>Assign Solicitor</label>
    <input type="text" name="solicitorName" value="${(item.solicitorName || '').replace(/"/g, '&quot;')}" placeholder="Enter solicitor name...">
  </div>`;

  // All other fields
  for (const key in item) {
    if (key === 'solicitorName') continue;
    let val = item[key];
    if (Array.isArray(val)) val = val.join(", ");
    else if (typeof val === "object" && val !== null) val = JSON.stringify(val);
    if (val === undefined || val === null) val = "";

    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    const isReadonly = readonlyFields.includes(key);

    if (isReadonly) {
      html += `<div class="modal-field readonly">
        <label>${label}</label>
        <input type="text" value="${String(val).replace(/"/g, '&quot;')}" readonly>
      </div>`;
    } else {
      // Use textarea for long text fields
      const isLong = String(val).length > 80;
      if (isLong) {
        html += `<div class="modal-field">
          <label>${label}</label>
          <textarea name="${key}">${String(val).replace(/</g, '&lt;')}</textarea>
        </div>`;
      } else {
        html += `<div class="modal-field">
          <label>${label}</label>
          <input type="text" name="${key}" value="${String(val).replace(/"/g, '&quot;')}">
        </div>`;
      }
    }
  }

  html += `</form>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-save" onclick="saveEdit('${item.id}')">Save Changes</button>
    </div>`;

  modal.innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
}

// Save edits to Supabase
async function saveEdit(id) {
  const form = document.getElementById('editForm');
  const formData = new FormData(form);
  const updates = { id };

  for (const [key, value] of formData.entries()) {
    updates[key] = value;
  }

  try {
    const res = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (res.ok) {
      closeModal();
      showToast("Submission updated successfully!");
      setTimeout(() => location.reload(), 800);
    } else {
      const err = await res.json();
      showToast("Error: " + (err.error || "Unknown error"), 'error');
    }
  } catch (err) {
    showToast("Network error: " + err.message, 'error');
  }
}

// Close modal when clicking overlay background
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Load and render submissions
(async function() {
  try {
    const response = await fetch('/api/submissions');
    if (!response.ok) throw new Error("Failed to fetch submissions");
    
    submissionsData = await response.json();
    const tbody = document.querySelector("#submissionTable tbody");

    if (submissionsData.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7" style="text-align:center;">No submissions found</td>`;
      tbody.appendChild(tr);
      return;
    }

    submissionsData.forEach((item, index) => {
      const tr = document.createElement("tr");
      const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A";
      const solicitorHtml = item.solicitorName 
        ? `<span style="color: #28a745; font-weight: bold;">${item.solicitorName}</span>` 
        : `<span style="color: #888; font-style: italic;">Unassigned</span>`;
      
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name || "N/A"}</td>
        <td>${item.phone || "N/A"}</td>
        <td>${item.tenantType || "N/A"}</td>
        <td>${ts}</td>
        <td>${solicitorHtml}</td>
        <td>
          <div class="action-btns">
            <button class="view-btn" data-index="${index}">View</button>
            <button class="edit-btn" data-index="${index}">Edit</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // View button handlers
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        openViewModal(submissionsData[idx]);
      });
    });

    // Edit button handlers
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        openEditModal(submissionsData[idx]);
      });
    });

  } catch(err) {
    console.error("Error loading submissions:", err);
    const tbody = document.querySelector("#submissionTable tbody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Could not load submissions. Make sure the server is configured.</td></tr>`;
  }
})();

// CSV Download Logic
document.getElementById('downloadCsvBtn')?.addEventListener('click', () => {
    if (submissionsData.length === 0) {
        alert("No data available to download.");
        return;
    }

    const headers = new Set();
    submissionsData.forEach(item => Object.keys(item).forEach(key => headers.add(key)));
    const headerArr = Array.from(headers);
    
    const csvRows = [];
    csvRows.push(headerArr.join(','));

    submissionsData.forEach(item => {
        const row = headerArr.map(header => {
            let val = item[header];
            if (val === null || val === undefined) val = "";
            else if (Array.isArray(val)) val = val.join("; ");
            else if (typeof val === "object") val = JSON.stringify(val);
            else val = String(val);
            val = val.replace(/"/g, '""');
            return `"${val}"`;
        });
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Submissions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});