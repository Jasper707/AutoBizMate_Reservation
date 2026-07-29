import {
  ArrowRight,
  Bot,
  CalendarCheck2,
  Eye,
  GitBranch,
  HeartHandshake,
  Mail,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { aboutContent } from '../content/aboutContent'

const approach = [
  {
    icon: HeartHandshake,
    title: 'Start with the real operation',
    text: 'We learn how the team serves customers today before choosing what to automate.',
  },
  {
    icon: GitBranch,
    title: 'Automate the repeatable parts',
    text: 'Routine steps become clearer without removing the flexibility people still need.',
  },
  {
    icon: Eye,
    title: 'Make work easier to see',
    text: 'Practical dashboards give teams a shared view of queues, visits, and next actions.',
  },
]

export function AboutPage() {
  const { company, developer } = aboutContent

  return (
    <main className="about-page">
      <section className="about-hero section-shell">
        <div>
          <span className="eyebrow">Automation that fits the business</span>
          <h1>{company.heading}</h1>
          {company.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="about-hero__motif" aria-hidden="true">
          <span className="about-hero__node about-hero__node--message">
            <Bot />
          </span>
          <span className="about-hero__line about-hero__line--one" />
          <span className="about-hero__node about-hero__node--queue">
            <CalendarCheck2 />
          </span>
          <span className="about-hero__line about-hero__line--two" />
          <span className="about-hero__node about-hero__node--people">
            <HeartHandshake />
          </span>
        </div>
      </section>

      <section className="about-capabilities section-shell">
        <div className="section-heading section-heading--split">
          <div>
            <span className="eyebrow">What we do</span>
            <h2>Turn repetitive service work into a practical system</h2>
          </div>
          <p>
            AutoBizMate connects customer communication, queue and appointment
            management, workflow automation, and operational visibility.
          </p>
        </div>
        <div className="approach-grid">
          {approach.map(({ icon: Icon, title, text }) => (
            <article className="approach-card" key={title}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-principle section-shell">
        <span className="about-principle__number">01</span>
        <div>
          <span className="eyebrow">Why AutoBizMate</span>
          <h2>Software should bend around the service—not the other way around.</h2>
        </div>
        <p>
          Our approach keeps useful human judgment in the process while automating
          repeat questions, routine updates, and administrative handoffs.
        </p>
      </section>

      <section className="developer-section section-shell">
        <div className="developer-section__portrait">
          {developer.portraitUrl ? (
            <img src={developer.portraitUrl} alt={developer.name} />
          ) : (
            <div className="portrait-placeholder" aria-label="Developer portrait placeholder">
              <UserRound aria-hidden="true" size={56} />
              <span>Portrait to be added</span>
            </div>
          )}
        </div>
        <div className="developer-section__content">
          <span className="eyebrow">Meet the builder</span>
          <h2>{developer.name}</h2>
          <p className="developer-section__title">{developer.title}</p>
          <p>{developer.shortBio}</p>
          <p>{developer.experience}</p>
          <ul>
            {developer.focusAreas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
          <p className="content-note">
            Profile details are intentionally left editable so no biography or
            credentials are invented.
          </p>
        </div>
      </section>

      <section className="contact-section section-shell" id="contact">
        <div>
          <span className="eyebrow">Let’s talk about your service flow</span>
          <h2>See how AutoBizMate could fit your business</h2>
          <p>
            Demo and pilot requests are handled directly. Add the approved contact
            address in the About content file to activate email enquiries.
          </p>
        </div>
        {developer.email.startsWith('[') ? (
          <span className="contact-placeholder">
            <Mail aria-hidden="true" size={20} />
            Contact details coming soon
          </span>
        ) : (
          <a className="button button--primary" href={`mailto:${developer.email}`}>
            Email AutoBizMate
            <ArrowRight aria-hidden="true" size={18} />
          </a>
        )}
        <Link className="text-link" to="/login">
          Already staff? Open the queue
        </Link>
      </section>
    </main>
  )
}
