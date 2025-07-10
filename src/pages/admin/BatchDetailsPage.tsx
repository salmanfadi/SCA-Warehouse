import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search } from 'lucide-react';

// Dummy data for batch and boxes
const dummyBatch = {
  id: '6497429a...',
  productName: 'Luna Eraser',
  warehouseName: 'Warehouse 2',
  processedBy: 'Admin',
  date: 'May 19, 2025',
  totalBoxes: 60,
  totalQuantity: 60,
};

const dummyBoxes = Array.from({ length: 10 }).map((_, i) => ({
  id: `BOX${1000 + i}`,
  barcode: `98765432${i}`,
  quantity: 6,
  status: i % 2 === 0 ? 'OK' : 'Pending',
  location: `Shelf ${i + 1}`,
}));

const BatchDetailsPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Filtered boxes
  const filteredBoxes = dummyBoxes.filter(
    (box) =>
      (search === '' || box.barcode.includes(search) || box.id.includes(search)) &&
      (statusFilter === '' || box.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-xl font-semibold">Batch Details</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Batch: {dummyBatch.productName}</CardTitle>
          <CardDescription>
            <div>Batch ID: {dummyBatch.id}</div>
            <div>Warehouse: {dummyBatch.warehouseName}</div>
            <div>Processed By: {dummyBatch.processedBy}</div>
            <div>Date: {dummyBatch.date}</div>
            <div>Total Boxes: {dummyBatch.totalBoxes}</div>
            <div>Total Quantity: {dummyBatch.totalQuantity}</div>
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Box-Level Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by barcode or box ID"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="OK">OK</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Box ID</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoxes.map(box => (
                  <TableRow key={box.id}>
                    <TableCell>{box.id}</TableCell>
                    <TableCell>{box.barcode}</TableCell>
                    <TableCell>{box.quantity}</TableCell>
                    <TableCell>{box.status}</TableCell>
                    <TableCell>{box.location}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchDetailsPage; 