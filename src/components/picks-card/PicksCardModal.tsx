"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check, ImageIcon } from "lucide-react";
import { PicksCard, type PicksCardData } from "./PicksCard";
import { usePicksCardImage } from "./usePicksCardImage";

interface PicksCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PicksCardData;
}

/**
 * Modal wrapper for PicksCard with share actions
 */
export function PicksCardModal({ open, onOpenChange, data }: PicksCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { downloadImage, copyCaption, generateCaption } = usePicksCardImage(cardRef, data);
  
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
      <DialogContent className="bg-[#0d1117] border-[#30363d] max-w-[420px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-[#30363d]">
          <DialogTitle className="flex items-center gap-2 text-white">
            <ImageIcon className="h-5 w-5 text-orange-500" />
            Picks Card Preview
          </DialogTitle>
        </DialogHeader>

        {/* Card Preview */}
        <div className="p-4 flex justify-center bg-[#161b22]">
          <PicksCard ref={cardRef} data={data} />
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
            disabled={downloading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            {downloading ? (
              <>
                <span className="animate-pulse">Generating...</span>
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
      </DialogContent>
    </Dialog>
  );
}
