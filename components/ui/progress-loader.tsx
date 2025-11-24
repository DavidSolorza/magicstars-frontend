'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LoaderStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  description?: string;
}

export interface ProgressLoaderProps {
  isVisible: boolean;
  title: string;
  steps: LoaderStep[];
  currentStep?: string;
  overallProgress?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  isVisible,
  title,
  steps,
  currentStep,
  overallProgress,
  onClose,
  showCloseButton = true,
  className = ''
}) => {
  if (!isVisible) return null;

  const getStepIcon = (step: LoaderStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'loading':
        return (
          <div className="relative w-4 h-4">
            <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
          </div>
        );
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepTextColor = (step: LoaderStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-emerald-700 dark:text-emerald-400';
      case 'loading':
        return 'text-sky-700 dark:text-sky-400';
      case 'error':
        return 'text-red-700 dark:text-red-400';
      case 'pending':
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const calculatedProgress = overallProgress !== undefined ? overallProgress : (completedSteps / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className={`w-full max-w-sm mx-4 border-0 shadow-2xl bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-950 dark:to-slate-900 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
              <span>Progreso</span>
              <span className="font-semibold">{Math.round(calculatedProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 h-1.5 rounded-full transition-all duration-300 shadow-sm" 
                style={{ width: `${calculatedProgress}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
                  step.status === 'loading' 
                    ? 'bg-gradient-to-r from-sky-50/50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-200/50 dark:border-sky-800/50' 
                    : step.status === 'completed'
                    ? 'bg-gradient-to-r from-emerald-50/50 to-green-50/50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/50 dark:border-emerald-800/50'
                    : step.status === 'error'
                    ? 'bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-950/30 dark:to-rose-950/30 border border-red-200/50 dark:border-red-800/50'
                    : 'bg-gray-50/50 dark:bg-gray-900/30 border border-gray-200/50 dark:border-gray-800/50'
                }`}
              >
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium ${getStepTextColor(step)}`}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Step Indicator */}
          {currentStep && (
            <div className="mt-3 p-2 bg-gradient-to-r from-sky-50/50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-200/50 dark:border-sky-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full border-2 border-sky-200/30"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-sky-500 border-r-indigo-500 animate-spin"></div>
                </div>
                <span className="text-xs text-sky-700 dark:text-sky-300 font-medium">
                  {steps.find(step => step.id === currentStep)?.label || 'Procesando...'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Hook para manejar el estado del loader
export const useProgressLoader = () => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [steps, setSteps] = React.useState<LoaderStep[]>([]);
  const [currentStep, setCurrentStep] = React.useState<string | undefined>();
  const [overallProgress, setOverallProgress] = React.useState<number | undefined>();

  const startLoader = (title: string, initialSteps: LoaderStep[]) => {
    setSteps(initialSteps);
    setCurrentStep(undefined);
    setOverallProgress(undefined);
    setIsVisible(true);
  };

  const updateStep = (stepId: string, updates: Partial<LoaderStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const setStepStatus = (stepId: string, status: LoaderStep['status'], description?: string) => {
    updateStep(stepId, { status, description });
    if (status === 'loading') {
      setCurrentStep(stepId);
    } else if (status === 'completed' || status === 'error') {
      setCurrentStep(undefined);
    }
  };

  const setProgress = (progress: number) => {
    setOverallProgress(progress);
  };

  const closeLoader = () => {
    setIsVisible(false);
    setCurrentStep(undefined);
    setOverallProgress(undefined);
  };

  return {
    isVisible,
    steps,
    currentStep,
    overallProgress,
    startLoader,
    updateStep,
    setStepStatus,
    setProgress,
    closeLoader
  };
};

// Componente específico para liquidaciones
export const LiquidationLoader: React.FC<{
  isVisible: boolean;
  onClose?: () => void;
  currentStep?: string;
  progress?: number;
}> = ({ isVisible, onClose, currentStep, progress }) => {
  const liquidationSteps: LoaderStep[] = [
    {
      id: 'debug',
      label: 'Verificando datos de la tabla',
      status: 'pending',
      description: 'Analizando estructura de datos...'
    },
    {
      id: 'mensajeros',
      label: 'Obteniendo mensajeros únicos',
      status: 'pending',
      description: 'Buscando mensajeros en la base de datos...'
    },
    {
      id: 'pedidos',
      label: 'Cargando pedidos del día',
      status: 'pending',
      description: 'Recopilando pedidos por mensajero...'
    },
    {
      id: 'calculations',
      label: 'Calculando liquidaciones',
      status: 'pending',
      description: 'Procesando totales y montos...'
    },
    {
      id: 'finalization',
      label: 'Finalizando proceso',
      status: 'pending',
      description: 'Preparando datos para mostrar...'
    }
  ];

  return (
    <ProgressLoader
      isVisible={isVisible}
      title="Procesando Liquidaciones"
      steps={liquidationSteps}
      currentStep={currentStep}
      overallProgress={progress}
      onClose={onClose}
      className="max-w-lg"
    />
  );
};
