import fs from 'fs';
let content = fs.readFileSync('src/components/EventForm.tsx', 'utf8');

const targetSubmit = `  const handleSubmit = async (e: FormEvent) => {`;
const replacementSubmit = `  const handleBatchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dbUserId || !excelFile) return;
    setLoading(true);
    setBatchResults(null);
    try {
      const rows = await readXlsxFile(excelFile);
      // Skip header row
      const dataRows = rows.slice(1);
      
      let successCount = 0;
      let failedCount = 0;

      // Header map (example): Title, Description, StartTime, Address, Cost, Lat, Lng
      for (const row of dataRows) {
        try {
          const title = row[0]?.toString();
          const description = row[1]?.toString() || '';
          let startTimeStr = row[2]?.toString();
          
          if (!title || !startTimeStr) {
            failedCount++;
            continue;
          }
          
          // try to make startTime a valid date
          let startTime = new Date(startTimeStr).toISOString();

          const address = row[3]?.toString() || 'مکان نامشخص';
          const cost = parseInt(row[4]?.toString() || '0', 10);
          const lat = parseFloat(row[5]?.toString() || '35.6892');
          const lng = parseFloat(row[6]?.toString() || '51.3890');

          const res = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              startTime,
              cost: isNaN(cost) ? 0 : cost,
              organizerId: dbUserId,
              location: {
                address,
                lat: isNaN(lat) ? 35.6892 : lat,
                lng: isNaN(lng) ? 51.3890 : lng,
              }
            }),
          });
          if (res.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error('Error processing row', row, err);
          failedCount++;
        }
      }
      setBatchResults({ total: dataRows.length, success: successCount, failed: failedCount });
      if (successCount > 0) {
        // Optional: wait a moment then call onSuccess, or let user dismiss
      }
    } catch (err) {
      console.error(err);
      alert('خطا در خواندن فایل اکسل. لطفا فرمت فایل را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {`;

content = content.replace(targetSubmit, replacementSubmit);

const targetRender = `  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
      <h2 className="text-xl font-bold text-gray-900 mb-6">ایجاد رویداد جدید</h2>
      
      <div>`;
const replacementRender = `  return (
    <div className="text-right" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">ایجاد رویداد جدید</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            type="button"
            onClick={() => setImportMode('single')}
            className={\`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors \${importMode === 'single' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}\`}
          >
            تکی
          </button>
          <button 
            type="button"
            onClick={() => setImportMode('batch')}
            className={\`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors \${importMode === 'batch' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}\`}
          >
            ورود گروهی (اکسل)
          </button>
        </div>
      </div>

      {importMode === 'batch' ? (
        <form onSubmit={handleBatchSubmit} className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start relative">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900 mb-1">راهنمای فایل اکسل</h4>
              <p className="text-sm text-blue-800 mb-2 leading-relaxed">
                فایل اکسل شما باید دارای ستون‌های زیر به ترتیب از چپ به راست باشد (ردیف اول به عنوان هدر نادیده گرفته می‌شود):
              </p>
              <ul className="text-xs text-blue-700 list-disc list-inside space-y-1 mb-3">
                <li>ستون A: <strong>عنوان رویداد</strong> (الزامی)</li>
                <li>ستون B: <strong>توضیحات</strong></li>
                <li>ستون C: <strong>زمان برگزاری</strong> (فرمت: 2024-12-01T15:00) (الزامی)</li>
                <li>ستون D: <strong>آدرس مکان</strong></li>
                <li>ستون E: <strong>هزینه (تومان)</strong> (عدد)</li>
                <li>ستون F: <strong>عرض جغرافیایی (Lat)</strong> (اختیاری)</li>
                <li>ستون G: <strong>طول جغرافیایی (Lng)</strong> (اختیاری)</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">فایل اکسل خود را انتخاب کنید</label>
            <div 
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => excelInputRef.current?.click()}
            >
              {excelFile ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-green-500 mb-3" />
                  <div className="text-sm text-gray-900 font-bold mb-1">{excelFile.name}</div>
                  <div className="text-xs text-gray-500">{(excelFile.size / 1024).toFixed(1)} KB</div>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400 mb-3" />
                  <span className="text-sm font-bold text-gray-700 mb-1">برای انتخاب فایل اکسل کلیک کنید</span>
                  <span className="text-xs text-gray-500 leading-relaxed">فقط فایل‌های .xlsx پشتیبانی می‌شوند</span>
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                ref={excelInputRef}
                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setExcelFile(e.target.files[0]);
                    setBatchResults(null);
                  }
                }}
              />
            </div>
          </div>

          {batchResults && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
              <h4 className="font-bold text-gray-900 mb-2">نتیجه ورود گروهی:</h4>
              <div className="flex gap-4">
                <span className="text-gray-600">تعداد کل: <strong>{batchResults.total}</strong></span>
                <span className="text-green-600">موفق: <strong>{batchResults.success}</strong></span>
                <span className="text-red-600">ناموفق: <strong>{batchResults.failed}</strong></span>
              </div>
              {batchResults.success > 0 && (
                <button 
                  type="button"
                  onClick={onSuccess}
                  className="mt-4 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-200 transition-colors"
                >
                  بازگشت به لیست رویدادها
                </button>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading || !excelFile}
              className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-70 flex justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال پردازش فایل اکسل...
                </span>
              ) : 'شروع ورود گروهی'}
            </button>
          </div>
        </form>
      ) : (
    <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
      <div>`;
      
content = content.replace(targetRender, replacementRender);

const targetClose = `    </form>
  );
}`;
const replacementClose = `    </form>
      )}
    </div>
  );
}`;

content = content.replace(targetClose, replacementClose);

fs.writeFileSync('src/components/EventForm.tsx', content);
