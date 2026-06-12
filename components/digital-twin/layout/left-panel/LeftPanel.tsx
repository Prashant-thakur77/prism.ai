"use client"
import { FC, useState } from 'react';
import { useQueryState } from 'nuqs';
import { ChevronDown, ChevronRight, ChevronLeft, Building2, MessageSquare } from 'lucide-react';
import { DeleteIcon } from '@/components/icons';
import { BlocksIcon } from '@/components/icons/blocks';
import { LayoutPanelTopIcon } from '@/components/icons/layout-panel-top';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { NODE_TYPES, SUPPLY_CHAIN_TEMPLATES } from '@/constants/digital-twin';
import { AIChatPanel } from './assistant';

interface LeftPanelProps {
  onAddNode: (nodeType: string, label: string, enhancedData?: any) => void;
  onAddNodeAtPosition?: (nodeType: string, position: { x: number; y: number }, label?: string, enhancedData?: any) => void;
  onClearAllNodes: () => void;
  onLoadTemplate?: (templateId: string) => void;
  onLoadTemplateAtPosition?: (templateId: string, position: { x: number, y: number }) => void;
  simulationMode: boolean;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  // CopilotKit integration props
  nodes?: any[];
  edges?: any[];
  onAddMultipleNodes?: (nodes: any[]) => void;
  onAddMultipleEdges?: (edges: any[]) => void;
  onAddEdges?: (edges: any[]) => void;
  onUpdateNode?: (nodeId: string, updates: any) => void;
  onDeleteNode?: (nodeId: string) => void;
  onUpdateEdge?: (edgeId: string, updates: any) => void;
  onValidateSupplyChain?: () => void;
  onUpdateMultipleNodes?: (nodeIds: string[], properties: object) => void;
  onUpdateNodePositions?: (nodePositions: { [nodeId: string]: { x: number; y: number } }) => void;
  onFindAndSelectNode?: (nodeId: string) => void;
  onFindAndSelectEdges?: (edgeIds: string[]) => void;

  onHighlightNodes?: (nodeIds: string[]) => void;
  onFocusNode?: (nodeId: string) => void;
  onZoomToNodes?: (nodeIds: string[]) => void;
  onGetNodeConnections?: (nodeId: string) => any[];
  onAnalyzeNetworkPaths?: (sourceId: string, targetId: string) => void;
  onBulkUpdateEdges?: (edgeIds: string[], properties: object) => void;
  onCreateNodeGroup?: (nodeIds: string[], groupName: string) => void;
  onExportSubgraph?: (nodeIds: string[]) => void;
  pendingAIMessage?: string | null;
  setPendingAIMessage?: (message: string | null) => void;
}

const LeftPanel: FC<LeftPanelProps> = ({ 
  onAddNode,
  onAddNodeAtPosition,
  onClearAllNodes, 
  onLoadTemplate, 
  simulationMode, 
  isCollapsed, 
  setIsCollapsed,
  nodes = [],
  edges = [],
  onAddMultipleNodes,
  onAddMultipleEdges,
  onAddEdges,
  onUpdateNode,
  onDeleteNode,
  onUpdateEdge,
  onValidateSupplyChain,
  onUpdateMultipleNodes,
  onUpdateNodePositions,
  onFindAndSelectNode,
  onFindAndSelectEdges,

  onHighlightNodes,
  onFocusNode,
  onZoomToNodes,
  onGetNodeConnections,
  onAnalyzeNetworkPaths,
  onBulkUpdateEdges,
  onCreateNodeGroup,
  onExportSubgraph,
  pendingAIMessage,
  setPendingAIMessage,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('');
  const [chatMode, setChatMode] = useQueryState('chat');

  const isImmersiveMode = chatMode === 'immersive';

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    
    const target = event.target as HTMLElement;
    target.style.opacity = '0.6';
    target.style.transform = 'scale(0.95)';
  };

  const onDragEnd = (event: React.DragEvent) => {
    const target = event.target as HTMLElement;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
  };

  const onTemplateDragStart = (event: React.DragEvent, templateId: string) => {
    event.dataTransfer.setData('application/reactflow-template', templateId);
    event.dataTransfer.effectAllowed = 'move';

    const target = event.target as HTMLElement;
    target.style.opacity = '0.6';
    target.style.transform = 'scale(0.95)';
  };

  const handleImmersiveModeChange = (immersive: boolean) => {
    setChatMode(immersive ? 'immersive' : null);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionHeader = ({ 
    title, 
    isExpanded, 
    onClick, 
    icon: Icon 
  }: { 
    title: string; 
    isExpanded: boolean; 
    onClick: () => void;
    icon?: any;
  }) => (
    <Button
      variant="ghost"
      className="w-full justify-between px-4 py-3.5 h-auto font-[700] text-[10px] uppercase tracking-[0.18em] text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary/50 rounded-none border-b border-theme-border-subtle"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-theme-text-secondary" />}
        <span>{title}</span>
      </div>
      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-theme-text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-theme-text-secondary" />}
    </Button>
  );

  return (
    <motion.div 
      className="h-full border-r border-theme-border-subtle bg-theme-bg-surface flex flex-col"
      initial={false}
      animate={{ 
        width: isCollapsed ? 48 : 320 
      }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0.0, 0.2, 1] 
      }}
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="w-full h-full flex flex-col"
          >
            <div className="flex-1 flex items-center justify-center">
              <motion.div 
                className="text-[10px] text-theme-text-secondary font-[700] uppercase tracking-widest select-none"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                Supply Chain Builder
              </motion.div>
            </div>
            
            <div className="mt-auto border-t border-theme-border-subtle">
              <motion.button
                onClick={() => {
                  setIsCollapsed(false);
                  handleImmersiveModeChange(true);
                }}
                className="w-full p-4 hover:bg-theme-bg-secondary/50 transition-colors group flex items-center justify-center"
                title="Supply Chain Assistant"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MessageSquare className="h-5 w-5 text-theme-text-secondary group-hover:text-theme-blue transition-colors" />
              </motion.button>
              <motion.button
                onClick={() => setIsCollapsed(false)}
                className="w-full p-4 hover:bg-theme-bg-secondary/50 transition-colors group flex items-center justify-center border-t border-theme-border-subtle"
                title="Expand Builder Panel"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronRight className="h-5 w-5 text-theme-text-secondary group-hover:text-theme-blue transition-colors" />
              </motion.button>
            </div>
          </motion.div>
        ) : isImmersiveMode ? (
          <motion.div
            key="immersive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="w-full h-full"
          >
            <AIChatPanel 
              simulationMode={simulationMode}
              onImmersiveModeChange={handleImmersiveModeChange}
              isImmersiveMode={true}
              onCollapse={() => setIsCollapsed(true)}
              nodes={nodes}
              edges={edges}
              onAddNode={onAddNode}
              onAddNodeAtPosition={onAddNodeAtPosition}
              onAddMultipleNodes={onAddMultipleNodes}
              onAddMultipleEdges={onAddMultipleEdges}
              onAddEdges={onAddEdges}
              onLoadTemplate={onLoadTemplate}
              onClearCanvas={onClearAllNodes}
              onUpdateNode={onUpdateNode}
              onUpdateEdge={onUpdateEdge}
              onValidateSupplyChain={onValidateSupplyChain}
              onUpdateMultipleNodes={onUpdateMultipleNodes}
              onUpdateNodePositions={onUpdateNodePositions}
              onFindAndSelectNode={onFindAndSelectNode}
              onFindAndSelectEdges={onFindAndSelectEdges}
              onDeleteNode={onDeleteNode}

              onHighlightNodes={onHighlightNodes}
              onFocusNode={onFocusNode}
              onZoomToNodes={onZoomToNodes}
              onGetNodeConnections={onGetNodeConnections}
              onAnalyzeNetworkPaths={onAnalyzeNetworkPaths}
              onBulkUpdateEdges={onBulkUpdateEdges}
              onCreateNodeGroup={onCreateNodeGroup}
              onExportSubgraph={onExportSubgraph}
              pendingAIMessage={pendingAIMessage}
              setPendingAIMessage={setPendingAIMessage}
            />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="w-full flex flex-col h-full bg-theme-bg-surface"
          >
            {/* Header */}
            <motion.div 
              className="p-6 border-b border-theme-border-subtle"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className="text-base font-bold text-theme-text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5 text-theme-blue" />
                Supply Chain Builder
              </h2>
              <p className="text-xs text-theme-text-secondary mt-1 font-medium">
                Design and configure your supply chain network
              </p>
            </motion.div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-theme-bg-secondary/10">
              <motion.div 
                className="p-4 space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                
                {/* Add Nodes Section */}
                <div className="border border-theme-border-subtle rounded-theme-md overflow-hidden bg-theme-bg-surface">
                  <SectionHeader
                    title="Add Nodes"
                    isExpanded={expandedSection === 'nodes'}
                    onClick={() => toggleSection('nodes')}
                    icon={BlocksIcon}
                  />
                  
                  <AnimatePresence>
                    {expandedSection === 'nodes' && (
                      <motion.div 
                        className="p-4 space-y-2 border-t border-theme-border-subtle"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {NODE_TYPES.map((node, index) => {
                          const IconComponent = node.icon;
                          return (
                            <motion.div
                              key={node.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: index * 0.05 }}
                            >
                              <Button
                                variant="outline"
                                onClick={() => onAddNode(node.id, `New ${node.id}`)}
                                onDragStart={(event) => onDragStart(event, node.id)}
                                onDragEnd={onDragEnd}
                                draggable
                                disabled={simulationMode}
                                className={`w-full h-auto p-3 justify-start bg-theme-bg-surface border-theme-border-subtle hover:bg-theme-bg-secondary/50 hover:border-theme-border-default transition-all duration-200 hover:scale-[1.01] ${
                                  simulationMode ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-theme-sm bg-theme-bg-secondary ${node.iconColor} border border-theme-border-subtle`}>
                                    <IconComponent className="h-4 w-4" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-semibold text-xs text-theme-text-primary capitalize">{node.id}</div>
                                    <div className="text-[10px] text-theme-text-secondary font-medium">{node.description}</div>
                                  </div>
                                </div>
                              </Button>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Templates Section */}
                <div className="border border-theme-border-subtle rounded-theme-md overflow-hidden bg-theme-bg-surface">
                  <SectionHeader
                    title="Templates"
                    isExpanded={expandedSection === 'templates'}
                    onClick={() => toggleSection('templates')}
                    icon={LayoutPanelTopIcon}
                  />
                  
                  <AnimatePresence>
                    {expandedSection === 'templates' && (
                      <motion.div 
                        className="p-3 space-y-1.5 border-t border-theme-border-subtle"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="mb-3 p-3 bg-theme-blue-soft rounded-theme-md border border-theme-blue/15">
                          <div className="text-xs font-semibold text-theme-blue mb-1">
                            🔗 Template Grouping
                          </div>
                          <div className="text-[11px] text-theme-text-secondary leading-relaxed font-medium">
                            Templates load as grouped units that can be moved together. Double-click to ungroup individual nodes.
                          </div>
                        </div>

                        <TooltipProvider>
                          {['Industry', 'Characteristics', 'Geographic', 'Complexity'].map((category) => {
                            const categoryTemplates = SUPPLY_CHAIN_TEMPLATES.filter(template => template.category === category);
                            if (categoryTemplates.length === 0) return null;
                            
                            return (
                              <div key={category} className="space-y-1.5 pt-2">
                                <div className="text-[9px] font-bold text-theme-text-muted uppercase tracking-wider px-1">
                                  {category}
                                </div>
                                {categoryTemplates.map((template, index) => (
                                  <motion.div
                                    key={template.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          onClick={() => onLoadTemplate?.(template.id)}
                                          onDragStart={(event) => onTemplateDragStart(event, template.id)}
                                          onDragEnd={onDragEnd}
                                          draggable={!simulationMode}
                                          disabled={simulationMode || !onLoadTemplate}
                                          className={`w-full h-auto p-2.5 justify-start bg-theme-bg-surface border-theme-border-subtle hover:bg-theme-bg-secondary/50 hover:border-theme-border-default transition-all duration-200 ${
                                            simulationMode ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing hover:scale-[1.01]'
                                          }`}
                                        >
                                          <div className="flex items-center w-full min-h-[36px]">
                                            <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                                              <div className="text-base leading-none flex-shrink-0">
                                                {template.icon}
                                              </div>
                                              <div className="text-left flex-1 min-w-0">
                                                <div className="font-semibold text-xs text-theme-text-primary truncate">
                                                  {template.name}
                                                </div>
                                                <div className="text-[10px] text-theme-text-secondary font-medium truncate">
                                                  {template.description}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs bg-theme-bg-surface border-theme-border-subtle text-theme-text-primary shadow-lg">
                                        <div className="space-y-2">
                                          <div className="font-bold text-xs">{template.name}</div>
                                          <div className="text-[11px] text-theme-text-secondary font-medium">{template.description}</div>
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-theme-text-muted">Nodes:</span>
                                            <span className="font-bold">{template.nodes}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-theme-text-muted">Complexity:</span>
                                            <span className={`font-bold ${
                                              template.complexity === 'High' ? 'text-theme-red' :
                                              template.complexity === 'Medium' ? 'text-theme-amber' : 'text-theme-green'
                                            }`}>
                                              {template.complexity}
                                            </span>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Features:</div>
                                            <div className="flex flex-wrap gap-1">
                                              {template.features.map((feature, idx) => (
                                                <span key={idx} className="inline-block px-1.5 py-0.5 bg-theme-bg-secondary text-[10px] text-theme-text-secondary rounded font-medium border border-theme-border-subtle">
                                                  {feature}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </motion.div>
                                ))}
                              </div>
                            );
                          })}
                        </TooltipProvider>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Build with Assistant Section */}
                <div className="border border-theme-border-subtle rounded-theme-md p-4 bg-theme-bg-surface">
                  <Button
                    onClick={() => handleImmersiveModeChange(true)}
                    disabled={simulationMode}
                    className={`w-full gap-2 bg-theme-text-primary hover:bg-theme-text-primary/95 text-theme-bg-primary rounded-theme-md transition-all duration-200 ${
                      simulationMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 text-theme-bg-primary" />
                    Build with Assistant
                  </Button>
                  <p className="text-[11px] text-theme-text-secondary mt-2 text-center font-medium">
                    Get AI-powered help to design your supply chain
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Actions Footer */}
            <motion.div 
              className="p-4 border-t border-theme-border-subtle bg-theme-bg-surface"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={onClearAllNodes}
                  disabled={simulationMode}
                  className={`w-full gap-2 border-theme-red/20 text-theme-red hover:bg-theme-red/5 bg-transparent shadow-none hover:text-theme-red ${
                    simulationMode ? 'opacity-50 cursor-not-allowed ' : ''
                  }`}
                >
                  <DeleteIcon size={16} className="h-4 w-4 text-theme-red" />
                  Clear All Nodes
                </Button>
                
                <div className="flex justify-center pt-2">
                  <motion.button
                    onClick={() => setIsCollapsed(true)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-theme-md hover:bg-theme-bg-secondary/50 transition-colors group cursor-pointer bg-transparent border-none outline-none focus:outline-none"
                    title="Collapse Builder Panel"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-xs text-theme-text-secondary group-hover:text-theme-text-primary font-medium select-none">Hide Panel</span>
                    <ChevronLeft className="h-4 w-4 text-theme-text-secondary group-hover:text-theme-text-primary transition-colors" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LeftPanel;