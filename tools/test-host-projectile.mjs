// Engineering-only action host. Native collision, events and ownership are checked by NativeProjectileChecks.
export function installProjectileContract(action) {
  let serial = 0;
  action.projectile = (origin, initial, gravity, radius, range, lifetime, impact, complete) => {
    action.releaseTarget();
    const id = `fixture-projectile-${++serial}`;
    let position = origin, velocity = initial, travelled = 0, age = 0;
    function advance(current) {
      const next = position.plus(velocity), hit = current.trace(position, next, radius);
      const receipt = { ...hit, projectile: () => id, entity: () => hit.target()?.ref() || '', source: () => action.actor() };
      if (hit.hitEntity() || hit.blocked()) { impact(current, receipt); complete(current); return; }
      travelled += velocity.length(); position = next; age++;
      if (age >= lifetime || travelled >= range) { complete(current); return; }
      const down = origin.scale(0); down.values[1] = -gravity;
      velocity = velocity.scale(.99).plus(down);
      current.after(1, advance);
    }
    action.after(1, advance);
    return id;
  };
}
