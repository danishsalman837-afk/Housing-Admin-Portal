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
  n('issues_electrics', 'faultyElectrics');
  n('issues_heating', 'heatingIssues');
  n('issues_structural', 'structuralDamage');
  n('reported', 'reportedOverMonth');
  n('arrears', 'rentalArrears');
  n('attachments', 'attachments');
  
  // Snake case to camelCase for dashboard/form consistency
  // Resilient mappings for Name and Phone
  if (lead.first_name && !lead.name) lead.name = lead.first_name;
  if (lead.name && !lead.first_name) lead.first_name = lead.name;
  
  if (lead.mobile_number && !lead.phone) lead.phone = lead.mobile_number;
  if (lead.phone && !lead.mobile_number) lead.mobile_number = lead.phone;
  // Fields that are already camelCase in DB or fixed lowercase/snake_case
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
  n('agent_name', 'agentName');
  
  // Cross-reference fallbacks for Agent Name
  if (!lead.agentName || lead.agentName === '--') {
    const backup = lead.agent_data;
    if (backup) {
      lead.agentName = backup.agentName || backup.agent_name || backup.dialler || backup.Dialler || lead.agentName;
    }
  }

  // Ensure 'name' is populated from 'first_name' if missing
  if (!lead.name && lead.first_name) lead.name = lead.first_name;

  return lead;
}

module.exports = { createSupabaseClient, assertEnv, normalizeLead };