const VALID_VIBE_TYPES = ['chill', 'intense', 'busy'];

function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'lat and lng must be numbers' };
  }
  if (!isFinite(lat) || !isFinite(lng)) {
    return { valid: false, error: 'lat and lng must be finite numbers' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'lat must be between -90 and 90' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'lng must be between -180 and 180' };
  }
  return { valid: true };
}

function validateUserId(userId) {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { valid: false, error: 'userId must be a non-empty string' };
  }
  return { valid: true };
}

function validateVibeType(vibeType) {
  if (!VALID_VIBE_TYPES.includes(vibeType)) {
    return { valid: false, error: `vibeType must be one of: ${VALID_VIBE_TYPES.join(', ')}` };
  }
  return { valid: true };
}

function validateRoomId(roomId) {
  if (typeof roomId !== 'string' || roomId.trim().length === 0) {
    return { valid: false, error: 'roomId must be a non-empty string' };
  }
  return { valid: true };
}

module.exports = {
  VALID_VIBE_TYPES,
  validateCoordinates,
  validateUserId,
  validateVibeType,
  validateRoomId,
};
