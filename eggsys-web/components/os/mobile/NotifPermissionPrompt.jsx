import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/devToast';

export default function NotifPermissionPrompt({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-2">Enable Notifications?</h2>
            <p className="text-gray-600 text-center text-sm mb-6">
              Get notified when you receive messages and updates right on your home screen.
            </p>
            <div className="space-y-3">
              <Button
                onClick={async () => {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    onClose();
                    toast.success('Notifications enabled!');
                    setTimeout(() => window.location.reload(), 500);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Enable Notifications
              </Button>
              <Button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                variant="outline"
                className="w-full"
              >
                Not Now
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}