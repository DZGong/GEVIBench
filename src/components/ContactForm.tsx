import { useState } from 'react';

interface ContactFormProps {
  darkMode: boolean;
}

export function ContactForm({ darkMode }: ContactFormProps) {
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <h2 className={`text-xl md:text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Contact & <span className="text-blue-400">Contribute</span>
        </h2>
        <p className={`text-sm md:text-base px-2 max-w-2xl mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Request a new GEVI to be added, report missing sensors, or share relevant papers and resources.
        </p>
      </div>

      <div className={`max-w-xl mx-auto border rounded-lg p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Message Sent!</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Thank you for your contribution. We'll get back to you soon.</p>
            <button onClick={() => setSent(false)} className={`mt-4 text-sm px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`} placeholder="Your full name" />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`} placeholder="your.email@example.com" />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Position</label>
              <input type="text" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`} placeholder="e.g., Postdoctoral Researcher" />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization</label>
              <input type="text" value={form.organization} onChange={(e) => setForm({...form, organization: e.target.value})} className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`} placeholder="e.g., University of ..." />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Message *</label>
              <textarea required rows={4} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:border-blue-900 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-900'}`} placeholder="Please describe the GEVI you'd like to request, or share links to papers/resources..." />
            </div>
            <button type="submit" disabled={submitting} className={`w-full py-2 px-4 rounded-md text-white font-medium ${submitting ? 'bg-blue-800' : 'bg-blue-900 hover:bg-blue-800'}`}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
