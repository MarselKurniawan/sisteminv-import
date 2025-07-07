import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface PinProtectionProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  menuName: string;
  verifyPin?: (pin: string) => Promise<boolean>;
}

export const PinProtection: React.FC<PinProtectionProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  menuName,
  verifyPin
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      toast.error('PIN harus 6 digit');
      return;
    }

    setLoading(true);
    try {
      let isValid = false;
      
      if (verifyPin) {
        isValid = await verifyPin(pin);
      } else {
        // Fallback to default verification
        const { db } = await import('../lib/database');
        isValid = await db.verifyPin(pin);
      }
      
      if (isValid) {
        onSuccess();
        setPin('');
        toast.success('Akses berhasil');
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
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Akses Terbatas - ${menuName}`}
      size="sm"
    >
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
          <Lock className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-gray-600">
          Menu ini memerlukan PIN khusus untuk diakses
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Masukkan PIN Menu"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 digit PIN"
          maxLength={6}
          required
          className="text-center text-2xl tracking-widest"
        />
        
        <div className="flex gap-3">
          <Button 
            type="submit" 
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            disabled={loading || pin.length !== 6}
          >
            {loading ? 'Memverifikasi...' : 'Akses'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={onCancel}
            className="flex-1"
          >
            Batal
          </Button>
        </div>
      </form>
    </Modal>
  );
};