import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function MaintenanceScreen() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const { data: user } = useQuery({
    queryKey: ['current-user-maintenance'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (user?.bypass_maintenance) return null;

  if (isMobile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Maintenance</h1>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            We're performing maintenance. Back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-3">System Maintenance</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          We're performing scheduled maintenance to improve your experience. No errors detected — everything is working as planned.
        </p>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 font-medium">
            Please check back in about a day. We'll have everything running smoothly soon.
          </p>
        </div>
        <p className="text-sm text-gray-500">
          We appreciate your patience during this brief downtime.
        </p>
      </div>
    </div>
  );
}