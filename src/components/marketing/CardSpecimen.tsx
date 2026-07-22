// ============================================
// QUICKARDS — Card specimen
// ============================================
//
// The hero object: an actual CR80 card face, at the true 1.586 aspect ratio,
// sitting inside crop marks like a press proof. The bound fields carry their
// column names as annotations, so the product's whole idea — one design, a
// thousand cards — is visible rather than described.

const ASPECT = 85.6 / 54; // CR80, the ISO/IEC 7810 ID-1 card size

function Annotation({ children }: { children: React.ReactNode }) {
  return (
    <span className="qk-label rounded-[3px] bg-red/12 px-1.5 py-0.5 text-[9px] tracking-[0.14em] text-red-accent">
      {children}
    </span>
  );
}

export default function CardSpecimen() {
  return (
    <figure className="m-0">
      <div className="qk-crop mx-auto w-full max-w-[30rem]" style={{ aspectRatio: ASPECT }}>
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[10px] bg-white text-[#0b0b0c] shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]">
          {/* Header band */}
          <div className="flex items-center justify-between bg-red px-[6%] py-[4.5%] text-white">
            <span className="qk-label text-[10px] leading-none">Northfield University</span>
            <span className="qk-label text-[9px] leading-none opacity-70">2026</span>
          </div>

          <div className="flex flex-1 items-center gap-[6%] px-[6%] py-[5%]">
            {/* Portrait — bound per card by card_id */}
            <div className="relative aspect-square h-full shrink-0 overflow-hidden rounded-full bg-[linear-gradient(145deg,#e6e7eb,#c9ccd4)] ring-1 ring-black/10">
              <div className="absolute inset-x-0 bottom-0 h-[46%] rounded-t-full bg-[#aeb2bd]" />
              <div className="absolute left-1/2 top-[18%] size-[34%] -translate-x-1/2 rounded-full bg-[#aeb2bd]" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[clamp(0.95rem,3.4vw,1.35rem)] font-bold leading-tight tracking-[-0.02em]">
                Amara Okonkwo
              </div>
              <div className="mt-[2%] truncate text-[clamp(0.6rem,2vw,0.75rem)] text-[#5b5f6e]">
                Computer Science · Year 3
              </div>
              <div className="mt-[6%] flex items-center gap-1.5">
                <Annotation>full_name</Annotation>
                <Annotation>course</Annotation>
              </div>
            </div>

            {/* Code block */}
            <div className="hidden h-full shrink-0 flex-col justify-between sm:flex">
              <div
                className="aspect-square w-[3.25rem] rounded-[3px] bg-[#0b0b0c]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg,#fff 0 2px,transparent 2px 4px),repeating-linear-gradient(90deg,#fff 0 2px,transparent 2px 4px)",
                  backgroundSize: "8px 8px, 8px 8px",
                }}
                aria-hidden
              />
            </div>
          </div>

          {/* Footer rule with the id */}
          <div className="flex items-center justify-between border-t border-black/8 px-[6%] py-[3.5%]">
            <span className="qk-num text-[clamp(0.55rem,1.8vw,0.7rem)] tracking-[0.08em] text-[#5b5f6e]">
              NU-2026-004182
            </span>
            <Annotation>card_id</Annotation>
          </div>
        </div>
      </div>

      {/* Dimension annotation, the way a spec sheet would carry it */}
      <figcaption className="mt-9 flex items-center justify-center gap-3 text-text-muted">
        <span className="h-px w-8 bg-rule-light" aria-hidden />
        <span className="qk-label qk-num text-[10px]">CR80 · 85.6 × 54 mm · 1012 × 638 px · 300 dpi</span>
        <span className="h-px w-8 bg-rule-light" aria-hidden />
      </figcaption>
    </figure>
  );
}
