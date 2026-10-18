import React, { useState, useEffect } from 'react';
import { HelpCircle, MessageSquare, Send, CheckCircle2, ChevronDown, ChevronUp, Phone, Mail, Sparkles } from 'lucide-react';
import { apiGet, apiPost } from '../utils/auth';
import PawBackdrop from './PawBackdrop';

/**
 * CustomerSupport Component
 * Features interactive FAQ accordions, contact form, ticket submission,
 * and private ticket status tracking for authenticated users.
 */
export default function CustomerSupport({ currentUser, onRequireAuth, onAddToast }) {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [openFaq, setOpenFaq] = useState(0);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
    } else {
      setTickets([]);
    }
  }, [currentUser]);

  const fetchTickets = async () => {
    if (!currentUser) return;
    try {
      const data = await apiGet('/api/support/tickets');
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
    }
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitMessage('');

    if (!currentUser) {
      onRequireAuth?.('Please sign in to submit a support ticket.', () => {});
      return;
    }

    try {
      const data = await apiPost('/api/support/tickets', {
        subject,
        message,
        priority
      });

      if (data.success) {
        setSubmitMessage(data.message);
        onAddToast?.(data.message || 'Support ticket submitted!', 'success');
        setSubject('');
        setMessage('');
        fetchTickets();
      } else {
        onAddToast?.(data.message || 'Failed to submit support ticket.', 'error');
      }
    } catch (err) {
      setSubmitMessage('Failed to submit support ticket.');
      onAddToast?.('Failed to submit support ticket.', 'error');
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
      {/* Warm Support Hero Header */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#2F3E46] via-[#52796F] to-[#2F3E46] text-white p-8 sm:p-10 mb-8 shadow-xl">
        <PawBackdrop count={6} light />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-extrabold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" /> 24/7 Pet Concierge & Care Desk
            </span>
            <h1 className="text-3xl sm:text-4xl font-black font-display tracking-tight">Customer Support & Assistance</h1>
            <p className="text-white/85 text-sm sm:text-base mt-2 leading-relaxed">
              Have a question about your live pet transport, veterinary wellness check, or seller payouts? Our dedicated concierge team responds within 2 hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-white/70 font-bold">Emergency Vet Line</p>
              <p className="text-base font-black text-[#F4A261]">+1 (800) PET-PAWS</p>
            </div>
            {currentUser && (
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-bold">Your Tickets</p>
                <p className="text-base font-black text-white">
                  {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: FAQ Accordion & Contact info */}
        <div className="lg:col-span-2 space-y-8">
          {/* FAQ Accordions */}
          <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#231F20] font-display mb-4 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2 text-[#E07A5F]" /> Frequently Asked Questions
            </h3>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="border border-[#EFE9DF] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-4 bg-[#FAF6F0] hover:bg-[#F3ECE0] text-left flex items-center justify-between font-bold text-xs text-[#231F20] transition-colors"
                    >
                      <span>{faq.q}</span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-[#8C847C]" /> : <ChevronDown className="w-4 h-4 text-[#8C847C]" />}
                    </button>
                    {isOpen && (
                      <div className="p-4 bg-white text-xs text-[#65605B] leading-relaxed border-t border-[#EFE9DF]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Support Ticket History (Authenticated users only) */}
          {currentUser && tickets.length > 0 && (
            <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#231F20] font-display mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-[#52796F]" /> Your Support Tickets ({tickets.length})
              </h3>
              <div className="space-y-3">
                {tickets.map((tck) => (
                  <div key={tck.id} className="p-4 bg-[#FAF6F0] rounded-2xl border border-[#E6DCCF] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#231F20]">{tck.subject} ({tck.id})</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        tck.status === 'Resolved' ? 'bg-[#EAEFE9] text-[#2A5C4A]' : 'bg-[#FFF8EB] text-[#D97706]'
                      }`}>
                        {tck.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#65605B]">{tck.message}</p>
                    {tck.response && (
                      <div className="p-3 bg-white rounded-xl border border-[#E6DCCF] text-xs text-[#4A4344] mt-2">
                        <strong className="text-[#231F20] block mb-1">Support Response:</strong>
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
        <div className="bg-white rounded-3xl border border-[#EFE9DF] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#231F20] font-display">Submit a Support Ticket</h3>
            <p className="text-xs text-[#65605B] mt-1">Our support agents reply within 2 hours</p>
          </div>

          {submitMessage && (
            <div className="p-3 bg-[#EAEFE9] text-[#2A5C4A] text-xs font-bold rounded-xl flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-[#52796F]" />
              <span>{submitMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4A4344] mb-1">Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. Order Tracking or Payment Question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4344] mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs font-bold"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4A4344] mb-1">Describe Your Issue</label>
              <textarea
                rows="4"
                required
                placeholder="Please include order number or specific details..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#FAF6F0] border border-[#E6DCCF] rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#231F20] hover:bg-[#E07A5F] text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{currentUser ? 'Send Ticket Request' : 'Sign In & Send Ticket'}</span>
            </button>
          </form>

          {/* Contact Details */}
          <div className="pt-4 border-t border-[#EFE9DF] space-y-2 text-xs text-[#65605B]">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-[#E07A5F]" />
              <span>Helpline: +1 (800) PET-PAWS</span>
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#E07A5F]" />
              <span>Support Email: support@petpaws.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
