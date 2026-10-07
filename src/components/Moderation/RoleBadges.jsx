import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ROLE_LABELS, ROLE_STYLES, elevatedRoles } from '../../utils/permissions';

const RoleBadges = ({ roles, className = '' }) => {
  const elevated = elevatedRoles(roles);
  if (elevated.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {elevated.map(role => (
        <span
          key={role}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${ROLE_STYLES[role] || 'bg-brand/10 text-brand border-brand/20'}`}
        >
          <ShieldCheck size={11} className="shrink-0" />
          {ROLE_LABELS[role] || role}
        </span>
      ))}
    </div>
  );
};

export default RoleBadges;
