import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react'
import Decor from '../../components/Decor'
import SampleQuizCard from '../../components/SampleQuizCard'
import { PrimaryButton, SecondaryButton } from '../../components/Buttons'
import { SectionHeading } from '../../components/Headings'
import { BoltIcon, UsersIcon } from '../../components/icons'
import { AVATARS, type Avatar } from '../../data/avatars'

type HeroSide = 'left' | 'right'

type AvatarStyle = CSSProperties & {
  '--avatar-bg': string
}

const HERO_AVATARS: Avatar[] = AVATARS.slice(0, 5)

function HeroSpark({ side }: { side: HeroSide }): ReactElement {
  return (
    <svg
      className={`qr-hero__spark qr-hero__spark--${side}`}
      width="52"
      height="82"
      viewBox="0 0 44 70"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {side === 'left' ? (
        <>
          <path d="M34 8C18 16 10 27 10 35c0 7 5 13 14 17" />
          <path d="M40 20C30 25 26 31 26 36c0 5 4 9 10 12" />
        </>
      ) : (
        <>
          <path d="M10 8c16 8 24 19 24 27 0 7-5 13-14 17" />
          <path d="M4 20c10 5 14 11 14 16 0 5-4 9-10 12" />
        </>
      )}
    </svg>
  )
}

export default function Home(): ReactElement {
  const stageRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = stageRef.current
    if (!root || !('IntersectionObserver' in window)) return
    root.classList.add('qr-home-stage--armed')
    const io = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.25 },
    )
    const targets = root.querySelectorAll('[data-reveal]')
    targets.forEach((target: Element) => io.observe(target))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Decor variant="home" />
      <main className="qr-main">
        <div className="qr-container">
          <section className="qr-hero" aria-labelledby="hero-title">
            <div className="qr-hero__mark">
              <HeroSpark side="left" />
              <h1 id="hero-title">
                <span className="qr-wordmark qr-wordmark--hero">
                  <span className="qr-wordmark__bolt" aria-hidden="true">
                    <BoltIcon size={30} />
                  </span>
                  <span className="qr-wordmark__quiz">Quiz</span>
                  <span className="qr-wordmark__rush">Rush</span>
                  <span className="sr-only">QuizRush</span>
                </span>
              </h1>
              <HeroSpark side="right" />
            </div>

            <p className="qr-hero__tagline">Create a room. Share the code. Beat the clock.</p>

            <p className="qr-hero__meta">
              <span className="qr-hero__avatars" aria-hidden="true">
                {HERO_AVATARS.map((avatar) => (
                  <span
                    key={avatar.id}
                    className="qr-hero__avatar"
                    style={{ '--avatar-bg': avatar.bg } as AvatarStyle}
                  >
                    {avatar.emoji}
                  </span>
                ))}
              </span>
              <span className="qr-hero__meta-text">
                {'2–12 friends · one 6-letter code · no sign-ups'}
              </span>
            </p>

            <div className="qr-hero__actions">
              <PrimaryButton
                to="/create"
                icon={<BoltIcon size={18} />}
                trailing
                className="qr-hero__cta"
              >
                Create a room
              </PrimaryButton>
              <SecondaryButton
                to="/join"
                icon={<UsersIcon size={18} />}
                trailing
                className="qr-hero__cta"
              >
                Join with a code
              </SecondaryButton>
            </div>
          </section>

          <section className="qr-home-stage" aria-labelledby="demo-heading" ref={stageRef}>
            <div className="qr-home-stage__head" data-reveal="head">
              <SectionHeading className="qr-home-stage__heading">
                <span id="demo-heading">See how a reveal lands</span>
              </SectionHeading>
              <p className="qr-home-stage__sub" data-reveal="sub">
                Pick an answer — the reveal is exactly what your friends see.
              </p>
            </div>
            <div className="qr-home-stage__card-wrap" data-reveal="card">
              <SampleQuizCard />
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
