import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export type Reservation = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_category: string | null;
  order_id: string | null;
  order_date: string | null;
  order_status: string | null;
  total_quantity: number;
  reservation_status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expiry_date: string | null;
};

export type ReservationBox = {
  id: string;
  reservation_id: string;
  batch_item_id: string;
  product_id: string;
  product_name: string;
  barcode: string | null;
  color: string | null;
  size: string | null;
  warehouse_name: string;
  location_name: string | null;
  floor: number | null;
  zone: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
};

type ReservationsTableProps = {
  productId?: string;
  orderId?: string;
  onRefresh?: () => void;
};

export const ReservationsTable = ({
  productId,
  orderId,
  onRefresh
}: ReservationsTableProps) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [reservationBoxes, setReservationBoxes] = useState<ReservationBox[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchReservations();
  }, [productId, orderId]);

  const fetchReservations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('reservation_details')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      if (orderId) {
        query = query.eq('order_id', orderId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setReservations(data || []);
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      setError('Failed to load reservations');
      toast.error('Failed to load reservations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReservationBoxes = async (reservationId: string) => {
    try {
      const { data, error } = await supabase
        .from('reservation_box_details')
        .select('*')
        .eq('reservation_id', reservationId);
      
      if (error) throw error;
      
      setReservationBoxes(data || []);
    } catch (err: any) {
      console.error('Error fetching reservation boxes:', err);
      toast.error('Failed to load reservation details');
    }
  };

  const handleViewDetails = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    fetchReservationBoxes(reservation.id);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedReservation(null);
    setReservationBoxes([]);
  };

  const handleFulfillReservation = async () => {
    if (!selectedReservation) return;
    
    setIsActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'fulfilled' })
        .eq('id', selectedReservation.id);
      
      if (error) throw error;
      
      toast.success('Reservation marked as fulfilled');
      handleCloseDetails();
      fetchReservations();
      onRefresh?.();
    } catch (err: any) {
      console.error('Error fulfilling reservation:', err);
      toast.error('Failed to fulfill reservation');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;
    
    setIsActionLoading(true);
    
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', selectedReservation.id);
      
      if (error) throw error;
      
      toast.success('Reservation cancelled');
      handleCloseDetails();
      fetchReservations();
      onRefresh?.();
    } catch (err: any) {
      console.error('Error cancelling reservation:', err);
      toast.error('Failed to cancel reservation');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">Active</Badge>;
      case 'fulfilled':
        return <Badge className="bg-green-500">Fulfilled</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-destructive">
        {error}
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reservations found
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell>
                  <div className="font-medium">{reservation.product_name}</div>
                  <div className="text-sm text-muted-foreground">{reservation.product_sku}</div>
                </TableCell>
                <TableCell>{reservation.total_quantity}</TableCell>
                <TableCell>{getStatusBadge(reservation.reservation_status)}</TableCell>
                <TableCell>{formatDate(reservation.created_at)}</TableCell>
                <TableCell>
                  {reservation.order_id ? (
                    <div className="font-mono text-xs">{reservation.order_id.split('-')[0]}...</div>
                  ) : (
                    <span className="text-muted-foreground">Manual</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(reservation)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-4 mt-4">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{reservation.product_name}</div>
                <div className="text-sm text-muted-foreground">{reservation.product_sku}</div>
              </div>
              {getStatusBadge(reservation.reservation_status)}
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Quantity:</span> {reservation.total_quantity}
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span> {formatDate(reservation.created_at)}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Order:</span> {
                  reservation.order_id 
                    ? <span className="font-mono">{reservation.order_id.split('-')[0]}...</span>
                    : <span>Manual</span>
                }
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleViewDetails(reservation)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        ))}
      </div>

      {/* Reservation Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reservation Details</DialogTitle>
          </DialogHeader>
          
          {selectedReservation && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Product</div>
                  <div className="font-medium">{selectedReservation.product_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">SKU</div>
                  <div className="font-medium">{selectedReservation.product_sku}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                  <div className="font-medium">{selectedReservation.total_quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div>{getStatusBadge(selectedReservation.reservation_status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(selectedReservation.created_at)}</div>
                </div>
                {selectedReservation.expiry_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Expires</div>
                    <div className="font-medium">{formatDate(selectedReservation.expiry_date)}</div>
                  </div>
                )}
                {selectedReservation.order_id && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">Order ID</div>
                    <div className="font-medium font-mono">{selectedReservation.order_id}</div>
                  </div>
                )}
                {selectedReservation.notes && (
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <div className="font-medium">{selectedReservation.notes}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Reserved Boxes</div>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-4 space-y-4">
                    {reservationBoxes.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading box details...
                      </div>
                    ) : (
                      reservationBoxes.map((box) => (
                        <div key={box.id} className="border-b pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between">
                            <div className="font-medium">
                              {box.barcode || 'No Barcode'}
                            </div>
                            <div>
                              <Badge variant="outline">Qty: {box.quantity}</Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {box.warehouse_name} {box.location_name ? `• ${box.location_name}` : ''}
                            {box.floor !== null && box.zone ? ` (Floor ${box.floor}, Zone ${box.zone})` : ''}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {box.color && (
                              <Badge variant="outline" className="text-xs">
                                Color: {box.color}
                              </Badge>
                            )}
                            {box.size && (
                              <Badge variant="outline" className="text-xs">
                                Size: {box.size}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseDetails} className="w-full sm:w-auto">
              Close
            </Button>
            
            {selectedReservation?.reservation_status === 'active' && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={handleCancelReservation}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto"
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancel Reservation
                </Button>
                
                <Button 
                  variant="default" 
                  onClick={handleFulfillReservation}
                  disabled={isActionLoading}
                  className="w-full sm:w-auto"
                >
                  {isActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as Fulfilled
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReservationsTable;
