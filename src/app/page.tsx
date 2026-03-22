import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Find Top Talent",
    description: "Browse through verified service providers with ratings, reviews, and portfolios.",
    icon: "🎯",
  },
  {
    title: "Secure Payments",
    description: "Protected transactions with escrow until you're satisfied with the work.",
    icon: "🔒",
  },
  {
    title: "Easy Communication",
    description: "Built-in messaging and video calls to discuss your project requirements.",
    icon: "💬",
  },
  {
    title: "Quality Guarantee",
    description: "Money-back guarantee if the service doesn't meet your expectations.",
    icon: "✨",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "For individuals getting started",
    features: ["Up to 3 bookings/month", "Basic messaging", "Standard support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing businesses",
    features: ["Unlimited bookings", "Priority messaging", "Analytics dashboard", "24/7 support"],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: ["Custom integrations", "Dedicated account manager", "SLA guarantee", "API access"],
    cta: "Contact Sales",
    popular: false,
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Small Business Owner",
    content: "Pick Marketplace helped me find the perfect web designer for my business. The whole process was seamless!",
    avatar: "SJ",
  },
  {
    name: "Michael Chen",
    role: "Freelance Developer",
    content: "As a service provider, I've grown my client base 3x since joining. The platform handles all the admin work.",
    avatar: "MC",
  },
  {
    name: "Emily Rodriguez",
    role: "Marketing Director",
    content: "We use Pick Marketplace for all our agency needs. The quality of talent is consistently excellent.",
    avatar: "ER",
  },
];

const faqs = [
  {
    question: "How does Pick Marketplace work?",
    answer: "Simply browse services, select a provider, book their time, and pay securely through our platform. We handle the rest!",
  },
  {
    question: "How do I become a service provider?",
    answer: "Sign up, complete your profile with your skills and portfolio, set your rates, and start accepting bookings.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely.",
  },
  {
    question: "What if I'm not satisfied with a service?",
    answer: "We offer a full money-back guarantee within 14 days if the service doesn't meet your expectations.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">Pick</span>
              <span className="text-2xl font-light text-zinc-500">Marketplace</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">Features</a>
              <a href="#pricing" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">Pricing</a>
              <a href="#testimonials" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">Testimonials</a>
              <a href="#faq" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">FAQ</a>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">Log in</button>
              <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-full font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Find the perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
              service provider
            </span>
          </h1>
          <p className="mt-6 text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Connect with top-rated professionals for any service you need. From web design to consulting,
            find trusted experts ready to help your business grow.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-full text-lg font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition">
              Browse Services
            </button>
            <button className="border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition">
              Become a Provider
            </button>
          </div>
          <div className="mt-16 flex items-center justify-center gap-8 text-zinc-500 dark:text-zinc-400">
            <div className="text-center">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">10K+</div>
              <div className="text-sm">Service Providers</div>
            </div>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">50K+</div>
              <div className="text-sm">Happy Clients</div>
            </div>
            <div className="w-px h-12 bg-zinc-200 dark:bg-zinc-800" />
            <div className="text-center">
              <div className="text-3xl font-bold text-zinc-900 dark:text-white">4.9</div>
              <div className="text-sm">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">Why Choose Pick Marketplace?</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Everything you need to find and hire the best service providers.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Choose the plan that works best for you.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl ${
                  plan.popular
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-4 ring-blue-500'
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-xl font-semibold ${plan.popular ? '' : 'text-zinc-900 dark:text-white'}`}>{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-4xl font-bold ${plan.popular ? '' : 'text-zinc-900 dark:text-white'}`}>{plan.price}</span>
                  {plan.period && <span className={plan.popular ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500'}>{plan.period}</span>}
                </div>
                <p className={`mt-2 ${plan.popular ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-600 dark:text-zinc-400'}`}>{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <svg className={`w-5 h-5 ${plan.popular ? 'text-blue-400' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={plan.popular ? '' : 'text-zinc-600 dark:text-zinc-400'}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`mt-8 w-full py-3 rounded-full font-medium transition ${
                  plan.popular
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200'
                }`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-zinc-50 dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">Loved by Thousands</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">See what our users have to say about Pick Marketplace.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-white">{testimonial.name}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 italic">"{testimonial.content}"</p>
                <div className="mt-4 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Got questions? We've got answers.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{faq.question}</h3>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-violet-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-xl text-blue-100">Join thousands of satisfied users and find your perfect service provider today.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-medium hover:bg-blue-50 transition">
              Start for Free
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-white/10 transition">
              Talk to Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 dark:bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold">Pick</span>
                <span className="text-2xl font-light text-zinc-400">Marketplace</span>
              </div>
              <p className="text-zinc-400">Connecting great service providers with clients who need them.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-zinc-400">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-400">
            <p>&copy; 2024 Pick Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
