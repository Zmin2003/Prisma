import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Brain, Zap, Settings as SettingsIcon, MessageSquare, CheckCircle } from 'lucide-react';

interface FeatureTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type TourStep = 'intro' | 'deepthink' | 'visualization' | 'settings' | 'chat' | 'complete';

interface TourStepConfig {
  id: TourStep;
  title: string;
  description: string;
  icon: React.ReactNode;
  tips: string[];
  highlightElement?: string;
}

const FeatureTour = ({ isOpen, onClose, onComplete }: FeatureTourProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const tourSteps: TourStepConfig[] = [
    {
      id: 'intro',
      title: 'Welcome to Prisma',
      description: 'Prisma is a visual deep multi-agent reasoning engine that breaks down complex problems using collaborative AI agents.',
      icon: <Sparkles size={32} className="text-blue-600" />,
      tips: [
        'Multiple AI agents work together to analyze your questions',
        'Real-time visualization shows the thinking process',
        'Supports multiple AI providers (Gemini, OpenAI, Claude, and more)'
      ]
    },
    {
      id: 'deepthink',
      title: 'DeepThink Architecture',
      description: 'Our multi-agent system uses three specialized roles to provide comprehensive answers.',
      icon: <Brain size={32} className="text-purple-600" />,
      tips: [
        'Manager Agent: Plans the approach and coordinates experts',
        'Expert Agents: Analyze from different specialized perspectives',
        'Synthesis Agent: Combines insights into a final answer'
      ]
    },
    {
      id: 'visualization',
      title: 'Real-time Process Flow',
      description: 'Watch the reasoning process unfold as each agent contributes their expertise.',
      icon: <Zap size={32} className="text-amber-600" />,
      tips: [
        'See which expert is currently working',
        'Track progress through each reasoning stage',
        'View thinking budgets and token usage in real-time'
      ]
    },
    {
      id: 'settings',
      title: 'Flexible Configuration',
      description: 'Customize the reasoning process to match your needs.',
      icon: <SettingsIcon size={32} className="text-slate-600" />,
      tips: [
        'Adjust thinking levels (minimal, low, medium, high)',
        'Enable recursive refinement for deeper analysis',
        'Configure API keys for different AI providers'
      ],
      highlightElement: 'header-settings-button'
    },
    {
      id: 'chat',
      title: 'Start Your First Query',
      description: 'Type your question in the input box and let Prisma\'s agents analyze it.',
      icon: <MessageSquare size={32} className="text-green-600" />,
      tips: [
        'Ask complex questions that benefit from multiple perspectives',
        'Attach images for visual analysis (supported models only)',
        'Use the sidebar to manage multiple chat sessions'
      ],
      highlightElement: 'chat-input'
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      description: 'You\'re ready to experience deep multi-agent reasoning. Start by asking a question.',
      icon: <CheckCircle size={32} className="text-green-600" />,
      tips: [
        'Try asking: "Explain quantum computing from multiple perspectives"',
        'Experiment with different thinking levels in Settings',
        'Check the Process Flow to see agents in action'
      ]
    }
  ];

  const currentStep = tourSteps[currentStepIndex];
  const isLastStep = currentStepIndex === tourSteps.length - 1;
  const isFirstStep = currentStepIndex === 0;

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setCompletedSteps(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStepIndex));
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set(prev).add(currentStepIndex));
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
            title="Skip Tour"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              {currentStep.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
              <p className="text-sm text-white/80 mt-1">
                Step {currentStepIndex + 1} of {tourSteps.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  index < currentStepIndex
                    ? 'bg-white'
                    : index === currentStepIndex
                    ? 'bg-white/60'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-8 min-h-[400px]">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-lg text-slate-700 leading-relaxed">
              {currentStep.description}
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                Key Features
              </h3>
              <div className="space-y-3">
                {currentStep.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={14} className="text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {currentStep.id === 'complete' && (
              <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">Pro Tip</h4>
                    <p className="text-sm text-slate-700">
                      For best results, ask questions that benefit from multiple expert perspectives.
                      Prisma excels at complex analysis, strategic planning, and creative problem-solving.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2 font-medium"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {isLastStep ? (
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 font-medium"
              >
                <CheckCircle size={16} />
                Start Using Prisma
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 font-medium"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTour;
