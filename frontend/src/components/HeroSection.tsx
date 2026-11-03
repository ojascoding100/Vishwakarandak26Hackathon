'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animId = 0;

    const handleTimeUpdate = () => {
      if (!video.duration || isNaN(video.duration)) return;

      const cur = video.currentTime;
      const dur = video.duration;
      const FADE_DUR = 0.5; // 0.5s fade window

      if (cur < FADE_DUR) {
        // Fade in from 0 to 1
        const op = Math.min(1, cur / FADE_DUR);
        setVideoOpacity(op);
      } else if (dur - cur < FADE_DUR) {
        // Fade out from 1 to 0
        const op = Math.max(0, (dur - cur) / FADE_DUR);
        setVideoOpacity(op);
      } else {
        setVideoOpacity(1);
      }
    };

    const handleEnded = () => {
      setVideoOpacity(0);
      setTimeout(() => {
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => { });
        }
      }, 100);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    // Initial play attempt
    video.play().catch(() => { });

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const scrollToLeaderboard = () => {
    const el = document.getElementById('leaderboard');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative w-full overflow-hidden bg-white">
      {/* Background Cinematic Video with custom RAF 0.5s fade loop */}
      <div className="absolute top-[320px] inset-x-0 bottom-0 h-[480px] w-full overflow-hidden pointer-events-none select-none z-0">
        <video
          ref={videoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          muted
          playsInline
          autoPlay
          style={{ opacity: videoOpacity, transition: 'opacity 0.1s linear' }}
          className="w-full h-full object-cover object-center filter saturate-50 contrast-125"
        />
        {/* Double gradient overlay blending into white background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[0.5px]" />
      </div>

      {/* Hero Foreground Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-[calc(8rem-75px)] pb-36">
        {/* Track Category Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 border border-[#E5E7EB] text-xs font-semibold text-zinc-800 mb-8 animate-fade-rise">
          <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
          <span>Vishwakarandak &apos;26 — Sustainability Track (SUS-12)</span>
        </div>

        {/* Master Typographic Headline */}
        <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl font-normal leading-[0.95] tracking-[-2.5px] text-black animate-fade-rise">
          Beyond <em className="italic text-[#6F6F6F] font-normal">rhetoric,</em>
          <br className="hidden sm:inline" />
          we audit <em className="italic text-[#6F6F6F] font-normal">the reported.</em>
        </h1>

        {/* Description */}
        <p className="max-w-2xl mx-auto mt-8 text-lg sm:text-xl text-[#6F6F6F] font-normal leading-relaxed animate-fade-rise-delay">
          Autonomous forensic verification for corporate sustainability. We cross-reference
          corporate ESG narrative claims against audited SEBI BRSR Principle 6 data tables with
          pixel-level PDF bounding-box certainty.
        </p>

        {/* CTA Button */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-rise-delay-2">
          <button
            onClick={scrollToLeaderboard}
            className="rounded-full px-8 py-3.5 text-base font-medium bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2.5"
          >
            <span>Launch Auditor Console</span>
            <ArrowDownRight className="w-4 h-4" />
          </button>
          <a
            href="#benchmark"
            className="rounded-full px-7 py-3 text-base font-medium bg-white text-zinc-700 border border-[#E5E7EB] hover:bg-zinc-50 transition-colors"
          >
            View Accuracy Benchmark (86.7%)
          </a>
        </div>

        {/* Key Metrics Counter Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20 pt-10 border-t border-[#E5E7EB]/80 text-left">
          <div>
            <div className="font-serif text-3xl sm:text-4xl text-black">20 Listed</div>
            <div className="text-xs uppercase tracking-wider text-[#6F6F6F] mt-1 font-medium">
              Indian Blue-Chips
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl text-black">Principle 6</div>
            <div className="text-xs uppercase tracking-wider text-[#6F6F6F] mt-1 font-medium">
              SEBI BRSR Indicators
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl text-black">0.0% Hallucination</div>
            <div className="text-xs uppercase tracking-wider text-[#6F6F6F] mt-1 font-medium">
              Deterministic Math Engine
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl sm:text-4xl text-black">8-bit Quantized</div>
            <div className="text-xs uppercase tracking-wider text-[#6F6F6F] mt-1 font-medium">
              Qwen3-8B Local LLM
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
