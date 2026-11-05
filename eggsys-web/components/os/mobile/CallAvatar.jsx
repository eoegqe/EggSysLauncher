import React from 'react';
import { Phone } from 'lucide-react';

// Shared avatar for call screens: shows the other user's profile picture,
// falling back to a phone icon when no picture is set.
export default function CallAvatar({ otherUser, className = '', iconClass = 'w-16 h-16' }) {
  return (
    <div className={`rounded-full flex items-center justify-center overflow-hidden ${className}`}>
      {otherUser?.profile_picture ? (
        <img src={otherUser.profile_picture} alt={otherUser?.username || 'caller'} className="w-full h-full object-cover" />
      ) : (
        <Phone className={`${iconClass} text-white`} />
      )}
    </div>
  );
}