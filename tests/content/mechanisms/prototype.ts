namespace PrototypeMechanisms {
    export function ward(action: CombatAction): void {
        var navigation: WorldAI.Memory = {};
        function approach(next: CombatAction): void {
            next.stage("approaching");
            var result = WorldAI.approach(next, 3, navigation);
            if (result === "moving") { next.after(4, approach); return; }
            if (result !== "arrived") { next.reject(result); return; }
            next.commit(140);
            ManagedEffects.shield(next, 0.5, 80);
            var remaining = 80;
            function sustain(current: CombatAction): void {
                var movement = WorldAI.approach(current, 3, navigation);
                current.stage(movement === "arrived" ? "maintaining" : "approaching");
                remaining -= 4;
                if (remaining <= 0) current.finish();
                else if (movement !== "moving" && movement !== "arrived") current.reject(movement);
                else current.after(4, sustain);
            }
            next.stage("maintaining");
            next.after(4, sustain);
        }
        approach(action);
    }
    export function wall(action: CombatAction): void {
        action.particle(action.targetPosition());
        action.after(8, function (next) {
            next.commit(100);
            ManagedEffects.wall(next, 160);
            next.finish();
        });
    }
    export function dash(action: CombatAction): void {
        var goal = action.targetPosition();
        action.after(3, function (next) {
            next.commit(70);
            var steps = 0;
            function move(current: CombatAction): void {
                var delta = goal.minus(current.origin());
                var horizontal = WorldCombat.point(delta.x(), 0, delta.z());
                var traveled = current.world().displace(current.actor(), horizontal.length() > 0.75 ? horizontal.unit().scale(0.75) : horizontal);
                current.particle(current.origin());
                steps++;
                delta = goal.minus(current.origin());
                if (Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z()) < 0.25 || steps >= 8) current.finish();
                else if (traveled < 0.05) current.reject("path-blocked");
                else current.after(1, move);
            }
            move(next);
        });
    }
}
