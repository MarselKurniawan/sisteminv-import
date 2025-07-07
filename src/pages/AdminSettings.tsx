import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { db } from '../lib/database';
import { Settings, Lock, User, Shield, Eye, EyeOff, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<any>({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMenuPinModal, setShowMenuPinModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [menuPin, setMenuPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: ''
  });
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    role: 'kasir',
    pin: ''
  });

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'cities', name: 'Kota' },
    { id: 'price-areas', name: 'Area Harga' },
    { id: 'stores', name: 'Toko' },
    { id: 'products', name: 'Produk' },
    { id: 'store-deliveries', name: 'Pengiriman Toko' },
    { id: 'individual-deliveries', name: 'Pengiriman Perorangan' },
    { id: 'returns', name: 'Retur' },
    { id: 'bookkeeping', name: 'Pembukuan' },
    { id: 'employees', name: 'Karyawan' },
    { id: 'payroll', name: 'Penggajian' },
    { id: 'factory', name: 'Pabrik' },
    { id: 'raw-materials', name: 'Bahan Baku' },
    { id: 'hpp', name: 'HPP' },
    { id: 'assets', name: 'Aset' },
    { id: 'roi', name: 'ROI' },
    { id: 'bills', name: 'Tagihan' },
    { id: 'reports', name: 'Laporan' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const adminSettings = await db.getAdminSettings();
      setSettings(adminSettings);
      setProfileData(adminSettings.profile || { name: '', email: '' });
      setUsers(adminSettings.users || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error('PIN harus 6 digit angka');
      return;
    }

    if (newPin !== confirmPin) {
      toast.error('Konfirmasi PIN tidak cocok');
      return;
    }

    if (settings.pin && currentPin !== settings.pin) {
      toast.error('PIN lama tidak benar');
      return;
    }

    try {
      await db.updateAdminSettings({ ...settings, pin: newPin });
      toast.success('PIN berhasil diubah');
      setShowPinModal(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await db.updateAdminSettings({ 
        ...settings, 
        profile: profileData 
      });
      toast.success('Profile berhasil diperbarui');
      setShowProfileModal(false);
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleMenuPinUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (menuPin.length !== 6 && menuPin !== '') {
      toast.error('PIN harus 6 digit angka');
      return;
    }

    try {
      const menuPins = { ...settings.menuPins };
      if (menuPin === '') {
        delete menuPins[selectedMenu];
      } else {
        menuPins[selectedMenu] = menuPin;
      }
      
      await db.updateAdminSettings({ 
        ...settings, 
        menuPins 
      });
      toast.success('PIN menu berhasil diatur');
      setShowMenuPinModal(false);
      setSelectedMenu('');
      setMenuPin('');
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const toggleMenuLock = async (menuId: string) => {
    try {
      const lockedMenus = settings.lockedMenus || [];
      const newLockedMenus = lockedMenus.includes(menuId)
        ? lockedMenus.filter((id: string) => id !== menuId)
        : [...lockedMenus, menuId];
      
      await db.updateAdminSettings({ 
        ...settings, 
        lockedMenus: newLockedMenus 
      });
      toast.success('Pengaturan menu berhasil diubah');
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleSetMenuPin = (menuId: string) => {
    setSelectedMenu(menuId);
    setMenuPin(settings.menuPins?.[menuId] || '');
    setShowMenuPinModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userFormData.pin.length !== 6 || !/^\d{6}$/.test(userFormData.pin)) {
      toast.error('PIN harus 6 digit angka');
      return;
    }

    try {
      const newUsers = [...users];
      
      if (editingUser) {
        const index = newUsers.findIndex(u => u.id === editingUser.id);
        if (index !== -1) {
          newUsers[index] = { ...editingUser, ...userFormData };
        }
        toast.success('User berhasil diperbarui');
      } else {
        const newUser = {
          id: Math.max(...users.map(u => u.id || 0), 0) + 1,
          ...userFormData,
          created_at: new Date().toISOString()
        };
        newUsers.push(newUser);
        toast.success('User berhasil ditambahkan');
      }
      
      await db.updateAdminSettings({ 
        ...settings, 
        users: newUsers 
      });
      
      setShowUserModal(false);
      setEditingUser(null);
      setUserFormData({ name: '', role: 'kasir', pin: '' });
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserFormData({
      name: user.name,
      role: user.role,
      pin: user.pin
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm('Yakin ingin menghapus user ini?')) {
      try {
        const newUsers = users.filter(u => u.id !== userId);
        await db.updateAdminSettings({ 
          ...settings, 
          users: newUsers 
        });
        toast.success('User berhasil dihapus');
        loadSettings();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  // Function to toggle menu visibility for kasir role
  const toggleMenuVisibility = async (menuId: string) => {
    try {
      const hiddenMenus = settings.hiddenMenus || [];
      const newHiddenMenus = hiddenMenus.includes(menuId)
        ? hiddenMenus.filter((id: string) => id !== menuId)
        : [...hiddenMenus, menuId];
      
      await db.updateAdminSettings({ 
        ...settings, 
        hiddenMenus: newHiddenMenus 
      });
      toast.success('Visibilitas menu berhasil diubah');
      loadSettings();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  // Check if menu is hidden for kasir
  const isMenuHidden = (menuId: string) => {
    return (settings.hiddenMenus || []).includes(menuId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Admin</h1>
          <p className="text-gray-600 mt-1">Kelola pengaturan keamanan, profile admin, dan user</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center text-blue-800">
            <User className="h-5 w-5 mr-2" />
            Profile Admin
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{settings.profile?.name || 'Belum diatur'}</p>
              <p className="text-sm text-gray-600">{settings.profile?.email || 'Belum diatur'}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowProfileModal(true)}
              icon={Settings}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Edit Profile
            </Button>
          </div>
        </div>
      </Card>

      {/* Security Card */}
      <Card className="border-emerald-200">
        <CardHeader className="bg-emerald-50">
          <CardTitle className="flex items-center text-emerald-800">
            <Shield className="h-5 w-5 mr-2" />
            Keamanan
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">PIN Keamanan</p>
              <p className="text-sm text-gray-600">
                {settings.pin ? 'PIN sudah diatur' : 'PIN belum diatur'}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowPinModal(true)}
              icon={Lock}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {settings.pin ? 'Ubah PIN' : 'Atur PIN'}
            </Button>
          </div>
        </div>
      </Card>

      {/* User Management */}
      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-purple-800">
              <User className="h-5 w-5 mr-2" />
              Manajemen User
            </CardTitle>
            <Button
              onClick={() => setShowUserModal(true)}
              icon={Plus}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Tambah User
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Belum ada user kasir</p>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Kasir'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{'*'.repeat(6)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit}
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDeleteUser(user.id)}
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
        </div>
      </Card>

      {/* Menu Visibility Control */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center text-blue-800">
            <Eye className="h-5 w-5 mr-2" />
            Visibilitas Menu untuk Kasir
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Visibilitas</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((menu) => {
                const isHidden = isMenuHidden(menu.id);
                return (
                  <TableRow key={`visibility-${menu.id}`}>
                    <TableCell>{menu.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isHidden ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {isHidden ? 'Tersembunyi' : 'Terlihat'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={isHidden ? "success" : "danger"}
                        onClick={() => toggleMenuVisibility(menu.id)}
                      >
                        {isHidden ? 'Tampilkan' : 'Sembunyikan'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Menu Access Control */}
      <Card className="border-amber-200">
        <CardHeader className="bg-amber-50">
          <CardTitle className="flex items-center text-amber-800">
            <Lock className="h-5 w-5 mr-2" />
            Kontrol Akses Menu (PIN per Menu)
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PIN Menu</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((menu) => {
                const isLocked = settings.lockedMenus?.includes(menu.id);
                const hasPin = settings.menuPins?.[menu.id];
                return (
                  <TableRow key={menu.id}>
                    <TableCell>{menu.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isLocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {isLocked ? 'Terkunci' : 'Terbuka'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        hasPin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {hasPin ? 'Ada PIN' : 'Tidak Ada PIN'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={isLocked ? "success" : "danger"}
                          onClick={() => toggleMenuLock(menu.id)}
                        >
                          {isLocked ? 'Buka' : 'Kunci'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Lock}
                          onClick={() => handleSetMenuPin(menu.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Atur PIN
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* PIN Modal */}
      <Modal
        isOpen={showPinModal}
        onClose={() => {
          setShowPinModal(false);
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
        }}
        title={settings.pin ? 'Ubah PIN' : 'Atur PIN'}
        size="md"
      >
        <form onSubmit={handlePinChange} className="space-y-4">
          {settings.pin && (
            <div className="relative">
              <Input
                label="PIN Lama"
                type={showPin ? "text" : "password"}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value)}
                placeholder="Masukkan PIN lama"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
          
          <Input
            label="PIN Baru"
            type={showPin ? "text" : "password"}
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Masukkan PIN 6 digit"
            maxLength={6}
            required
          />
          
          <Input
            label="Konfirmasi PIN Baru"
            type={showPin ? "text" : "password"}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Konfirmasi PIN baru"
            maxLength={6}
            required
          />
          
          <div className="flex gap-3">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Simpan
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowPinModal(false);
                setCurrentPin('');
                setNewPin('');
                setConfirmPin('');
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Menu PIN Modal */}
      <Modal
        isOpen={showMenuPinModal}
        onClose={() => {
          setShowMenuPinModal(false);
          setSelectedMenu('');
          setMenuPin('');
        }}
        title={`Atur PIN Menu - ${menuItems.find(m => m.id === selectedMenu)?.name}`}
        size="md"
      >
        <form onSubmit={handleMenuPinUpdate} className="space-y-4">
          <Input
            label="PIN Menu (6 digit)"
            type="password"
            value={menuPin}
            onChange={(e) => setMenuPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Masukkan PIN 6 digit (kosongkan untuk hapus)"
            maxLength={6}
          />
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Catatan:</strong> PIN ini akan diminta setiap kali user kasir ingin mengakses menu ini. 
              Kosongkan field untuk menghapus PIN menu.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Simpan
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowMenuPinModal(false);
                setSelectedMenu('');
                setMenuPin('');
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Profile"
        size="md"
      >
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <Input
            label="Nama"
            value={profileData.name}
            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            placeholder="Masukkan nama"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            placeholder="Masukkan email"
            required
          />
          
          <div className="flex gap-3">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Simpan
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setShowProfileModal(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
          setUserFormData({ name: '', role: 'kasir', pin: '' });
        }}
        title={editingUser ? 'Edit User' : 'Tambah User Baru'}
        size="md"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <Input
            label="Nama"
            value={userFormData.name}
            onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
            placeholder="Masukkan nama user"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <Input
            label="PIN (6 digit)"
            type="password"
            value={userFormData.pin}
            onChange={(e) => setUserFormData({ ...userFormData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder="Masukkan PIN 6 digit"
            maxLength={6}
            required
          />
          
          <div className="flex gap-3">
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              {editingUser ? 'Perbarui' : 'Simpan'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowUserModal(false);
                setEditingUser(null);
                setUserFormData({ name: '', role: 'kasir', pin: '' });
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminSettings;