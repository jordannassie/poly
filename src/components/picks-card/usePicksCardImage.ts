"use client";

import { useCallback, RefObject, useState } from "react";
import type { PicksCardData, CardVariant } from "./PicksCard";

// In-memory cache for base64 image URLs
const imageCache = new Map<string, string>();

/**
 * Load an image URL as a base64 data URL
 * Falls back to proxy if CORS fails
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;

  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  try {
    // Try direct fetch first
    let response = await fetch(url);

    // If CORS fails, try proxy
    if (!response.ok) {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      response = await fetch(proxyUrl);
    }

    if (!response.ok) {
      console.warn(`Failed to load image: ${url}`);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        imageCache.set(url, dataUrl);
        resolve(dataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    // If direct fetch fails (CORS), try proxy
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) return null;

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          imageCache.set(url, dataUrl);
          resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      console.warn(`Failed to proxy image: ${url}`);
      return null;
    }
  }
}

/**
 * Helper to draw rounded rectangle
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Load an image from data URL for canvas drawing
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Hook for generating shareable content from PicksCard
 * Creates a 1080x1080 centered export image with logos and avatar
 */
export function usePicksCardImage(
  cardRef: RefObject<HTMLDivElement | null>,
  data: PicksCardData,
  variant: CardVariant = "pick"
) {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Generate caption for sharing
   */
  const generateCaption = useCallback(() => {
    if (!data?.teamA?.name || !data?.teamB?.name) {
      return "My pick on ProvePicks";
    }
    const selectedTeam = data.selectedTeam === "teamA" ? data.teamA : data.teamB;
    
    // Different caption for receipt card
    if (variant === "receipt" && data.amount && data.amount > 0) {
      return `My pick: ${selectedTeam.name}. Amount: $${data.amount}. Potential payout: $${data.potentialPayout?.toFixed(2)}. ${data.eventTitle}`;
    }
    
    return `My pick: ${selectedTeam.name}. Market: ${data.teamA.name} ${data.teamA.odds ?? 0}% / ${data.teamB.name} ${data.teamB.odds ?? 0}%. ${data.eventTitle}`;
  }, [data, variant]);

  /**
   * Copy caption to clipboard
   */
  const copyCaption = useCallback(async () => {
    const caption = generateCaption();
    try {
      await navigator.clipboard.writeText(caption);
      return true;
    } catch (err) {
      console.error("Failed to copy caption:", err);
      return false;
    }
  }, [generateCaption]);

  /**
   * Download card as 1080x1080 PNG with logos and avatar
   */
  const downloadImage = useCallback(async () => {
    setIsLoading(true);

    try {
      // Load all images as base64 in parallel
      const [logoADataUrl, logoBDataUrl, avatarDataUrl] = await Promise.all([
        data.teamA.logoUrl ? loadImageAsDataUrl(data.teamA.logoUrl) : null,
        data.teamB.logoUrl ? loadImageAsDataUrl(data.teamB.logoUrl) : null,
        data.userAvatarUrl ? loadImageAsDataUrl(data.userAvatarUrl) : null,
      ]);

      // Create canvas (1080x1080 square)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsLoading(false);
        return false;
      }

      const size = 1080;
      canvas.width = size;
      canvas.height = size;

      // Determine if receipt card (adds extra height for amount section)
      const isReceipt = variant === "receipt" && data.amount && data.amount > 0;

      // Card dimensions (centered in 1080x1080)
      const cardWidth = 720;
      const cardHeight = isReceipt ? 900 : 800;
      const cardX = (size - cardWidth) / 2;
      const cardY = (size - cardHeight) / 2;

      // Background (dark)
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, size, size);

      // Card background
      ctx.fillStyle = "#0d1117";
      drawRoundRect(ctx, cardX, cardY, cardWidth, cardHeight, 32);
      ctx.fill();

      // Card border
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Header gradient
      ctx.save();
      ctx.beginPath();
      drawRoundRect(ctx, cardX, cardY, cardWidth, 100, 32);
      ctx.clip();
      const headerGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY);
      headerGradient.addColorStop(0, "#161b22");
      headerGradient.addColorStop(1, "#21262d");
      ctx.fillStyle = headerGradient;
      ctx.fillRect(cardX, cardY, cardWidth, 100);
      ctx.restore();

      // Header line
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX, cardY + 100);
      ctx.lineTo(cardX + cardWidth, cardY + 100);
      ctx.stroke();

      // League badge
      ctx.fillStyle = "rgba(249, 115, 22, 0.15)";
      drawRoundRect(ctx, cardX + 40, cardY + 35, 80, 30, 6);
      ctx.fill();
      ctx.fillStyle = "#f97316";
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.league.toUpperCase(), cardX + 80, cardY + 57);

      // Card type text
      ctx.fillStyle = "#9ca3af";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(isReceipt ? "My Receipt" : "My Pick", cardX + 140, cardY + 57);

      // ProvePicks branding
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("provepicks.com", cardX + cardWidth - 40, cardY + 57);

      // Event title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 36px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.eventTitle, cardX + cardWidth / 2, cardY + 160);

      // Title separator
      ctx.strokeStyle = "#30363d";
      ctx.beginPath();
      ctx.moveTo(cardX + 40, cardY + 190);
      ctx.lineTo(cardX + cardWidth - 40, cardY + 190);
      ctx.stroke();

      // Team section
      const teamSectionY = cardY + 220;
      const teamWidth = 280;
      const teamAX = cardX + 60;
      const teamBX = cardX + cardWidth - 60 - teamWidth;
      const selectedA = data.selectedTeam === "teamA";
      const selectedB = data.selectedTeam === "teamB";

      // Team A selection highlight
      if (selectedA) {
        ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
        drawRoundRect(ctx, teamAX, teamSectionY, teamWidth, 320, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Team A logo background
      const logoSize = 120;
      const logoAX = teamAX + (teamWidth - logoSize) / 2;
      const logoY = teamSectionY + 30;
      ctx.fillStyle = data.teamA.color || "#333";
      drawRoundRect(ctx, logoAX, logoY, logoSize, logoSize, 20);
      ctx.fill();

      // Team A logo image
      if (logoADataUrl) {
        try {
          const imgA = await loadImage(logoADataUrl);
          const imgSize = 90;
          ctx.drawImage(imgA, logoAX + (logoSize - imgSize) / 2, logoY + (logoSize - imgSize) / 2, imgSize, imgSize);
        } catch {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(data.teamA.abbr, logoAX + logoSize / 2, logoY + logoSize / 2 + 14);
        }
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(data.teamA.abbr, logoAX + logoSize / 2, logoY + logoSize / 2 + 14);
      }

      // Team A name
      ctx.fillStyle = selectedA ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.teamA.name, teamAX + teamWidth / 2, logoY + logoSize + 50);

      // Team A odds
      ctx.fillStyle = selectedA ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${data.teamA.odds}%`, teamAX + teamWidth / 2, logoY + logoSize + 110);

      // Team A selected label
      if (selectedA) {
        ctx.fillStyle = "#f97316";
        ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
        ctx.fillText("SELECTED", teamAX + teamWidth / 2, logoY + logoSize + 140);
      }

      // VS divider
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VS", cardX + cardWidth / 2, teamSectionY + 180);

      // Team B selection highlight
      if (selectedB) {
        ctx.fillStyle = "rgba(249, 115, 22, 0.12)";
        drawRoundRect(ctx, teamBX, teamSectionY, teamWidth, 320, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Team B logo background
      const logoBX = teamBX + (teamWidth - logoSize) / 2;
      ctx.fillStyle = data.teamB.color || "#333";
      drawRoundRect(ctx, logoBX, logoY, logoSize, logoSize, 20);
      ctx.fill();

      // Team B logo image
      if (logoBDataUrl) {
        try {
          const imgB = await loadImage(logoBDataUrl);
          const imgSize = 90;
          ctx.drawImage(imgB, logoBX + (logoSize - imgSize) / 2, logoY + (logoSize - imgSize) / 2, imgSize, imgSize);
        } catch {
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(data.teamB.abbr, logoBX + logoSize / 2, logoY + logoSize / 2 + 14);
        }
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(data.teamB.abbr, logoBX + logoSize / 2, logoY + logoSize / 2 + 14);
      }

      // Team B name
      ctx.fillStyle = selectedB ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.teamB.name, teamBX + teamWidth / 2, logoY + logoSize + 50);

      // Team B odds
      ctx.fillStyle = selectedB ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${data.teamB.odds}%`, teamBX + teamWidth / 2, logoY + logoSize + 110);

      // Team B selected label
      if (selectedB) {
        ctx.fillStyle = "#f97316";
        ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
        ctx.fillText("SELECTED", teamBX + teamWidth / 2, logoY + logoSize + 140);
      }

      // Receipt section (for receipt variant only)
      let receiptEndY = teamSectionY + 360;
      if (isReceipt) {
        const receiptY = teamSectionY + 360;
        receiptEndY = receiptY + 100;

        // Receipt separator
        ctx.strokeStyle = "#30363d";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 40, receiptY);
        ctx.lineTo(cardX + cardWidth - 40, receiptY);
        ctx.stroke();

        // Amount label
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Amount", cardX + cardWidth / 4, receiptY + 35);

        // Amount value
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
        ctx.fillText(`$${data.amount?.toLocaleString()}`, cardX + cardWidth / 4, receiptY + 75);

        // Divider line
        ctx.strokeStyle = "#30363d";
        ctx.beginPath();
        ctx.moveTo(cardX + cardWidth / 2, receiptY + 20);
        ctx.lineTo(cardX + cardWidth / 2, receiptY + 85);
        ctx.stroke();

        // Potential payout label
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px system-ui, -apple-system, sans-serif";
        ctx.fillText("Potential Payout", cardX + (3 * cardWidth) / 4, receiptY + 35);

        // Potential payout value
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
        ctx.fillText(`$${data.potentialPayout?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, cardX + (3 * cardWidth) / 4, receiptY + 75);
      }

      // Footer background
      const footerY = cardY + cardHeight - 100;
      ctx.fillStyle = "#161b22";
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cardX, footerY);
      ctx.lineTo(cardX + cardWidth, footerY);
      ctx.lineTo(cardX + cardWidth, cardY + cardHeight - 32);
      ctx.quadraticCurveTo(cardX + cardWidth, cardY + cardHeight, cardX + cardWidth - 32, cardY + cardHeight);
      ctx.lineTo(cardX + 32, cardY + cardHeight);
      ctx.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - 32);
      ctx.lineTo(cardX, footerY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Footer separator
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cardX, footerY);
      ctx.lineTo(cardX + cardWidth, footerY);
      ctx.stroke();

      // User avatar
      const avatarX = cardX + 60;
      const avatarY = footerY + 50;
      const avatarRadius = 24;

      if (avatarDataUrl) {
        // Draw avatar image in circle
        try {
          const avatarImg = await loadImage(avatarDataUrl);
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
          ctx.restore();
        } catch {
          // Fallback to gradient circle with initial
          const avatarGradient = ctx.createLinearGradient(avatarX - 20, avatarY - 20, avatarX + 20, avatarY + 20);
          avatarGradient.addColorStop(0, "#f97316");
          avatarGradient.addColorStop(1, "#fbbf24");
          ctx.fillStyle = avatarGradient;
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
          ctx.textAlign = "center";
          const userInitial = data.userHandle?.charAt(0)?.toUpperCase() || "G";
          ctx.fillText(userInitial, avatarX, avatarY + 7);
        }
      } else {
        // Gradient circle with initial (no avatar)
        const avatarGradient = ctx.createLinearGradient(avatarX - 20, avatarY - 20, avatarX + 20, avatarY + 20);
        avatarGradient.addColorStop(0, "#f97316");
        avatarGradient.addColorStop(1, "#fbbf24");
        ctx.fillStyle = avatarGradient;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        const userInitial = data.userHandle?.charAt(0)?.toUpperCase() || "G";
        ctx.fillText(userInitial, avatarX, avatarY + 7);
      }

      // Username
      ctx.fillStyle = "#d1d5db";
      ctx.font = "20px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "left";
      const displayHandle = data.userHandle.startsWith("@") ? data.userHandle : `@${data.userHandle}`;
      ctx.fillText(displayHandle === "@Guest" ? "Guest" : displayHandle, avatarX + 40, avatarY + 7);

      // Locks in
      ctx.fillStyle = "#9ca3af";
      ctx.font = "18px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Locks: ${data.locksIn}`, cardX + cardWidth - 40, avatarY + 7);

      // Download
      const cardType = isReceipt ? "receipt" : "picks";
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${cardType}-card-${data.teamA.abbr}-vs-${data.teamB.abbr}.png`;
      link.href = dataUrl;
      link.click();

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("Failed to generate image:", err);
      setIsLoading(false);
      return false;
    }
  }, [data, variant]);

  return {
    generateCaption,
    copyCaption,
    downloadImage,
    isLoading,
  };
}
