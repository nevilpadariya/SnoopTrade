import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  const measure = useCallback(() => {
    if (containerRef.current) {
      const w = Math.floor(containerRef.current.offsetWidth);
      const nextWidth = Math.min(400, w);
      if (nextWidth > 0 && nextWidth !== buttonWidth) {
        setButtonWidth(nextWidth);
        setRenderKey((k) => k + 1);
      }
    }
  }, [buttonWidth]);

  useEffect(() => {
    measure();

    // Fallback for browsers/environments without ResizeObserver.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="min-h-[44px] w-full">
        {buttonWidth ? (
          <div className="flex w-full justify-center">
            <GoogleLogin
              key={renderKey}
              onSuccess={onSuccess}
              onError={onError}
              text="signin_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width={String(buttonWidth)}
            />
          </div>
        ) : (
          <div className="signal-input h-[44px] w-full rounded-md" aria-hidden="true" />
        )}
      </div>
    </div>
  );
};

export default GoogleLoginButton;
