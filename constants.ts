
export const AVATAR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#f43f5e', // rose
];

// Using Tenor's public legacy key (LIVDSRZULELA) which is generally more stable for demos than Giphy's beta key.
export const TENOR_API_KEY = 'LIVDSRZULELA';

export const PEER_CONFIG = {
  // Using Google's public STUN server for NAT traversal
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  },
  debug: 1
};
