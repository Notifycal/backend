export interface CharacterMapping {
  [inputChar: string]: string | null;
}

export const GSM_7BIT_VALID_CHARACTERS =
  '@£$¥èéùìòÇ\nØø\rÅå' +
  'Δ_ΦΓΛΩΠΨΣΘΞÆæßÉ' +
  ' !"#¤%&\'()*+,-./' +
  '0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNO' +
  'PQRSTUVWXYZÄÖÑÜ§' +
  '¿abcdefghijklmno' +
  'pqrstuvwxyzäöñüà';

export const GSM_7BIT_EXTENDED_CHARACTERS = '\f^{}\\[~]|€';

export const DEFAULT_CHARACTER_MAPPING: CharacterMapping = {
  á: 'a',
  Á: 'A',
  é: 'e',
  É: 'E',
  í: 'i',
  Í: 'I',
  ó: 'o',
  Ó: 'O',
  ú: 'u',
  Ú: 'U',

  â: 'a',
  Â: 'A',
  ã: 'a',
  Ã: 'A',

  ê: 'e',
  Ê: 'E',
  ë: 'e',
  Ë: 'E',

  î: 'i',
  Î: 'I',
  ï: 'i',
  Ï: 'I',

  ô: 'o',
  Ô: 'O',
  õ: 'o',
  Õ: 'O',

  û: 'u',
  Û: 'U',

  ç: 'c',

  ý: 'y',
  Ý: 'Y',
  ÿ: 'y',
  Ÿ: 'Y',

  œ: 'oe',
  Œ: 'OE',

  '¢': 'c',
  '©': '(c)',
  '®': '(R)',
  '™': '(TM)',
  '°': 'deg',

  '–': '-',
  '—': '-',
  '…': '...',

  '×': 'x',
  '÷': '/',
  '±': '+/-',

  '½': '1/2',
  '¼': '1/4',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',

  '¹': '1',
  '²': '2',
  '³': '3',

  '¿': '?',
  '¡': '!'
};

const isValidGSM7BitCharacter = (char: string): boolean =>
  GSM_7BIT_VALID_CHARACTERS.includes(char) || GSM_7BIT_EXTENDED_CHARACTERS.includes(char);

const processCharacter = (
  char: string,
  characterMapping: CharacterMapping,
  replaceUnknownWith: string | null
): string => {
  if (char in characterMapping) {
    const mappedValue = characterMapping[char];
    return mappedValue === null ? '' : mappedValue;
  }

  if (isValidGSM7BitCharacter(char)) {
    return char;
  }

  return replaceUnknownWith === null ? '' : replaceUnknownWith;
};

export function normalizeToGSM7Bit(
  input: string,
  characterMapping: CharacterMapping = DEFAULT_CHARACTER_MAPPING,
  replaceUnknownWith = ''
): string {
  return Array.from(input)
    .map((char) => processCharacter(char, characterMapping, replaceUnknownWith))
    .join('');
}
