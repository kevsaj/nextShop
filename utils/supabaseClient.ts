import { createClient } from '@supabase/supabase-js';
import { cp } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Function to check if a product is matched in the database
export const checkMatchedProductsInDatabase = async (title: string) => {
  console.log('Checking matched products in database:', title);
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('title', title); // Query by title

  if (error) {
    console.error('Error checking matched products in database:', error);
    return null;
  }

  return data.length > 0 ? data[0] : null; // Return the matched product if found
};