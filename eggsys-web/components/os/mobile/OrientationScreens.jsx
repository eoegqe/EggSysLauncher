import { Info, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TabletDialog({ onConfirm, onDeny }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
        <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Info className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Are you on a tablet?</h1>
        <p className="text-gray-600 mb-6">
          EggetSystem Mobile only supports portrait mode on phones. If you're on a tablet, you can use landscape mode.
        </p>
        <div className="space-y-3">
          <Button
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            Yes, I'm on a tablet
          </Button>
          <Button
            onClick={onDeny}
            variant="outline"
            className="w-full"
          >
            No, rotate to portrait
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LandscapeWarning({ onSwitchToPC }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-2xl">
        <div className="w-20 h-20 bg-orange-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <RotateCw className="w-10 h-10 text-orange-600 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Rotate to Portrait</h1>
        <p className="text-gray-600 mb-6">
          To access landscape mode, please use a tablet. Rotate your phone back to portrait to continue using EggetSystem.
        </p>
        <div className="flex justify-center">
          <div className="w-16 h-24 border-4 border-gray-300 rounded-xl flex items-center justify-center">
            <div className="w-8 h-12 border-2 border-gray-400 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}