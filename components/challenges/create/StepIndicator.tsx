'use client';

import { Check } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, name: 'Basic Info', description: 'Name and duration' },
  { id: 2, name: 'Tasks', description: 'What to track' },
  { id: 3, name: 'Settings', description: 'Privacy and rules' },
  { id: 4, name: 'Review', description: 'Create challenge' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, stepIdx) => (
              <li
                key={step.name}
                className={stepIdx !== steps.length - 1 ? 'flex-1 pr-8 sm:pr-20' : ''}
              >
                <div className="flex items-center">
                  <div className="relative flex flex-col items-center">
                    {step.id < currentStep ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 dark:bg-green-500">
                        <Check className="h-5 w-5 text-white" />
                      </span>
                    ) : step.id === currentStep ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-600 dark:border-green-500 bg-white dark:bg-gray-800">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{step.id}</span>
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{step.id}</span>
                      </span>
                    )}
                    <div className="mt-2 text-center">
                      <span
                        className={`block text-sm font-medium ${
                          step.id <= currentStep ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step.name}
                      </span>
                      <span className="mt-1 hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
                        {step.description}
                      </span>
                    </div>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div
                      className={`ml-4 hidden h-0.5 w-full sm:block ${
                        step.id < currentStep ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}