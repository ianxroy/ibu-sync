import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Get the key from env
const SITE_KEY = (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <GoogleReCaptchaProvider
      reCaptchaKey={SITE_KEY}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: "head",
        nonce: undefined,
      }}
    >
      <App />
    </GoogleReCaptchaProvider>
  </React.StrictMode>,
);
