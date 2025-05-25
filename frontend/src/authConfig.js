// MSAL configuration
export const msalConfig = {
  auth: {
    clientId: "0ed8cf17-a7f1-4e23-b869-d19777fba7cc", // Use the same client ID as in .env
    authority: "https://login.microsoftonline.com/f66009f9-3aae-4a4e-9161-974b63e7eb6a", // Use tenant ID from .env
    redirectUri: "http://localhost:3000",
    postLogoutRedirectUri: "http://localhost:3000",
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0:
            console.error(message);
            return;
          case 1:
            console.warn(message);
            return;
          case 2:
            console.info(message);
            return;
          case 3:
            console.debug(message);
            return;
          default:
            return;
        }
      },
      logLevel: 3, // Set to 3 for verbose logging during development
    },
  },
};

// Scopes for token request
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"]
};

// API endpoints
export const apiConfig = {
  baseUrl: "http://localhost:8000", // FastAPI backend URL
  endpoints: {
    tables: "/tables/",
    data: "/data/",
    me: "/me"
  }
};
