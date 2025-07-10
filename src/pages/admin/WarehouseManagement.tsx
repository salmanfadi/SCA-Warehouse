import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Warehouse, MapPin } from 'lucide-react';

interface WarehouseType {
  id: string;
  name: string;
  code?: string;
  address?: string;
  location?: string;
  contact_person?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WarehouseLocation {
  id?: string;
  warehouse_id: string;
  floor: string;
  zone: string;
}

const WarehouseManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    location: '',
    contact_person: '',
    contact_phone: '',
    is_active: true
  });

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WarehouseType[];
    },
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (warehouseData: typeof formData) => {
      console.log('Attempting to create warehouse with data:', warehouseData);
      
      const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouseData)
        .select()
        .single();
        
      if (error) {
        console.error('Warehouse creation error:', error);
        throw error;
      }
      
      // Create locations if any
      if (locations.length > 0) {
        const locationData = locations.map(loc => ({
          warehouse_id: data.id,
          floor: loc.floor,
          zone: loc.zone
        }));
        
        console.log('Creating warehouse locations:', locationData);
        const { error: locationError } = await supabase
          .from('warehouse_locations')
          .insert(locationData);
          
        if (locationError) {
          console.error('Location creation error:', locationError);
          throw locationError;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('The warehouse has been created successfully.');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error('Full error object:', error);
      const errorMessage = error instanceof Error 
        ? error.message.includes('warehouses_code_key') || (error as any).code === '23505'
          ? 'A warehouse with this code already exists. Please use a different code or leave it empty.'
          : error.message.includes('duplicate key') 
            ? 'This warehouse already exists. Please check the name and code.'
            : error.message
        : 'Failed to create warehouse';
        
      toast.error(errorMessage);
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: async ({ id, warehouseData }: { id: string; warehouseData: typeof formData }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update(warehouseData)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      
      // Update locations - delete existing and create new ones
      await supabase
        .from('warehouse_locations')
        .delete()
        .eq('warehouse_id', id);
        
      if (locations.length > 0) {
        const locationData = locations.map(loc => ({
          warehouse_id: id,
          floor: loc.floor,
          zone: loc.zone
        }));
        
        const { error: locationError } = await supabase
          .from('warehouse_locations')
          .insert(locationData);
          
        if (locationError) throw locationError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('The warehouse has been updated successfully.');
      resetForm();
      setIsDialogOpen(false);
      setEditingWarehouse(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update warehouse');
    },
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('The warehouse has been deleted successfully.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete warehouse');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      location: '',
      contact_person: '',
      contact_phone: '',
      is_active: true
    });
    setLocations([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({
        id: editingWarehouse.id,
        warehouseData: formData
      });
    } else {
      createWarehouseMutation.mutate(formData);
    }
  };

  const handleEdit = async (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || '',
      address: warehouse.address || '',
      location: warehouse.location || '',
      contact_person: warehouse.contact_person || '',
      contact_phone: warehouse.contact_phone || '',
      is_active: warehouse.is_active
    });
    
    // Fetch warehouse locations
    const { data: warehouseLocations } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('warehouse_id', warehouse.id);
      
    if (warehouseLocations) {
      setLocations(warehouseLocations.map(loc => ({
        warehouse_id: loc.warehouse_id,
        floor: loc.floor || '',
        zone: loc.zone
      })));
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this warehouse?')) {
      deleteWarehouseMutation.mutate(id);
    }
  };

  const addLocation = () => {
    setLocations([...locations, { warehouse_id: '', floor: '', zone: '' }]);
  };

  const updateLocation = (index: number, field: keyof WarehouseLocation, value: string) => {
    const updatedLocations = [...locations];
    updatedLocations[index] = { ...updatedLocations[index], [field]: value };
    setLocations(updatedLocations);
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const filteredWarehouses = warehouses?.filter(warehouse =>
    !searchTerm || 
    warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Warehouse Management" 
          description="Manage warehouse locations and settings"
        />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Warehouse Management" 
        description="Manage warehouse locations and settings"
      />
      
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search warehouses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingWarehouse(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogDescription className="sr-only">
              {editingWarehouse ? 'Edit warehouse details' : 'Create a new warehouse'}
            </DialogDescription>
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Warehouse Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="code">Warehouse Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                  <p className="text-sm text-gray-500">
                    Must be unique. Leave empty if not needed.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Warehouse Locations</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>
                
                {locations.map((location, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`floor-${index}`}>Floor</Label>
                      <Input
                        id={`floor-${index}`}
                        value={location.floor}
                        onChange={(e) => updateLocation(index, 'floor', e.target.value)}
                        placeholder="e.g., 1, 2, Ground"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`zone-${index}`}>Zone</Label>
                      <Input
                        id={`zone-${index}`}
                        value={location.zone}
                        onChange={(e) => updateLocation(index, 'zone', e.target.value)}
                        placeholder="e.g., A, B, C"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLocation(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                    setEditingWarehouse(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
                >
                  {createWarehouseMutation.isPending || updateWarehouseMutation.isPending
                    ? 'Saving...'
                    : editingWarehouse
                    ? 'Update Warehouse'
                    : 'Create Warehouse'
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {filteredWarehouses?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No warehouses found</p>
                <p className="text-sm text-gray-400">
                  {searchTerm
                    ? 'Try adjusting your search criteria'
                    : 'Create your first warehouse to get started'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredWarehouses?.map((warehouse) => (
            <Card key={warehouse.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Warehouse className="h-5 w-5 mr-2" />
                    {warehouse.name}
                    {warehouse.code && (
                      <span className="ml-2 text-sm font-mono text-gray-500">
                        ({warehouse.code})
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant={warehouse.is_active ? 'default' : 'secondary'}>
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(warehouse)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(warehouse.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location Details
                    </div>
                    <div className="space-y-1">
                      {warehouse.address && (
                        <p className="text-sm"><strong>Address:</strong> {warehouse.address}</p>
                      )}
                      {warehouse.location && (
                        <p className="text-sm"><strong>Location:</strong> {warehouse.location}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-500">Contact Information</div>
                    <div className="space-y-1">
                      {warehouse.contact_person && (
                        <p className="text-sm"><strong>Contact:</strong> {warehouse.contact_person}</p>
                      )}
                      {warehouse.contact_phone && (
                        <p className="text-sm"><strong>Phone:</strong> {warehouse.contact_phone}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t text-xs text-gray-400">
                  Created: {new Date(warehouse.created_at).toLocaleDateString()}
                  {warehouse.updated_at !== warehouse.created_at && (
                    <span> • Updated: {new Date(warehouse.updated_at).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default WarehouseManagement;
