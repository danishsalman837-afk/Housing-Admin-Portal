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

module.exports = { createSupabaseClient, assertEnv };