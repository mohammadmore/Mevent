// Checksums of Iranian identifiers. Shared by the server (validation) and the client (instant feedback).

const latin = (s: string) => String(s ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[\s-]/g, '');

/** 10-digit personal national code (کد ملی). */
export function isValidNationalId(input: string): boolean {
  const id = latin(input);
  if (!/^\d{10}$/.test(id) || /^(\d)\1{9}$/.test(id)) return false;
  const check = Number(id[9]);
  const sum = [...id.slice(0, 9)].reduce((acc, d, i) => acc + Number(d) * (10 - i), 0) % 11;
  return sum < 2 ? check === sum : check === 11 - sum;
}

/** 11-digit legal entity national id (شناسه ملی شرکت). */
export function isValidCompanyId(input: string): boolean {
  const id = latin(input);
  if (!/^\d{11}$/.test(id) || /^(\d)\1{10}$/.test(id)) return false;
  const coef = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17];
  const dec = Number(id[9]) + 2;
  let r = [...id.slice(0, 10)].reduce((acc, d, i) => acc + (Number(d) + dec) * coef[i], 0) % 11;
  if (r === 10) r = 0;
  return r === Number(id[10]);
}

/** Sheba (IR + 24 digits), ISO 13616 mod-97 check. */
export function isValidSheba(input: string): boolean {
  const iban = latin(input).toUpperCase();
  if (!/^IR\d{24}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + '1827' + iban.slice(2, 4); // I=18, R=27
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

export const normalizeDigits = latin;
