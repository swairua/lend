import { Check, Clock, AlertCircle } from 'lucide-react';

interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  date?: string;
}

interface LoanStatusTimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export default function LoanStatusTimeline({ steps, className = '' }: LoanStatusTimelineProps) {
  const getIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-white" />;
      case 'current':
        return <Clock className="h-5 w-5 text-white" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-white" />;
      default:
        return null;
    }
  };

  const getBgColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'current':
        return 'bg-blue-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-300';
    }
  };

  const getLineColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'current':
        return 'bg-blue-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {steps.map((step, idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full ${getBgColor(step.status)} flex items-center justify-center flex-shrink-0`}>
              {getIcon(step.status)}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-1 h-12 my-1 ${getLineColor(steps[idx + 1].status === 'rejected' ? 'rejected' : steps[idx + 1].status === 'pending' && step.status !== 'completed' ? 'pending' : steps[idx + 1].status)}`} />
            )}
          </div>
          <div className="pt-2 pb-6">
            <p className={`font-medium text-sm ${step.status === 'rejected' ? 'text-red-600' : 'text-foreground'}`}>
              {step.label}
            </p>
            {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
