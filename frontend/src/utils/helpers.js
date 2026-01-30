export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const getStatusColor = (status) => {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-blue-100 text-blue-700',
    pending_verification: 'bg-yellow-100 text-yellow-700',
    account_verified: 'bg-purple-100 text-purple-700',
    admin_verified: 'bg-green-100 text-green-700',
    billed: 'bg-teal-100 text-teal-700',
    paid: 'bg-emerald-100 text-emerald-700',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-700';
};

export const getStatusLabel = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

export const calculateTotalPaid = (installments) => {
  if (!installments || !Array.isArray(installments)) return 0;
  return installments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
};

export const calculateBalance = (salePrice, installments) => {
  const totalPaid = calculateTotalPaid(installments);
  return salePrice - totalPaid;
};
