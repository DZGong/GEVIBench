import { useState } from 'react';

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', position: '', organization: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch('https://formspree.io/f/mqedrgwk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setSent(true);
      setForm({ name: '', email: '', position: '', organization: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm font-sans rounded-md border border-ink/15 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 bg-transparent text-ink transition-colors";

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className="text-xl md:text-2xl font-bold mb-2 text-ink">
          Contact & <span className="text-klein">Contribute</span>
        </h2>
        <p className="text-sm md:text-base px-2 max-w-2xl mx-auto text-ink/60">
          Request a new GEVI to be added, report missing sensors, or share relevant papers and resources.
        </p>
      </div>

      <div className="max-w-xl mx-auto rounded-lg p-6 bg-surface-low border-2 border-gold/40 shadow-md">
        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold mb-2 text-ink">Message Sent!</h3>
            <p className="text-ink/60">Thank you for your contribution. We'll get back to you soon.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-sm font-sans px-4 py-2 rounded-md bg-surface text-ink/70 hover:bg-surface-low">
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-sans font-medium mb-1 text-ink/70">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className={inputCls} placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-sans font-medium mb-1 text-ink/70">Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className={inputCls} placeholder="your.email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-sans font-medium mb-1 text-ink/70">Position</label>
              <input type="text" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} className={inputCls} placeholder="e.g., Postdoctoral Researcher" />
            </div>
            <div>
              <label className="block text-sm font-sans font-medium mb-1 text-ink/70">Organization</label>
              <input type="text" value={form.organization} onChange={(e) => setForm({...form, organization: e.target.value})} className={inputCls} placeholder="e.g., University of ..." />
            </div>
            <div>
              <label className="block text-sm font-sans font-medium mb-1 text-ink/70">Message *</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className={inputCls} placeholder="Please describe the GEVI you'd like to request, or share links to papers/resources..." />
            </div>
            <button type="submit" disabled={submitting} className={`w-full py-2 px-4 rounded-md text-white font-sans font-medium ${submitting ? 'bg-klein-light' : 'bg-klein hover:bg-klein-light'}`}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
