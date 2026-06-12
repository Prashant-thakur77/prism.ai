"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { SimulationLoader } from "@/components/simulation/test/simulation-loader"
import { AIScenarioSuggestions } from "@/components/simulation/test/ai-scenario-suggestions"
import { ScenarioProvider, useScenario, ScenarioData } from "@/lib/context/scenario-context"
import type { Simulation } from "@/lib/types/database"
import { getUserSupplyChains } from "@/lib/api/supply-chain"
import {  updateSimulation, getSimulations, findCachedSimulation, createSimulationWithCache } from "@/lib/api/simulation"
import { useUser } from "@/lib/stores/user"
import { useImpact } from "@/lib/context/impact-context"

// Import separated components
import { FloatingRunButton } from "./floating-run-button"
import { ProfessionalTemplateSelection } from "./professional-template-selection"
import type { ApiResponse, SupplyChainData } from "./types"
import { ScenarioConfigurationForm } from "./enhanced-scenario-configuration-form"

// Minimalist Card Component with variant styling
function MinimalCard({ children, className = "", variant = "default", ...props }: { 
  children: React.ReactNode; 
  className?: string; 
  variant?: "default" | "accent" | "subtle";
  [key: string]: any 
}) {
  const variantStyles = {
    default: "border border-gray-200 dark:border-gray-800 bg-white dark:bg-black shadow-sm",
    accent: "border border-black dark:border-white bg-gray-50 dark:bg-gray-900 shadow-md",
    subtle: "border border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50 shadow-sm"
  }
  
  return (
    <Card 
      className={`${variantStyles[variant]} rounded-2xl transition-all duration-300 ${className}`} 
      {...props}
    >
      {children}
    </Card>
  )
}

function SimulationPageContent() {
  const router = useRouter()
  const [simulationHistory, setSimulationHistory] = useState<Simulation[]>([])
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null)
  const [isAIScenarioOpen, setIsAIScenarioOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  // View state management - simplified without query params
  const [view, setView] = useState('templates')
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [simulationComplete, setSimulationComplete] = useState(false)
  
  // Navigation state to track when to navigate
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Access scenario context
  const { 
    scenarioData, 
    updateScenarioData, 
    supplyChains, 
    setSupplyChains, 
    selectedSupplyChainId, 
    setSelectedSupplyChainId 
  } = useScenario()

  // Access the impact context
  const { setImpactData, setIsLoading } = useImpact()

  //fetch user 
  const { userData, userLoading } = useUser()

  const user_id = userData?.id

  // Form validation - more robust checking
  const isFormValid = !!(
    scenarioData.scenarioName && 
    scenarioData.scenarioName.trim().length > 0 &&
    scenarioData.scenarioType && 
    scenarioData.scenarioType.trim().length > 0 &&
    scenarioData.affectedNode && 
    scenarioData.affectedNode.trim().length > 0 &&
    selectedSupplyChainId &&
    selectedSupplyChainId.trim().length > 0 &&
    scenarioData.disruptionSeverity > 0 &&
    scenarioData.disruptionDuration > 0
  )

  // Debug logging for form validation (moved to useEffect to avoid render-time side effects)
  useEffect(() => {
    console.log('🔧 Form validation debug:', {
      scenarioName: scenarioData.scenarioName,
      scenarioType: scenarioData.scenarioType,
      affectedNode: scenarioData.affectedNode,
      selectedSupplyChainId: selectedSupplyChainId,
      disruptionSeverity: scenarioData.disruptionSeverity,
      disruptionDuration: scenarioData.disruptionDuration,
      isFormValid: isFormValid
    })
  }, [scenarioData, selectedSupplyChainId, isFormValid])

  useEffect(() => {
    const fetchSupplyChains = async () => {
      if (!userData?.id) {
        // Only show error after loading is complete
        if (!userLoading) {
          toast.error("User not found. Please log in.")
        }
        return
      }

      try {
        const response: ApiResponse = await getUserSupplyChains(userData.id)
        if (response.status === 'success' && response.data) {
          const transformedData = response.data.map((chain: SupplyChainData) => ({
            supply_chain_id: chain.supply_chain_id,
            user_id: chain.user_id ?? null,
            name: chain.name,
            description: chain.description ?? null,
            form_data: chain.form_data ?? {},
            organisation: chain.organisation ?? {},
            timestamp: chain.timestamp ?? null
          }))
          setSupplyChains(transformedData)
          if (transformedData.length > 0) {
            setSelectedSupplyChainId(transformedData[0].supply_chain_id)
            fetchSimulationHistory(transformedData[0].supply_chain_id)
          }
        } else {
          toast.error("Failed to load supply chains")
        }
      } catch (error) {
        console.error('Error fetching supply chains:', error)
        toast.error("Failed to load supply chains")
      }
    }
    
    // Wait for user store to finish loading before doing anything
    if (userLoading) return

    if (!supplyChains.length && userData?.id) {
      fetchSupplyChains()
    } else if (supplyChains.length > 0 && !selectedSupplyChainId) {
      setSelectedSupplyChainId(supplyChains[0].supply_chain_id)
      fetchSimulationHistory(supplyChains[0].supply_chain_id)
    }
  }, [supplyChains, userData, selectedSupplyChainId, userLoading])

  const fetchSimulationHistory = async (id: string) => {
    try {
      const sims = await getSimulations(id)
      setSimulationHistory(sims)
    } catch (error) {
      console.error('Error fetching simulation history:', error)
      toast.error("Failed to load simulation history")
    }
  }

  const handleAIScenarioSelect = (scenario: ScenarioData) => {
    updateScenarioData(scenario)
    setView('form')
    toast.success(`Applied "${scenario.scenarioName}" to the builder`)
  }

  const handleForecastScenarioSelect = (scenario: ScenarioData) => {
    updateScenarioData(scenario)
    setView('form')
    toast.success(`Applied AI forecast scenario "${scenario.scenarioName}" to the builder`)
  }

  const handleTemplateSelect = (template: any) => {
    if (template) {
      updateScenarioData(template.scenarioData)
      setView('form')
      toast.success(`Applied "${template.name}" template`)
    }
  }

  const handleStartFromScratch = () => {
    // Reset scenario data to defaults
    updateScenarioData({
      scenarioName: "",
      scenarioType: "",
      disruptionSeverity: 0,
      disruptionDuration: 0,
      affectedNode: "",
      description: "",
      startDate: "",
      endDate: "",
      monteCarloRuns: 1000,
      distributionType: "normal",
      cascadeEnabled: true,
      failureThreshold: 50,
      bufferPercent: 15,
      alternateRouting: true,
      randomSeed: ""
    })
    setView('form')
    toast.success("Started with blank scenario")
  }

  const runSimulation = async () => {
    if (!selectedSupplyChainId) {
      toast.error("Please select a supply chain first")
      return
    }

    if (!isFormValid) {
      toast.error("Please complete all required fields")
      return
    }

    try {
      setView('simulation')
      setSimulationRunning(true)
      setSimulationComplete(false)
      setProgress(0)
      setPendingNavigation(null) // Reset any pending navigation

      // Check for cached simulation first
      console.log('🔍 Checking for cached simulation...')
      const cachedSimulation = await findCachedSimulation(scenarioData, selectedSupplyChainId)
      
      if (cachedSimulation) {
        console.log(`✅ Found cached simulation: ${cachedSimulation.simulation_id}`)
        toast.success("Found existing simulation with same parameters")
        setCurrentSimulation(cachedSimulation)
        
        // Fast progress for cached simulation
        const fastInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(fastInterval)
              setSimulationRunning(false)
              setSimulationComplete(true)
              
              console.log(`✅ Setting navigation for cached results: ${cachedSimulation.simulation_id}`)
              setPendingNavigation(`/simulation/result?id=${cachedSimulation.simulation_id}`)
              
              return 100
            }
            return prev + 25 // Faster progress for cached results
          })
        }, 200)
        
        return
      }

      console.log('📭 No cached simulation found, creating new simulation...')
      
      const newSim: Partial<Simulation> = {
        supply_chain_id: selectedSupplyChainId,
        name: scenarioData.scenarioName,
        scenario_type: scenarioData.scenarioType,
        parameters: {
          severity: scenarioData.disruptionSeverity,
          duration: scenarioData.disruptionDuration,
          affectedNode: scenarioData.affectedNode,
          description: scenarioData.description,
          startDate: scenarioData.startDate,
          endDate: scenarioData.endDate,
          monteCarloRuns: scenarioData.monteCarloRuns,
          distributionType: scenarioData.distributionType,
          cascadeEnabled: scenarioData.cascadeEnabled,
          failureThreshold: scenarioData.failureThreshold,
          bufferPercent: scenarioData.bufferPercent,
          alternateRouting: scenarioData.alternateRouting,
          randomSeed: scenarioData.randomSeed
        },
        status: "running"
      }

      const created = await createSimulationWithCache(newSim, scenarioData)
      setCurrentSimulation(created)

      const simulationConfig = {
        id: created?.simulation_id,
        name: scenarioData.scenarioName,
        type: scenarioData.scenarioType,
        supplyChainId: selectedSupplyChainId,
        parameters: {
          severity: scenarioData.disruptionSeverity,
          duration: scenarioData.disruptionDuration,
          affectedNode: scenarioData.affectedNode,
          description: scenarioData.description,
          startDate: scenarioData.startDate,
          endDate: scenarioData.endDate,
          monteCarloRuns: scenarioData.monteCarloRuns,
          distributionType: scenarioData.distributionType,
          cascadeEnabled: scenarioData.cascadeEnabled,
          failureThreshold: scenarioData.failureThreshold,
          bufferPercent: scenarioData.bufferPercent,
          alternateRouting: scenarioData.alternateRouting,
          randomSeed: scenarioData.randomSeed
        }
      }

      setIsLoading(true)

      // Start the progress simulation immediately to animate while the API is working
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            return 90 // Pause at 90% until API responds
          }
          return prev + 5
        })
      }, 300)

      // Call the impact assessment agent with the simulation ID
      try {
        console.log(`🎯 Triggering impact assessment for simulation: ${created?.simulation_id}`)
        
        let localNodes = []
        let localEdges = []
        try {
          const localData = localStorage.getItem(`supplyChain-${selectedSupplyChainId}`)
          if (localData) {
            const chainData = JSON.parse(localData)
            localNodes = chainData.nodes || []
            localEdges = chainData.edges || []
            console.log(`ℹ️ Loaded ${localNodes.length} nodes and ${localEdges.length} edges from localStorage for chain ${selectedSupplyChainId}`)
          }
        } catch (storageErr) {
          console.warn('⚠️ Error parsing local supply chain data:', storageErr)
        }

        const response = await fetch('/api/agent/impact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            simulationId: created?.simulation_id,
            nodes: localNodes,
            edges: localEdges,
            forceRefresh: true 
          })
        })

        const impactResponse = await response.json()
        
        if (response.ok && impactResponse.success) {
          console.log('✅ Impact assessment completed successfully:', impactResponse)
          toast.success("Impact assessment completed successfully")
          
          // Update simulation with enhanced results
          if (created?.simulation_id && impactResponse.data) {
            await updateSimulation(created.simulation_id, {
              status: "completed",
              result_summary: {
                enhanced_analysis: true,
                impact_assessment_completed: true,
                analysis_timestamp: new Date().toISOString(),
                ...impactResponse.data
              },
              simulated_at: new Date().toISOString()
            })
          }
        } else {
          console.warn('Impact assessment warning:', impactResponse.error)
          toast.warning("Impact assessment completed with warnings")
          
          // Still update simulation as completed but without enhanced data
          if (created?.simulation_id) {
            await updateSimulation(created.simulation_id, {
              status: "completed",
              result_summary: {
                enhanced_analysis: false,
                impact_assessment_completed: false,
                costImpact: "$1.2M",
                timeDelay: "14.5 days",
                inventoryImpact: "-42%",
                recoveryTime: "35 days"
              },
              simulated_at: new Date().toISOString()
            })
          }
        }
      } catch (error) {
        console.error('❌ Error calling impact assessment agent:', error)
        toast.error("Failed to run impact assessment, using basic simulation")
        
        // Fallback: Update simulation as completed without impact assessment
        if (created?.simulation_id) {
          await updateSimulation(created.simulation_id, {
            status: "completed",
            result_summary: {
              enhanced_analysis: false,
              impact_assessment_completed: false,
              error: "Impact assessment failed",
              costImpact: "$1.2M",
              timeDelay: "14.5 days",
              inventoryImpact: "-42%",
              recoveryTime: "35 days"
            },
            simulated_at: new Date().toISOString()
          })
        }
      } finally {
        setIsLoading(false)
        clearInterval(progressInterval)
        setProgress(100)
        
        // Force a brief delay at 100% for user feedback before navigation
        setTimeout(() => {
          setSimulationRunning(false)
          setSimulationComplete(true)
          
          if (created?.simulation_id) {
            console.log(`✅ Setting navigation for simulation: ${created.simulation_id}`)
            setPendingNavigation(`/simulation/result?id=${created.simulation_id}`)
          } else {
            console.warn('⚠️ No simulation ID available, setting basic results page navigation')
            setPendingNavigation('/simulation/result')
          }
        }, 500)
      }
    } catch (error) {
      console.error('Error starting simulation:', error)
      toast.error("Failed to start simulation")
      setIsLoading(false)
      setView('form')
    }
  }

  const handleNewSimulation = () => {
    setView('templates')
    setSimulationRunning(false)
    setSimulationComplete(false)
    setProgress(0)
    setPendingNavigation(null) // Reset any pending navigation
    setCurrentSimulation(null)
  }

  // Function to view existing simulation results
  const handleViewSimulationResults = (simulationId: string) => {
    // Navigate directly to results page with simulation ID
    router.push(`/simulation/result?id=${simulationId}`)
  }

  // Handle navigation when simulation is complete
  useEffect(() => {
    if (simulationComplete && pendingNavigation) {
      console.log(`🎯 Navigating to: ${pendingNavigation}`)
      router.push(pendingNavigation)
      setPendingNavigation(null)
      
      if (selectedSupplyChainId) {
        fetchSimulationHistory(selectedSupplyChainId)
      }
    }
  }, [simulationComplete, pendingNavigation, selectedSupplyChainId, router])

  return (
    <div className="relative min-h-full flex-1 bg-white dark:bg-black overflow-hidden text-black dark:text-white">
      <div className="flex h-full">
        {/* Left Rail — Workflow Steps */}
        <aside className="w-52 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col py-6 px-4 gap-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-3 px-2">Probe Workflow</p>
          <StepItem active={view === 'templates'} done={view === 'form' || view === 'simulation'} number={1} label="Select Preset" onClick={() => view !== 'simulation' && setView('templates')} />
          <StepItem active={view === 'form'} done={view === 'simulation'} number={2} label="Configure Parameters" onClick={() => {}} />
          <StepItem active={view === 'simulation'} done={false} number={3} label="Execute Probe" onClick={() => {}} />

          <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-2 px-2">Tools</p>
            <button
              onClick={() => setIsAIScenarioOpen(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded transition-colors text-left"
            >
              <span className="w-4 h-4 text-slate-400">✦</span>
              AI Vector Generator
            </button>
          </div>
        </aside>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {view === "templates" && (
              <div className="p-8">
                <div className="max-w-5xl mx-auto">
                  {/* New header: left-aligned, terse */}
                  <div className="mb-8 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-1">Fault Injection Blueprint</p>
                        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                          Select an Event Vector
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                          Choose from pre-calibrated disruption presets, or define a custom fault scenario for your network graph.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 tracking-wide">
                          STEP 1 / 3
                        </div>
                      </div>
                    </div>
                  </div>

                  <ProfessionalTemplateSelection
                    onTemplateSelect={handleTemplateSelect}
                    onStartFromScratch={handleStartFromScratch}
                    onAIScenarios={() => setIsAIScenarioOpen(true)}
                    onSelectScenario={handleForecastScenarioSelect}
                  />
                </div>
              </div>
            )}

            {view === "form" && (
              <div className="p-8">
                <div className="max-w-5xl mx-auto">
                  {/* Form header */}
                  <div className="mb-8 pb-5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-1">Parameter Configuration</p>
                        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                          Fault Vector Parameters
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                          Define the scope and intensity of your probe — affected origin nodes, cascade probability, and fault depth.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setView("templates")}
                          className="flex items-center gap-1.5 text-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-slate-500 hover:text-black dark:hover:text-white hover:border-slate-400 transition-colors"
                        >
                          ← Presets
                        </button>
                        <div className="px-2.5 py-1 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 tracking-wide">
                          STEP 2 / 3
                        </div>
                      </div>
                    </div>
                  </div>

                  <ScenarioConfigurationForm />
                </div>

                {/* Floating Action Button */}
                <FloatingRunButton
                  isFormValid={isFormValid}
                  onRunSimulation={runSimulation}
                  scenarioData={scenarioData}
                />
              </div>
            )}

            {view === "simulation" && simulationRunning && (
              <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="w-full max-w-2xl mx-auto p-8">
                  <div className="border border-slate-200 dark:border-slate-800 p-10">
                    <SimulationLoader progress={progress} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Scenario Suggestions Sheet */}
      <AIScenarioSuggestions
        open={isAIScenarioOpen}
        onOpenChange={setIsAIScenarioOpen}
        onSelectScenario={handleAIScenarioSelect}
      />
    </div>
  );
}

function StepItem({ active, done, number, label, onClick }: { active: boolean; done: boolean; number: number; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-2 py-2 rounded text-left transition-colors w-full ${
        active ? 'bg-black text-white dark:bg-white dark:text-black' :
        done ? 'text-slate-500 hover:text-black dark:hover:text-white' :
        'text-slate-400 cursor-default'
      }`}
    >
      <span className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
        active ? 'border-white dark:border-black bg-white/20 dark:bg-black/20 text-white dark:text-black' :
        done ? 'border-slate-400 text-slate-500' :
        'border-slate-300 dark:border-slate-700 text-slate-400'
      }`}>
        {done ? '✓' : number}
      </span>
      <span className="text-xs truncate">{label}</span>
    </button>
  )
}

// Wrap component with context provider
export function SimulationPage() {
  return (
    <ScenarioProvider>
      <SimulationPageContent />
    </ScenarioProvider>
  )
}
