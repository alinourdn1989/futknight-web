"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import emailjs from "@emailjs/browser";

const FAQS = [
  {
    q: "How do I join a tournament?",
    a: "Your admin will add you to a tournament from their roster. Once added, log in to your FutKnight account and you will see the tournament under My Tournaments.",
  },
  {
    q: "How do I register on FutKnight?",
    a: "Ask your admin for the registration link or tournament link. You can register using your email address. Once registered, your account will be linked to your player profile.",
  },
  {
    q: "I can't see my tournament — what do I do?",
    a: "Make sure you are logged in with the same email your admin used to add you. If the issue persists, contact your tournament admin or reach out to us.",
  },
  {
    q: "How are match scores entered?",
    a: "Only the tournament admin can enter and update match scores. Players can view scores in real time from their tournament page.",
  },
  {
    q: "What are badges and how do I earn them?",
    a: "Badges are awarded automatically when a tournament is completed. You can earn Champion, Top Scorer, Hat-trick Hero, Undefeated, Finalist, Veteran, and Serial Winner badges based on your performance.",
  },
  {
    q: "What is Head-to-Head (H2H)?",
    a: "H2H lets you challenge other registered players to private matches outside of tournaments. You send a challenge, they accept, one of you enters the score, and the other approves it.",
  },
  {
    q: "How do I scan a tournament QR code?",
    a: "Open your phone camera and point it at the QR code shown by your admin. It will take you directly to the public tournament page where you can view fixtures, standings, and results.",
  },
  {
    q: "Can I delete my account?",
    a: "Yes. Contact us at ali.nour.dn@gmail.com and we will delete your account and all associated data within 7 days.",
  },
];

export default function Support() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await emailjs.send(
        "service_35hvy95",
        "template_0xugb2k",
        {
          from_name: formData.name,
          from_email: formData.email,
          subject: formData.subject || "FutKnight Support Request",
          message: formData.message,
          to_email: "ali.nour.dn@gmail.com",
        },
        "iRug2n0uQd9bjHX_t"
      );
      setSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Failed to send message. Please email us directly at ali.nour.dn@gmail.com");
    }
    setSending(false);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <nav className="border-b border-[#111] px-4 md:px-10 py-4 flex justify-between items-center sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-40">
        <button onClick={() => router.push("/")} className="text-orange-500 text-sm">Back</button>
        <span className="text-cyan-400 font-extrabold">FutKnight</span>
        <div className="w-16" />
      </nav>

      <main className="px-4 md:px-10 py-12 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-white text-3xl font-extrabold mb-3">Support Center</h1>
          <p className="text-gray-500">Find answers to common questions or get in touch with us</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FAQ */}
          <div>
            <h2 className="text-white text-xl font-bold mb-5">Frequently Asked Questions</h2>
            <div className="flex flex-col gap-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="bg-[#111] border border-[#1A1A1A] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-4 text-left">
                    <span className="text-white font-bold text-sm pr-4">{faq.q}</span>
                    <span className="text-cyan-400 text-lg shrink-0">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="text-white text-xl font-bold mb-5">Contact Us</h2>

            {sent ? (
              <div className="bg-cyan-400/10 border border-cyan-400/30 rounded-2xl p-8 text-center">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-white font-bold text-lg mb-2">Message sent!</p>
                <p className="text-gray-500 text-sm">We will get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-cyan-400 text-sm underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    className="w-full bg-[#111] text-white border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    className="w-full bg-[#111] text-white border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">Subject</label>
                  <input
                    className="w-full bg-[#111] text-white border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition"
                    placeholder="What is your question about?"
                    value={formData.subject}
                    onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1.5 block">
                    Message <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    rows={5}
                    className="w-full bg-[#111] text-white border border-[#222] rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 transition resize-none"
                    placeholder="Describe your issue or question..."
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                  />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={sending}
                  className="bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-400 disabled:opacity-50 transition">
                  {sending ? "Sending..." : "Send Message"}
                </button>
                <p className="text-gray-600 text-xs text-center">
                  Or email us directly at{" "}
                  <a href="mailto:ali.nour.dn@gmail.com" className="text-cyan-400 hover:underline">ali.nour.dn@gmail.com</a>
                </p>
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#111] text-center">
          <p className="text-gray-600 text-xs">
            Powered by <span className="text-cyan-400 font-bold">FutKnight</span>
            {" · "}
            <button onClick={() => router.push("/privacy")} className="text-gray-600 hover:text-cyan-400 transition">Privacy Policy</button>
          </p>
        </div>
      </main>
    </div>
  );
}
