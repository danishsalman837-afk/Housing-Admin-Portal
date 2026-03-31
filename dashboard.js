// Dashboard script with error handling
let submissionsData = [];

// Expose update function to the popup window
window.updateSolicitor = async function(id, solicitorName) {
  try {
    const res = await fetch('/api/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, solicitorName })
    });
    if (res.ok) {
      alert("Solicitor assigned successfully!");
      location.reload(); // Refresh the table to show updates
    } else {
      const err = await res.json();
      alert("Error saving: " + (err.error || "Unknown error"));
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
};

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
      
      // Handle timestamp formatting safely
      const ts = item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A";
      const solicitorHtml = item.solicitorName 
        ? `<span style="color: green; font-weight: bold;">${item.solicitorName}</span>` 
        : `<span style="color: #888; font-style: italic;">Unassigned</span>`;
      
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name || "N/A"}</td>
        <td>${item.phone || "N/A"}</td>
        <td>${item.tenantType || "N/A"}</td>
        <td>${ts}</td>
        <td>${solicitorHtml}</td>
        <td><button class="view-btn" data-index="${index}">View</button></td>
      `;
      tbody.appendChild(tr);
    });

    // View Details Button
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const idx = e.target.getAttribute("data-index");
        const item = submissionsData[idx];
        let html = "<h2>Submission Details</h2><div style='font-family: sans-serif; padding: 20px;'>";
        
        // Add the Solicitor Assignment box at the top
        html += `<div style="background-color: #f0f7ff; padding: 15px; border: 1px solid #cce0ff; border-radius: 6px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0066cc;">Assign Solicitor</h3>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="solicitorInput" placeholder="Enter Solicitor Name..." value="${item.solicitorName || ''}" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <button onclick="window.opener.updateSolicitor('${item.id}', document.getElementById('solicitorInput').value); window.close();" style="padding: 8px 15px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Save & Close</button>
          </div>
        </div>`;

        // Render all other fields safely
        for (const key in item) {
          if (key === 'solicitorName') continue; // Skip rendering here since it's at the top

          let val = item[key];
          if (Array.isArray(val)) {
             val = val.join(", ");
          } else if (typeof val === "object" && val !== null) {
             val = JSON.stringify(val);
          }
          if (val === undefined || val === null) val = "";
          html += `<p style='margin:5px 0'><strong>${key}:</strong> ${val}</p>`;
        }
        html += "</div>";
        const win = window.open("", "_blank", "width=600,height=700");
        win.document.write(html);
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

    // Get all unique headers
    const headers = new Set();
    submissionsData.forEach(item => Object.keys(item).forEach(key => headers.add(key)));
    const headerArr = Array.from(headers);
    
    // Construct CSV String
    const csvRows = [];
    csvRows.push(headerArr.join(',')); // Add header row

    submissionsData.forEach(item => {
        const row = headerArr.map(header => {
            let val = item[header];
            if (val === null || val === undefined) val = "";
            else if (Array.isArray(val)) val = val.join("; ");
            else if (typeof val === "object") val = JSON.stringify(val);
            else val = String(val);

            // Escape quotes and wrap in quotes for CSV safety
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