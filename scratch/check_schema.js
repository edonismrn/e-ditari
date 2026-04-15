
import { supabase } from '../src/lib/supabase';

async function checkSchema() {
  const { data, error } = await supabase.from('attendance').select('*').limit(1);
  if (error) {
    console.error('Error fetching attendance:', error);
  } else {
    console.log('Attendance columns:', data.length > 0 ? Object.keys(data[0]) : 'No data found');
  }
}

checkSchema();
