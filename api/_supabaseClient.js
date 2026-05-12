const { createClient } = require("@supabase/supabase-js");

const envMap = {
  service: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  anon: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
};

function getMissingEnv(role) {
  const required = envMap[role] || envMap.service;
  return required.filter((key) => !process.env[key]);
}

function assertEnv(role = "service", res) {
  const missing = getMissingEnv(role);
  if (missing.length === 0) return true;

  const errorText = `Missing environment variables: ${missing.join(", ")}. Please configure these in Vercel.`;
  if (res && typeof res.status === "function") {
    return res.status(500).json({ error: errorText });
  }

  throw new Error(errorText);
}

function createSupabaseClient(role = "service") {
  // Caller should validate with assertEnv(role, res) first.
  const url = process.env.SUPABASE_URL;
  const key = role === "anon" ? process.env.SUPABASE_ANON_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(`Missing env for createSupabaseClient(${role})`);
  }

  return createClient(url, key);
}

function normalizeLead(lead) {
  if (!lead) return lead;
  const n = (dbKey, formKey) => { 
    if (lead[dbKey] !== undefined && lead[dbKey] !== null) {
      if (lead[formKey] === undefined || lead[formKey] === null) {
        lead[formKey] = lead[dbKey];
      }
    }
    // Reverse mapping for older saved leads
    if (lead[formKey] !== undefined && lead[formKey] !== null) {
      if (lead[dbKey] === undefined || lead[dbKey] === null) {
        lead[dbKey] = lead[formKey];
      }
    }
  };
  n('dob', 'dateOfBirth');
  n('livingDuration', 'tenancyDuration');
  n('damp', 'hasDampMould');
  n('dampRooms', 'roomsAffected');
  n('dampSurface', 'affectedSurface');
  n('dampDuration', 'issueDuration');
  n('dampCause', 'issueCause');
  n('dampDamage', 'damageBelongings');
  n('dampHealth', 'healthProblems');
  n('leak', 'hasLeaks');
  n('leakCracks', 'cracksDamage');
  n('issuesElectrics', 'faultyElectrics');
  n('issuesHeating', 'heatingIssues');
  n('issuesStructural', 'issuesStructural');
  n('reported', 'reportedOverMonth');
  n('arrears', 'rentalArrears');
  n('attachments', 'attachments');
  
  // Basic mappings
  n('dampLocation', 'dampLocation'); 
  n('leakLocation', 'leakLocation');
  n('leakSource', 'leakSource');
  n('leakStart', 'leakStart');
  n('leakDamage', 'leakDamage');
  n('leakBelongings', 'leakBelongings');
  n('reportCount', 'reportCount');
  n('reportFirst', 'reportFirst');
  n('reportResponse', 'reportResponse');
  n('reportAttempt', 'reportAttempt');
  n('reportStatus', 'reportStatus');
  n('arrearsAmount', 'arrearsAmount');
  n('alreadySubmitted', 'alreadySubmitted');
  n('additionalNotes', 'additionalNotes');
 
  // New Fields
  n('infestation', 'infestation');
  n('propertyType', 'propertyType');
  n('tenancyOnName', 'tenancyOnName');
  n('tenancyType', 'tenancyType');
  n('isNameOnJoint', 'isNameOnJoint');
  n('otherTenantName', 'otherTenantName');
  n('actualTenantFullname', 'actualTenantFullname');
 
  // Robust fallback for Agent Name
  const getAgent = (obj) => {
    if (!obj) return null;
    let target = obj;
    if (typeof obj === 'string') {
      try { target = JSON.parse(obj); } catch(e) { return null; }
    }
    const val = target.agentName || target.agent_name || target.dialler || target.Dialler || target.Dialer || target.agent || target.user_name || target.username;
    if (typeof val === 'string' && val.trim() !== '' && val.trim() !== '--') return val.trim();
    return null;
  };

  const rootAgent = getAgent(lead);
  const backupAgent = getAgent(lead.agentData) || getAgent(lead.agent_data);
  
  if (rootAgent) {
    lead.agentName = rootAgent;
  } else if (backupAgent) {
    lead.agentName = backupAgent;
  }

 
  return lead;
}
 
module.exports = { createSupabaseClient, assertEnv, normalizeLead };