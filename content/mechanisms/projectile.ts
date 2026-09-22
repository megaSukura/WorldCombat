namespace Projectiles {
    /** Caller commits the action and supplies its payload; physics belongs to the native entity. */
    export function launch(action: CombatAction, speed: number, range: number, radius: number,
                           hit: (action: CombatAction, impact: CombatImpact) => void, direction?: CombatPoint,
                           appearance?: { item?: string; sprite?: string; scale?: number; tint?: number; glow?: boolean }): void {
        var origin = action.origin(), delta = action.targetPosition().minus(origin);
        var velocity = (direction || (delta.length() < .01 ? action.direction() : delta.unit())).scale(speed);
        action.projectile(origin, velocity, 0, radius, range, 200,
            function (current, impact) { if (impact.hitEntity()) hit(current, impact); },
            function (current) { current.finish(); }, JSON.stringify(appearance || {}));
    }
}
