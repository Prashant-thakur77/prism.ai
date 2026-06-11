import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useDigitalTwinStore } from '@/lib/digitalTwinStore';

// Base styles for all nodes
const baseNodeStyle = {
  padding: '10px',
  borderRadius: '8px',
  width: '150px',
  boxShadow: '0 4px 6px rgba(40, 0, 10, 0.1)',
  border: '2px solid #e2e8f0'
};

// Node type specific colors with more distinct color schemes (fallback colors)
const nodeTypeColors = {
  supplier: 'bg-blue-100 border-blue-500 text-blue-800',
  factory: 'bg-purple-100 border-purple-500 text-purple-800',
  port: 'bg-cyan-100 border-cyan-500 text-cyan-800',
  warehouse: 'bg-amber-100 border-amber-500 text-amber-800',
  distribution: 'bg-emerald-100 border-emerald-500 text-emerald-800',
  retailer: 'bg-red-100 border-red-500 text-red-800',
  manufacturer: 'bg-orange-100 border-orange-500 text-orange-800'
};

// Helper to generate risk class
const getRiskClass = (riskScore: number) => {
  if (riskScore >= 0.7) return 'ring-2 ring-red-500 ring-opacity-70';
  if (riskScore >= 0.4) return 'ring-2 ring-yellow-500 ring-opacity-70';
  return '';
};

// Helper to generate selection class with glowing effect
const getSelectionClass = (selected: boolean) => {
  return selected 
    ? 'ring-4 ring-blue-400 ring-opacity-80 shadow-lg shadow-blue-200 transform scale-105 transition-all duration-200' 
    : 'transition-all duration-200';
};

// Hook to get disruption styling
const useDisruptionStyle = (id: string) => {
  const { disruptedNodes } = useDigitalTwinStore();
  const isRoot = disruptedNodes.length > 0 && disruptedNodes[0] === id;
  const isDisrupted = disruptedNodes.includes(id);
  
  if (isRoot) return 'animate-pulse-border-red z-50';
  if (isDisrupted) return 'animate-pulse-border-orange z-40';
  return '';
};

// Helper to get node style with custom color or fallback
const getNodeStyle = (data: any, nodeType: keyof typeof nodeTypeColors) => {
  if (data.nodeColor) {
    // Use custom color from node data with enhanced styling
    return {
      ...baseNodeStyle,
      backgroundColor: data.nodeColor,
      color: getContrastColor(data.nodeColor), // Ensure text is readable
      borderColor: data.nodeColor, // Use the same color for border
      borderWidth: '2px',
      borderStyle: 'solid'
    };
  }
  // Fallback to default styles with CSS classes
  return baseNodeStyle;
};

// Helper to determine if text should be dark or light based on background color
const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black for light backgrounds, white for dark backgrounds
  return brightness > 155 ? '#000000' : '#FFFFFF';
};

// Supplier Node
export const SupplierNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.supplier;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'supplier');

  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Factory Node
export const FactoryNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.factory;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'factory');

  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />

      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Port Node
export const PortNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.port;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'port');
  
  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Warehouse Node
export const WarehouseNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.warehouse;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'warehouse');
  
  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Distribution Node
export const DistributionNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.distribution;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'distribution');
  
  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Retailer Node
export const RetailerNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.retailer;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'retailer');
  
  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
    </div>
  );
});

// Manufacturer / Production Node
export const ManufacturerNode = memo(({ id, data, isConnectable, selected }: NodeProps) => {
  const riskClass = getRiskClass(data.riskScore);
  const typeClass = data.nodeColor ? '' : nodeTypeColors.manufacturer;
  const selectionClass = getSelectionClass(selected);
  const disruptionClass = useDisruptionStyle(id);
  const nodeStyle = getNodeStyle(data, 'manufacturer');
  
  return (
    <div 
      style={nodeStyle} 
      className={`${data.nodeColor ? 'border-0' : typeClass} ${riskClass} ${selectionClass} ${disruptionClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
      
      <div className="font-bold text-sm text-center">{data.label}</div>
      {data.label?.toLowerCase().includes('india') && (
        <div className="text-xs text-center mt-1">🇮🇳</div>
      )}
    </div>
  );
});

// Template Group Node
export const TemplateGroupNode = memo(({ data, selected }: NodeProps) => {
  // Use a simpler selection class for template groups without the blue ring
  const templateSelectionClass = selected ? 'transition-all duration-200' : 'transition-all duration-200';
  
  return (
    <div 
      className={`template-group ${templateSelectionClass}`}
      data-label={data.label}
      title="Double-click to ungroup this template"
    >
      {/* Template content area - children nodes will be positioned here */}
      <div className="h-full w-full">
        {/* This div provides space for child nodes */}
      </div>
    </div>
  );
});

export const nodeTypes = {
  supplierNode: SupplierNode,
  factoryNode: FactoryNode,
  portNode: PortNode,
  warehouseNode: WarehouseNode,
  distributionNode: DistributionNode,
  retailerNode: RetailerNode,
  customerNode: RetailerNode,  // AI sometimes generates "customerNode" — alias to retailer
  manufacturerNode: ManufacturerNode,
  productionNode: ManufacturerNode, // Alias for production nodes
  'supply-chain-node': WarehouseNode, // Alias for generic supply chain nodes
  supplyChainNode: WarehouseNode,
  genericNode: WarehouseNode,
  group: TemplateGroupNode,
}; 