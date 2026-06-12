import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useDigitalTwinStore } from '@/lib/digitalTwinStore';

// Base styles for all nodes
const baseNodeStyle = {
  padding: '12px 14px',
  borderRadius: '8px',
  width: '165px',
  boxShadow: 'var(--shadow-sm)',
  borderWidth: '1px',
  borderStyle: 'solid',
  fontFamily: 'inherit',
  transition: 'all 0.2s ease'
};

// Node type specific colors with more distinct color schemes
const nodeTypeColors = {
  supplier: 'bg-theme-bg-surface border-theme-border-subtle hover:border-theme-blue/40 text-theme-text-primary',
  factory: 'bg-theme-bg-surface border-theme-border-subtle hover:border-purple-500/40 text-theme-text-primary',
  port: 'bg-theme-bg-surface border-theme-border-subtle hover:border-cyan-500/40 text-theme-text-primary',
  warehouse: 'bg-theme-bg-surface border-theme-border-subtle hover:border-theme-amber/40 text-theme-text-primary',
  distribution: 'bg-theme-bg-surface border-theme-border-subtle hover:border-theme-green/40 text-theme-text-primary',
  retailer: 'bg-theme-bg-surface border-theme-border-subtle hover:border-theme-red/40 text-theme-text-primary',
  manufacturer: 'bg-theme-bg-surface border-theme-border-subtle hover:border-orange-500/40 text-theme-text-primary'
};

// Helper to generate risk class
const getRiskClass = (riskScore: number) => {
  if (riskScore >= 0.7) return 'ring-2 ring-theme-red ring-opacity-70 border-theme-red/50';
  if (riskScore >= 0.4) return 'ring-2 ring-theme-amber ring-opacity-70 border-theme-amber/50';
  return '';
};

// Helper to generate selection class with glowing effect
const getSelectionClass = (selected: boolean) => {
  return selected 
    ? 'ring-2 ring-theme-blue ring-opacity-80 shadow-md shadow-theme-blue/20 transform scale-[1.02] transition-all duration-200' 
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
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-theme-blue uppercase block mb-1 text-center">SUPPLIER</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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

      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-purple-500 dark:text-purple-400 uppercase block mb-1 text-center">FACTORY</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-cyan-500 dark:text-cyan-400 uppercase block mb-1 text-center">PORT</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-theme-amber uppercase block mb-1 text-center">WAREHOUSE</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-theme-green uppercase block mb-1 text-center">DISTRIBUTION</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-theme-red uppercase block mb-1 text-center">RETAILER</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
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
      
      <div className="text-[0.6rem] font-[700] tracking-[0.05em] text-orange-500 dark:text-orange-400 uppercase block mb-1 text-center">MANUFACTURER</div>
      <div className="font-[600] text-theme-text-primary text-[0.82rem] leading-[1.3] text-center">{data.label}</div>
      {data.label?.toLowerCase().includes('india') && (
        <div className="text-xs text-center mt-1">🇮🇳</div>
      )}
    </div>
  );
});

// Template Group Node
export const TemplateGroupNode = memo(({ data, selected }: NodeProps) => {
  const templateSelectionClass = selected ? 'transition-all duration-200' : 'transition-all duration-200';
  
  return (
    <div 
      className={`template-group ${templateSelectionClass}`}
      data-label={data.label}
      title="Double-click to ungroup this template"
    >
      <div className="h-full w-full">
        {/* Space for child nodes */}
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
  customerNode: RetailerNode,  // alias to retailer
  manufacturerNode: ManufacturerNode,
  productionNode: ManufacturerNode, // Alias for production nodes
  'supply-chain-node': WarehouseNode, // Alias for generic supply chain nodes
  supplyChainNode: WarehouseNode,
  genericNode: WarehouseNode,
  group: TemplateGroupNode,
};