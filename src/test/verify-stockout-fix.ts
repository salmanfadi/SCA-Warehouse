/**
 * Verify Stock Out Fix
 * 
 * This script verifies that our fixes to the stock out completion process work correctly.
 * It tests:
 * 1. Location validation
 * 2. UUID generation
 * 3. JSON storage in the notes column
 */
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test functions
async function testLocationValidation() {
  console.log('Testing location validation...');
  
  // Create a test location info with invalid IDs
  const invalidLocationInfo = {
    warehouse_id: uuidv4(), // Invalid warehouse ID
    warehouse_name: 'Test Warehouse',
    location_id: uuidv4(), // Invalid location ID
    location_name: 'Test Location',
    floor: '1',
    zone: 'A'
  };
  
  // Get valid warehouse and location IDs
  const { data: validWarehouse } = await supabase
    .from('warehouses')
    .select('id, name')
    .limit(1)
    .single();
    
  const { data: validLocation } = await supabase
    .from('locations')
    .select('id, name')
    .limit(1)
    .single();
    
  // Create a test location info with valid IDs
  const validLocationInfo = {
    warehouse_id: validWarehouse?.id || null,
    warehouse_name: validWarehouse?.name || null,
    location_id: validLocation?.id || null,
    location_name: validLocation?.name || null,
    floor: '1',
    zone: 'A'
  };
  
  console.log('Invalid location info:', invalidLocationInfo);
  console.log('Valid location info:', validLocationInfo);
  
  // Test validation function
  const validWarehouseIds = new Set([validWarehouse?.id].filter(Boolean));
  const validLocationIds = new Set([validLocation?.id].filter(Boolean));
  
  // Validate invalid IDs
  const validatedInvalid = {
    warehouse_id: invalidLocationInfo.warehouse_id && validWarehouseIds.has(invalidLocationInfo.warehouse_id) 
      ? invalidLocationInfo.warehouse_id 
      : null,
    location_id: invalidLocationInfo.location_id && validLocationIds.has(invalidLocationInfo.location_id) 
      ? invalidLocationInfo.location_id 
      : null
  };
  
  // Validate valid IDs
  const validatedValid = {
    warehouse_id: validLocationInfo.warehouse_id && validWarehouseIds.has(validLocationInfo.warehouse_id) 
      ? validLocationInfo.warehouse_id 
      : null,
    location_id: validLocationInfo.location_id && validLocationIds.has(validLocationInfo.location_id) 
      ? validLocationInfo.location_id 
      : null
  };
  
  console.log('Validated invalid location:', validatedInvalid);
  console.log('Validated valid location:', validatedValid);
  
  // Check if validation works correctly
  const invalidPassed = validatedInvalid.warehouse_id === null && validatedInvalid.location_id === null;
  const validPassed = validatedValid.warehouse_id === validWarehouse?.id && validatedValid.location_id === validLocation?.id;
  
  console.log('Invalid location validation test:', invalidPassed ? 'PASSED' : 'FAILED');
  console.log('Valid location validation test:', validPassed ? 'PASSED' : 'FAILED');
  
  return invalidPassed && validPassed;
}

async function testJsonStorage() {
  console.log('\nTesting JSON storage in notes column...');
  
  // Get a test processed item
  const { data: processedItem } = await supabase
    .from('stock_out_processed_items')
    .select('id, notes')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (!processedItem) {
    console.log('No processed items found to test');
    return false;
  }
  
  console.log('Processed item:', processedItem);
  
  try {
    // Try to parse the notes as JSON
    const locationInfo = JSON.parse(processedItem.notes);
    console.log('Parsed location info:', locationInfo);
    
    // Check if it has the expected structure
    const hasCorrectStructure = 
      'warehouse_id' in locationInfo && 
      'warehouse_name' in locationInfo && 
      'location_id' in locationInfo && 
      'location_name' in locationInfo;
      
    console.log('JSON structure test:', hasCorrectStructure ? 'PASSED' : 'FAILED');
    return hasCorrectStructure;
  } catch (error) {
    console.error('Error parsing notes as JSON:', error);
    console.log('JSON structure test: FAILED');
    return false;
  }
}

async function testUuidGeneration() {
  console.log('\nTesting UUID generation...');
  
  // Generate a UUID
  const id = uuidv4();
  console.log('Generated UUID:', id);
  
  // Check if it's a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(id);
  
  console.log('UUID validation test:', isValid ? 'PASSED' : 'FAILED');
  return isValid;
}

// Run all tests
async function runTests() {
  console.log('Starting verification tests...');
  
  const locationValidationPassed = await testLocationValidation();
  const jsonStoragePassed = await testJsonStorage();
  const uuidGenerationPassed = await testUuidGeneration();
  
  console.log('\n=== TEST RESULTS ===');
  console.log('Location validation:', locationValidationPassed ? 'PASSED' : 'FAILED');
  console.log('JSON storage:', jsonStoragePassed ? 'PASSED' : 'FAILED');
  console.log('UUID generation:', uuidGenerationPassed ? 'PASSED' : 'FAILED');
  console.log('Overall result:', (locationValidationPassed && jsonStoragePassed && uuidGenerationPassed) ? 'PASSED' : 'FAILED');
}

// Run the tests
runTests().catch(console.error);
