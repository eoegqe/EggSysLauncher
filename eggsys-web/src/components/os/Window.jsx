import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Minimize2, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Window({ 
  title, 
  icon: Icon, 
  children, 
  onClose, 
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 800, height: 600 },
  isMinimized,
  onMinimize,
  zIndex,
  onFocus,
  isPinned = false,
  onTogglePin,
  uiPrefs = {}
}) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const rootRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (e) {}
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls')) return;
    onFocus?.();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || isMaximized || isFullscreen) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: Math.max(0, e.clientY - dragStart.current.y)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMaximized]);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleClose = (e) => {
    e.stopPropagation();
    onClose?.();
  };

  const handleMinimize = (e) => {
    e.stopPropagation();
    onMinimize?.();
  };

  const handleMaximize = (e) => {
    e.stopPropagation();
    toggleMaximize();
  };

  if (isMinimized) return null;

  const windowStyle = uiPrefs.window_style || 'modern';
  const cornerRadius = uiPrefs.corner_radius || 'rounded';
  const transparency = uiPrefs.transparency !== false;
  const animationSpeed = uiPrefs.animation_speed || 'normal';
  const fontSize = uiPrefs.font_size || 'medium';
  
  const cornerRadiusClass = cornerRadius === 'sharp' ? 'rounded-none' : cornerRadius === 'very_rounded' ? 'rounded-3xl' : 'rounded-xl';
  const animationClass = 
    animationSpeed === 'none' ? '' :
    animationSpeed === 'reduced' ? 'duration-300' :
    animationSpeed === 'fast' ? 'duration-100' :
    '';
  
  const bgClass = windowStyle === 'classic' 
    ? 'bg-gray-100 border-2 border-gray-400'
    : windowStyle === 'minimal'
    ? `bg-white border border-gray-200 ${transparency ? 'bg-opacity-95' : ''}`
    : `${transparency ? 'bg-white/90 backdrop-blur-xl' : 'bg-white'} border border-white/20`;

  const titleBarClass = windowStyle === 'classic'
    ? 'bg-gradient-to-r from-blue-700 to-blue-500 text-white'
    : windowStyle === 'minimal'
    ? 'bg-gray-50 border-b border-gray-200'
    : `bg-gradient-to-r from-blue-500/10 to-purple-500/10 ${transparency ? 'backdrop-blur-xl' : ''} border-b border-white/10`;

  const fontSizeClass = fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm';

  return (
    <div
      ref={rootRef}
      className={cn(
        `absolute ${bgClass} ${cornerRadiusClass} shadow-2xl overflow-hidden transition-all pointer-events-auto ${animationClass}`,
        isDragging && "transition-none",
        isMaximized ? "!top-0 !left-0 !w-full !h-[calc(100vh-48px)] !rounded-none" : ""
      )}
      style={
        isMaximized
          ? {}
          : {
              left: position.x,
              top: position.y,
              width: size.width,
              height: size.height,
              zIndex
            }
      }
      onClick={onFocus}
    >
      {/* Title Bar */}
      <div
        ref={dragRef}
        className={`h-12 ${titleBarClass} flex items-center justify-between px-4 cursor-move select-none`}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${windowStyle === 'classic' ? 'text-white' : 'text-gray-700'}`} />}
          <span className={`${fontSizeClass} font-medium ${windowStyle === 'classic' ? 'text-white' : 'text-gray-800'}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2 window-controls">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              className="w-8 h-8 rounded-lg hover:bg-gray-200/50 flex items-center justify-center transition-colors"
              title={isPinned ? "Unpin from taskbar" : "Pin to taskbar"}
            >
              {isPinned ? (
                <PinOff className="w-4 h-4 text-gray-600" />
              ) : (
                <Pin className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          <button
            onClick={handleMinimize}
            className="w-8 h-8 rounded-lg hover:bg-gray-200/50 flex items-center justify-center transition-colors"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleMaximize}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); toggleFullscreen(); }}
            title="Click to maximize • Right-click for fullscreen"
            className="w-8 h-8 rounded-lg hover:bg-gray-200/50 flex items-center justify-center transition-colors"
          >
            {isFullscreen || isMaximized ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`h-[calc(100%-48px)] flex flex-col overflow-hidden ${windowStyle === 'minimal' ? 'bg-white' : transparency ? 'bg-white/60 backdrop-blur-sm' : 'bg-white'}`}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}