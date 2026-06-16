'use client';

export default function Testimonials() {
  const testimonials = [
    {
      quote: "i was about to spend $85 on a hoodie. pick found the same one for $31. obsessed.",
      attribution: "maya, junior"
    },
    {
      quote: "used pick for textbooks and saved $140. that's like six dinners.",
      attribution: "jordan, sophomore"
    },
    {
      quote: "literally the only app i've installed this semester that does what it says.",
      attribution: "alex, freshman"
    },
    {
      quote: "pick told me the amazon price was NOT the best price. wild.",
      attribution: "sam, junior"
    }
  ];

  return (
    <section className="max-w-5xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="bg-white border border-black/10 rounded-lg p-5 hover:border-[#2A9D8F]/30 transition-colors"
          >
            <p className="text-sm text-black/80 leading-relaxed mb-3">
              {testimonial.quote}
            </p>
            <p className="text-xs text-black/40">
              {testimonial.attribution}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
