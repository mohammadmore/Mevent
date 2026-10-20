import fs from 'fs';

let css = fs.readFileSync('src/index.css', 'utf8');

const themeOverrides = `
@layer base {
  :root {
    --color-white: #FFEAD1;
    --color-gray-50: #FFEAD1;
    --color-gray-100: #DCE4B8;
    --color-gray-200: #DCE4B8;
    --color-gray-300: #515739;
    --color-gray-400: #515739;
    --color-gray-500: #515739;
    --color-gray-600: #515739;
    --color-gray-700: #515739;
    --color-gray-800: #515739;
    --color-gray-900: #515739;
    
    --color-teal-50: #DCE4B8;
    --color-teal-100: #DCE4B8;
    --color-teal-500: #FD6F2F;
    --color-teal-600: #FD6F2F;
    --color-teal-700: #FD6F2F;
    --color-teal-800: #FD6F2F;
    --color-teal-900: #FD6F2F;

    --color-blue-50: #DCE4B8;
    --color-blue-100: #DCE4B8;
    --color-blue-500: #FD6F2F;
    --color-blue-600: #FD6F2F;
    --color-blue-900: #FD6F2F;
    
    --color-red-50: #FFEAD1;
    --color-red-100: #DCE4B8;
    --color-red-500: #FD6F2F;
    --color-red-600: #FD6F2F;
  }

  .dark {
    --color-white: #ffffff;
    --color-gray-50: #f9fafb;
    --color-gray-100: #f3f4f6;
    --color-gray-200: #e5e7eb;
    --color-gray-300: #d1d5db;
    --color-gray-400: #9ca3af;
    --color-gray-500: #6b7280;
    --color-gray-600: #4b5563;
    --color-gray-700: #374151;
    --color-gray-800: #1f2937;
    --color-gray-900: #111827;
    
    --color-teal-50: #f0fdfa;
    --color-teal-100: #ccfbf1;
    --color-teal-500: #14b8a6;
    --color-teal-600: #0d9488;
    --color-teal-700: #0f766e;
    --color-teal-800: #115e59;
    --color-teal-900: #134e4a;
    
    --color-blue-50: #eff6ff;
    --color-blue-100: #dbeafe;
    --color-blue-500: #3b82f6;
    --color-blue-600: #2563eb;
    --color-blue-900: #1e3a8a;

    --color-red-50: #fef2f2;
    --color-red-100: #fee2e2;
    --color-red-500: #ef4444;
    --color-red-600: #dc2626;
  }
}
`;

fs.writeFileSync('src/index.css', css + themeOverrides);
