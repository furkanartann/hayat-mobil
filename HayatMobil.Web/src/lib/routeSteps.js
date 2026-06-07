export function formatStepDistance(meters) {
  if (meters == null || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatNavStepLine(step, t = (tr) => tr) {
  if (!step?.instruction) return '';
  const dist = formatStepDistance(step.distanceMeters);
  const street = step.streetName ? ` · ${step.streetName}` : '';
  if (dist && step.distanceMeters > 25) {
    return `${dist} ${t('sonra', 'then')} ${step.instruction}${street}`;
  }
  return `${step.instruction}${street}`;
}

export function pickNavSteps(steps, limit = 3) {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  return steps.slice(0, limit);
}

/** OSRM manevra veya Türkçe talimat metninden Google Maps tarzı ikon anahtarı. */
export function resolveNavStepIcon(step) {
  const type = step?.maneuverType;
  const mod = step?.maneuverModifier;

  if (type === 'depart') return 'depart';
  if (type === 'arrive') return 'arrive';
  if (type === 'roundabout' || type === 'rotary') return 'roundabout';
  if (type === 'merge') return 'merge';
  if (type === 'fork') {
    if (mod === 'left') return 'fork-left';
    if (mod === 'right') return 'fork-right';
    return 'straight';
  }
  if (type === 'turn' || type === 'end of road' || type === 'continue' || type === 'new name') {
    switch (mod) {
      case 'right':
        return 'turn-right';
      case 'slight right':
        return 'slight-right';
      case 'sharp right':
        return 'sharp-right';
      case 'left':
        return 'turn-left';
      case 'slight left':
        return 'slight-left';
      case 'sharp left':
        return 'sharp-left';
      case 'uturn':
        return 'uturn';
      case 'straight':
        return 'straight';
      default:
        return type === 'new name' ? 'straight' : 'straight';
    }
  }

  const ins = (step?.instruction || '').toLowerCase();
  if (ins.includes('keskin sağa')) return 'sharp-right';
  if (ins.includes('sağa dön')) return 'turn-right';
  if (ins.includes('hafif sağa')) return 'slight-right';
  if (ins.includes('keskin sola')) return 'sharp-left';
  if (ins.includes('sola dön')) return 'turn-left';
  if (ins.includes('hafif sola')) return 'slight-left';
  if (ins.includes('çatalda sağa')) return 'fork-right';
  if (ins.includes('çatalda sola')) return 'fork-left';
  if (ins.includes('dönel kavşak')) return 'roundabout';
  if (ins.includes('birleş')) return 'merge';
  if (ins.includes('yola çık') || ins.includes('hedefe doğru')) return 'depart';
  if (ins.includes('düz') || ins.includes('devam et')) return 'straight';

  return 'straight';
}
