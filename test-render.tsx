import React from 'react';
import { renderToString } from 'react-dom/server';
import EventForm from './src/components/EventForm.tsx';
console.log(renderToString(<EventForm onSuccess={() => {}} />));
