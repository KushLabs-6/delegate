import React, { useState, useEffect, useRef } from 'react';

import api from '../services/api';
import { CreditCard, DollarSign } from 'lucide-react';

const PAYPAL_CLIENT_ID = 'AVjr2JPRZ92AHZmX9KQtvOJLA-fWA-aPwNOy0zB-cy1nOVFW9zHQQESjAcJMSWG-YtX49oM_n6jpI4AN'; // Hardcoded for now based on Help me app

const Subscription: React.FC = () => {

  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [sdkReady, setSdkReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [paymentType, setPaymentType] = useState<'premium' | 'donation'>('premium');
  const [donationAmount, setDonationAmount] = useState('10.00');

  const paymentTypeRef = useRef(paymentType);
  const donationAmountRef = useRef(donationAmount);

  useEffect(() => {
    paymentTypeRef.current = paymentType;
  }, [paymentType]);

  useEffect(() => {
    donationAmountRef.current = donationAmount;
  }, [donationAmount]);

  const paypalButtonRef = useRef<boolean | null>(null);
  const cardFieldsRef = useRef<any>(null);

  useEffect(() => {
    // Load PayPal SDK
    const scriptId = 'paypal-sdk-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=card-fields,buttons&currency=USD`;
      script.async = true;
      script.onload = () => setSdkReady(true);
      script.onerror = () => setErrorMsg('Failed to load PayPal SDK');
      document.body.appendChild(script);
    } else if ((window as any).paypal) {
      setSdkReady(true);
    }

    return () => {
      // Don't remove script on unmount as it might be used elsewhere or cached
    };
  }, []);

  useEffect(() => {
    if (sdkReady && method === 'paypal' && !success && (window as any).paypal?.Buttons) {
      if (paypalButtonRef.current) return;
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
        (window as any).paypal.Buttons({
          createOrder: async () => {
            setErrorMsg('');
            try {
              const amount = paymentTypeRef.current === 'premium' ? '20.00' : donationAmountRef.current;
              const res = await api.post('/paypal/create-order', { 
                planId: paymentTypeRef.current === 'premium' ? 'monthly' : 'donation',
                amount
              });
              return res.data.id;
            } catch (err: any) {
              setErrorMsg('Failed to create order');
              throw err;
            }
          },
          onApprove: async (data: any) => {
            setProcessing(true);
            try {
              const res = await api.post(`/paypal/capture-order/${data.orderID}`);
              if (res.data.success) {
                setSuccess(true);
              } else {
                setErrorMsg('Payment failed to capture');
              }
            } catch (err: any) {
              setErrorMsg('Payment capture error');
            } finally {
              setProcessing(false);
            }
          },
          onError: () => {
            setErrorMsg('PayPal encountered an error. Please try again.');
          }
        }).render('#paypal-button-container').then(() => {
          paypalButtonRef.current = true;
        });
      }
    } else {
      paypalButtonRef.current = null;
    }
  }, [sdkReady, method, success]);

  useEffect(() => {
    if (sdkReady && method === 'card' && !success && (window as any).paypal?.CardFields) {
      if (cardFieldsRef.current) return;
      
      const cardFields = (window as any).paypal.CardFields({
        style: {
          input: {
            'color': '#ffffff',
            'font-size': '15px',
            'font-family': 'sans-serif',
          }
        },
        createOrder: async () => {
          setErrorMsg('');
          try {
            const amount = paymentTypeRef.current === 'premium' ? '20.00' : donationAmountRef.current;
            const res = await api.post('/paypal/create-order', { 
              planId: paymentTypeRef.current === 'premium' ? 'monthly' : 'donation',
              amount
            });
            return res.data.id;
          } catch (err: any) {
            setErrorMsg('Failed to create order');
            throw err;
          }
        },
        onApprove: async (data: any) => {
          setProcessing(true);
          try {
            const res = await api.post(`/paypal/capture-order/${data.orderID}`);
            if (res.data.success) {
              setSuccess(true);
            } else {
              setErrorMsg('Payment failed to capture');
            }
          } catch (err: any) {
            setErrorMsg('Payment capture error');
          } finally {
            setProcessing(false);
          }
        },
        onError: () => {
          setErrorMsg('Card processing error');
        }
      });
      
      if (cardFields.isEligible()) {
        try {
          const numberField = cardFields.NumberField();
          numberField.render('#card-number');
          const expiryField = cardFields.ExpiryField();
          expiryField.render('#card-expiry');
          const cvvField = cardFields.CVVField();
          cvvField.render('#card-cvv');
          cardFieldsRef.current = cardFields;
        } catch (err) {
          console.error("Card Fields render error", err);
        }
      } else {
        setErrorMsg('Advanced card fields not available. Please use the PayPal tab.');
      }
    }
  }, [sdkReady, method, success]);

  const handleCardSubmit = async () => {
    if (!cardFieldsRef.current) return;
    setProcessing(true);
    setErrorMsg('');
    try {
      await cardFieldsRef.current.submit();
    } catch (err: any) {
      setErrorMsg('Submission failed. Check your details.');
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-10">
        <div className="bg-zinc-900 border border-brand/30 rounded-2xl p-10 text-center shadow-2xl">
          <div className="w-20 h-20 bg-brand/10 text-brand rounded-full flex items-center justify-center mx-auto mb-6">
            <DollarSign size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Payment Successful!</h2>
          <p className="text-zinc-400 mb-8">Your account has been upgraded to Premium. Thank you for subscribing!</p>
          <button onClick={() => window.location.href = '/dashboard'} className="bg-brand text-zinc-900 px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto flex gap-8 flex-wrap justify-center mt-10">
      <style>{`
        .paypal-field-container { transition: all 0.2s ease; }
        .paypal-field-container:focus-within { border-color: var(--primary-color) !important; box-shadow: 0 0 0 2px rgba(254,225,0,0.2); }
      `}</style>
      
      {/* Order Summary */}
      <div className="bg-zinc-900 border-t-4 border-brand p-8 rounded-2xl w-full max-w-sm shrink-0">
        <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-bold">Select Option</h3>
        
        <div className="flex bg-zinc-850 p-1 rounded-xl mb-6 border border-zinc-800">
          <button 
            onClick={() => setPaymentType('premium')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${paymentType === 'premium' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Premium
          </button>
          <button 
            onClick={() => setPaymentType('donation')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${paymentType === 'donation' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Support
          </button>
        </div>

        {paymentType === 'premium' ? (
          <>
            <h2 className="text-2xl font-black text-white mb-1">Delegate <span className="text-brand">Premium</span></h2>
            <p className="text-zinc-400 text-sm mb-6">Monthly — Billed every 30 days</p>
            
            <div className="space-y-3 mb-8">
              {['Unlimited Teams', 'Advanced Analytics', 'Priority Support', 'Custom Roles'].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <span className="text-brand font-black">✓</span> {feature}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white mb-1">Support <span className="text-brand">BJA</span></h2>
            <p className="text-zinc-400 text-sm mb-6">Help keep BJA active with a donation of any size.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Contribution Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                  <input 
                    type="number"
                    min="1.00"
                    step="0.01"
                    placeholder="10.00"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="border-t border-zinc-800 pt-5 flex justify-between items-end">
          <span className="text-xl font-black text-white">Total</span>
          <div className="text-right">
            <span className="text-2xl font-black text-brand">
              ${paymentType === 'premium' ? '20.00' : parseFloat(donationAmount || '0').toFixed(2)}
            </span>
            <div className="text-xs text-zinc-500">USD</div>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="bg-zinc-900 border-t-4 border-brand p-8 rounded-2xl w-full max-w-lg shrink-0 shadow-2xl">
        <h3 className="text-xs text-zinc-500 uppercase tracking-widest mb-6 font-bold">Payment Method</h3>
        
        <div className="flex bg-zinc-800/50 p-1 rounded-xl mb-8 border border-zinc-800">
          <button 
            onClick={() => setMethod('card')}
            className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-colors ${method === 'card' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            💳 Debit / Credit Card
          </button>
          <button 
            onClick={() => setMethod('paypal')}
            className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-colors ${method === 'paypal' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            🅿️ PayPal
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-lg mb-6 text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {method === 'card' && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Card Number</label>
              <div id="card-number" className="paypal-field-container h-12 border border-zinc-800 bg-zinc-950 rounded-xl px-4 flex items-center"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Expiry</label>
                <div id="card-expiry" className="paypal-field-container h-12 border border-zinc-800 bg-zinc-950 rounded-xl px-4 flex items-center"></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">CVV</label>
                <div id="card-cvv" className="paypal-field-container h-12 border border-zinc-800 bg-zinc-950 rounded-xl px-4 flex items-center"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-xs text-zinc-500 mt-2 pt-2">
              <div className="flex gap-1.5">
                <span className="px-2 py-1 bg-zinc-800 rounded">VISA</span>
                <span className="px-2 py-1 bg-zinc-800 rounded">MC</span>
                <span className="px-2 py-1 bg-zinc-800 rounded">AMEX</span>
              </div>
              <span className="font-bold flex items-center gap-1"><CreditCard size={12}/> Secured by PayPal</span>
            </div>
            
            {!sdkReady && <div className="text-center text-zinc-500 text-sm py-2">Loading secure fields...</div>}
            
            <button 
              onClick={handleCardSubmit} 
              disabled={processing || !sdkReady}
              className="w-full py-4 mt-4 bg-brand text-zinc-900 font-black text-lg rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : `💳 Pay $${paymentType === 'premium' ? '20.00' : parseFloat(donationAmount || '0').toFixed(2)} Securely`}
            </button>
            <p className="text-center text-xs text-zinc-500 mt-2">No PayPal account needed • Card data never stored on our servers</p>
          </div>
        )}

        {method === 'paypal' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-zinc-300">
              Sign in with your PayPal account. Fast, secure, and protected by PayPal Buyer Protection.
            </div>
            <div id="paypal-button-container" className="min-h-[50px]"></div>
            {!sdkReady && <div className="text-center text-zinc-500 text-sm py-4">Loading PayPal...</div>}
            {processing && <div className="text-center text-brand font-bold py-2">Confirming payment...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
