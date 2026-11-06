import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Mail, Headphones } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SupportChat from '../apps/mobile/SupportChat';

export default function MobileBanScreen({ user, eAccount, onBypass }) {
  const [showAppeal, setShowAppeal] = useState(false);
  const banReason = eAccount?.banned_reason || user?.ban_reason;

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-red-600 via-red-700 to-red-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Icon */}
        <div className="w-24 h-24 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Account Banned</h1>
        <p className="text-gray-600 mb-6">
          Your account has been banned and you cannot access EggetSystem Mobile.
        </p>

        {/* Ban Reason */}
        {banReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1 text-sm">Reason for Ban</h3>
                <p className="text-sm text-red-800">{banReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3 text-left">
            <Mail className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Need Help?</h3>
              <p className="text-xs text-gray-600">
                If you believe this is a mistake, please contact support through the feedback system.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {onBypass && (
            <button
              onClick={onBypass}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all"
            >
              Bypass
            </button>
          )}
          <button
            onClick={() => setShowAppeal(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Headphones className="w-5 h-5" />
            Appeal to Support
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>

        {/* Account Info */}
        <p className="text-xs text-gray-400 mt-6">
          Account: {user?.email}
        </p>
      </div>

      {showAppeal && (
        <div className="fixed inset-0 z-50 bg-white">
          <SupportChat
            conversationEmail={user?.email}
            conversationUsername={user?.username}
            isSupport={false}
            currentUser={user}
            onBack={() => setShowAppeal(false)}
          />
        </div>
      )}
    </div>
  );
}