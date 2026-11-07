/**
 * Indian Rupee (INR) formatting utility matching the deterministic backend domain rules.
 */
export function formatINR(
  paise: number,
  options: { showPaise?: boolean; includeSymbol?: boolean } = {}
): string {
  const { showPaise = true, includeSymbol = true } = options;

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));

  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = absPaise % 100;

  const s = rupeesPart.toString();
  let formattedRupees: string;

  if (s.length <= 3) {
    formattedRupees = s;
  } else {
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const groups: string[] = [];

    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length > 0) {
      groups.unshift(rest);
    }
    formattedRupees = groups.join(",") + "," + last3;
  }

  const result = showPaise
    ? `${formattedRupees}.${paisePart.toString().padStart(2, "0")}`
    : formattedRupees;

  let prefix = "";
  if (isNegative) {
    prefix = "-";
  }
  if (includeSymbol) {
    prefix += "₹";
  }

  return prefix + result;
}

export function paiseToRupees(paise: number): number {
  return Number((paise / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
