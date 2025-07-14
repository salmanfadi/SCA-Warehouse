import { useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { UnifiedReservationModal, ProductToReserve } from './UnifiedReservationModal';
import { Package } from 'lucide-react';

type ReserveOrderButtonProps = ButtonProps & {
  orderId: string;
  products: ProductToReserve[];
  onReservationComplete?: () => void;
  isDisabled?: boolean;
  disabledReason?: string;
};

export const ReserveOrderButton = ({
  orderId,
  products,
  onReservationComplete,
  isDisabled = false,
  disabledReason = 'Already Reserved',
  ...buttonProps
}: ReserveOrderButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // We'll show all products in the modal, even those without available quantity
  // This allows users to see which products need inventory
  
  // Always render the button, but disable it if needed
  return (
    <>
      <Button
        onClick={() => !isDisabled && setIsModalOpen(true)}
        disabled={isDisabled}
        title={isDisabled ? disabledReason : 'Reserve stock for this order'}
        {...buttonProps}
      >
        <Package className="mr-1 h-3 w-3" />
        Reserve
      </Button>

      <UnifiedReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={orderId}
        products={products}
        onReservationComplete={onReservationComplete}
      />
    </>
  );
};
