import React, { useState, useRef } from 'react';

interface CadSplitterProps {
  direction: 'vertical' | 'horizontal';
  onDragStart?: () => void;
  onResize: (clientX: number, clientY: number) => void;
  onDragEnd?: () => void;
  onDoubleClick?: () => void;
  title?: string;
  className?: string;
}

export const CadSplitter: React.FC<CadSplitterProps> = ({
  direction,
  onDragStart,
  onResize,
  onDragEnd,
  onDoubleClick,
  title,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag on primary mouse/touch button
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    onDragStart?.();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    const onPointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      onResize(moveEvent.clientX, moveEvent.clientY);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      try {
        if (splitterRef.current && splitterRef.current.hasPointerCapture(upEvent.pointerId)) {
          splitterRef.current.releasePointerCapture(upEvent.pointerId);
        }
      } catch (_) {}
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.body.classList.remove('cad-resizing-col', 'cad-resizing-row');
      onDragEnd?.();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.body.classList.add(direction === 'vertical' ? 'cad-resizing-col' : 'cad-resizing-row');
  };

  return (
    <div
      ref={splitterRef}
      role="separator"
      aria-orientation={direction}
      tabIndex={0}
      className={`cad-splitter cad-splitter-${direction} ${isDragging ? 'dragging' : ''} ${className}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={onDoubleClick}
      title={title || `Drag to resize window • Double-click to reset size`}
    >
      <div className="cad-splitter-handle">
        <span className="cad-splitter-grip"></span>
      </div>
    </div>
  );
};
