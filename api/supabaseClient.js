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
  
  // Snake case to camelCase for dashboard/form consistency
  n('first_name', 'name');
  n('mobile_number', 'phone');
  n('damp_location', 'dampLocation');
  n('leak_location', 'leakLocation');
  n('leak_source', 'leakSource');
  n('leak_start', 'leakStart');
  n('leak_damage', 'leakDamage');
  n('leak_belongings', 'leakBelongings');
  n('report_count', 'reportCount');
  n('report_first', 'reportFirst');
  n('report_response', 'reportResponse');
  n('report_attempt', 'reportAttempt');
  n('report_status', 'reportStatus');
  n('arrears_amount', 'arrearsAmount');
  n('additional_notes', 'additionalNotes');
  
  return lead;
}

module.exports = { createSupabaseClient, assertEnv, normalizeLead };