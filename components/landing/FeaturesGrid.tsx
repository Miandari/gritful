'use client';

import { useState } from 'react';
import { TrendingUp, Users, Calendar, Trophy, Target, Zap, BarChart3, Bell } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

export function FeaturesGrid() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: primaryRef, isVisible: primaryVisible } = useScrollAnimation();
  const { ref: socialRef, isVisible: socialVisible } = useScrollAnimation();

  const primaryFeatures = [
    {
      icon: TrendingUp,
      title: 'Visual Progress Tracking',
      description: 'Watch your streaks grow with intuitive calendars, charts, and statistics that motivate you to keep going.',
      color: 'green',
      stats: '12-day avg streak',
    },
    {
      icon: BarChart3,
      title: 'Custom Tasks',
      description: 'Track anything that matters to you. From workout minutes to books read, you define what success looks like.',
      color: 'blue',
      stats: '50+ task types',
    },
    {
      icon: Calendar,
      title: 'Smart Reminders',
      description: 'Never miss a day with intelligent notifications that adapt to your schedule and habits.',
      color: 'purple',
      stats: '98% completion rate',
    },
  ];

  const socialFeatures = [
    {
      icon: Users,
      title: 'Friend Challenges',
      description: 'Compete with friends or join public challenges to stay motivated and accountable.',
      color: 'orange',
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Climb the ranks and celebrate achievements with real-time competitive scoring.',
      color: 'yellow',
    },
    {
      icon: Target,
      title: 'Points & Rewards',
      description: 'Earn points for consistency, streaks, and milestones. Gamification that actually works.',
      color: 'pink',
    },
    {
      icon: Bell,
      title: 'Social Accountability',
      description: 'Share progress updates and get encouragement from your accountability partners.',
      color: 'cyan',
    },
  ];

  const getColorClasses = (color: string, type: 'bg' | 'text' | 'border' | 'glow') => {
    const colorMap: Record<string, Record<string, string>> = {
      green: {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      },
      blue: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      },
      purple: {
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
        glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
      },
      orange: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      },
      yellow: {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      },
      pink: {
        bg: 'bg-pink-500/10',
        text: 'text-pink-400',
        border: 'border-pink-500/30',
        glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      },
      cyan: {
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400',
        border: 'border-cyan-500/30',
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      },
    };

    return colorMap[color]?.[type] || '';
  };

  return (
    <section id="features" className="relative py-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 space-y-4 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Everything You Need to{' '}
            <span className="landing-gradient-text">Succeed</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful features designed to help you build lasting habits and achieve your goals
          </p>
        </div>

        {/* Primary Features - Progress Tracking */}
        <div
          ref={primaryRef}
          className={`mb-20 transition-all duration-700 delay-100 ${
            primaryVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-green-400" />
            Progress Tracking
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {primaryFeatures.map((feature, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`group relative glass-dark rounded-xl p-8 border transition-all duration-300 ${
                  getColorClasses(feature.color, 'border')
                } ${hoveredFeature === index ? getColorClasses(feature.color, 'glow') : ''}`}
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-lg mb-6 ${getColorClasses(feature.color, 'bg')}`}>
                  <feature.icon className={`h-7 w-7 ${getColorClasses(feature.color, 'text')}`} />
                </div>

                {/* Content */}
                <h4 className="text-xl font-bold text-white mb-3">{feature.title}</h4>
                <p className="text-gray-400 mb-4">{feature.description}</p>

                {/* Stats Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getColorClasses(feature.color, 'bg')} ${getColorClasses(feature.color, 'text')}`}>
                  <Zap className="h-3 w-3" />
                  {feature.stats}
                </div>

                {/* Hover Gradient Border Effect */}
                <div
                  className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 ${getColorClasses(feature.color, 'glow')}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Social Features - Competition */}
        <div
          ref={socialRef}
          className={`transition-all duration-700 delay-200 ${
            socialVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <Users className="h-6 w-6 text-purple-400" />
            Social & Competition
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {socialFeatures.map((feature, index) => (
              <div
                key={index}
                onMouseEnter={() => setHoveredFeature(primaryFeatures.length + index)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`group glass-dark rounded-xl p-6 border transition-all duration-300 ${
                  getColorClasses(feature.color, 'border')
                } ${hoveredFeature === primaryFeatures.length + index ? getColorClasses(feature.color, 'glow') : ''}`}
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${getColorClasses(feature.color, 'bg')}`}>
                  <feature.icon className={`h-6 w-6 ${getColorClasses(feature.color, 'text')}`} />
                </div>

                {/* Content */}
                <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
