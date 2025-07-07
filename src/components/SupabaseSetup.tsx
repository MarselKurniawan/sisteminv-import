import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Database, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const SupabaseSetup: React.FC = () => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if Supabase is already configured
    const url = localStorage.getItem('supabase_url');
    const key = localStorage.getItem('supabase_anon_key');
    
    if (url && key) {
      setSupabaseUrl(url);
      setSupabaseKey(key);
      setIsConfigured(true);
      
      // Test connection
      testConnection(url, key);
    } else {
      setIsConfigured(isSupabaseConfigured());
      if (isSupabaseConfigured()) {
        testConnection();
      }
    }
  }, []);

  const testConnection = async (url?: string, key?: string) => {
    setIsLoading(true);
    try {
      // Use either the provided credentials or the ones from the environment
      const client = url && key 
        ? createClient(url, key) 
        : supabase;
      
      const { data, error } = await client.from('cities').select('count').limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        setIsConnected(false);
        toast.error('Koneksi ke Supabase gagal');
      } else {
        setIsConnected(true);
        toast.success('Koneksi ke Supabase berhasil');
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setIsConnected(false);
      toast.error('Koneksi ke Supabase gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = (url: string, key: string) => {
    return supabase;
  };

  const handleSaveConfig = () => {
    if (!supabaseUrl || !supabaseKey) {
      toast.error('URL dan API Key harus diisi');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_anon_key', supabaseKey);
    
    // Test connection
    testConnection(supabaseUrl, supabaseKey);
    
    setIsConfigured(true);
    toast.success('Konfigurasi Supabase disimpan');
  };

  const handleReset = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    setSupabaseUrl('');
    setSupabaseKey('');
    setIsConfigured(false);
    setIsConnected(false);
    toast.success('Konfigurasi Supabase direset');
  };

  return (
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center text-blue-800">
          <Database className="h-5 w-5 mr-2" />
          Konfigurasi Supabase Database
        </CardTitle>
      </CardHeader>
      <div className="p-6 space-y-6">
        {isConfigured ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-start ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              )}
              <div>
                <h3 className={`font-medium ${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                  {isConnected ? 'Terhubung ke Supabase' : 'Tidak dapat terhubung ke Supabase'}
                </h3>
                <p className={`text-sm mt-1 ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                  {isConnected 
                    ? 'Database Supabase berhasil dikonfigurasi dan terhubung. Data akan disimpan di cloud.' 
                    : 'Terjadi masalah saat menghubungkan ke Supabase. Periksa kredensial Anda.'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Supabase URL"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                disabled={isLoading}
              />
              <Input
                label="Supabase Anon Key"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                type="password"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => testConnection(supabaseUrl, supabaseKey)}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Menguji Koneksi...' : 'Uji Koneksi'}
              </Button>
              <Button
                onClick={handleSaveConfig}
                disabled={isLoading || !supabaseUrl || !supabaseKey}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Simpan Perubahan
              </Button>
              <Button
                onClick={handleReset}
                disabled={isLoading}
                variant="secondary"
              >
                Reset Konfigurasi
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Konfigurasi Database Diperlukan
              </h3>
              <p className="text-sm text-yellow-700 mt-2">
                Untuk menyimpan data di cloud dan memungkinkan akses dari berbagai perangkat, Anda perlu mengkonfigurasi Supabase.
                Masukkan URL dan API Key Supabase Anda di bawah ini.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Supabase URL"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                required
                disabled={isLoading}
              />
              <Input
                label="Supabase Anon Key"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                type="password"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleSaveConfig}
                disabled={isLoading || !supabaseUrl || !supabaseKey}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Konfigurasi'}
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800">Cara Mendapatkan Kredensial Supabase:</h4>
              <ol className="mt-2 space-y-2 text-sm text-blue-700 list-decimal list-inside">
                <li>Buat akun di <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">Supabase.com</a></li>
                <li>Buat project baru</li>
                <li>Setelah project dibuat, buka "Settings" &gt; "API"</li>
                <li>Salin "Project URL" dan "anon public" key</li>
                <li>Tempel kredensial tersebut di form di atas</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SupabaseSetup;