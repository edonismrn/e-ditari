export const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${month}`;
};

export const getDayName = (date) => {
  const days = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];
  return days[new Date(date).getDay()];
};

export const getMonthName = (date) => {
  const months = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Krr', 'Gsh', 'Sht', 'Tet', 'Nën', 'Dhj'];
  return months[new Date(date).getMonth()];
};
