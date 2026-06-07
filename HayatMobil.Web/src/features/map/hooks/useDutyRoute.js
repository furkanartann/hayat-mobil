import { useMemo } from 'react';
import { resolveDutyTarget } from '../../../lib/dutyTargets.js';
import { useRouteEta } from './useRouteEta.js';

export function useDutyRoute({ myActiveDuty, userLocation, user, units, sensors, missingPersons }) {
  const target = useMemo(
    () => resolveDutyTarget(myActiveDuty, { units, sensors, missingPersons }),
    [myActiveDuty, units, sensors, missingPersons]
  );

  const { data, loading } = useRouteEta({
    from: userLocation,
    to: target,
    userType: user?.userType,
    enabled: !!myActiveDuty && !!target && userLocation?.lat != null,
  });

  return { target, eta: data, loading };
}
