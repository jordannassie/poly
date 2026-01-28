"use client";

import { useState, useEffect } from "react";
import { Globe, Users, TrendingUp, Zap, MapPin } from "lucide-react";

const tabs = ["Availability", "Players", "Markets", "Stats"];

// World locations with coordinates (positions on world map)
const locations = [
  // North America
  { name: "New York", x: 230, y: 140, region: "NA", users: "125K" },
  { name: "Los Angeles", x: 145, y: 155, region: "NA", users: "98K" },
  { name: "Chicago", x: 205, y: 135, region: "NA", users: "67K" },
  { name: "Miami", x: 220, y: 175, region: "NA", users: "54K" },
  { name: "Toronto", x: 225, y: 125, region: "NA", users: "82K" },
  { name: "Mexico City", x: 175, y: 185, region: "NA", users: "45K" },
  // South America
  { name: "São Paulo", x: 280, y: 290, region: "SA", users: "73K" },
  { name: "Buenos Aires", x: 260, y: 330, region: "SA", users: "38K" },
  { name: "Bogotá", x: 235, y: 225, region: "SA", users: "29K" },
  { name: "Lima", x: 225, y: 265, region: "SA", users: "24K" },
  // Europe
  { name: "London", x: 420, y: 115, region: "EU", users: "156K" },
  { name: "Paris", x: 430, y: 125, region: "EU", users: "89K" },
  { name: "Berlin", x: 455, y: 115, region: "EU", users: "76K" },
  { name: "Amsterdam", x: 435, y: 110, region: "EU", users: "62K" },
  { name: "Madrid", x: 410, y: 140, region: "EU", users: "51K" },
  { name: "Rome", x: 455, y: 140, region: "EU", users: "42K" },
  { name: "Stockholm", x: 465, y: 90, region: "EU", users: "34K" },
  // Africa
  { name: "Lagos", x: 435, y: 210, region: "AF", users: "28K" },
  { name: "Cairo", x: 490, y: 165, region: "AF", users: "22K" },
  { name: "Johannesburg", x: 485, y: 310, region: "AF", users: "18K" },
  { name: "Nairobi", x: 510, y: 235, region: "AF", users: "15K" },
  // Asia
  { name: "Tokyo", x: 705, y: 145, region: "AS", users: "134K" },
  { name: "Singapore", x: 635, y: 235, region: "AS", users: "87K" },
  { name: "Hong Kong", x: 660, y: 175, region: "AS", users: "95K" },
  { name: "Seoul", x: 685, y: 135, region: "AS", users: "78K" },
  { name: "Mumbai", x: 575, y: 185, region: "AS", users: "65K" },
  { name: "Dubai", x: 540, y: 175, region: "AS", users: "72K" },
  { name: "Bangkok", x: 625, y: 195, region: "AS", users: "43K" },
  { name: "Shanghai", x: 670, y: 155, region: "AS", users: "88K" },
  // Oceania
  { name: "Sydney", x: 720, y: 320, region: "OC", users: "68K" },
  { name: "Melbourne", x: 705, y: 335, region: "OC", users: "52K" },
  { name: "Auckland", x: 775, y: 340, region: "OC", users: "24K" },
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
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#0d1117] py-16 px-4 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-[#1a1f2e] rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${
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
        <div className="relative bg-[#0a0f14] rounded-2xl p-6 border border-white/10">
          <svg
            viewBox="0 0 800 400"
            className="w-full h-auto"
            fill="none"
          >
            {/* Actual World Map paths */}
            {/* North America */}
            <path
              d="M120 60 L130 55 L145 50 L165 48 L185 52 L200 58 L215 55 L230 52 L245 58 L250 70 L248 85 L240 95 L235 110 L238 125 L245 138 L250 150 L248 165 L235 180 L220 190 L200 195 L180 192 L165 185 L155 175 L148 165 L145 155 L140 145 L135 135 L130 120 L125 105 L120 90 L118 75 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Greenland */}
            <path
              d="M280 35 L310 30 L340 35 L355 50 L350 70 L335 85 L310 90 L285 80 L275 60 L278 45 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Central America & Caribbean */}
            <path
              d="M165 185 L175 188 L185 195 L195 205 L190 215 L180 218 L170 212 L165 200 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* South America */}
            <path
              d="M210 220 L230 215 L255 220 L275 235 L290 260 L295 290 L290 320 L280 345 L265 360 L245 365 L230 355 L225 335 L228 310 L235 285 L240 260 L235 240 L220 225 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Europe */}
            <path
              d="M400 70 L420 65 L445 68 L470 75 L490 85 L495 100 L490 115 L480 130 L465 142 L445 148 L425 145 L410 138 L400 125 L395 110 L398 90 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* UK & Ireland */}
            <path
              d="M405 85 L415 82 L422 88 L420 100 L412 108 L402 105 L400 95 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Scandinavia */}
            <path
              d="M445 45 L465 40 L485 48 L495 65 L490 82 L475 88 L458 82 L450 68 L448 55 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Africa */}
            <path
              d="M410 155 L440 150 L475 155 L510 165 L530 185 L540 210 L538 245 L530 280 L515 310 L490 335 L460 345 L430 338 L410 315 L400 280 L395 245 L400 210 L405 180 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Middle East */}
            <path
              d="M495 145 L520 140 L545 145 L560 160 L555 180 L540 190 L520 188 L505 175 L498 160 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Russia / Northern Asia */}
            <path
              d="M490 50 L530 45 L580 42 L630 45 L680 50 L720 58 L740 72 L735 90 L720 105 L690 115 L650 118 L610 115 L570 108 L530 100 L500 90 L488 75 L485 60 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* South Asia / India */}
            <path
              d="M555 170 L580 165 L600 175 L610 195 L605 220 L590 240 L570 245 L555 235 L550 210 L552 190 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Southeast Asia */}
            <path
              d="M610 190 L635 185 L655 195 L660 215 L650 235 L630 245 L610 240 L600 220 L605 200 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* China / East Asia */}
            <path
              d="M600 110 L640 105 L680 110 L710 125 L720 145 L715 168 L695 185 L665 190 L635 185 L610 172 L598 150 L595 130 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Japan */}
            <path
              d="M700 120 L715 115 L728 125 L730 145 L722 160 L708 165 L698 155 L695 138 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Indonesia / Philippines */}
            <path
              d="M630 250 L660 245 L690 252 L710 265 L705 285 L685 295 L655 292 L635 280 L628 265 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* Australia */}
            <path
              d="M660 295 L700 290 L740 300 L760 320 L755 350 L735 370 L700 375 L670 365 L655 340 L658 315 Z"
              fill="#22c55e"
              opacity="0.85"
            />
            {/* New Zealand */}
            <path
              d="M770 340 L785 335 L792 350 L788 368 L775 375 L765 365 L768 350 Z"
              fill="#22c55e"
              opacity="0.85"
            />

            {/* Location dots */}
            {locations.map((loc, index) => {
              const isAnimated = animatedLocations.has(index);
              const isHovered = hoveredLocation === loc.name;

              return (
                <g key={loc.name}>
                  {/* Pulse ring on hover */}
                  {isHovered && (
                    <circle
                      cx={loc.x}
                      cy={loc.y}
                      r="12"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="animate-ping"
                      opacity="0.6"
                    />
                  )}
                  {/* Glow effect */}
                  {isAnimated && (
                    <circle
                      cx={loc.x}
                      cy={loc.y}
                      r="8"
                      fill="#ffffff"
                      opacity="0.15"
                    />
                  )}
                  {/* Main dot */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isHovered ? 5 : 3.5}
                    fill="#ffffff"
                    className={`transition-all duration-300 cursor-pointer ${
                      isAnimated ? "opacity-100" : "opacity-0"
                    }`}
                    onMouseEnter={() => setHoveredLocation(loc.name)}
                    onMouseLeave={() => setHoveredLocation(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredLocation && (
            <div className="absolute top-4 right-4 bg-[#1a1f2e] border border-white/20 rounded-xl p-3 shadow-xl z-10">
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
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          {Object.entries(regionNames).map(([code, name]) => (
            <div
              key={code}
              className="flex items-center gap-2 text-sm text-white/70"
            >
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-[#1a1f2e] rounded-xl p-4 border border-white/10 hover:border-green-500/50 transition-all text-center"
            >
              <stat.icon className="h-5 w-5 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
