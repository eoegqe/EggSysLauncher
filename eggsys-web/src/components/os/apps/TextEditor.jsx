import React, { useState } from 'react';
import { Save, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/devToast';

export default function TextEditor() {
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('untitled.txt');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }

    setIsSaving(true);
    try {
      await base44.entities.File.create({
        name: fileName,
        content: content,
        type: 'text',
        path: `E:\\${fileName}`
      });
      toast.success('File saved successfully!');
    } catch (error) {
      toast.error('Failed to save file');
    }
    setIsSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border-b bg-gray-50">
        <FileText className="w-5 h-5 text-gray-600" />
        <Input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="max-w-xs"
          placeholder="File name"
        />
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="ml-auto"
          size="sm"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 p-6 resize-none outline-none font-mono text-sm"
        placeholder="Start typing..."
      />

      {/* Status Bar */}
      <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500 flex justify-between">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).filter(w => w).length} words</span>
      </div>
    </div>
  );
}