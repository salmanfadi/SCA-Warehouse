
import { UserRole } from '@/types/auth';

export const businessTypes = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'service_provider', label: 'Service Provider' },
  { value: 'other', label: 'Other' }
];

export const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800';
    case 'warehouse_manager':
      return 'bg-blue-100 text-blue-800';
    case 'field_operator':
      return 'bg-green-100 text-green-800';
    case 'sales_operator':
      return 'bg-yellow-100 text-yellow-800';
    case 'customer':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// This is for audit logging
export interface AuditLogEntry {
  userId: string;
  action: string;
  details: object;
  timestamp: string;
}

export const logAdminAction = async (entry: AuditLogEntry) => {
  try {
    // In a real system, you'd save this to a database table
    // For now, we'll just log to console
    console.log('ADMIN AUDIT LOG:', entry);
    
    // You could implement this in the future with a database table:
    /*
    await supabase
      .from('admin_audit_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        details: entry.details,
        created_at: entry.timestamp,
      });
    */
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};
