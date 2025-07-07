import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { db } from '../lib/database';
import { Lock, Eye, EyeOff, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { isDatabaseInitialized } from '../lib/localDatabase';
import LocalDatabaseSetup from '../components/LocalDatabaseSetup';

interface LoginProps {
  onLogin: (role: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDbInitialized = isDatabaseInitialized();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      toast.error('PIN harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      const result = await db.login(pin);
      if (result.success) {
        onLogin(result.role);
        toast.success('Login berhasil');
      } else {
        toast.error('PIN salah');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <img 
              src="https://risnacookies.com/wp-content/uploads/2025/02/Risna-Cookies-Desain-02-e1740218556622.png" 
              alt="Logo" 
              className="mx-auto mb-4 w-32"
            />
            <h2 className="text-2xl font-bold text-gray-900">Sistem Inventory</h2>
            <p className="text-gray-600 mt-2">Masukkan PIN untuk mengakses sistem</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Input
                label="PIN (6 digit)"
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Masukkan PIN"
                maxLength={6}
                required
                className="text-center text-2xl tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-success"
              disabled={loading || pin.length !== 6 || !isDbInitialized}
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </Button>

            <div className="text-center text-sm text-gray-500">
              <div className="flex items-center justify-center text-green-600">
                <Database className="h-4 w-4 mr-1" />
                <span>Menggunakan SQLite Database Lokal</span>
              </div>
            </div>
          </form>
        </Card>

        {!isDbInitialized && (
          <LocalDatabaseSetup />
        )}
      </div>
    </div>
  );
};

export default Login;