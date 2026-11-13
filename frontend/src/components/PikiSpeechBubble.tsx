interface PikiSpeechBubbleProps {
  children: string;
  variant?: 'invitation' | 'hand';
}

/** 피키의 얼굴과 손 상호작용 영역 밖에 유지하는 읽기 전용 말풍선이다. */
export function PikiSpeechBubble({ children, variant = 'invitation' }: PikiSpeechBubbleProps) {
  const hand = variant === 'hand';
  return <div className={hand ? 'intro-hand-cue' : 'intro-v2-speech'} aria-live={hand ? undefined : 'polite'}>
    <div className="intro-bubble-illustration">
      <svg className="intro-bubble-outline" viewBox={hand ? '0 0 320 180' : '0 0 360 160'} aria-hidden="true" focusable="false">
        <path vectorEffect="non-scaling-stroke" d={hand
          ? 'M40 48C68 25 103 37 116 34C151 19 192 34 211 35C232 32 251 22 266 8C269 31 256 44 249 48C284 39 308 59 306 89C320 121 292 151 267 149C244 169 213 154 196 155C163 173 132 156 112 157C78 172 52 155 47 146C16 147 6 123 14 103C1 81 15 54 40 48Z'
          : 'M39 32C43 12 77 9 96 20C118 2 151 11 161 18C186 5 219 9 234 20C262 5 293 19 298 32C325 27 346 48 340 69C359 94 337 117 312 116C294 137 263 129 244 126C228 134 220 145 222 155C201 151 190 138 185 129C162 140 135 129 122 127C98 141 68 130 62 121C35 128 13 110 18 91C0 70 13 43 39 32Z'} />
      </svg>
      <span className="intro-bubble-copy">{children}</span>
    </div>
  </div>;
}
