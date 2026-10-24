// Media sources for image and video blocks. Only parsed links are ever rendered — never author-supplied embed HTML.

const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com", "music.youtube.com"]);
const VIDEO_FILE = /\.(mp4|m4v|webm)$/i;

// An http(s), root-relative or playground blob: image URL (what the builder's image inputs accept), else "".
export function imageSource(value) {
  const url = String(value || "").trim();
  return /^(https?:\/\/|blob:|\/(?!\/))/i.test(url) ? url : "";
}

// YouTube / Vimeo links → privacy-enhanced embed URLs; direct https video files play natively; anything else is null.
export function videoSource(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^(www|m)\./, "");

  const youtubeId = host === "youtu.be" ? url.pathname.slice(1) : YOUTUBE_HOSTS.has(host) ? url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] : null;
  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) return { kind: "embed", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0` };

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = url.pathname.match(/^\/(?:video\/|channels\/[\w-]+\/|groups\/[\w-]+\/videos\/)?(\d+)(?:\/([\da-f]+))?\/?$/i);
    if (match) {
      const params = new URLSearchParams({ dnt: "1" });
      const hash = match[2] || url.searchParams.get("h");
      if (hash) params.set("h", hash);
      return { kind: "embed", provider: "Vimeo", src: `https://player.vimeo.com/video/${match[1]}?${params}` };
    }
  }

  return VIDEO_FILE.test(url.pathname) ? { kind: "file", src: url.href } : null;
}
