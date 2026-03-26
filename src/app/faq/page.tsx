import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: "FAQ - Pick Marketplace",
  description: "Frequently asked questions about Pick Marketplace, price comparison, affiliate commissions, and data privacy.",
};

export default function FAQPage() {
  const faqs = [
    {
      question: "Is Pick Marketplace free to use?",
      answer: "Yes, Pick Marketplace is completely free. You don\'t need to create an account, provide payment information, or pay any subscription fees. We earn affiliate commissions when you purchase through our links, which allows us to keep the service free for everyone.",
    },
    {
      question: "How does Pick Marketplace make money?",
      answer: "We participate in affiliate marketing programs with retailers like Amazon, Target, Best Buy, and Walmart. When you click through from Pick Marketplace and make a purchase, we may earn a small commission (typically 1-10% depending on the product category). This doesn't affect the price you pay-the retailer pays us, not you.",
    },
    {
      question: "How often are prices updated?",
      answer: "We attempt to check prices regularly throughout the day, but exact update frequency varies by retailer. Some prices may be several hours old. Retailers can change prices at any time, so the price you see on Pick Marketplace might differ from the current price on the retailer's website. Always verify the final price before purchasing.",
    },
    {
      question: "Why does the price on the retailer site differ from what Pick Marketplace shows?",
      answer: "This happens for a few reasons: (1) The retailer changed their price after we last checked, (2) The product is on a flash sale or limited-time promotion, (3) Shipping costs or taxes aren't included in our displayed price, (4) The product shown is marked as an \\\"example\\\" for demonstration purposes, or (5) The retailer's price varies by location. Always check the final price at checkout.",
    },
    {
      question: "Which retailers does Pick Marketplace support?",
      answer: "We currently support 50+ retailers including Amazon, Target, Best Buy, Walmart, Macy's, and Google Shopping. We're continuously adding more retailers. Visit our Supported Retailers page for the complete list and details about what product categories each retailer covers.",
    },
    {
      question: "Can I set price alerts for products I'm watching?",
      answer: "Price alerts are not currently available, but we're considering adding this feature in the future. For now, you can bookmark specific searches or check back periodically to see if prices have dropped. If you'd like to see price alerts added, let us know via our contact form.",
    },
    {
      question: "Is my personal information shared with retailers?",
      answer: "No. When you search on Pick Marketplace, we don't share your personal information with retailers. When you click through to a retailer's website, you're visiting their site directly and are subject to their privacy policy-but we don't send them identifying information from our side. We do collect anonymized search data to improve our service.",
    },
    {
      question: "How do I report an incorrect price or broken link?",
      answer: "If you find a price that's incorrect, a link that doesn't work, or any other issue, please contact us via our contact form or email support@pickmarketplace.com. Include the product name, retailer, and a description of the problem. We review all reports and work to fix issues quickly.",
    },
    {
      question: "Do you guarantee I'll get the lowest price?",
      answer: "We show you prices from multiple retailers to help you compare options, but we can't guarantee that we always show the absolute lowest price available online. Prices change frequently, some retailers aren't included in our system, and flash sales or promotional codes may not be reflected. We do our best to help you find a great deal.",
    },
    {
      question: "Why do some products say \\\"EXAMPLE\\\" or show placeholder images?",
      answer: "When our price-checking system can't retrieve real-time data from retailers (due to anti-bot protections or technical issues), we sometimes show example products to demonstrate how the platform works. These are clearly labeled with an \\\"EXAMPLE\\\" badge and disclaimer. The links go to retailer search pages rather than specific product pages.",
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600">
              Quick answers to common questions about Pick Marketplace
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-6 bg-white border border-gray-200 rounded-lg hover:border-teal-600 transition"
              >
                <h2 className="text-xl font-semibold text-black mb-3">
                  {faq.question}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          {/* Still have questions */}
          <div className="mt-16 p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <h2 className="text-2xl font-semibold text-black mb-3">
              Still Have Questions?
            </h2>
            <p className="text-gray-700 mb-6">
              Can't find the answer you're looking for? Check our{' '}
              <a href="/help" className="text-teal-600 hover:text-teal-700 underline">
                Help Center
              </a>
              {' '}or{' '}
              <a href="/contact" className="text-teal-600 hover:text-teal-700 underline">
                contact our support team
              </a>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
