import React from 'react';
import { X, Download } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, alt = 'Photo preview', onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <a
          href={src}
          download="kinfolk-photo.jpg"
          onClick={e => e.stopPropagation()}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md"
          title="Download photo"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition backdrop-blur-md"
          title="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
};
