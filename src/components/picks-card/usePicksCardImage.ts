"use client";

import { useCallback, RefObject } from "react";
import type { PicksCardData } from "./PicksCard";

/**
 * Hook for generating shareable content from PicksCard
 * Uses native Canvas API - no external dependencies
 */
export function usePicksCardImage(
  cardRef: RefObject<HTMLDivElement | null>,
  data: PicksCardData
) {
  /**
   * Generate caption for sharing
   */
  const generateCaption = useCallback(() => {
    const selectedTeam = data.selectedTeam === "teamA" ? data.teamA : data.teamB;
    return `My pick: ${selectedTeam.name}. Market: ${data.teamA.name} ${data.teamA.odds}% / ${data.teamB.name} ${data.teamB.odds}%. ${data.eventTitle}`;
  }, [data]);

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
   * Download card as PNG using canvas
   * This is a simplified approach that draws the card to a canvas
   */
  const downloadImage = useCallback(async () => {
    const element = cardRef.current;
    if (!element) return false;

    try {
      // Create canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;

      // Set canvas size (2x for retina)
      const scale = 2;
      const width = 360;
      const height = 400;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, width, height);

      // Header background
      const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
      headerGradient.addColorStop(0, "#161b22");
      headerGradient.addColorStop(1, "#21262d");
      ctx.fillStyle = headerGradient;
      ctx.fillRect(0, 0, width, 50);

      // Header text
      ctx.fillStyle = "#f97316";
      ctx.font = "bold 12px system-ui";
      ctx.fillText(data.league.toUpperCase(), 20, 30);
      
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px system-ui";
      ctx.fillText("My Pick", 80, 30);
      
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = "right";
      ctx.fillText("provepicks.com", width - 20, 30);
      ctx.textAlign = "left";

      // Separator line
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.lineTo(width, 50);
      ctx.stroke();

      // Event title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(data.eventTitle, width / 2, 80);
      ctx.textAlign = "left";

      // Separator
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(width, 100);
      ctx.stroke();

      // Team A side
      const teamAX = 60;
      const teamY = 180;
      const selectedA = data.selectedTeam === "teamA";
      
      if (selectedA) {
        ctx.fillStyle = "rgba(249, 115, 22, 0.15)";
        ctx.beginPath();
        ctx.roundRect(20, 120, 140, 150, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Team A logo placeholder
      ctx.fillStyle = data.teamA.color;
      ctx.beginPath();
      ctx.roundRect(teamAX - 30, 130, 60, 60, 10);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(data.teamA.abbr, teamAX, 168);
      
      // Team A name
      ctx.font = "600 14px system-ui";
      ctx.fillText(data.teamA.name, teamAX + 30, 210);
      
      // Team A odds
      ctx.font = "bold 24px system-ui";
      ctx.fillText(`${data.teamA.odds}%`, teamAX + 30, 240);
      
      if (selectedA) {
        ctx.fillStyle = "#f97316";
        ctx.font = "bold 10px system-ui";
        ctx.fillText("SELECTED", teamAX + 30, 260);
      }

      // VS
      ctx.fillStyle = "#6b7280";
      ctx.font = "bold 16px system-ui";
      ctx.fillText("VS", width / 2, teamY);

      // Team B side
      const teamBX = width - 60;
      const selectedB = data.selectedTeam === "teamB";
      
      if (selectedB) {
        ctx.fillStyle = "rgba(249, 115, 22, 0.15)";
        ctx.beginPath();
        ctx.roundRect(width - 160, 120, 140, 150, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Team B logo placeholder
      ctx.fillStyle = data.teamB.color;
      ctx.beginPath();
      ctx.roundRect(teamBX - 30, 130, 60, 60, 10);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px system-ui";
      ctx.fillText(data.teamB.abbr, teamBX, 168);
      
      // Team B name
      ctx.font = "600 14px system-ui";
      ctx.fillText(data.teamB.name, teamBX - 30, 210);
      
      // Team B odds
      ctx.font = "bold 24px system-ui";
      ctx.fillText(`${data.teamB.odds}%`, teamBX - 30, 240);
      
      if (selectedB) {
        ctx.fillStyle = "#f97316";
        ctx.font = "bold 10px system-ui";
        ctx.fillText("SELECTED", teamBX - 30, 260);
      }

      // Footer background
      ctx.fillStyle = "#161b22";
      ctx.fillRect(0, height - 60, width, 60);
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - 60);
      ctx.lineTo(width, height - 60);
      ctx.stroke();

      // User avatar circle
      const avatarGradient = ctx.createLinearGradient(20, height - 40, 44, height - 16);
      avatarGradient.addColorStop(0, "#f97316");
      avatarGradient.addColorStop(1, "#fbbf24");
      ctx.fillStyle = avatarGradient;
      ctx.beginPath();
      ctx.arc(32, height - 28, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(data.userHandle.charAt(0).toUpperCase(), 32, height - 24);
      
      // Username
      ctx.textAlign = "left";
      ctx.fillStyle = "#d1d5db";
      ctx.font = "14px system-ui";
      ctx.fillText(data.userHandle, 50, height - 24);

      // Locks in
      ctx.textAlign = "right";
      ctx.fillStyle = "#9ca3af";
      ctx.font = "12px system-ui";
      ctx.fillText(`Locks: ${data.locksIn}`, width - 20, height - 24);

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `picks-card-${data.teamA.abbr}-vs-${data.teamB.abbr}.png`;
      link.href = dataUrl;
      link.click();

      return true;
    } catch (err) {
      console.error("Failed to generate image:", err);
      return false;
    }
  }, [cardRef, data]);

  return {
    generateCaption,
    copyCaption,
    downloadImage,
  };
}
