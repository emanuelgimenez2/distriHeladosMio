// components/ui/background-image.tsx
"use client"

interface BackgroundImageProps {
  src: string;
  opacity?: number;
  overlayOpacity?: number;
  className?: string;
}

export function BackgroundImage({ 
  src, 
  opacity = 0.08, 
  overlayOpacity = 0.92,
  className = "" 
}: BackgroundImageProps) {
  return (
    <>
      <div 
        className={`fixed inset-0 z-0 pointer-events-none ${className}`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          opacity,
        }}
      />
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundColor: `rgba(255,255,255,${overlayOpacity})`,
        }}
      />
    </>
  )
}