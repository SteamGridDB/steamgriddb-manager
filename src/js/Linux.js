const os = window.require('os');

const platforms = {
  WINDOWS: 'WINDOWS',
  MAC: 'MAC',
  LINUX: 'LINUX'
};

const platformsNames = {
  win32: platforms.WINDOWS,
  darwin: platforms.MAC,
  linux: platforms.LINUX
};
const currentPlatform = platformsNames[os.platform()];

export const IsLinux = currentPlatform == platforms.LINUX
export const IsNotLinux = currentPlatform != platforms.LINUX