import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Building2, Phone, User, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const Stores: React.FC = () => {
  const { stores, cities, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city_id: '',
    contact_billing_name: '',
    contact_billing_phone: '',
    contact_purchasing_name: '',
    contact_purchasing_phone: '',
    contact_store_name: '',
    contact_store_phone: ''
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
      const contacts = {
        billing_name: formData.contact_billing_name,
        billing_phone: formData.contact_billing_phone,
        purchasing_name: formData.contact_purchasing_name,
        purchasing_phone: formData.contact_purchasing_phone,
        store_name: formData.contact_store_name,
        store_phone: formData.contact_store_phone
      };

      if (editingStore) {
        await db.updateStore(
          editingStore.id,
          formData.name,
          formData.address,
          parseInt(formData.city_id),
          contacts
        );
        toast.success('Toko berhasil diperbarui');
      } else {
        await db.addStore(
          formData.name,
          formData.address,
          parseInt(formData.city_id),
          contacts
        );
        toast.success('Toko berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (store: any) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      city_id: store.city_id.toString(),
      contact_billing_name: store.contact_billing_name || '',
      contact_billing_phone: store.contact_billing_phone || '',
      contact_purchasing_name: store.contact_purchasing_name || '',
      contact_purchasing_phone: store.contact_purchasing_phone || '',
      contact_store_name: store.contact_store_name || '',
      contact_store_phone: store.contact_store_phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus toko ini?')) {
      try {
        await db.deleteStore(id);
        toast.success('Toko berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city_id: '',
      contact_billing_name: '',
      contact_billing_phone: '',
      contact_purchasing_name: '',
      contact_purchasing_phone: '',
      contact_store_name: '',
      contact_store_phone: ''
    });
    setEditingStore(null);
    setShowForm(false);
  };

  const cityOptions = cities.map((city: any) => ({
    value: city.id,
    label: city.name
  }));

  // Filter stores based on search term and city filter
  const filteredStores = stores.filter((store: any) => {
    const matchesSearch = 
      store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = filterCity ? store.city_id === parseInt(filterCity) : true;
    
    return matchesSearch && matchesCity;
  });

  // Pagination
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStores = filteredStores.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Toko</h1>
          <p className="text-gray-600 mt-1">Kelola data toko partner</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
        >
          Tambah Toko
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Toko
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
                placeholder="Cari berdasarkan nama atau alamat..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <Select
            label="Filter Kota"
            value={filterCity}
            onChange={(value) => {
              setFilterCity(value.toString());
              setCurrentPage(1);
            }}
            options={[{ value: '', label: 'Semua Kota' }, ...cityOptions]}
          />
          
          <Select
            label="Items per Halaman"
            value={itemsPerPage}
            onChange={(value) => {
              setItemsPerPage(parseInt(value.toString()));
              setCurrentPage(1);
            }}
            options={itemsPerPageOptions}
          />
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredStores.length)} dari {filteredStores.length} toko
            {(searchTerm || filterCity) && ` (difilter dari ${stores.length} total)`}
          </div>
          
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm('');
              setFilterCity('');
              setCurrentPage(1);
            }}
          >
            Reset Filter
          </Button>
        </div>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingStore ? 'Edit Toko' : 'Tambah Toko Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Toko"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama toko"
                required
              />
              <Select
                label="Kota"
                value={formData.city_id}
                onChange={(value) => setFormData({ ...formData, city_id: value.toString() })}
                options={cityOptions}
                placeholder="Pilih kota"
                required
              />
            </div>
            
            <Input
              label="Alamat"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Masukkan alamat lengkap"
              required
            />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Informasi Kontak</h3>
              
              {/* Billing Contact */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Kontak Penagihan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nama"
                    value={formData.contact_billing_name}
                    onChange={(e) => setFormData({ ...formData, contact_billing_name: e.target.value })}
                    placeholder="Nama kontak penagihan"
                  />
                  <Input
                    label="Nomor Telepon"
                    value={formData.contact_billing_phone}
                    onChange={(e) => setFormData({ ...formData, contact_billing_phone: e.target.value })}
                    placeholder="Nomor telepon penagihan"
                  />
                </div>
              </div>

              {/* Purchasing Contact */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Kontak Pembelian
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nama"
                    value={formData.contact_purchasing_name}
                    onChange={(e) => setFormData({ ...formData, contact_purchasing_name: e.target.value })}
                    placeholder="Nama kontak pembelian"
                  />
                  <Input
                    label="Nomor Telepon"
                    value={formData.contact_purchasing_phone}
                    onChange={(e) => setFormData({ ...formData, contact_purchasing_phone: e.target.value })}
                    placeholder="Nomor telepon pembelian"
                  />
                </div>
              </div>

              {/* Store Contact */}
              <div>
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Kontak Toko
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nama"
                    value={formData.contact_store_name}
                    onChange={(e) => setFormData({ ...formData, contact_store_name: e.target.value })}
                    placeholder="Nama kontak toko"
                  />
                  <Input
                    label="Nomor Telepon"
                    value={formData.contact_store_phone}
                    onChange={(e) => setFormData({ ...formData, contact_store_phone: e.target.value })}
                    placeholder="Nomor telepon toko"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="submit">
                {editingStore ? 'Perbarui' : 'Simpan'}
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
              <TableHead>Nama Toko</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentStores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm || filterCity ? 'Tidak ada toko yang sesuai dengan filter' : 'Belum ada data toko'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentStores.map((store: any) => (
                <TableRow key={store.id}>
                  <TableCell>{store.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{store.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600 max-w-xs truncate">
                      {store.address}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {store.city_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {store.contact_billing_name && (
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-gray-600">Tagihan: {store.contact_billing_name}</span>
                        </div>
                      )}
                      {store.contact_purchasing_name && (
                        <div className="flex items-center">
                          <User className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-gray-600">Pembelian: {store.contact_purchasing_name}</span>
                        </div>
                      )}
                      {store.contact_store_name && (
                        <div className="flex items-center">
                          <Building2 className="h-3 w-3 text-gray-400 mr-1" />
                          <span className="text-gray-600">Toko: {store.contact_store_name}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(store)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(store.id)}
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredStores.length)} dari {filteredStores.length} toko
            </div>
            
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
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stores;