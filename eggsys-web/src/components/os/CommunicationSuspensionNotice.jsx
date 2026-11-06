import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function CommunicationSuspensionNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('show-comm-suspension', handler);
    return () => window.removeEventListener('show-comm-suspension', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <ShieldAlert className="w-5 h-5" />
            Communication Suspension
          </DialogTitle>
          <DialogDescription>
            Your account has a communication suspension. You cannot open any apps that allow you to interact with other users.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}