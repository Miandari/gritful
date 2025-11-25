'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StepIndicator } from '@/components/challenges/create/StepIndicator';
import { Step1BasicInfo } from '@/components/challenges/create/Step1BasicInfo';
import { Step2Tasks } from '@/components/challenges/create/Step2Tasks';
import { Step3Settings } from '@/components/challenges/create/Step3Settings';
import { Step4Review } from '@/components/challenges/create/Step4Review';
import { TemplateSelectionScreen } from '@/components/challenges/create/TemplateSelectionScreen';
import { useChallengeWizardStore } from '@/lib/stores/challengeStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChallengeTemplate } from '@/lib/templates/challengeTemplates';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CreateChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { currentStep, nextStep, prevStep, setStep, reset, loadFromTemplate, formData, metrics } = useChallengeWizardStore();

  // Check URL to determine initial state
  const mode = searchParams.get('mode');
  const [templateSelected, setTemplateSelected] = useState(mode === 'wizard');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Check if user has entered any data
  const hasFormData = () => {
    return (
      (formData.name && formData.name.length > 0) ||
      (formData.description && formData.description.length > 0) ||
      metrics.length > 0
    );
  };

  // Reset wizard state when component mounts
  useEffect(() => {
    if (!mode || mode !== 'wizard') {
      reset();
      setTemplateSelected(false);
    }
  }, [reset, mode]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleTemplateSelection = (template: ChallengeTemplate | null) => {
    if (template) {
      loadFromTemplate(template);
    }
    setTemplateSelected(true);
    // Update URL to enable browser back button
    router.push('/challenges/create?mode=wizard');
  };

  const handleBackToTemplates = () => {
    reset();
    setTemplateSelected(false);
    router.push('/challenges/create');
  };

  const handleCancel = () => {
    if (hasFormData()) {
      setShowCancelDialog(true);
    } else {
      router.back();
    }
  };

  const confirmCancel = () => {
    reset();
    setShowCancelDialog(false);
    router.back();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo onNext={nextStep} onBackToTemplates={handleBackToTemplates} />;
      case 2:
        return <Step2Tasks onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <Step3Settings onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <Step4Review onPrev={prevStep} />;
      default:
        return <Step1BasicInfo onNext={nextStep} onBackToTemplates={handleBackToTemplates} />;
    }
  };

  // Show template selection screen if not yet selected
  if (!templateSelected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Breadcrumbs */}
          <nav className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-gray-100 font-medium">Create Challenge</li>
            </ol>
          </nav>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Create New Challenge</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Choose a template or start from scratch to create your challenge
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <TemplateSelectionScreen onSelectTemplate={handleTemplateSelection} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show wizard steps after template selection
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-4">
          <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                Dashboard
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-gray-100 font-medium">Create Challenge</li>
          </ol>
        </nav>

        {/* Header with Back Button */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create New Challenge</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Set up a challenge with custom tasks to track your progress
            </p>
          </div>
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <StepIndicator currentStep={currentStep} />

        <Card>
          <CardContent className="p-6">{renderStep()}</CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Without Saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to go back? Your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
