import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleLoginButtonProps {
  onSuccess: (response: CredentialResponse) => void;
  onError: () => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  return (
    <div className="w-full min-w-0 [&>div]:!w-full [&>div]:!min-w-0 [&>div]:!block [&>div>div]:!w-full [&_iframe]:!w-full [&_iframe]:!max-w-full">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={onError}
        text="signin_with"
        shape="rectangular"
        theme="outline"
        size="large"
        width="100%"
      />
    </div>
  );
};

export default GoogleLoginButton;
