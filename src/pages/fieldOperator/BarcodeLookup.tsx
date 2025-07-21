import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BarcodeLookup from '@/components/barcode/BarcodeLookup';

const FieldOperatorBarcodeLookup: React.FC = () => {
  const navigate = useNavigate();

  const goBackToDashboard = () => {
    navigate('/field');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={goBackToDashboard} 
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <PageHeader 
          title="Barcode Lookup" 
          description="Scan barcodes to view product information and location details"
        />
      </div>
      <div className="max-w-3xl mx-auto">
        <BarcodeLookup title="Field Operator Barcode Lookup" />
      </div>
    </div>
  );
};

export default FieldOperatorBarcodeLookup;
