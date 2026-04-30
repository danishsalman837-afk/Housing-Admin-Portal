require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const phone = '07897723956'; // We need a real phone number from DB. Let's just select 1 to find a phone.
  const { data: sample } = await supabase.from('submissions').select('phone, mobile_number').limit(1);
  console.log("Sample phone:", sample);
  
  if (sample && sample.length > 0) {
    const testPhone = sample[0].phone || sample[0].mobile_number;
    console.log("Testing with phone:", testPhone);
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .or(`phone.eq."${testPhone}",mobile_number.eq."${testPhone}"`)
      .order('timestamp', { ascending: false })
      .limit(1);
    
    console.log("Error:", error);
    console.log("Data found:", data ? data.length : 0);
  }
}

test();
