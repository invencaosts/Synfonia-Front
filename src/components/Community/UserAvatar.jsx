import React from 'react';
import { User } from 'lucide-react';

const SIZES = {
  sm: 'w-10 h-10 rounded-full text-sm',
  md: 'w-14 h-14 rounded-2xl text-xl',
  lg: 'w-28 h-28 md:w-32 md:h-32 rounded-[32px] text-5xl',
};

const UserAvatar = ({ user, size = 'md', className = '' }) => {
  const initial = (user?.displayName || user?.username || '').trim().charAt(0).toUpperCase();

  return (
    <div className={`${SIZES[size]} bg-linear-to-br from-brand via-purple-600 to-indigo-700 flex items-center justify-center font-black text-brand-contrast overflow-hidden shrink-0 shadow-lg ${className}`}>
      {user?.fotoPerfil ? (
        <img src={user.fotoPerfil} alt={user.displayName || user.username} className="w-full h-full object-cover" />
      ) : initial ? (
        initial
      ) : (
        <User size={size === 'lg' ? 40 : 20} />
      )}
    </div>
  );
};

export default UserAvatar;
