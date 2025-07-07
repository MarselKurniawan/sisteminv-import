import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Users, Gift, Calendar, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const Employees: React.FC = () => {
  const { employees, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    base_salary: 0,
    base_overtime: 0,
    contact: '',
    address: '',
    hire_date: '',
    birth_date: '',
    status: 'active'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadUpcomingBirthdays = async () => {
    try {
      const birthdays = await db.getUpcomingBirthdays();
      setUpcomingBirthdays(birthdays);
    } catch (error) {
      console.error('Error loading birthdays:', error);
    }
  };

  React.useEffect(() => {
    loadUpcomingBirthdays();
  }, [employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEmployee) {
        await db.updateEmployee(
          editingEmployee.id,
          formData.name,
          formData.position,
          formData.base_salary,
          formData.base_overtime,
          formData.contact,
          formData.address,
          formData.hire_date,
          formData.birth_date,
          formData.status
        );
        toast.success('Karyawan berhasil diperbarui');
      } else {
        await db.addEmployee(
          formData.name,
          formData.position,
          formData.base_salary,
          formData.base_overtime,
          formData.contact,
          formData.address,
          formData.hire_date,
          formData.birth_date
        );
        toast.success('Karyawan berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position,
      base_salary: employee.base_salary,
      base_overtime: employee.base_overtime,
      contact: employee.contact,
      address: employee.address || '',
      hire_date: employee.hire_date,
      birth_date: employee.birth_date || '',
      status: employee.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus karyawan ini?')) {
      try {
        await db.deleteEmployee(id);
        toast.success('Karyawan berhasil dihapus');
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
      position: '',
      base_salary: 0,
      base_overtime: 0,
      contact: '',
      address: '',
      hire_date: '',
      birth_date: '',
      status: 'active'
    });
    setEditingEmployee(null);
    setShowForm(false);
  };

  const getBirthdayBadge = (birthDate: string) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Gift className="w-3 h-3 mr-1" />
          Hari ini!
        </span>
      );
    } else if (diffDays > 0 && diffDays <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Calendar className="w-3 h-3 mr-1" />
          {diffDays} hari lagi
        </span>
      );
    }
    
    return null;
  };

  const getAge = (birthDate: string) => {
    if (!birthDate) return '-';
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} tahun`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Karyawan</h1>
          <p className="text-gray-600 mt-1">Kelola data karyawan dan informasi kepegawaian</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
          className="btn-success"
        >
          Tambah Karyawan
        </Button>
      </div>

      {/* Upcoming Birthdays */}
      {upcomingBirthdays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Gift className="h-5 w-5 mr-2" />
              Ulang Tahun Minggu Ini
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBirthdays.map((employee: any) => (
              <div key={employee.id} className="flex items-center p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                <Gift className="h-8 w-8 text-pink-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">{employee.name}</p>
                  <p className="text-sm text-gray-600">{employee.position}</p>
                  <p className="text-xs text-pink-600">
                    {new Date(employee.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Karyawan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama karyawan"
                required
              />
              <Input
                label="Posisi"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Contoh: Baker, Sales Manager"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Base Gaji (per hari)"
                type="number"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
                placeholder="Contoh: 50000"
                min={0}
                required
              />
              <Input
                label="Base Lembur (per hari)"
                type="number"
                value={formData.base_overtime}
                onChange={(e) => setFormData({ ...formData, base_overtime: parseFloat(e.target.value) || 0 })}
                placeholder="Contoh: 25000"
                min={0}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kontak"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Nomor telepon / WhatsApp"
                required
              />
              <Input
                label="Alamat"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat lengkap karyawan"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tanggal Masuk"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                required
              />
              <Input
                label="Tanggal Lahir"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>
            
            <div className="flex gap-3">
              <Button type="submit">
                {editingEmployee ? 'Perbarui' : 'Simpan'}
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
              <TableHead>Nama Karyawan</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead>Base Gaji</TableHead>
              <TableHead>Base Lembur</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Tanggal Lahir</TableHead>
              <TableHead>Umur</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!employees || employees.length === 0) ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data karyawan</p>
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee: any) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        {getBirthdayBadge(employee.birth_date)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {employee.position}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(employee.base_salary)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(employee.base_overtime)}
                    </span>
                  </TableCell>
                  <TableCell>{employee.contact}</TableCell>
                  <TableCell>
                    <div className="flex items-center max-w-xs">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate" title={employee.address}>
                        {employee.address || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString('id-ID') : '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">{getAge(employee.birth_date)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      employee.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(employee)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(employee.id)}
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

export default Employees;