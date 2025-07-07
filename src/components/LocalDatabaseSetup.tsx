import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Database, CheckCircle, AlertCircle, Download, Upload, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { initDatabase, isDatabaseInitialized, exportDatabase } from '../lib/localDatabase';
import { db } from '../lib/database';

const LocalDatabaseSetup: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    setIsLoading(true);
    try {
      if (!isDatabaseInitialized()) {
        await initDatabase();
      }
      setIsInitialized(isDatabaseInitialized());
    } catch (error) {
      console.error('Error checking database status:', error);
      toast.error('Gagal memeriksa status database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeDatabase = async () => {
    setIsLoading(true);
    try {
      await initDatabase();
      setIsInitialized(true);
      toast.success('Database berhasil diinisialisasi');
    } catch (error) {
      console.error('Error initializing database:', error);
      toast.error('Gagal menginisialisasi database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-green-200">
      <CardHeader className="bg-green-50">
        <CardTitle className="flex items-center text-green-800">
          <Database className="h-5 w-5 mr-2" />
          Database Lokal SQLite
        </CardTitle>
      </CardHeader>
      <div className="p-6 space-y-6">
        <div className={`p-4 rounded-lg flex items-start ${isInitialized ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {isInitialized ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          )}
          <div>
            <h3 className={`font-medium ${isInitialized ? 'text-green-800' : 'text-red-800'}`}>
              {isInitialized ? 'Database Lokal Aktif' : 'Database Lokal Belum Diinisialisasi'}
            </h3>
            <p className={`text-sm mt-1 ${isInitialized ? 'text-green-700' : 'text-red-700'}`}>
              {isInitialized 
                ? 'Database SQLite lokal berhasil diinisialisasi. Data akan disimpan di browser Anda dan dapat diakses kapan saja.' 
                : 'Database lokal belum diinisialisasi. Klik tombol di bawah untuk menginisialisasi database.'}
            </p>
          </div>
        </div>
        
        {!isInitialized && (
          <Button
            onClick={handleInitializeDatabase}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Menginisialisasi...' : 'Inisialisasi Database'}
          </Button>
        )}
        
        {isInitialized && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Database SQLite Lokal
              </h4>
              <p className="text-sm text-blue-700 mt-2">
                Database SQLite lokal telah diaktifkan. Data Anda disimpan di browser dan dapat diakses kapan saja.
                Anda juga dapat melakukan backup dan restore data untuk memindahkannya ke perangkat lain.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-blue-200">
                <div className="p-4">
                  <h4 className="font-medium text-blue-800 flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Backup Database
                  </h4>
                  <p className="text-sm text-blue-700 mt-2 mb-4">
                    Download database SQLite untuk backup atau transfer ke perangkat lain.
                  </p>
                  <Button
                    onClick={() => {
                      const success = exportDatabase();
                      if (success) {
                        toast.success('Database berhasil diunduh');
                      } else {
                        toast.error('Gagal mengunduh database');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Download Database
                  </Button>
                </div>
              </Card>
              
              <Card className="border-purple-200">
                <div className="p-4">
                  <h4 className="font-medium text-purple-800 flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Database
                  </h4>
                  <p className="text-sm text-purple-700 mt-2 mb-4">
                    Import database SQLite dari file backup.
                  </p>
                  <div>
                    <label htmlFor="database-file" className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih File Database (.sqlite)
                    </label>
                    <input
                      id="database-file"
                      type="file"
                      accept=".sqlite"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        try {
                          const success = await db.uploadBackup(file);
                          if (success) {
                            toast.success('Database berhasil diimpor! Halaman akan dimuat ulang...');
                            setTimeout(() => {
                              window.location.reload();
                            }, 1500);
                          } else {
                            toast.error('Gagal mengimpor database');
                          }
                        } catch (error) {
                          console.error('Error importing database:', error);
                          toast.error('Gagal mengimpor database');
                        }
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LocalDatabaseSetup;