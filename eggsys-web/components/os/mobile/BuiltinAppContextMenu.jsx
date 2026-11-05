import { motion, AnimatePresence } from 'framer-motion';
import { Package, Info, PowerOff } from 'lucide-react';

// Long-press context menu for BUILT-IN apps only.
// Shows App Info (opens Settings → app info) and Disable (hides from home screen).
// Settings itself is non-disableable, so Disable is hidden for it.
// `app` is an appConfigs entry: { id, title, icon (component), color }.
export default function BuiltinAppContextMenu({ app, onClose, onOpenApp, onAppInfo, onDisable }) {
  if (!app) return <AnimatePresence />;
  const canDisable = app.app_id !== 'settings';
  const Icon = app.icon || Package;

  return (
    <AnimatePresence>
      {app && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end justify-center pb-16"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-72 bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* App header */}
            <div className="px-5 pt-5 pb-4 border-b flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.color || 'from-gray-500 to-slate-600'} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{app.name}</p>
                <p className="text-xs text-gray-400">Built-in app</p>
              </div>
            </div>
            {/* Actions */}
            <button
              onClick={() => onOpenApp(app)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-gray-800">Open App</span>
            </button>
            <button
              onClick={() => onAppInfo(app)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left border-t"
            >
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Info className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-medium text-gray-800">App Info</span>
            </button>
            {canDisable && (
              <button
                onClick={() => onDisable(app)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-amber-50 text-left border-t"
              >
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <PowerOff className="w-4 h-4 text-amber-600" />
                </div>
                <span className="font-medium text-amber-600">Disable</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-5 py-3 text-center text-gray-500 text-sm border-t hover:bg-gray-50"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}