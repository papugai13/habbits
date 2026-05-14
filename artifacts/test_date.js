const toLocalDateString = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return dateInput;
  // en-CA is YYYY-MM-DD
  return d.toLocaleDateString('en-CA');
};

console.log("2026-05-11 ->", toLocalDateString('2026-05-11'));
console.log("new Date('2026-05-11') ->", toLocalDateString(new Date('2026-05-11')));
console.log("new Date() ->", toLocalDateString(new Date()));
