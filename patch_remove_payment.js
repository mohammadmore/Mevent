import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `        {paymentEvent && (
          <PaymentModal
            title={paymentEvent.title}
            amount={paymentEvent.cost}
            onClose={() => setPaymentEvent(null)}
            onConfirm={executePayment}
          />
        )}`;

content = content.replace(target, '');
fs.writeFileSync('src/App.tsx', content);
