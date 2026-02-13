const {
  VALID_VIBE_TYPES,
  validateCoordinates,
  validateUserId,
  validateVibeType,
  validateRoomId,
} = require('../validation');

describe('validateCoordinates', () => {
  test('accepts valid coordinates', () => {
    expect(validateCoordinates(40.75, -73.98)).toEqual({ valid: true });
    expect(validateCoordinates(0, 0)).toEqual({ valid: true });
    expect(validateCoordinates(-90, -180)).toEqual({ valid: true });
    expect(validateCoordinates(90, 180)).toEqual({ valid: true });
  });

  test('rejects non-number lat', () => {
    const result = validateCoordinates('40', -73);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/numbers/);
  });

  test('rejects non-number lng', () => {
    const result = validateCoordinates(40, null);
    expect(result.valid).toBe(false);
  });

  test('rejects NaN', () => {
    expect(validateCoordinates(NaN, 0).valid).toBe(false);
    expect(validateCoordinates(0, NaN).valid).toBe(false);
  });

  test('rejects Infinity', () => {
    expect(validateCoordinates(Infinity, 0).valid).toBe(false);
    expect(validateCoordinates(0, -Infinity).valid).toBe(false);
  });

  test('rejects lat out of range', () => {
    expect(validateCoordinates(91, 0).valid).toBe(false);
    expect(validateCoordinates(-91, 0).valid).toBe(false);
  });

  test('rejects lng out of range', () => {
    expect(validateCoordinates(0, 181).valid).toBe(false);
    expect(validateCoordinates(0, -181).valid).toBe(false);
  });
});

describe('validateUserId', () => {
  test('accepts valid user IDs', () => {
    expect(validateUserId('user-123')).toEqual({ valid: true });
    expect(validateUserId('a')).toEqual({ valid: true });
  });

  test('rejects empty string', () => {
    expect(validateUserId('').valid).toBe(false);
  });

  test('rejects whitespace-only string', () => {
    expect(validateUserId('   ').valid).toBe(false);
  });

  test('rejects non-string types', () => {
    expect(validateUserId(123).valid).toBe(false);
    expect(validateUserId(null).valid).toBe(false);
    expect(validateUserId(undefined).valid).toBe(false);
  });
});

describe('validateVibeType', () => {
  test('accepts all valid vibe types', () => {
    for (const vibe of VALID_VIBE_TYPES) {
      expect(validateVibeType(vibe)).toEqual({ valid: true });
    }
  });

  test('rejects unknown vibe types', () => {
    expect(validateVibeType('loud').valid).toBe(false);
    expect(validateVibeType('').valid).toBe(false);
  });

  test('rejects non-string types', () => {
    expect(validateVibeType(42).valid).toBe(false);
    expect(validateVibeType(null).valid).toBe(false);
  });
});

describe('validateRoomId', () => {
  test('accepts valid room IDs', () => {
    expect(validateRoomId('room-abc')).toEqual({ valid: true });
  });

  test('rejects empty string', () => {
    expect(validateRoomId('').valid).toBe(false);
  });

  test('rejects non-string types', () => {
    expect(validateRoomId(123).valid).toBe(false);
    expect(validateRoomId(undefined).valid).toBe(false);
  });
});
