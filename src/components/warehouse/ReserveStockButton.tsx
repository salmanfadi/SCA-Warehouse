import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReservationModal, ProductToReserve } from './ReservationModal';

type ReserveStockButtonProps = {
  product: ProductToReserve;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  orderId?: string;
  onReservationComplete?: () => void;
};

export const ReserveStockButton = ({
  product,
  variant = 'outline',
  size = 'sm',
  className = '',
  orderId,
  onReservationComplete
}: ReserveStockButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenModal}
        className={className}
      >
        Reserve Stock
      </Button>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={product}
        orderId={orderId}
        onReservationComplete={onReservationComplete}
      />
    </>
  );
};

export default ReserveStockButton;
