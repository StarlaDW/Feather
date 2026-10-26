// Every download on this page comes from the repository's releases. The GitHub API is only
// read for the version, size and asset URL; a working link stays in place if it can't be reached.

const REPO = "StarlaDW/Feather";
const API = "https://api.github.com/repos/" + REPO;
const RELEASES = "https://github.com/" + REPO + "/releases";
const ANDROID_TAG = "Mobile-v";
const WINDOWS_NOTE = "Windows 7 SP1 to 11 · 64-bit";

// Used only when the API can't be reached. Bump alongside each Mobile-v release.
const ANDROID_FALLBACK = RELEASES + "/download/Mobile-v0.3.2/FeatherMobile.apk";
const ANDROID_FALLBACK_NAME = "FeatherMobile.apk";

const windowsButton = document.getElementById("windows-button");
const windowsMeta = document.getElementById("windows-meta");
const windowsPill = document.getElementById("windows-version");
const androidButton = document.getElementById("android-button");
const androidLabel = document.getElementById("android-button-label");
const androidMeta = document.getElementById("android-meta");
const androidPill = document.getElementById("android-version");

async function github(path) {
  const response = await fetch(API + path, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error("GitHub answered " + response.status);
  }
  return response.json();
}

function sizeInMb(bytes) {
  return (bytes / 1048576).toFixed(1) + " MB";
}

function sizeInKb(bytes) {
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function showPill(element, text) {
  element.textContent = text;
  element.hidden = false;
}

function versionOf(tag) {
  return String(tag || "").replace(/^Mobile-v/i, "").replace(/^v/i, "");
}

function findAsset(release, name) {
  return release.assets.find(function (asset) {
    return asset.name.toLowerCase() === name.toLowerCase();
  });
}

function useGithub(button, asset) {
  button.href = asset.browser_download_url;
  // A cross-origin download attribute is ignored, and GitHub already sends
  // Content-Disposition: attachment, so the browser saves the file either way.
  button.removeAttribute("download");
}

async function loadWindows() {
  try {
    const release = await github("/releases/latest");
    const version = versionOf(release.tag_name);
    const setup = findAsset(release, "FeatherSetup.exe");

    if (version) {
      showPill(windowsPill, "v" + version);
    }

    if (!setup) {
      // The installer is small enough to ship with the page, and it always fetches the newest
      // build from the release above, so the browser itself is still coming from GitHub.
      windowsMeta.textContent = "Version " + version + " · " + WINDOWS_NOTE;
      return;
    }

    useGithub(windowsButton, setup);
    windowsMeta.textContent =
      "Version " + version + " · " + sizeInKb(setup.size) + " · " + WINDOWS_NOTE;
  } catch (error) {
    console.warn("Could not read the latest Windows release:", error.message);
  }
}

async function loadAndroid() {
  try {
    const releases = await github("/releases?per_page=40");
    const release = releases.find(function (entry) {
      return (
        !entry.draft &&
        typeof entry.tag_name === "string" &&
        entry.tag_name.indexOf(ANDROID_TAG) === 0
      );
    });
    const apk = release && findAsset(release, ANDROID_FALLBACK_NAME);

    if (!apk) {
      fallbackAndroid();
      return;
    }

    const version = versionOf(release.tag_name);
    useGithub(androidButton, apk);
    androidButton.classList.remove("is-pending");
    androidButton.removeAttribute("aria-disabled");
    androidLabel.textContent = "Download for Android";
    showPill(androidPill, "v" + version);
    androidMeta.textContent =
      "Version " + version + " · " + sizeInMb(apk.size) + " · signed APK";
  } catch (error) {
    console.warn("Could not read the Android release:", error.message);
    fallbackAndroid();
  }
}

// GitHub serves release assets with an attachment header, so this is still a direct download
// rather than a trip to the release page.
function fallbackAndroid() {
  androidButton.href = ANDROID_FALLBACK;
  androidButton.classList.remove("is-pending");
  androidButton.removeAttribute("aria-disabled");
  androidLabel.textContent = "Download for Android";
  androidMeta.textContent = "Newest signed APK from the release page.";
}

loadWindows();
loadAndroid();
