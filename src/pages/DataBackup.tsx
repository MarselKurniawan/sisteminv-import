import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/database';
import { Download, Upload, Database, AlertTriangle, CheckCircle, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import LocalDatabaseSetup from '../components/LocalDatabaseSetup';

const DataBackup: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const success = db.downloadBackup();
      if (success) {
        toast.success('Backup berhasil diunduh!');
      } else {
        toast.error('Gagal mengunduh backup');
      }
    } catch (error) {
      toast.error('Gagal mengekspor data');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sqlite')) {
      toast.error('File harus berformat SQLite (.sqlite)');
      return;
    }

    setImporting(true);
    try {
      const success = await db.uploadBackup(file);
      if (success) {
        toast.success('Data berhasil diimpor! Halaman akan dimuat ulang...');
        // Refresh page to load new data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error('Gagal mengimpor data. Pastikan file valid.');
      }
    } catch (error) {
      toast.error('Gagal mengimpor data. Pastikan file valid.');
      console.error(error);
    } finally {
      setImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleManualBackup = () => {
    handleExport();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore Data</h1>
          <p className="text-gray-600 mt-1">Kelola backup dan restore data sistem dengan aman menggunakan database SQLite</p>
        </div>
      </div>

      {/* Database Setup */}
      <LocalDatabaseSetup />

      {/* Auto Backup Info */}
      <Card className="border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-3">
          <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-blue-900">Auto Backup Aktif</h3>
            <div className="mt-2 text-sm text-blue-800 space-y-2">
              <p>• Sistem otomatis menyimpan data ke database SQLite lokal</p>
              <p>• Data tersimpan secara real-time setiap ada perubahan</p>
              <p>• Backup manual tersedia kapan saja dengan tombol di bawah</p>
              <p>• Database SQLite dapat dipindahkan antar perangkat dengan mudah</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Warning Card */}
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-1" />
          <div>
            <h3 className="text-lg font-medium text-amber-900">Peringatan Penting</h3>
            <div className="mt-2 text-sm text-amber-800 space-y-2">
              <p>• Backup data secara berkala untuk menghindari kehilangan data</p>
              <p>• Import data akan mengganti semua data yang ada saat ini</p>
              <p>• Pastikan file backup valid sebelum melakukan import</p>
              <p>• Disarankan untuk melakukan backup sebelum import data baru</p>
              <p>• Data disimpan dalam format SQLite yang mudah dipindahkan</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center text-blue-800">
            <Download className="h-5 w-5 mr-2" />
            Export Data (Manual Backup)
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            Download database SQLite untuk backup atau transfer ke perangkat lain.
          </p>
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleManualBackup}
              disabled={exporting}
              icon={exporting ? RefreshCw : Download}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exporting ? 'Mengunduh...' : 'Download Backup Sekarang'}
            </Button>
            <div className="text-sm text-gray-500">
              File akan diunduh dengan nama: risna_cookies_backup_[tanggal].sqlite
            </div>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="flex items-center text-purple-800">
            <Upload className="h-5 w-5 mr-2" />
            Import Data (Restore dari Backup)
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            Import data dari file backup SQLite. Semua data saat ini akan diganti dengan data dari file backup.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="backup-file" className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File Backup (SQLite)
              </label>
              <input
                id="backup-file"
                type="file"
                accept=".sqlite"
                onChange={handleImport}
                disabled={importing}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            {importing && (
              <div className="flex items-center space-x-2 text-purple-600">
                <RefreshCw className="animate-spin h-4 w-4" />
                <span className="text-sm">Mengimpor data...</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Backup Verification */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center text-green-800">
            <FileText className="h-5 w-5 mr-2" />
            Verifikasi Backup
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <p className="text-gray-600">
            Pastikan file backup Anda valid dan lengkap dengan melakukan verifikasi sebelum import.
          </p>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">Checklist Verifikasi:</h4>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                File berformat SQLite (.sqlite) dan berukuran wajar
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                File backup dibuat dari versi sistem yang sama
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Backup berisi semua data penting (produk, transaksi, dll)
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                File memiliki struktur database yang valid
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="border-indigo-200">
        <CardHeader className="bg-indigo-50">
          <CardTitle className="flex items-center text-indigo-800">
            <Database className="h-5 w-5 mr-2" />
            Petunjuk Penggunaan
          </CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Untuk Backup Rutin:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Sistem otomatis menyimpan data setiap ada perubahan</li>
              <li>Klik "Download Backup Sekarang" untuk backup manual kapan saja</li>
              <li>Simpan file backup di tempat yang aman (cloud storage, USB, dll)</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Untuk Transfer ke Perangkat Lain:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Download backup dari perangkat sumber</li>
              <li>Transfer file backup ke perangkat tujuan</li>
              <li>Buka aplikasi di perangkat tujuan</li>
              <li>Import file backup di menu "Backup & Restore"</li>
              <li>Sistem akan restart otomatis setelah import berhasil</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Untuk Restore Data:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Pastikan Anda memiliki file backup yang valid (format SQLite)</li>
              <li>Backup data saat ini terlebih dahulu (opsional)</li>
              <li>Pilih file backup dan tunggu proses import selesai</li>
              <li>Sistem akan memuat data dari backup secara otomatis</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Format File Backup:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>File berformat SQLite dengan ekstensi .sqlite</li>
              <li>Berisi semua data: produk, transaksi, karyawan, dll</li>
              <li>Database SQLite dapat dibuka dengan berbagai aplikasi SQLite browser</li>
              <li>Ukuran file tergantung pada jumlah data yang disimpan</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Status Info */}
      <Card className="border-green-200">
        <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-lg">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-medium text-green-900">Status Sistem</h3>
            <p className="text-sm text-green-700 mt-1">
              Sistem berjalan dengan database SQLite lokal. Data tersimpan di browser Anda dan dapat di-backup ke file SQLite kapan saja.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataBackup;