"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, ImageIcon, Loader2, Receipt } from "lucide-react";
import { PicksCard, type PicksCardData, type CardVariant } from "./PicksCard";
import { usePicksCardImage } from "./usePicksCardImage";

interface PicksCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PicksCardData;
}

/**
 * Modal wrapper for PicksCard with share actions
 * Supports Pick Card and Receipt Card variants
 */
export function PicksCardModal({ open, onOpenChange, data }: PicksCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Check if receipt card is available (user has entered an amount)
  const hasAmount = data.amount && data.amount > 0;
  
  // Card type state (only show receipt option if amount exists)
  const [cardType, setCardType] = useState<CardVariant>("pick");
  
  const { downloadImage, copyCaption, generateCaption, isLoading } = usePicksCardImage(cardRef, data, cardType);
  
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await downloadImage();
    setDownloading(false);
  };

  const handleCopyCaption = async () => {
    const success = await copyCaption();
    if (success) {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-[#30363d] max-w-[420px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-4 pb-2 border-b border-[#30363d]">
          <DialogTitle className="flex items-center gap-2 text-white">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            Share Card Preview
          </DialogTitle>
        </DialogHeader>

        {/* Card Type Tabs (only show if receipt option available) */}
        {hasAmount && (
          <div className="px-4 pt-3">
            <div className="flex gap-2 p-1 bg-[#161b22] rounded-lg">
              <button
                onClick={() => setCardType("pick")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  cardType === "pick"
                    ? "bg-orange-500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                Pick Card
              </button>
              <button
                onClick={() => setCardType("receipt")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
                  cardType === "receipt"
                    ? "bg-green-500 text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#21262d]"
                }`}
              >
                <Receipt className="h-4 w-4" />
                Receipt Card
              </button>
            </div>
          </div>
        )}

        {/* Card Preview */}
        <div className="p-4 flex justify-center bg-[#161b22]">
          <PicksCard ref={cardRef} data={data} variant={cardType} />
        </div>

        {/* Caption Preview */}
        <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]">
          <p className="text-xs text-gray-400 mb-1">Caption:</p>
          <p className="text-sm text-gray-300 bg-[#161b22] rounded p-2 border border-[#30363d]">
            {generateCaption()}
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 pt-2 flex gap-3 border-t border-[#30363d]">
          <Button
            onClick={handleDownload}
            disabled={downloading || isLoading}
            className={`flex-1 text-white ${
              cardType === "receipt" 
                ? "bg-green-500 hover:bg-green-600" 
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {downloading || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download
              </>
            )}
          </Button>
          <Button
            onClick={handleCopyCaption}
            variant="outline"
            className="flex-1 border-[#30363d] text-gray-300 hover:bg-[#21262d]"
          >
            {copiedCaption ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Caption
              </>
            )}
          </Button>
        </div>

        {/* Export info */}
        <div className="px-4 pb-3 text-center">
          <p className="text-xs text-gray-500">
            Exports as 1080x1080 PNG with team logos
            {data.userAvatarUrl && " and avatar"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
