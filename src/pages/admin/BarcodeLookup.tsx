import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import BarcodeLookup from '@/components/barcode/BarcodeLookup';

const AdminBarcodeLookup: React.FC = () => {
  const navigate = useNavigate();

  const goBackToDashboard = () => {
    navigate('/admin');
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col space-y-2">
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
            title="Admin Barcode Lookup" 
            description="View detailed product and inventory information"
          />
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto w-full bg-card rounded-lg shadow p-6 border border-border/40">
        <div className="flex items-center mb-4">
          <div className="bg-primary/10 p-2 rounded-full mr-3">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Scan or Enter Barcode</h2>
        </div>
        <BarcodeLookup title="" />
      </div>
    </div>
  );
};

export default AdminBarcodeLookup;
