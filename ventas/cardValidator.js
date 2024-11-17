exports.validateCard = (cardNumber) => {
  const cleaned = ('' + cardNumber).replace(/\D/g, '');

  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  // Validar longitud para Visa y MasterCard
  const visaMasterCardRegex = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})$/;
  if (!visaMasterCardRegex.test(cleaned)) {
    return false;
  }

  // Implementar el algoritmo de Luhn
  let sum = 0;
  let shouldDouble = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i));

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};
