import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, MapPin, Building2, Eye, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const Cities: React.FC = () => {
  const { cities, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showStoresModal, setShowStoresModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [cityStores, setCityStores] = useState<any[]>([]);
  const [editingCity, setEditingCity] = useState<any>(null);
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
      if (editingCity) {
        await db.updateCity(editingCity.id, formData.name);
        toast.success('Kota berhasil diperbarui');
      } else {
        await db.addCity(formData.name);
        toast.success('Kota berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (city: any) => {
    setEditingCity(city);
    setFormData({ name: city.name });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus kota ini?')) {
      try {
        await db.deleteCity(id);
        toast.success('Kota berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleViewStores = async (city: any) => {
    try {
      const stores = await db.getCityStores(city.id);
      setCityStores(stores);
      setSelectedCity(city);
      setShowStoresModal(true);
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingCity(null);
    setShowForm(false);
  };

  // Filter cities based on search term
  const filteredCities = cities.filter((city: any) =>
    city.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredCities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCities = filteredCities.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Kota</h1>
          <p className="text-gray-600 mt-1">Kelola data kota untuk pengiriman</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
        >
          Tambah Kota
        </Button>
      </div>

      {/* Search and Pagination Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Kota
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
                placeholder="Cari berdasarkan nama kota..."
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
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredCities.length)} dari {filteredCities.length} kota
            {searchTerm && ` (difilter dari ${cities.length} total)`}
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

      {/* Stores Modal */}
      <Modal
        isOpen={showStoresModal}
        onClose={() => {
          setShowStoresModal(false);
          setSelectedCity(null);
          setCityStores([]);
        }}
        title={`Toko di ${selectedCity?.name}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-blue-900">{selectedCity?.name}</p>
                <p className="text-sm text-blue-700">Total: {cityStores.length} toko</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Toko</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alamat</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kontak</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cityStores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <Building2 className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      Belum ada toko di kota ini
                    </td>
                  </tr>
                ) : (
                  cityStores.map((store: any) => (
                    <tr key={store.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{store.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          {store.name}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 max-w-xs truncate">
                        {store.address}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {store.contact_store_phone || store.contact_billing_phone || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCity ? 'Edit Kota' : 'Tambah Kota Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nama Kota"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama kota"
              required
            />
            <div className="flex gap-3">
              <Button type="submit">
                {editingCity ? 'Perbarui' : 'Simpan'}
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
              <TableHead>Nama Kota</TableHead>
              <TableHead>Jumlah Toko</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada kota yang sesuai dengan pencarian' : 'Belum ada data kota'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentCities.map((city: any) => (
                <TableRow key={city.id}>
                  <TableCell>{city.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      {city.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-600">{city.store_count || 0} toko</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(city.created_at).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Eye}
                        onClick={() => handleViewStores(city)}
                      >
                        Lihat Toko
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(city)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(city.id)}
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

export default Cities;