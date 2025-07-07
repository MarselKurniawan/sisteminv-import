import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Tag, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const PriceAreas: React.FC = () => {
  const { priceAreas, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    name: ''
  });

  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingArea) {
        await db.updatePriceArea(editingArea.id, formData.name);
        toast.success('Area harga berhasil diperbarui');
      } else {
        await db.addPriceArea(formData.name);
        toast.success('Area harga berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (area: any) => {
    setEditingArea(area);
    setFormData({ name: area.name });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus area harga ini?')) {
      try {
        await db.deletePriceArea(id);
        toast.success('Area harga berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingArea(null);
    setShowForm(false);
  };

  // Filter price areas based on search term
  const filteredAreas = priceAreas.filter((area: any) =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredAreas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAreas = filteredAreas.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Area Harga</h1>
          <p className="text-gray-600 mt-1">Kelola area harga untuk produk</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
        >
          Tambah Area Harga
        </Button>
      </div>

      {/* Search and Pagination Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Area Harga
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari berdasarkan nama area..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <Select
            label="Items per Halaman"
            value={itemsPerPage}
            onChange={(value) => {
              setItemsPerPage(parseInt(value.toString()));
              setCurrentPage(1);
            }}
            options={itemsPerPageOptions}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
            }}
          >
            Reset
          </Button>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredAreas.length)} dari {filteredAreas.length} area
            {searchTerm && ` (difilter dari ${priceAreas.length} total)`}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      size="sm"
                      variant={currentPage === page ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8"
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-gray-500">...</span>
                    <Button
                      size="sm"
                      variant={currentPage === totalPages ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </div>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingArea ? 'Edit Area Harga' : 'Tambah Area Harga Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Area Harga"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama area harga"
              required
            />
            <div className="flex gap-3">
              <Button type="submit">
                {editingArea ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nama Area Harga</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAreas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Tag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada area harga yang sesuai dengan pencarian' : 'Belum ada data area harga'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentAreas.map((area: any) => (
                <TableRow key={area.id}>
                  <TableCell>{area.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      {area.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(area.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(area)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(area.id)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default PriceAreas;