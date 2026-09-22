namespace TrainingBolt {
    export function cast(action: CombatAction, damage: number): void {
        action.particle(action.origin());
        action.after(6, function (ready) {
            var position = ready.origin();
            var direction = ready.targetPosition().minus(position).unit().scale(0.8);
            var travelled = 0;
            var impact: CombatImpact | null = null;
            ready.on("impact", function (hit) {
                if (impact !== null) hit.damage(impact, damage);
            });
            ready.commit(40);
            function advance(current: CombatAction): void {
                var next = position.plus(direction);
                impact = current.trace(position, next, 0.15);
                current.particle(impact.position());
                if (impact.hitEntity()) {
                    current.emit("impact");
                    current.finish();
                    return;
                }
                if (impact.blocked() || travelled >= 24) {
                    current.finish();
                    return;
                }
                position = next;
                travelled += 0.8;
                current.after(1, advance);
            }
            ready.after(1, advance);
        });
    }
}
