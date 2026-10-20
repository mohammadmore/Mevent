import React, { useState } from 'react';
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import TimePicker from "react-multi-date-picker/plugins/time_picker";

export function Test() {
  const [val, setVal] = useState("");
  return <DatePicker calendar={persian} locale={persian_fa} plugins={[<TimePicker />]} />;
}
