"use client";

import { useState, useEffect } from "react";
import { Globe, Users, TrendingUp, Zap, MapPin } from "lucide-react";

const tabs = ["Availability", "Players", "Markets", "Stats"];

// World locations with coordinates (approximate positions on SVG viewBox)
const locations = [
  // North America
  { name: "New York", x: 285, y: 165, region: "NA", users: "125K" },
  { name: "Los Angeles", x: 155, y: 185, region: "NA", users: "98K" },
  { name: "Chicago", x: 255, y: 160, region: "NA", users: "67K" },
  { name: "Miami", x: 280, y: 210, region: "NA", users: "54K" },
  { name: "Toronto", x: 275, y: 145, region: "NA", users: "82K" },
  { name: "Mexico City", x: 215, y: 225, region: "NA", users: "45K" },
  // South America
  { name: "São Paulo", x: 320, y: 320, region: "SA", users: "73K" },
  { name: "Buenos Aires", x: 300, y: 360, region: "SA", users: "38K" },
  { name: "Bogotá", x: 275, y: 265, region: "SA", users: "29K" },
  // Europe
  { name: "London", x: 470, y: 135, region: "EU", users: "156K" },
  { name: "Paris", x: 478, y: 145, region: "EU", users: "89K" },
  { name: "Berlin", x: 500, y: 135, region: "EU", users: "76K" },
  { name: "Amsterdam", x: 485, y: 130, region: "EU", users: "62K" },
  { name: "Madrid", x: 460, y: 165, region: "EU", users: "51K" },
  { name: "Stockholm", x: 510, y: 105, region: "EU", users: "34K" },
  // Africa
  { name: "Lagos", x: 485, y: 250, region: "AF", users: "28K" },
  { name: "Cairo", x: 545, y: 195, region: "AF", users: "22K" },
  { name: "Cape Town", x: 520, y: 355, region: "AF", users: "18K" },
  // Asia
  { name: "Tokyo", x: 755, y: 170, region: "AS", users: "134K" },
  { name: "Singapore", x: 690, y: 270, region: "AS", users: "87K" },
  { name: "Hong Kong", x: 710, y: 210, region: "AS", users: "95K" },
  { name: "Seoul", x: 735, y: 160, region: "AS", users: "78K" },
  { name: "Mumbai", x: 620, y: 220, region: "AS", users: "65K" },
  { name: "Dubai", x: 580, y: 210, region: "AS", users: "72K" },
  { name: "Bangkok", x: 680, y: 235, region: "AS", users: "43K" },
  // Oceania
  { name: "Sydney", x: 770, y: 345, region: "OC", users: "68K" },
  { name: "Melbourne", x: 755, y: 360, region: "OC", users: "52K" },
  { name: "Auckland", x: 820, y: 370, region: "OC", users: "24K" },
];

const stats = [
  { label: "Active Countries", value: "120+", icon: Globe },
  { label: "Total Users", value: "2.4M", icon: Users },
  { label: "Daily Volume", value: "$48M", icon: TrendingUp },
  { label: "Live Markets", value: "1,200+", icon: Zap },
];

const regionNames: Record<string, string> = {
  NA: "North America",
  SA: "South America",
  EU: "Europe",
  AF: "Africa",
  AS: "Asia",
  OC: "Oceania",
};

export function AvailabilitySection() {
  const [activeTab, setActiveTab] = useState("Availability");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [animatedLocations, setAnimatedLocations] = useState<Set<number>>(new Set());
  const [currentHighlight, setCurrentHighlight] = useState(0);

  // Animate locations appearing
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedLocations((prev) => {
        if (prev.size >= locations.length) {
          return prev;
        }
        const newSet = new Set(prev);
        newSet.add(prev.size);
        return newSet;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Cycle through highlighted cities
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHighlight((prev) => (prev + 1) % locations.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const highlightedCity = locations[currentHighlight];

  return (
    <section className="bg-[#0d1117] py-16 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <span className="text-green-400 text-sm font-medium">Available Worldwide</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              ProvePicks Is
              <br />
              Available in
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500">
                {highlightedCity.name}
              </span>
            </h2>

            <p className="text-white/60 text-lg mb-8">
              Join millions of traders worldwide making predictions on sports, politics, crypto, and more.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 hover:border-green-500/50 transition-all hover:scale-105"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-white/50">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="#"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-green-500/25"
            >
              <Zap className="h-5 w-5" />
              Start Trading Now
            </a>
          </div>

          {/* Right side - World Map */}
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
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* World Map */}
            <div className="relative bg-[#0a0f14] rounded-2xl p-4 border border-white/10">
              <svg
                viewBox="0 0 900 450"
                className="w-full h-auto"
                fill="none"
              >
                {/* World continents (simplified shapes) */}
                {/* North America */}
                <path
                  d="M120 80 L180 60 L260 70 L300 100 L320 140 L300 180 L280 200 L260 210 L220 230 L200 220 L180 200 L150 180 L130 150 L120 120 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />
                {/* South America */}
                <path
                  d="M260 250 L300 240 L330 260 L340 300 L330 340 L310 380 L280 390 L260 370 L270 330 L260 290 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />
                {/* Europe */}
                <path
                  d="M440 90 L480 85 L530 90 L560 100 L560 130 L540 160 L510 170 L480 175 L450 170 L440 150 L445 120 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />
                {/* Africa */}
                <path
                  d="M460 180 L520 175 L560 200 L570 250 L560 300 L540 350 L510 370 L480 360 L460 320 L450 270 L455 220 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />
                {/* Asia */}
                <path
                  d="M560 80 L620 70 L700 80 L760 100 L780 130 L770 170 L750 200 L720 220 L680 240 L640 250 L600 240 L570 210 L560 170 L565 130 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />
                {/* Australia */}
                <path
                  d="M720 300 L780 290 L810 310 L820 350 L800 380 L760 390 L720 370 L710 340 Z"
                  fill="#22c55e"
                  className="opacity-80"
                />

                {/* Location dots */}
                {locations.map((loc, index) => {
                  const isAnimated = animatedLocations.has(index);
                  const isHovered = hoveredLocation === loc.name;
                  const isHighlighted = currentHighlight === index;

                  return (
                    <g key={loc.name}>
                      {/* Pulse ring for highlighted */}
                      {isHighlighted && (
                        <circle
                          cx={loc.x}
                          cy={loc.y}
                          r="12"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="2"
                          className="animate-ping"
                          opacity="0.5"
                        />
                      )}
                      {/* Main dot */}
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r={isHovered || isHighlighted ? 6 : 4}
                        fill={isHighlighted ? "#22c55e" : "#ffffff"}
                        className={`transition-all duration-300 cursor-pointer ${
                          isAnimated ? "opacity-100" : "opacity-0"
                        }`}
                        onMouseEnter={() => setHoveredLocation(loc.name)}
                        onMouseLeave={() => setHoveredLocation(null)}
                      />
                      {/* Glow effect */}
                      {(isHovered || isHighlighted) && (
                        <circle
                          cx={loc.x}
                          cy={loc.y}
                          r="10"
                          fill="none"
                          stroke={isHighlighted ? "#22c55e" : "#ffffff"}
                          strokeWidth="1"
                          opacity="0.4"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover tooltip */}
              {hoveredLocation && (
                <div className="absolute top-4 right-4 bg-[#1a1f2e] border border-white/20 rounded-xl p-3 shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-green-400" />
                    <span className="font-semibold text-white">{hoveredLocation}</span>
                  </div>
                  <div className="text-xs text-white/60">
                    {locations.find((l) => l.name === hoveredLocation)?.users} active users
                  </div>
                  <div className="text-xs text-green-400">
                    {regionNames[locations.find((l) => l.name === hoveredLocation)?.region || "NA"]}
                  </div>
                </div>
              )}
            </div>

            {/* Region Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {Object.entries(regionNames).map(([code, name]) => (
                <div
                  key={code}
                  className="flex items-center gap-1.5 text-xs text-white/60"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  {name}
                </div>
              ))}
            </div>

            {/* Footer text */}
            <div className="text-center mt-6 text-sm text-white/60">
              Available in 120+ countries.{" "}
              <a href="#" className="text-green-400 hover:underline">
                Check your region
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
