/**
 * Professional CSV Export Utility
 * Handles UTF-8 encoding and standard CSV formatting for production data exports.
 */

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Add Company Branding Header
  const brandingHeader = `Gold X Usdt - Secure USDT Investment Platform\nExported on: ${new Date().toLocaleString()}\n\n`;
  
  // Create rows
  const rows = data.map(obj => 
    headers.map(header => {
      let val = obj[header];
      if (val === null || val === undefined) val = '';
      // Escape quotes and wrap in quotes if contains comma
      const stringVal = String(val).replace(/"/g, '""');
      return `"${stringVal}"`;
    }).join(',')
  );

  // Combine headers and rows
  const csvContent = brandingHeader + [headers.join(','), ...rows].join('\n');
  
  // Create blob and download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportUserDataCSV(profile: any, wallets: any[], transactions: any[]) {
  // Combine all user data into a single CSV if needed, or export multiple files
  // For now, let's just export a summary
  const summary = [
    {
      'Category': 'User Profile',
      'Detail': `Name: ${profile.full_name}, Email: ${profile.email}`
    },
    ...wallets.map(w => ({
      'Category': `Wallet: ${w.wallet_type}`,
      'Detail': `Balance: ${w.balance} USDT`
    })),
    ...transactions.map(t => ({
      'Category': `Transaction: ${t.transaction_type}`,
      'Detail': `Amount: ${t.amount} USDT, Status: ${t.status}, Date: ${t.created_at}`
    }))
  ];
  
  exportToCSV(summary, 'user_data_export');
}
