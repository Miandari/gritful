'use client';

import { useState } from 'react';
import { CheckCircle, TrendingUp, Users } from 'lucide-react';

export function ProductScreenshots() {
  const [activeView, setActiveView] = useState(0);

  const views = [
    {
      title: 'Start Fresh',
      description: 'Create your first challenge in seconds',
      icon: CheckCircle,
      color: 'text-blue-400',
    },
    {
      title: 'Track Daily',
      description: 'Log your progress and build streaks',
      icon: TrendingUp,
      color: 'text-green-400',
    },
    {
      title: 'Compete Together',
      description: 'Climb the leaderboard with friends',
      icon: Users,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="relative">
      {/* Main Screenshot Container with Glass Effect */}
      <div className="glass-dark rounded-2xl p-8 border border-gray-800 relative overflow-hidden">
        {/* Gradient Border Glow */}
        <div className="absolute -inset-0.5 landing-gradient-neon rounded-2xl opacity-20 blur-lg" />

        <div className="relative space-y-6">
          {/* Navigation Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {views.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveView(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activeView === index
                    ? 'bg-green-400 w-8'
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                aria-label={`View ${index + 1}`}
              />
            ))}
          </div>

          {/* Active View Content */}
          <div className="text-center space-y-4">
            {(() => {
              const Icon = views[activeView].icon;
              return (
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 ${views[activeView].color}`}>
                  <Icon className="h-8 w-8" />
                </div>
              );
            })()}
            <h3 className="text-2xl font-bold text-white">{views[activeView].title}</h3>
            <p className="text-gray-400">{views[activeView].description}</p>
          </div>

          {/* Mock Interface - View 1: Empty State */}
          {activeView === 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6 space-y-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-24 bg-green-500/20 rounded flex items-center justify-center">
                  <span className="text-green-400 text-sm">New</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="pt-4 border-t border-gray-700">
                <div className="h-10 w-full bg-blue-500/20 rounded flex items-center justify-center">
                  <span className="text-blue-400 text-sm font-medium">Create Your First Challenge</span>
                </div>
              </div>

              {/* SVG Annotation */}
              <svg className="absolute -right-4 top-1/3 w-32 h-24" viewBox="0 0 130 100">
                <path
                  d="M 10 50 Q 40 20, 80 40"
                  stroke="#10b981"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 4"
                />
                <circle cx="10" cy="50" r="4" fill="#10b981" />
              </svg>
            </div>
          )}

          {/* Mock Interface - View 2: Active Tracking */}
          {activeView === 1 && (
            <div className="bg-gray-800/50 rounded-lg p-6 space-y-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-white font-medium">30-Day Fitness Challenge</div>
                  <div className="text-sm text-gray-400">Day 12 of 30</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-orange-400 font-bold">12</div>
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
              </div>

              {/* Daily Tasks */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { label: 'Workout', value: '45m', color: 'green' },
                  { label: 'Water', value: '8/8', color: 'blue' },
                  { label: 'Sleep', value: '7.5h', color: 'purple' },
                ].map((metric, i) => (
                  <div key={i} className={`bg-${metric.color}-500/10 rounded p-2 text-center`}>
                    <div className={`text-${metric.color}-400 font-bold text-lg`}>{metric.value}</div>
                    <div className="text-xs text-gray-500">{metric.label}</div>
                  </div>
                ))}
              </div>

              {/* SVG Annotation */}
              <svg className="absolute -left-8 top-1/2 w-40 h-24" viewBox="0 0 160 100">
                <path
                  d="M 150 50 Q 100 30, 60 50"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 4"
                />
                <circle cx="150" cy="50" r="4" fill="#3b82f6" />
              </svg>
            </div>
          )}

          {/* Mock Interface - View 3: Leaderboard */}
          {activeView === 2 && (
            <div className="bg-gray-800/50 rounded-lg p-6 space-y-3 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-medium">Leaderboard</div>
                <div className="text-sm text-gray-400">Top Performers</div>
              </div>

              {/* Leaderboard Items */}
              {[
                { rank: 1, name: 'You', points: 340, color: 'yellow' },
                { rank: 2, name: 'Alex M.', points: 325, color: 'gray' },
                { rank: 3, name: 'Sarah K.', points: 310, color: 'orange' },
              ].map((player, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    i === 0 ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-${player.color}-500/20 flex items-center justify-center`}>
                      <span className={`text-${player.color}-400 font-bold text-sm`}>#{player.rank}</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{player.name}</div>
                    </div>
                  </div>
                  <div className="text-green-400 font-bold">{player.points} pts</div>
                </div>
              ))}

              {/* SVG Annotation */}
              <svg className="absolute -right-6 top-1/4 w-36 h-24" viewBox="0 0 140 100">
                <path
                  d="M 10 30 Q 50 10, 90 40"
                  stroke="#8b5cf6"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="4 4"
                />
                <circle cx="10" cy="30" r="4" fill="#8b5cf6" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Call-out */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setActiveView((activeView + 1) % 3)}
          className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          Click to see next view
        </button>
      </div>
    </div>
  );
}
