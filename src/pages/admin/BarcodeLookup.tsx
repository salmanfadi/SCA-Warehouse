import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import BarcodeLookup from '@/components/barcode/BarcodeLookup';

const AdminBarcodeLookup: React.FC = () => {
  const navigate = useNavigate();

  const goBackToDashboard = () => {
    navigate('/admin');
  };

  return (
    <div className="space-y-6">
      <div className="relative flex items-center w-full">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goBackToDashboard}
          className="absolute left-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="w-full text-center">
          <PageHeader 
            title="Admin Barcode Lookup" 
            description="View detailed product and inventory information"
          />
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <BarcodeLookup title="Admin Barcode Lookup" />
      </div>
    </div>
  );
};

export default AdminBarcodeLookup;
