function crc16ccitt(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEMV(id, value) {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

export function generatePixCode({ pixKey, name, city, amount }) {
  const cleanKey = pixKey.replace(/\s+/g, '');
  const safeName = name.substring(0, 25);
  const safeCity = city.substring(0, 15);

  const merchantAccountInfo =
    formatEMV('00', 'br.gov.bcb.pix') + formatEMV('01', cleanKey);

  let payload =
    '000201' +
    formatEMV('26', merchantAccountInfo) +
    '52040000' +
    '5303986';

  if (amount > 0) {
    payload += formatEMV('54', amount.toFixed(2));
  }

  payload +=
    '5802BR' +
    formatEMV('59', safeName) +
    formatEMV('60', safeCity) +
    formatEMV('62', formatEMV('05', '***')) +
    '6304';

  return payload + crc16ccitt(payload);
}
