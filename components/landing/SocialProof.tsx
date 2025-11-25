'use client';

import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';

export function SocialProof() {
  const [visibleTestimonials, setVisibleTestimonials] = useState<number[]>([]);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Fitness Enthusiast',
      avatar: 'SJ',
      rating: 5,
      text: 'Gritful transformed my workout routine. The streak tracking keeps me motivated, and competing with friends adds that extra push I needed.',
    },
    {
      name: 'Michael Chen',
      role: 'Software Developer',
      avatar: 'MC',
      rating: 5,
      text: 'Finally, a habit tracker that actually works! Custom tasks let me track everything from coding hours to meditation. Love the dark theme too.',
    },
    {
      name: 'Emma Williams',
      role: 'Graduate Student',
      avatar: 'EW',
      rating: 5,
      text: 'The accountability features are game-changing. Seeing my friends progress motivates me to stay consistent with my study goals.',
    },
  ];

  useEffect(() => {
    testimonials.forEach((_, index) => {
      setTimeout(() => {
        setVisibleTestimonials(prev => [...prev, index]);
      }, index * 200);
    });
  }, []);

  return (
    <section className="relative py-24 bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold text-white">
            Loved by{' '}
            <span className="landing-gradient-text">Achievers</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join thousands who have built lasting habits with Gritful
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-8 mb-16">
          {[
            { value: '1,234+', label: 'Active Users', color: 'green' },
            { value: '50K+', label: 'Challenges Completed', color: 'blue' },
            { value: '98%', label: 'Success Rate', color: 'purple' },
            { value: '4.9/5', label: 'User Rating', color: 'yellow' },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center glass-dark rounded-xl p-8 border border-gray-700"
            >
              <div className={`text-4xl font-bold mb-2 ${
                stat.color === 'green' ? 'text-green-400' :
                stat.color === 'blue' ? 'text-blue-400' :
                stat.color === 'purple' ? 'text-purple-400' :
                'text-yellow-400'
              }`}>
                {stat.value}
              </div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`glass-dark rounded-xl p-8 border border-gray-700 transition-all duration-500 ${
                visibleTestimonials.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
              }`}
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-green-400 mb-4 opacity-50" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-300 mb-6 leading-relaxed">
                {testimonial.text}
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold">{testimonial.name}</div>
                  <div className="text-gray-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm mb-6">Trusted by individuals and teams worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {/* Placeholder for logos - replace with actual partner/media logos if available */}
            {['Featured', 'Verified', 'Secure'].map((badge, index) => (
              <div
                key={index}
                className="glass rounded-lg px-6 py-3 text-gray-400 text-sm font-medium"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
