import { describe, expect, it } from 'vitest';
import { DEFAULT_CHARACTER_MAPPING, normalizeToGSM7Bit } from './sms';

describe('GSM 7-bit text normalization', () => {
  describe(normalizeToGSM7Bit, () => {
    it('should keep valid GSM 7-bit characters unchanged', () => {
      const result = normalizeToGSM7Bit('Hello World!');

      expect(result).toBe('Hello World!');
    });

    it('should keep GSM special characters unchanged but map accents by default', () => {
      const result = normalizeToGSM7Bit('@£$¥èéùì');

      expect(result).toBe('@£$¥èeùì');
    });

    it('should transform extended GSM characters according to mapping', () => {
      const result = normalizeToGSM7Bit('{}[]\\^~|€');

      expect(result).toBe('()()- e');
    });

    it('should replace invalid characters with default replacement', () => {
      const result = normalizeToGSM7Bit('Hello 😀 World');

      expect(result).toBe('Hello  World');
    });

    it('should use custom replacement character', () => {
      const result = normalizeToGSM7Bit('Hello 😀 World', DEFAULT_CHARACTER_MAPPING, '*');

      expect(result).toBe('Hello * World');
    });

    it('should work with custom character mapping', () => {
      const characterMapping = { '😀': '☺' };
      const result = normalizeToGSM7Bit('Hello 😀', characterMapping);

      expect(result).toBe('Hello ☺');
    });

    it('should map multiple characters with custom mapping', () => {
      const characterMapping = {
        '😀': '☺',
        '👋': 'H',
        '🌍': 'W'
      };
      const result = normalizeToGSM7Bit('👋 😀 🌍', characterMapping);

      expect(result).toBe('H ☺ W');
    });

    it('should work with single character', () => {
      const result = normalizeToGSM7Bit('a');

      expect(result).toBe('a');
    });

    it('should replace single invalid character', () => {
      const result = normalizeToGSM7Bit('😀');

      expect(result).toBe('');
    });

    it('should handle mixed valid and invalid characters', () => {
      const result = normalizeToGSM7Bit('café😀mañana');

      expect(result).toBe('cafemañana');
    });

    it('should prioritize custom mapping over GSM validity', () => {
      const characterMapping = { a: 'X' };
      const result = normalizeToGSM7Bit('Hello a World', characterMapping);

      expect(result).toBe('Hello X World');
    });

    it('should suppress characters when mapped to null', () => {
      const characterMapping = { '😀': null, '👋': null };
      const result = normalizeToGSM7Bit('Hello 😀👋 World', characterMapping);

      expect(result).toBe('Hello  World');
    });

    it('should suppress unknown characters when replaceUnknownWith is null', () => {
      const result = normalizeToGSM7Bit('Hello 😀 World', { replaceUnknownWith: null });

      expect(result).toBe('Hello  World');
    });

    it('should handle mixed suppress and replace operations', () => {
      const characterMapping = {
        '😀': null, // suppress
        '👋': 'Hi', // replace
        '🌍': null // suppress
      };
      const result = normalizeToGSM7Bit('👋 😀 World 🌍!', characterMapping, '*');

      expect(result).toBe('Hi  World !');
    });

    it('should handle unicode characters correctly with functional approach', () => {
      const characterMapping = { '🎉': 'Party', '🚀': null };
      const result = normalizeToGSM7Bit('🎉 Ready to launch 🚀', characterMapping);

      expect(result).toBe('Party Ready to launch ');
    });

    it('should use default mapping for accented characters', () => {
      const result = normalizeToGSM7Bit('Hola José, ¿cómo estás?');

      expect(result).toBe('Hola Jose, ¿como estas?');
    });

    it('should transform Spanish accented text by default', () => {
      const result = normalizeToGSM7Bit('Niño con años de experiencia en programación');

      expect(result).toBe('Niño con años de experiencia en programacion');
    });

    it('should handle mixed languages with default mapping', () => {
      const result = normalizeToGSM7Bit('Café français avec des crêpes');

      expect(result).toBe('Cafe francais avec des crepes');
    });

    it('should handle symbols and currency with default mapping', () => {
      const result = normalizeToGSM7Bit('Price: 100€ or £50 (50% discount)');

      expect(result).toBe('Price: 100e or £50 (50% discount)');
    });

    it('should handle fractions and special characters', () => {
      const result = normalizeToGSM7Bit('Recipe: 1½ cups, temperature 350°F');

      expect(result).toBe('Recipe: 11/2 cups, temperature 350oF');
    });

    it('should allow custom mapping to override default', () => {
      const result = normalizeToGSM7Bit('José tiene años', { é: 'E', ñ: 'NY' });

      expect(result).toBe('JosE tiene aNYos');
    });

    it('should handle complex text with all default transformations', () => {
      const result = normalizeToGSM7Bit(
        '!Bienvenidos al café "La Señorita"! Menú: crêpes €15, café ½ precio'
      );

      expect(result).toBe('!Bienvenidos al cafe "La Señorita"! Menu: crepes e15, cafe 1/2 precio');
    });
  });

  describe('DEFAULT_CHARACTER_MAPPING', () => {
    it('should contain mappings for common Spanish accents', () => {
      expect(DEFAULT_CHARACTER_MAPPING['á']).toBe('a');
      expect(DEFAULT_CHARACTER_MAPPING['é']).toBe('e');
      expect(DEFAULT_CHARACTER_MAPPING['í']).toBe('i');
      expect(DEFAULT_CHARACTER_MAPPING['ó']).toBe('o');
      expect(DEFAULT_CHARACTER_MAPPING['ú']).toBe('u');
    });

    it('should contain mappings for uppercase accents', () => {
      expect(DEFAULT_CHARACTER_MAPPING['Á']).toBe('A');
      expect(DEFAULT_CHARACTER_MAPPING['É']).toBe('E');
    });

    it('should contain currency and symbol mappings', () => {
      expect(DEFAULT_CHARACTER_MAPPING['€']).toBe('e');
      expect(DEFAULT_CHARACTER_MAPPING['£']).toBeUndefined(); // £ is valid GSM character
      expect(DEFAULT_CHARACTER_MAPPING['°']).toBe('o');
    });

    it('should work seamlessly with normalizeToGSM7Bit', () => {
      const text = 'Testing áéíóú and ñ with €';
      const result = normalizeToGSM7Bit(text);

      expect(result).toBe('Testing aeiou and ñ with e');
    });
  });
});
