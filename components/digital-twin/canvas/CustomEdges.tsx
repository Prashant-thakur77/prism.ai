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
          stroke: isDisrupted ? '#ef4444' : '#64748b',
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
            backgroundColor: 'white',
            padding: selected ? '6px 12px' : '4px 8px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 'max-content'
          }}
          className="nodrag nopan"
        >
          <span style={{ fontSize: '16px' }}>{transportInfo.emoji}</span>
          {selected && <span style={{ color: '#374151' }}>{transportInfo.text}</span>}
          
          {selected && (
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              marginLeft: '8px',
              borderLeft: '1px solid #e2e8f0',
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