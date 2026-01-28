"use client";

import { useState } from "react";
import { Apple, Star } from "lucide-react";

const tabs = ["Availability", "Player", "Team", "Culture"];

// US states with abbreviations
const states = [
  { abbr: "WA", x: 115, y: 45 },
  { abbr: "OR", x: 95, y: 85 },
  { abbr: "CA", x: 70, y: 165 },
  { abbr: "NV", x: 110, y: 145 },
  { abbr: "ID", x: 155, y: 80 },
  { abbr: "MT", x: 200, y: 50 },
  { abbr: "WY", x: 220, y: 105 },
  { abbr: "UT", x: 160, y: 145 },
  { abbr: "AZ", x: 145, y: 210 },
  { abbr: "CO", x: 220, y: 160 },
  { abbr: "NM", x: 195, y: 220 },
  { abbr: "ND", x: 280, y: 50 },
  { abbr: "SD", x: 280, y: 90 },
  { abbr: "NE", x: 285, y: 130 },
  { abbr: "KS", x: 290, y: 175 },
  { abbr: "OK", x: 295, y: 215 },
  { abbr: "TX", x: 280, y: 280 },
  { abbr: "MN", x: 340, y: 70 },
  { abbr: "IA", x: 345, y: 120 },
  { abbr: "MO", x: 355, y: 170 },
  { abbr: "AR", x: 360, y: 215 },
  { abbr: "LA", x: 370, y: 275 },
  { abbr: "WI", x: 380, y: 80 },
  { abbr: "IL", x: 385, y: 140 },
  { abbr: "MS", x: 395, y: 240 },
  { abbr: "MI", x: 420, y: 90 },
  { abbr: "IN", x: 420, y: 145 },
  { abbr: "AL", x: 420, y: 230 },
  { abbr: "OH", x: 455, y: 135 },
  { abbr: "KY", x: 440, y: 175 },
  { abbr: "TN", x: 430, y: 200 },
  { abbr: "GA", x: 455, y: 235 },
  { abbr: "FL", x: 480, y: 295 },
  { abbr: "WV", x: 480, y: 160 },
  { abbr: "VA", x: 505, y: 170 },
  { abbr: "NC", x: 500, y: 200 },
  { abbr: "SC", x: 485, y: 225 },
  { abbr: "PA", x: 505, y: 125 },
  { abbr: "NY", x: 515, y: 95 },
  { abbr: "VT", x: 535, y: 60 },
  { abbr: "NH", x: 550, y: 70 },
  { abbr: "ME", x: 565, y: 45 },
  { abbr: "MA", x: 555, y: 95 },
  { abbr: "RI", x: 560, y: 108 },
  { abbr: "CT", x: 548, y: 115 },
  { abbr: "NJ", x: 535, y: 130 },
  { abbr: "DE", x: 530, y: 150 },
  { abbr: "MD", x: 520, y: 158 },
  { abbr: "AK", x: 130, y: 330 },
  { abbr: "HI", x: 230, y: 340 },
];

export function AvailabilitySection() {
  const [activeTab, setActiveTab] = useState("Availability");

  return (
    <section className="bg-[#0d1117] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-8">
              ProvePicks Is
              <br />
              Available in
              <br />
              <span className="text-white">Texas</span>
            </h2>

            {/* App store buttons */}
            <div className="flex gap-3 mb-4">
              <a
                href="#"
                className="flex items-center gap-2 bg-black border border-white/20 rounded-lg px-4 py-2 hover:bg-white/10 transition"
              >
                <Apple className="h-6 w-6 text-white" />
                <div className="text-left">
                  <div className="text-[10px] text-white/70">Download on the</div>
                  <div className="text-sm font-semibold text-white">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 bg-black border border-white/20 rounded-lg px-4 py-2 hover:bg-white/10 transition"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="white">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-white/70">GET IT ON</div>
                  <div className="text-sm font-semibold text-white">Google Play</div>
                </div>
              </a>
            </div>

            {/* Ratings */}
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-white text-white" />
                ))}
              </div>
              <span>431K Ratings on</span>
              <Apple className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Right side - Map */}
          <div>
            {/* Tabs */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex bg-[#1a1f2e] rounded-full p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      activeTab === tab
                        ? "bg-[#2a3142] text-white border border-white/20"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* US Map */}
            <div className="relative">
              <svg
                viewBox="0 0 600 400"
                className="w-full h-auto"
                fill="none"
              >
                {/* Simplified US shape as background */}
                <path
                  d="M50 100 L100 60 L180 50 L280 45 L350 50 L420 65 L500 55 L560 70 L580 100 L575 130 L560 160 L540 180 L520 200 L510 230 L490 260 L500 290 L520 320 L490 350 L420 340 L380 320 L350 300 L300 310 L260 330 L220 310 L180 280 L140 250 L100 220 L80 190 L60 160 L50 130 Z"
                  fill="#22c55e"
                  className="opacity-90"
                />
                {/* State labels */}
                {states.map((state) => (
                  <text
                    key={state.abbr}
                    x={state.x}
                    y={state.y}
                    fill="white"
                    fontSize="10"
                    fontWeight="500"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {state.abbr}
                  </text>
                ))}
              </svg>
            </div>

            {/* Footer text */}
            <div className="text-center mt-4 text-sm text-white/60">
              Learn more about how to play ProvePicks{" "}
              <a href="#" className="underline hover:text-white">
                here
              </a>
              .
              <br />
              Only F2P Available in NV.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
