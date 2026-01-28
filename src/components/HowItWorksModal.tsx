"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { TrendingUp, X } from "lucide-react";

type HowItWorksModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn?: () => void;
};

const steps = [
  {
    number: 1,
    title: "Pick a Market",
    description:
      "Buy 'Yes' or 'No' shares depending on your prediction. Buying shares is like betting on the outcome. Odds shift in real time as other traders bet.",
  },
  {
    number: 2,
    title: "Place a Bet",
    description:
      "Fund your account with crypto, credit/debit card, or bank transfer—then you're ready to bet. No bet limits and no fees.",
  },
  {
    number: 3,
    title: "Profit",
    emoji: "🤑",
    description:
      "Sell your 'Yes' or 'No' shares at any time, or wait until the market ends to redeem winning shares for $1 each. Create an account and place your first trade in minutes.",
  },
];

export function HowItWorksModal({
  open,
  onOpenChange,
  onSignIn,
}: HowItWorksModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleGetStarted = () => {
    onOpenChange(false);
    onSignIn?.();
    setCurrentStep(0);
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrentStep(0); }}>
      <DialogContent className="bg-[#1a2332] border-none text-white max-w-md p-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-white/60 hover:text-white z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Visual Card Area */}
        <div className="relative h-64 flex items-center justify-center overflow-hidden">
          {/* Confetti for last step */}
          {isLastStep && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899"][i % 5],
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animation: `fall ${2 + Math.random() * 2}s linear infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Step 1: Pick a Market Card */}
          {currentStep === 0 && (
            <div className="bg-white rounded-2xl p-4 w-64 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-800 text-sm font-medium">Will there be a US recession this year?</span>
                <div className="flex items-center gap-1 text-green-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-bold">50%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold transition">
                  Yes
                </button>
                <button className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition">
                  No
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Place a Bet Cards */}
          {currentStep === 1 && (
            <div className="relative w-72 h-48">
              {/* Back card */}
              <div className="absolute top-0 right-0 bg-white rounded-2xl p-4 w-48 shadow-xl transform rotate-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">$100</div>
                  <div className="text-sm text-gray-500">To Win <span className="text-green-500 font-semibold">$133</span></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-gray-200 text-gray-600 py-1.5 rounded-lg text-sm font-medium">Buy Yes</button>
                  <button className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-sm font-medium">Buy No</button>
                </div>
              </div>
              {/* Front card */}
              <div className="absolute bottom-0 left-0 bg-white rounded-2xl p-4 w-48 shadow-2xl transform -rotate-6">
                <div className="flex items-center justify-between mb-2">
                  <button className="text-gray-400 text-xl">−</button>
                  <div className="text-2xl font-bold text-gray-800">$100</div>
                  <button className="text-gray-400 text-xl">+</button>
                </div>
                <div className="text-center text-sm text-gray-500 mb-3">
                  To Win <span className="text-green-500 font-semibold">$400</span>
                </div>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">
                  Buy Yes
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Profit Card */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl p-4 w-64 shadow-2xl relative">
              {/* Ticket edge effect */}
              <div className="absolute left-0 top-1/2 w-4 h-8 bg-[#1a2332] rounded-r-full transform -translate-y-1/2 -translate-x-2" />
              <div className="absolute right-0 top-1/2 w-4 h-8 bg-[#1a2332] rounded-l-full transform -translate-y-1/2 translate-x-2" />
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-800 text-sm font-medium">Will there be a US recession this year?</span>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="border-t border-dashed border-gray-300 my-3" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Odds</span>
                  <span></span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Bet</span>
                  <span></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">To Win</span>
                  <span className="text-2xl font-bold text-green-500">$250</span>
                </div>
              </div>
              <button className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold mt-4">
                Cash Out
              </button>
            </div>
          )}
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 py-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === currentStep ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Text Content */}
        <div className="px-6 pb-6 text-center">
          <h2 className="text-2xl font-bold mb-3">
            {step.number}. {step.title} {step.emoji || ""}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed mb-6">
            {step.description}
          </p>
          
          {isLastStep ? (
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 text-base font-semibold"
              onClick={handleGetStarted}
            >
              Get Started
            </Button>
          ) : (
            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white h-12 text-base font-semibold"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
