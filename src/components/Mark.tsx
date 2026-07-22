// ============================================
// QUICKARDS — Wordmark
// ============================================
//
// A card at the true CR80 ratio with a red header band: the object the product
// actually makes, and the same shape as the hero specimen. Shared by the
// marketing and app shells so the identity is one thing, not two.
//
// `bg-red` resolves from the global @theme block, so this renders identically
// on the dark marketing surface and inside the themed app.

export default function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative block h-[1.05rem] w-[1.67rem] shrink-0 overflow-hidden rounded-[3px] bg-white/90 ${className}`}
      aria-hidden
    >
      <span className="absolute inset-x-0 top-0 h-[0.36rem] bg-red" />
      <span className="absolute bottom-[0.16rem] left-[0.18rem] h-[0.14rem] w-[0.5rem] rounded-full bg-black/35" />
      <span className="absolute bottom-[0.16rem] left-[0.8rem] h-[0.14rem] w-[0.62rem] rounded-full bg-black/20" />
    </span>
  );
}
