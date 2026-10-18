/**
 * Shared formatting utilities for PetPaws client
 */

export const formatDate = (record) => {
  const raw = record?.created_at || record?.createdAt || record?.date;
  if (!raw) return 'Recent';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Recent';
  }
};

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString()}`;
};
