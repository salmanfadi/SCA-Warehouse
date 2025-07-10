
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCustomerInquiries } from '@/hooks/useCustomerInquiries';
import { InquiryManagement } from '@/components/sales/InquiryManagement';

import { SalesInquiry } from '@/types/inquiries';

const CustomerInquiries: React.FC = () => {
  const {
    inquiries,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    updateInquiryStatus,
    convertInquiryToOrder,
    formatDate,
    refreshInquiries
  } = useCustomerInquiries();

  // Convert CustomerInquiry to SalesInquiry format for compatibility
  const salesInquiries = inquiries.map(inquiry => ({
    ...inquiry,
    message: inquiry.message || inquiry.notes || '', // Ensure message field exists and is not null
  }));

  // Wrapper function to handle type conversion
  const handleConvertToOrder = async (inquiry: SalesInquiry) => {
    // Find the original CustomerInquiry
    const originalInquiry = inquiries.find(ci => ci.id === inquiry.id);
    if (originalInquiry) {
      return await convertInquiryToOrder(originalInquiry);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Inquiries" 
        description="View and manage customer pricing inquiries"
      />
      
      
      <InquiryManagement
        inquiries={salesInquiries}
        isLoading={isLoading}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        setSearchTerm={setSearchTerm}
        setStatusFilter={setStatusFilter}
        updateInquiryStatus={updateInquiryStatus}
        convertInquiryToOrder={handleConvertToOrder}
        formatDate={formatDate}
        refreshInquiries={refreshInquiries}
      />
    </div>
  );
};

export default CustomerInquiries;
