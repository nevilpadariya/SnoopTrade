import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState<string>('100%');
  const [renderKey, setRenderKey] = useState(0);

  const measure = useCallback(() => {
    if (containerRef.current) {
      const w = Math.floor(containerRef.current.offsetWidth);
      // Google Login button needs explicit pixel width as a string
      const newWidth = `${w}`;
      if (w > 0 && newWidth !== buttonWidth) {
        setButtonWidth(newWidth);
        setRenderKey((k) => k + 1);
      }
    }
  }, [buttonWidth]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <GoogleLogin
        key={renderKey}
        onSuccess={onSuccess}
        onError={onError}
        text="signin_with"
        shape="rectangular"
        theme="outline"
        size="large"
        width={buttonWidth}
      />
    </div>
  );
};

export default GoogleLoginButton;
