import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldInitBuy = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    // Redirect to the official ticket site (crawler or UGC, we redirect as requested)
    const targetUrl = event.ticketUrl || (event.source === 'CRAWLER' ? 'https://calendar.iranfair.com/fa' : 'https://iranfair.com');
    window.open(targetUrl, '_blank');
  };`;

const newInitBuy = `  const initiateBuyTicket = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    if (!dbUserId) return;
    
    if (event.cost === 0) {
      handleInteraction(event.id, 'RSVP');
      return;
    }
    
    setPaymentEvent(event);
  };`;
content = content.replace(oldInitBuy, newInitBuy);

const oldPaymentExec = `  const executePayment = async () => {
    if (!dbUserId || !paymentEvent) return;
    setBuyingTicketId(paymentEvent.id);
    
    try {
      const res = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dbUserId,
          eventId: paymentEvent.id,
          amount: paymentEvent.cost
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        handleInteraction(paymentEvent.id, 'RSVP');
        setPaymentEvent(null); // Close modal
      } else {
        showToast('خطا در خرید بلیت');
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در ارتباط با سرور');
    } finally {
      setBuyingTicketId(null);
    }
  };`;
  
const newPaymentExec = `  const [buyForFriend, setBuyForFriend] = useState(false);
  const executePayment = async () => {
    if (!dbUserId || !paymentEvent) return;
    setBuyingTicketId(paymentEvent.id);
    
    // Viral feature: 10% discount on second ticket if buying for a friend
    const totalAmount = buyForFriend ? (paymentEvent.cost * 1.9) : paymentEvent.cost;
    
    try {
      const res = await fetch('/api/tickets/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: dbUserId,
          eventId: paymentEvent.id,
          amount: totalAmount,
          plusOne: buyForFriend
        })
      });
      const data = await res.json();
      if (res.ok) {
        addToast(buyForFriend ? 'بلیت شما و دوستتان با موفقیت خریداری شد!' : 'خرید بلیت با موفقیت انجام شد', 'success');
        
        // Add 20 points for buying a ticket for a friend (Gamification)
        if (buyForFriend) {
          await fetch(\`/api/users/\${user?.uid}/points\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 20, reason: 'buy_for_friend' })
          });
          addToast('۲۰ امتیاز جایزه برای دعوت دوست دریافت کردید!', 'info');
        }
        
        handleInteraction(paymentEvent.id, 'RSVP');
        setPaymentEvent(null); 
        setBuyForFriend(false);
      } else {
        addToast('خطا در خرید بلیت', 'error');
      }
    } catch (err) {
      console.error(err);
      addToast('خطا در ارتباط با سرور', 'error');
    } finally {
      setBuyingTicketId(null);
    }
  };`;
content = content.replace(oldPaymentExec, newPaymentExec);

const oldRender = `        {/* Toast Notification */}`;
const newRender = `        {/* Payment Modal */}
        {paymentEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex flex-col justify-end md:items-center md:justify-center">
            <div className="bg-white w-full md:w-[400px] rounded-t-3xl md:rounded-3xl p-6 animate-in slide-in-from-bottom-10 md:zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">خرید بلیت</h3>
                <button onClick={() => setPaymentEvent(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                <h4 className="font-bold text-gray-900 mb-2 truncate">{paymentEvent.title}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">قیمت بلیت:</span>
                  <span className="font-bold text-indigo-700">{(paymentEvent.cost / 1000).toLocaleString()} هزار تومان</span>
                </div>
              </div>
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
                <label className="flex flex-col gap-3 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      خرید برای دوست (+۱)
                    </span>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500" 
                      checked={buyForFriend}
                      onChange={(e) => setBuyForFriend(e.target.checked)}
                    />
                  </div>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    با خرید بلیت برای دوستتان، ۱۰٪ روی بلیت دوم تخفیف بگیرید و ۲۰ امتیاز میونت جایزه بگیرید! این یک راه عالی برای شرکت گروهی در رویدادهاست.
                  </p>
                </label>
              </div>
              
              <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-gray-600 font-medium">مبلغ کل قابل پرداخت:</span>
                <span className="text-2xl font-black text-gray-900">
                  {buyForFriend 
                    ? ((paymentEvent.cost * 1.9) / 1000).toLocaleString() 
                    : (paymentEvent.cost / 1000).toLocaleString()
                  } <span className="text-sm font-normal text-gray-500">هزار تومان</span>
                </span>
              </div>
              
              <button 
                onClick={executePayment}
                disabled={buyingTicketId === paymentEvent.id}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {buyingTicketId === paymentEvent.id ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    در حال اتصال به درگاه...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    پرداخت آنلاین
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Toast Notification */}`;
content = content.replace(oldRender, newRender);

fs.writeFileSync('src/App.tsx', content);
