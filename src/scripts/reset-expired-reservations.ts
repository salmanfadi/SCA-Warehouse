import { supabase } from '../integrations/supabase/client';

/**
 * Script to reset expired reservations
 * This should be run as a scheduled job (e.g., daily)
 */
async function resetExpiredReservations(): Promise<void> {
  console.log('Starting expired reservation check...');
  
  try {
    // Call the database function to reset expired reservations
    const { data, error } = await supabase.rpc('reset_expired_reservations');
    
    if (error) {
      console.error('Error resetting expired reservations:', error);
      return;
    }
    
    console.log('Successfully reset expired reservations');
    
    // Log the results
    const { data: expiredReservations, error: queryError } = await supabase
      .from('custom_reservations')
      .select('id, order_id, expiration_date')
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (queryError) {
      console.error('Error querying expired reservations:', queryError);
      return;
    }
    
    console.log(`Found ${expiredReservations?.length || 0} recently expired reservations:`);
    console.log(expiredReservations);
    
    // Update customer inquiries for expired reservations
    if (expiredReservations && expiredReservations.length > 0) {
      for (const reservation of expiredReservations) {
        // Get order number from the order_id
        const { data: orderData, error: orderError } = await supabase
          .from('customer_orders')
          .select('reference_number')
          .eq('id', reservation.order_id)
          .single();
        
        if (orderError) {
          console.error(`Error getting order number for reservation ${reservation.id}:`, orderError);
          continue;
        }
        
        // Update customer inquiry is_reserved flag
        if (orderData?.reference_number) {
          const { error: inquiryError } = await supabase
            .from('customer_inquiries')
            .update({ is_reserved: false } as any)
            .eq('reference_number', orderData.reference_number);
            
          if (inquiryError) {
            console.error(`Error updating customer inquiry for order ${orderData.reference_number}:`, inquiryError);
          } else {
            console.log(`Successfully updated customer inquiry for order ${orderData.reference_number}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error in resetExpiredReservations:', error);
  }
}

// Execute the function
resetExpiredReservations()
  .then(() => {
    console.log('Reservation reset process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error in reservation reset process:', error);
    process.exit(1);
  });
