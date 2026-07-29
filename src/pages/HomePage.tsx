import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Clock3,
  MessageCircle,
  MonitorSmartphone,
  Scissors,
  Sparkles,
  UserCheck,
  UsersRound,
  Wrench,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const problems = [
  'Customers cannot tell how long the wait might be.',
  'Staff repeatedly answer the same Messenger questions.',
  'Rigid appointment slots do not fit variable service times.',
]

const steps = [
  ['01', 'Check demand', 'Customers see how busy a staff member or branch is in Messenger.'],
  ['02', 'Plan the visit', 'They can travel now or schedule a future visit.'],
  ['03', 'Confirm arrival', 'A real queue position starts only after they check in on-site.'],
  ['04', 'Serve with clarity', 'Staff manage the live queue from a simple web dashboard.'],
  ['05', 'Keep it current', 'Queue information updates as services start and finish.'],
]

const features = [
  {
    icon: UsersRound,
    title: 'Live Staff Queues',
    text: 'See who is being served, who has arrived, and who should be handled next.',
  },
  {
    icon: MessageCircle,
    title: 'Messenger Crowd Check',
    text: 'Let customers check demand before they spend time travelling.',
  },
  {
    icon: UserCheck,
    title: 'Arrival Check-In',
    text: 'Customers enter the real queue only after confirming they have arrived.',
  },
  {
    icon: CalendarClock,
    title: 'Advance Scheduling',
    text: 'Accept future visits without forcing today’s walk-ins into rigid slots.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Staff Web Dashboard',
    text: 'Start, complete, and cancel queue entries from a phone, tablet, or desktop.',
  },
  {
    icon: BarChart3,
    title: 'Useful Queue Records',
    text: 'Keep organized booking and visit data ready for approved follow-ups.',
  },
]

const benefits = [
  'Reduce repetitive Messenger questions',
  'Give customers better visibility',
  'Preserve staff flexibility',
  'Reduce ghost queue entries',
  'Organize bookings and walk-ins',
  'Support thoughtful follow-ups',
]

export function HomePage() {
  return (
    <main className="home-page">
      <section className="hero-section">
        <div className="hero-section__copy">
          <span className="eyebrow">
            <Sparkles aria-hidden="true" size={16} />
            Queue clarity, without rigid schedules
          </span>
          <h1>A Smarter Queue for Walk-In Businesses</h1>
          <p className="hero-section__lead">
            Let customers check how busy your staff are, schedule future visits, and
            check in when they arrive—all through Messenger.
          </p>
          <p className="hero-section__support">
            Keep the flexibility of walk-ins without locking your team into rigid
            appointment slots.
          </p>
          <div className="hero-section__actions">
            <Link className="button button--primary" to="/about#contact">
              Request a Demo
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <a className="button button--secondary" href="#how-it-works">
              See How It Works
              <ArrowDown aria-hidden="true" size={18} />
            </a>
          </div>
          <div className="hero-section__trust">
            <span>
              <Check aria-hidden="true" size={16} />
              Built for variable service times
            </span>
            <span>
              <Check aria-hidden="true" size={16} />
              Works across phone, tablet, and desktop
            </span>
          </div>
        </div>

        <div className="queue-preview" aria-label="Example of a live staff queue">
          <div className="queue-preview__top">
            <div>
              <span className="queue-preview__label">TODAY’S QUEUE</span>
              <strong>Jasper’s chair</strong>
            </div>
            <span className="live-pill">
              <span aria-hidden="true" />
              Live
            </span>
          </div>
          <div className="queue-preview__current">
            <span className="queue-preview__position">NOW</span>
            <div>
              <strong>Maria Santos</strong>
              <span>Hair rebond · In service</span>
            </div>
            <span className="status-dot status-dot--active" aria-label="In service" />
          </div>
          <div className="queue-preview__item">
            <span className="queue-preview__number">01</span>
            <div>
              <strong>Anna Reyes</strong>
              <span>Scheduled · 9:00 AM</span>
            </div>
            <span className="badge badge--scheduled">Arrived</span>
          </div>
          <div className="queue-preview__item">
            <span className="queue-preview__number">02</span>
            <div>
              <strong>Paolo Cruz</strong>
              <span>Waiting list · 8:52 AM</span>
            </div>
            <span className="badge">Checked in</span>
          </div>
          <div className="queue-preview__signal">
            <MessageCircle aria-hidden="true" size={20} />
            <span>
              Messenger crowd check
              <strong>2 customers are ready</strong>
            </span>
          </div>
        </div>
      </section>

      <section className="problem-section section-shell">
        <div className="section-heading section-heading--split">
          <div>
            <span className="eyebrow">A calmer front desk</span>
            <h2>Stop Losing Customers to Uncertain Waiting Times</h2>
          </div>
          <p>
            Give customers a useful answer before they travel, while your team keeps
            the freedom to handle real service times.
          </p>
        </div>
        <div className="problem-grid">
          {problems.map((problem, index) => (
            <article className="problem-card" key={problem}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{problem}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section section-shell" id="how-it-works">
        <div className="section-heading section-heading--center">
          <span className="eyebrow">One clear service journey</span>
          <h2>From “How busy are you?” to the next customer served</h2>
        </div>
        <ol className="process-list">
          {steps.map(([number, title, text]) => (
            <li key={number}>
              <span className="process-list__number">{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="arrival-rule section-shell">
        <div className="arrival-rule__icon" aria-hidden="true">
          <Clock3 size={34} />
        </div>
        <div className="arrival-rule__copy">
          <span className="eyebrow">The AutoBizMate difference</span>
          <h2>No Remote Position Holding</h2>
          <p>
            Customers who are still travelling do not block the active queue. Only
            customers who have arrived and checked in receive an actual position.
          </p>
          <p>
            Staff can continue serving customers who are physically ready, while
            remote customers can still view current demand before travelling.
          </p>
        </div>
        <div className="arrival-rule__visual" aria-label="Remote visitors do not block arrived customers">
          <div>
            <span>REMOTE</span>
            <strong>Viewing demand</strong>
          </div>
          <ArrowRight aria-hidden="true" />
          <div className="arrival-rule__ready">
            <span>ARRIVED</span>
            <strong>Gets queue position</strong>
          </div>
        </div>
      </section>

      <section className="features-section section-shell">
        <div className="section-heading section-heading--split">
          <div>
            <span className="eyebrow">Built around the service day</span>
            <h2>Simple tools that keep queues moving</h2>
          </div>
          <p>
            Customers get visibility. Staff get a focused queue. The business keeps
            the flexibility that walk-in service needs.
          </p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="feature-card" key={title}>
              <span className="feature-card__icon">
                <Icon aria-hidden="true" size={23} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ideal-section section-shell">
        <div>
          <span className="eyebrow">Designed for businesses where walk-ins matter</span>
          <h2>When every service takes a different amount of time</h2>
          <p>
            Built for barbershops, salons, grooming businesses, repair services, and
            other teams where walk-in flexibility matters.
          </p>
        </div>
        <div className="ideal-section__types" aria-label="Ideal business types">
          <span>
            <Scissors aria-hidden="true" />
            Barbers & salons
          </span>
          <span>
            <UsersRound aria-hidden="true" />
            Grooming services
          </span>
          <span>
            <Wrench aria-hidden="true" />
            Repair services
          </span>
        </div>
      </section>

      <section className="benefits-section section-shell">
        <div className="benefits-section__intro">
          <span className="eyebrow">A better customer handoff</span>
          <h2>Serve more customers with less waiting confusion</h2>
          <p>
            Replace repeated questions and uncertain arrivals with a shared view of
            what is happening now.
          </p>
        </div>
        <ul className="benefit-list">
          {benefits.map((benefit) => (
            <li key={benefit}>
              <Check aria-hidden="true" size={18} />
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      <section className="final-cta section-shell">
        <span className="final-cta__orb final-cta__orb--one" aria-hidden="true" />
        <span className="final-cta__orb final-cta__orb--two" aria-hidden="true" />
        <div>
          <span className="eyebrow">Made to fit your operation</span>
          <h2>See how it works for your business</h2>
          <p>
            Explore a practical queue setup shaped around your staff, services, and
            real customer flow.
          </p>
          <div className="final-cta__actions">
            <Link className="button button--primary" to="/about#contact">
              Request a Demo
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="button button--secondary" to="/about#contact">
              Request a Pilot
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
