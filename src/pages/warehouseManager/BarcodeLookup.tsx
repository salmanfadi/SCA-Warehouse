import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import BarcodeLookup from '@/components/barcode/BarcodeLookup';

const ManagerBarcodeLookup: React.FC = () => {
  const navigate = useNavigate();

  const goBackToDashboard = () => {
    navigate('/manager');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goBackToDashboard}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <PageHeader 
          title="" 
          description=""
        />
      </div>
      
      <div className="max-w-3xl mx-auto">
        <BarcodeLookup title="Warehouse Barcode Lookup" />
      </div>
    </div>
  );
};

export default ManagerBarcodeLookup;
