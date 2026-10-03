export type CheckoutForm = { name: string; email: string; postcode: string };
export type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

export const isEmail = (value: string): boolean => /^\S+@\S+$/.test(value);

export const isPostcode = (value: string): boolean => /^\d{5}$/.test(value);

export function validateCheckout(form: CheckoutForm): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim() === '') errors.name = 'Enter your name';
  if (!isEmail(form.email)) errors.email = 'Enter a valid email address';
  if (!isPostcode(form.postcode)) errors.postcode = 'Enter a 5-digit postcode';
  return errors;
}
