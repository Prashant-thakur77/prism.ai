// src/components/CustomEdges.tsx
import { useState } from 'react';
import { 
  EdgeProps, 
  BaseEdge, 
  EdgeLabelRenderer,
  getSmoothStepPath
} from 'reactflow';
import { useDigitalTwinStore } from '@/lib/digitalTwinStore';

export const TransportEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {}
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const { disruptedEdges } = useDigitalTwinStore();
  const isDisrupted = disruptedEdges.includes(id);

  // Get emoji and text for transport mode
  const getTransportInfo = () => {
    switch (data?.mode) {
      case 'sea': 
        return { emoji: '🚢', text: 'Sea', color: '#0ea5e9' };
      case 'air': 
        return { emoji: '✈️', text: 'Air', color: '#8b5cf6' };
      case 'rail': 
        return { emoji: '🚂', text: 'Rail', color: '#f59e0b' };
      case 'road': 
      default: 
        return { emoji: '🚚', text: 'Road', color: '#10b981' };
    }
  };

  const transportInfo = getTransportInfo();

  return (
    <>
      <BaseEdge
        path={edgePath}
        id={id}
        style={{
          strokeWidth: isDisrupted ? 4 : 2,
          stroke: isDisrupted ? 'var(--accent-red)' : 'var(--border-default)',
          strokeDasharray: isDisrupted ? '5,5' : 'none',
          animation: isDisrupted ? 'dashdraw 1s linear infinite' : 'none',
          ...style
        }}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            padding: selected ? '6px 12px' : '0',
            width: selected ? 'auto' : '20px',
            height: selected ? 'auto' : '20px',
            borderRadius: selected ? '6px' : '50%',
            fontSize: selected ? '13px' : '11px',
            fontWeight: 500,
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            minWidth: selected ? 'max-content' : '20px'
          }}
          className="nodrag nopan hover:border-theme-blue/50 transition-colors"
        >
          <span style={{ fontSize: selected ? '14px' : '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {transportInfo.emoji}
          </span>
          {selected && <span style={{ color: 'var(--text-primary)' }}>{transportInfo.text}</span>}
          
          {selected && (
            <div style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              marginLeft: '8px',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '8px'
            }}>
              <div>💰 ${data?.cost || 0}</div>
              <div>⏱️ {data?.transitTime || 0}d</div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export const edgeTypes = {
  transportEdge: TransportEdge,
  sea: TransportEdge,
  air: TransportEdge,
  rail: TransportEdge,
  road: TransportEdge,
  default: TransportEdge
};