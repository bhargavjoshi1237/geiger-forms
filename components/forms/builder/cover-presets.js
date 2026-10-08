// Cover gradients a form can use when `coverStyle` is "cover" and no `coverUrl` is set (stored as settings.coverGradient).
export const COVER_GRADIENTS = [
  { id: "dusk", label: "Dusk", css: "linear-gradient(106deg,#17353a 0%,#3e3a24 48%,#5a2d29 100%)" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(120deg,#0f2027 0%,#203a43 50%,#2c5364 100%)" },
  { id: "forest", label: "Forest", css: "linear-gradient(120deg,#0b2a1f 0%,#1d4030 50%,#3c5a2a 100%)" },
  { id: "plum", label: "Plum", css: "linear-gradient(120deg,#26112f 0%,#3f1d4a 50%,#5b2440 100%)" },
  { id: "slate", label: "Slate", css: "linear-gradient(120deg,#1c1f26 0%,#2b303b 50%,#3a3f4b 100%)" },
  { id: "ember", label: "Ember", css: "linear-gradient(120deg,#2b0f0a 0%,#5a2312 50%,#8a4a14 100%)" },
];

export function coverBackground(settings) {
  if (settings?.coverUrl) return `center / cover no-repeat url("${String(settings.coverUrl).replace(/"/g, "%22")}")`;
  return (COVER_GRADIENTS.find((g) => g.id === settings?.coverGradient) ?? COVER_GRADIENTS[0]).css;
}
