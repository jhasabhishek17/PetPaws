import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Phone, 
  Mail, 
  Clock
} from 'lucide-react';

/**
 * CustomerSupport Component
 * Features interactive FAQ accordions, contact form, ticket submission, 
 * and real-time ticket status tracking for buyers and sellers.
 */
export default function CustomerSupport({ currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [openFaq, setOpenFaq] = useState(0);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  const fetchTickets = async () => {
    try {
      const userId = currentUser?.id || 'u-buyer-1';
      const res = await fetch(`/api/support/tickets?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Error fetching support tickets:", err);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitMessage('');

    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id || 'u-buyer-1',
          user_name: currentUser?.name || 'Alex Morgan',
          user_email: currentUser?.email || 'buyer@petpaws.com',
          subject,
          message,
          priority
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitMessage(data.message);
        setSubject('');
        setMessage('');
        fetchTickets();
      }
    } catch (err) {
      setSubmitMessage('Failed to submit support ticket.');
    }
  };

  const faqs = [
    {
      q: 'How does pet order tracking and live climate control work?',
      a: 'All live pet shipments are handled in specialized climate-controlled vehicles equipped with real-time GPS tracking and live temperature sensors. You can view your tracking code on the Orders & Tracking tab.'
    },
    {
      q: 'What happens when a listed pet stock is sold out?',
      a: 'When a buyer completes the purchase of a pet, stock decrements automatically. If stock reaches zero, the product automatically converts to "Sold Out" and is unlisted from the buyer marketplace.'
    },
    {
      q: 'How do sellers configure their UPI and NetBanking payout settings?',
      a: 'Sellers can navigate to the Seller Portal, click on "Payment Payouts", and input their UPI ID or Bank account details for automated payouts upon order completion.'
    },
    {
      q: 'How do direct veterinarian consultation meetings work?',
      a: 'Buyers can browse verified veterinarians under the Veterinarians tab, view their experience and consultation fees, and pick a date & time slot to schedule a direct consultation meeting.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 font-display">Customer Support & Assistance</h1>
        <p className="text-slate-500 text-sm mt-1">
          Have a question about your order, pet care, or seller payouts? We are here 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: FAQ Accordion & Contact info */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* FAQ Accordions */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 font-display mb-4 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-orange-500" /> Frequently Asked Questions
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 bg-slate-50/70 hover:bg-slate-100 text-left flex items-center justify-between font-bold text-xs text-slate-800 transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Support Ticket History */}
          {tickets.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 font-display mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-500" /> Your Support Tickets ({tickets.length})
              </h3>
              <div className="space-y-3">
                {tickets.map((tck) => (
                  <div key={tck.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{tck.subject} ({tck.id})</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        tck.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {tck.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{tck.message}</p>
                    {tck.response && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 mt-2">
                        <strong className="text-slate-900 block mb-1">Support Response:</strong>
                        {tck.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Submit Support Ticket Form */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-display">Submit a Support Ticket</h3>
            <p className="text-xs text-slate-500 mt-1">Our support agents reply within 2 hours</p>
          </div>

          {submitMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
              <span>{submitMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. Order Tracking or Payment Question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Describe Your Issue</label>
              <textarea
                rows="4"
                required
                placeholder="Please include order number or specific details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Ticket Request</span>
            </button>
          </form>

          {/* Contact Details */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-orange-500" />
              <span>Helpline: +1 (800) PET-PAWS</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-orange-500" />
              <span>Support Email: support@petpaws.com</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
