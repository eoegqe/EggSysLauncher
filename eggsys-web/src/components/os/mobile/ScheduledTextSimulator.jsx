import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ScheduledTextSimulator({ isOpen, onClose, currentUser, allUsers, onSend }) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('Hey');
  const [countdown, setCountdown] = useState(null);
  const timerRef = useRef(null);

  const candidates = (allUsers || [])
    .filter(u => u.username && u.username !== currentUser?.username)
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.username || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
    });

  const startSchedule = () => {
    if (!selectedUser || !message.trim() || countdown !== null) return;
    let count = 10;
    setCountdown(count);
    timerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCountdown(null);
        onSend(selectedUser, message.trim());
        handleClose();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCountdown(null);
  };

  const handleClose = () => {
    cancelCountdown();
    setSelectedUser(null);
    setMessage('Hey');
    setSearch('');
    onClose();
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <h2 className="font-semibold">Schedule a Text</h2>
              </div>
              <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {countdown !== null ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-5"
                >
                  <Clock className="w-10 h-10 text-indigo-600" />
                </motion.div>
                <p className="text-3xl font-bold text-slate-800">{countdown}s</p>
                <p className="text-sm text-slate-500 mt-2">
                  Text from @{selectedUser?.username} will arrive soon
                </p>
                <Button onClick={cancelCountdown} variant="outline" className="mt-6">
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-5 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search users..."
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="px-5 pt-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Choose a sender
                </div>
                <div className="flex-1 overflow-auto px-3 pb-2 space-y-1">
                  {candidates.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-8">No users found</p>
                  ) : candidates.slice(0, 60).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${
                        selectedUser?.id === u.id
                          ? 'bg-indigo-50 ring-1 ring-indigo-200'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {(u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">@{u.username}</p>
                        {u.full_name && <p className="text-xs text-slate-500 truncate">{u.full_name}</p>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="px-5 py-4 border-t border-slate-100 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Message</label>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={startSchedule}
                    disabled={!selectedUser || !message.trim()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Schedule in 10 seconds
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}