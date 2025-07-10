import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { ReserveStockList } from '@/components/reserve-stock/ReserveStockList';
import { ReserveStockForm } from '@/components/reserve-stock/ReserveStockForm';
import { ReserveStockDetail } from '@/components/reserve-stock/ReserveStockDetail';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reserveStockService, ReserveStockWithDetails } from '@/services/reserveStockService';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const ReserveStock: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const createReservation = useMutation({
    mutationFn: reserveStockService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reserve-stocks'] });
      setIsCreateFormOpen(false);
      toast.success('Reservation created successfully.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create reservation');
    },
  });

  const handleViewDetails = (item: ReserveStockWithDetails) => {
    setSelectedReservation(item.id);
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="Reserve Stock Management"
            description="Create and manage stock reservations"
          />
        </div>
        <Button onClick={() => setIsCreateFormOpen(true)}>
          Create Reservation
        </Button>
      </div>

      <Card>

        <CardContent className="pt-6">
          <ReserveStockList onView={handleViewDetails} />
        </CardContent>
      </Card>

      <Sheet
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
      >
        <SheetContent className="sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle>Create Reservation</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ReserveStockForm
              onSubmit={createReservation.mutate}
              isSubmitting={createReservation.isPending}
            />

          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
      >
        <DialogContent className="max-w-3xl">
          {selectedReservation && (
            <ReserveStockDetail
              id={selectedReservation}
              onClose={() => setSelectedReservation(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReserveStock; 