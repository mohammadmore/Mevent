import fs from 'fs';

let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const importOld = `import LocationPicker from './LocationPicker';`;
const importNew = `import LocationPicker from './LocationPicker';
import { useToast, ToastContainer } from './Toast';`;
content = content.replace(importOld, importNew);

const stateOld = `export default function EventForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const { dbUserId } = useAuth();`;
const stateNew = `export default function EventForm({ onSuccess, initialData }: { onSuccess: () => void, initialData?: any }) {
  const { dbUserId } = useAuth();
  const { toasts, addToast, removeToast } = useToast();`;
content = content.replace(stateOld, stateNew);

const singleSubmitSuccessOld = `      if (res.ok) {
        onSuccess();
      }`;
const singleSubmitSuccessNew = `      if (res.ok) {
        addToast(initialData ? 'رویداد با موفقیت ویرایش شد' : 'رویداد با موفقیت ایجاد شد', 'success');
        setTimeout(() => onSuccess(), 1000);
      } else {
        addToast('خطا در ثبت رویداد', 'error');
      }`;
content = content.replace(singleSubmitSuccessOld, singleSubmitSuccessNew);

const batchSubmitSuccessOld = `        setBatchResults({
          total: dataRows.length,
          success: successCount,
          failed: failedCount
        });`;
const batchSubmitSuccessNew = `        setBatchResults({
          total: dataRows.length,
          success: successCount,
          failed: failedCount
        });
        addToast(\`\${successCount} رویداد با موفقیت وارد شد\`, 'success');
        if (successCount > 0) {
          setTimeout(() => onSuccess(), 2000);
        }`;
content = content.replace(batchSubmitSuccessOld, batchSubmitSuccessNew);

const renderOld = `return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto w-full">`;
const renderNew = `return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl mx-auto w-full relative">
      <ToastContainer toasts={toasts} removeToast={removeToast} />`;
content = content.replace(renderOld, renderNew);


fs.writeFileSync('src/components/EventForm.tsx', content);
