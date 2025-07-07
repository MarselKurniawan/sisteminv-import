import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, DollarSign, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const Payroll: React.FC = () => {
  const { payrolls, employees, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
  const [selectedPayrolls, setSelectedPayrolls] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    period: '',
    attendance_days: 0,
    overtime_days: 0,
    additional_amount: 0,
    additional_description: '',
    additional_show_in_print: true,
    deduction_amount: 0,
    deduction_description: '',
    deduction_show_in_print: true
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotalSalary = () => {
    const employee = employees?.find((emp: any) => emp.id === parseInt(formData.employee_id));
    if (!employee) return 0;

    const baseSalary = employee.base_salary * formData.attendance_days;
    const overtimePay = employee.base_overtime * formData.overtime_days;
    const total = baseSalary + overtimePay + formData.additional_amount - formData.deduction_amount;
    
    return Math.max(0, total);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const employee = employees?.find((emp: any) => emp.id === parseInt(formData.employee_id));
      const totalSalary = calculateTotalSalary();
      
      const payrollData = {
        ...formData,
        employee_id: parseInt(formData.employee_id),
        base_salary: employee?.base_salary || 0,
        base_overtime: employee?.base_overtime || 0,
        total_salary: totalSalary
      };

      if (editingPayroll) {
        await db.updatePayroll(editingPayroll.id, payrollData);
        toast.success('Penggajian berhasil diperbarui');
      } else {
        await db.addPayroll(payrollData);
        toast.success('Penggajian berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (payroll: any) => {
    setEditingPayroll(payroll);
    setFormData({
      employee_id: payroll.employee_id.toString(),
      period: payroll.period,
      attendance_days: payroll.attendance_days,
      overtime_days: payroll.overtime_days,
      additional_amount: payroll.additional_amount,
      additional_description: payroll.additional_description || '',
      additional_show_in_print: payroll.additional_show_in_print !== false,
      deduction_amount: payroll.deduction_amount,
      deduction_description: payroll.deduction_description || '',
      deduction_show_in_print: payroll.deduction_show_in_print !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus data penggajian ini?')) {
      try {
        await db.deletePayroll(id);
        toast.success('Data penggajian berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleSelectPayroll = (id: number) => {
    setSelectedPayrolls(prev => 
      prev.includes(id) 
        ? prev.filter(payrollId => payrollId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedPayrolls.length === payrolls.length) {
      setSelectedPayrolls([]);
    } else {
      setSelectedPayrolls(payrolls.map((p: any) => p.id));
    }
  };

  const handlePrintSelected = () => {
    if (selectedPayrolls.length === 0) {
      toast.error('Pilih minimal satu data penggajian');
      return;
    }

    const selectedData = payrolls.filter((p: any) => selectedPayrolls.includes(p.id));
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      const cardsPerPage = 8;
      const pages = Math.ceil(selectedData.length / cardsPerPage);
      
      let htmlContent = `
        <html>
          <head>
            <title>Slip Gaji - Multiple</title>
            <style>
              body { 
                font-family: "Poppins", sans-serif; 
                font-weight: 300;
                margin: 0; 
                padding: 10px; 
                font-size: 11px;
              }
              .page { 
                page-break-after: always; 
                display: grid; 
                grid-template-columns: repeat(2, 1fr); 
                gap: 15px;
                height: 100vh;
                box-sizing: border-box;
              }
              .page:last-child { page-break-after: avoid; }
              .card { 
                border: 2px solid #059669; 
                padding: 12px; 
                height: 280px;
                box-sizing: border-box;
                background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .header { 
                text-align: center; 
                margin-bottom: 10px; 
                border-bottom: 2px solid #059669; 
                padding-bottom: 8px; 
              }
              .header h3 {
                margin: 0;
                color: #059669;
                font-size: 14px;
                font-weight: bold;
              }
              .header p {
                margin: 2px 0;
                color: #065f46;
                font-size: 10px;
              }
              .content {
                flex: 1;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .row { 
                display: flex; 
                justify-content: space-between; 
                margin: 2px 0; 
                font-size: 10px;
              }
              .row .label {
                color: #065f46;
              }
              .row .value {
                font-weight: bold;
                color: #059669;
              }
              .total { 
                border-top: 2px solid #059669; 
                font-weight: bold; 
                margin-top: 2px; 
                padding-top: 2px; 
                font-size: 12px;
                color: #059669;
              }
              .footer {
                text-align: center;
                margin-top: 4px;
                font-size: 9px;
                color: #065f46;
              }
              @media print { 
                body { margin: 0; padding: 5px; } 
                .page { page-break-after: always; }
              }
            </style>
          </head>
          <body>
      `;

      for (let page = 0; page < pages; page++) {
        const startIndex = page * cardsPerPage;
        const endIndex = Math.min(startIndex + cardsPerPage, selectedData.length);
        const pageData = selectedData.slice(startIndex, endIndex);

        htmlContent += `<div class="page">`;

        pageData.forEach((payroll: any) => {
          const employee = employees?.find((emp: any) => emp.id === payroll.employee_id);
          const baseSalary = (employee?.base_salary || 0) * payroll.attendance_days;
          const overtimePay = (employee?.base_overtime || 0) * payroll.overtime_days;

          htmlContent += `
            <div class="card">
              <div class="header">
                <h3>SLIP GAJI</h3>
                <p>RISNA COOKIES & BAKERY</p>
                <p>Periode: ${new Date(payroll.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
              </div>
              
              <div class="content">
                <div>
                  <div class="row">
                    <span class="label">Nama:</span>
                    <span class="value">${employee?.name || 'Unknown'}</span>
                  </div>
                  
                  <div class="row">
                    <span class="label">Absensi:</span>
                    <span class="value">${payroll.attendance_days} hari</span>
                  </div>
                  
                  <div class="row">
                    <span class="label">Gaji Pokok:</span>
                    <span class="value">${formatCurrency(baseSalary)}</span>
                  </div>
                  
                  <div class="row">
                    <span class="label">Lembur (${payroll.overtime_days} hari):</span>
                    <span class="value">${formatCurrency(overtimePay)}</span>
                  </div>
                  
                  ${payroll.additional_show_in_print && payroll.additional_amount > 0 ? `
                  <div class="row">
                    <span class="label">Tambahan${payroll.additional_description ? ` (${payroll.additional_description})` : ''}:</span>
                    <span class="value">${formatCurrency(payroll.additional_amount)}</span>
                  </div>
                  ` : ''}
                  
                  ${payroll.deduction_show_in_print && payroll.deduction_amount > 0 ? `
                  <div class="row">
                    <span class="label">Potongan${payroll.deduction_description ? ` (${payroll.deduction_description})` : ''}:</span>
                    <span class="value">-${formatCurrency(payroll.deduction_amount)}</span>
                  </div>
                  ` : ''}
                </div>
                
                <div class="row total">
                  <span>Total Gaji:</span>
                  <span>${formatCurrency(payroll.total_salary)}</span>
                </div>
              </div>
              
              <div class="footer">
                Terima kasih atas dedikasi Anda
              </div>
            </div>
          `;
        });

        // Fill remaining slots with empty cards if needed
        const remainingSlots = cardsPerPage - pageData.length;
        for (let i = 0; i < remainingSlots; i++) {
          htmlContent += `<div></div>`;
        }

        htmlContent += `</div>`;
      }

      htmlContent += `</body></html>`;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      period: '',
      attendance_days: 0,
      overtime_days: 0,
      additional_amount: 0,
      additional_description: '',
      additional_show_in_print: true,
      deduction_amount: 0,
      deduction_description: '',
      deduction_show_in_print: true
    });
    setEditingPayroll(null);
    setShowForm(false);
  };

  const employeeOptions = employees?.map((employee: any) => ({
    value: employee.id,
    label: employee.name
  })) || [];

  const selectedEmployee = employees?.find((emp: any) => emp.id === parseInt(formData.employee_id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Penggajian</h1>
          <p className="text-gray-600 mt-1">Kelola penggajian karyawan dengan slip gaji</p>
        </div>
        <div className="flex gap-3">
          {selectedPayrolls.length > 0 && (
            <Button
              onClick={handlePrintSelected}
              icon={Printer}
              variant="secondary"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Cetak Terpilih ({selectedPayrolls.length})
            </Button>
          )}
          <Button
            onClick={() => setShowForm(true)}
            icon={Plus}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Tambah Penggajian
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="text-emerald-800">
              {editingPayroll ? 'Edit Penggajian' : 'Tambah Penggajian Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Karyawan"
                value={formData.employee_id}
                onChange={(value) => setFormData({ ...formData, employee_id: value.toString() })}
                options={employeeOptions}
                placeholder="Pilih karyawan"
                required
              />
              <Input
                label="Periode"
                type="date"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                required
              />
            </div>

            {selectedEmployee && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-emerald-900 mb-2">Informasi Karyawan</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Base Gaji: <span className="font-medium text-emerald-700">{formatCurrency(selectedEmployee.base_salary)}/hari</span></div>
                  <div>Base Lembur: <span className="font-medium text-emerald-700">{formatCurrency(selectedEmployee.base_overtime)}/hari</span></div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Absensi (hari)"
                type="number"
                value={formData.attendance_days}
                onChange={(e) => setFormData({ ...formData, attendance_days: parseInt(e.target.value) || 0 })}
                min={0}
                max={31}
                required
              />
              <Input
                label="Lembur (hari)"
                type="number"
                value={formData.overtime_days}
                onChange={(e) => setFormData({ ...formData, overtime_days: parseInt(e.target.value) || 0 })}
                min={0}
                required
              />
            </div>
            
            {/* Additional Amount */}
            <div className="space-y-4 p-4 border border-emerald-200 rounded-lg bg-emerald-50">
              <h4 className="font-medium text-emerald-900">Tambahan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Jumlah Tambahan"
                  type="number"
                  value={formData.additional_amount}
                  onChange={(e) => setFormData({ ...formData, additional_amount: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
                <Input
                  label="Keterangan Tambahan"
                  value={formData.additional_description}
                  onChange={(e) => setFormData({ ...formData, additional_description: e.target.value })}
                  placeholder="Contoh: Bonus, Insentif"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="additional_show_in_print"
                  checked={formData.additional_show_in_print}
                  onChange={(e) => setFormData({ ...formData, additional_show_in_print: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="additional_show_in_print" className="text-sm text-emerald-800">
                  Tampilkan di slip gaji
                </label>
              </div>
            </div>

            {/* Deduction Amount */}
            <div className="space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium text-red-900">Potongan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Jumlah Potongan"
                  type="number"
                  value={formData.deduction_amount}
                  onChange={(e) => setFormData({ ...formData, deduction_amount: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
                <Input
                  label="Keterangan Potongan"
                  value={formData.deduction_description}
                  onChange={(e) => setFormData({ ...formData, deduction_description: e.target.value })}
                  placeholder="Contoh: BPJS, Pinjaman"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="deduction_show_in_print"
                  checked={formData.deduction_show_in_print}
                  onChange={(e) => setFormData({ ...formData, deduction_show_in_print: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="deduction_show_in_print" className="text-sm text-red-800">
                  Tampilkan di slip gaji
                </label>
              </div>
            </div>
            
            {formData.employee_id && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium mb-2 text-emerald-800">Perhitungan Gaji</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gaji Pokok ({formData.attendance_days} hari):</span>
                    <span className="text-emerald-700">{formatCurrency((selectedEmployee?.base_salary || 0) * formData.attendance_days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lembur ({formData.overtime_days} hari):</span>
                    <span className="text-emerald-700">{formatCurrency((selectedEmployee?.base_overtime || 0) * formData.overtime_days)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tambahan:</span>
                    <span className="text-emerald-700">{formatCurrency(formData.additional_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potongan:</span>
                    <span className="text-red-600">-{formatCurrency(formData.deduction_amount)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-lg border-t pt-2 border-emerald-300">
                    <span className="text-emerald-800">Total Gaji:</span>
                    <span className="text-emerald-700">{formatCurrency(calculateTotalSalary())}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingPayroll ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false} className="border-emerald-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-emerald-50">
              <TableHead>
                <input
                  type="checkbox"
                  checked={selectedPayrolls.length === payrolls.length && payrolls.length > 0}
                  onChange={handleSelectAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead className="text-emerald-700">ID</TableHead>
              <TableHead className="text-emerald-700">Karyawan</TableHead>
              <TableHead className="text-emerald-700">Periode</TableHead>
              <TableHead className="text-emerald-700">Absensi</TableHead>
              <TableHead className="text-emerald-700">Lembur</TableHead>
              <TableHead className="text-emerald-700">Total Gaji</TableHead>
              <TableHead className="text-emerald-700">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!payrolls || payrolls.length === 0) ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data penggajian</p>
                </TableCell>
              </TableRow>
            ) : (
              payrolls.map((payroll: any) => (
                <TableRow key={payroll.id} className="hover:bg-emerald-50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedPayrolls.includes(payroll.id)}
                      onChange={() => handleSelectPayroll(payroll.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>{payroll.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-emerald-500 mr-2" />
                      {payroll.employee_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(payroll.period).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </TableCell>
                  <TableCell>{payroll.attendance_days} hari</TableCell>
                  <TableCell>{payroll.overtime_days} hari</TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(payroll.total_salary)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(payroll)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(payroll.id)}
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

export default Payroll;