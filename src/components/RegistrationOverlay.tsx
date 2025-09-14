'use client'

import { useEffect, useState } from 'react'
import { Clock, Target, Sparkles } from 'lucide-react'

interface RegistrationOverlayProps {
  isVisible: boolean
  message?: string
  onClose?: () => void
}

export function RegistrationOverlay({ 
  isVisible, 
  message = 'Registration will open soon. Get ready to secure your spot!',
  onClose 
}: RegistrationOverlayProps) {
  const [mounted, setMounted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isVisible) {
      // Prevent scrolling when overlay is visible
      document.body.style.overflow = 'hidden'
      setIsAnimating(true)
    } else {
      // Restore scrolling when overlay is hidden
      document.body.style.overflow = 'unset'
      setIsAnimating(false)
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isVisible])

  if (!mounted) return null

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) rotate(0deg); }
          10% { transform: translateY(-5px) rotate(2deg); }
          30% { transform: translateY(-3px) rotate(-2deg); }
          40% { transform: translateY(-7px) rotate(1deg); }
          60% { transform: translateY(-2px) rotate(-1deg); }
        }
        
        @keyframes sparkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.8; }
          50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
        }
        
        @keyframes dots {
          0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
          40% { transform: scale(1.5); opacity: 1; }
        }
        
        .overlay-enter {
          animation: fadeIn 0.3s ease-out;
        }
        
        .content-enter {
          animation: slideUp 0.4s ease-out 0.1s both;
        }
        
        .pulse-animation {
          animation: pulse 2.5s ease-in-out infinite;
        }
        
        .bounce-animation {
          animation: bounce 3s ease-in-out infinite;
        }
        
        .sparkle-animation {
          animation: sparkle 2s ease-in-out infinite;
        }
        
        .dot-1 { animation: dots 1.5s ease-in-out infinite; }
        .dot-2 { animation: dots 1.5s ease-in-out infinite 0.2s; }
        .dot-3 { animation: dots 1.5s ease-in-out infinite 0.4s; }
      `}</style>
      
      {isVisible && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center ${isAnimating ? 'overlay-enter' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px),
                                 radial-gradient(circle at 75% 75%, white 2px, transparent 2px)`,
                backgroundSize: '50px 50px'
              }} 
            />
          </div>

          {/* Main Content */}
          <div className={`relative max-w-2xl mx-4 p-8 md:p-12 text-center ${isAnimating ? 'content-enter' : ''}`}>
            {/* Glass Card Effect */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl" />
            
            {/* Content */}
            <div className="relative z-10 text-white">
              {/* Animated Icon */}
              <div className="mb-8">
                <div className="relative inline-block bounce-animation">
                  <Target className="w-20 h-20 mx-auto text-white/90" />
                  <div className="absolute -top-2 -right-2 sparkle-animation">
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                  </div>
                </div>
              </div>

              {/* Main Message */}
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight pulse-animation"
                style={{
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
                }}
              >
                Registration will open soon.
              </h1>

              {/* Sub Message */}
              <p className="text-xl md:text-2xl mb-8 text-white/90 font-medium">
                Get ready to secure your spot!
              </p>

              {/* Additional Info */}
              <div className="flex items-center justify-center gap-3 text-white/70 text-lg">
                <Clock className="w-5 h-5" />
                <span>Please check back shortly for registration availability</span>
              </div>

              {/* Animated Dots */}
              <div className="flex justify-center gap-2 mt-8">
                <div className="w-3 h-3 bg-white/60 rounded-full dot-1" />
                <div className="w-3 h-3 bg-white/60 rounded-full dot-2" />
                <div className="w-3 h-3 bg-white/60 rounded-full dot-3" />
              </div>
            </div>
          </div>

          {/* Close button (hidden by default, can be enabled) */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 transition-colors duration-200"
              aria-label="Close overlay"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  )
}