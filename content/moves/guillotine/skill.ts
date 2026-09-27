/** Two real finite edges close in a locked aim plane; the first body or wall ends the clamp. */
namespace PokemonSkills {
    define({
        id: guillotineId,
        cooldownParameter: "recharge",
        name: "Guillotine",
        description: "两条钳刃沿锁定的瞄准平面逐刻收拢，最先碰到的身体或墙面结束这一夹；敌人承受一笔有限重击，真实死亡后才显示钳断。",
        uses: ["贴身用最短的起手夹中一个目标", "夹住正前方扇形里第一个可夹到的对手", "夹空后要承担最久的收招，用时机换爆发"],
        kind: "aim",
        range: 2.4,
        maxRange: 4.2,
        prepare: 10,
        active: 0,
        recover: 16,
        cooldown: 80,
        style: "pincer",
        defaults: { wide: false, ai: { maxChase: 5 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[guillotineId], detail: { values: config } };
            return { radius: pokemon ? p(guillotineId, "span", context) : guillotineReference, geometry: "cone", style: "normal",
                color: 0xB0A48C, label: config && config.wide === true ? "断头钳·阔钳" : "断头钳·窄钳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[guillotineId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(guillotineId, "tempo", context)),
                recover: Math.round(p(guillotineId, "aftercast", context)),
                cooldown: Math.round(p(guillotineId, "recharge", context)),
                active: 0,
                range: p(guillotineId, "span", context) + 0.2
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range() + 0.4) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_guillotine:windup", guillotineScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), self = world.observe(actor);
            if (!self) { done(action); return; }
            const plane = WorldGeometry.basis(action.targetPosition().minus(self.position()), action.direction());
            const heading = plane.forward;
            action.releaseTarget();
            const span = Math.max(1.8, p(guillotineId, "span", action));
            const half = Math.max(90, p(guillotineId, "arc", action)) * Math.PI / 360;
            const mark = Math.max(6, Math.round(p(guillotineId, "mark", action)));
            const grip = Math.max(10, Math.round(p(guillotineId, "grip", action)));
            const scale = span / guillotineReference, radius = Math.max(.1, Math.min(.22, span * .055));
            const jaws = WorldFeedback.actionScenes("world_combat:move_guillotine/jaw");
            let finished = false;
            const vertex = (point: CombatPoint): number[] => [point.x(), point.y(), point.z()];
            function end(current: CombatAction, contact: CombatImpact | null, blades: number[][][]): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), victim = contact && contact.hitEntity() ? contact.target() : null;
                const at = contact ? contact.position() : current.origin().plus(heading.scale(span));
                const ref = victim ? String(victim.ref()) : "";
                const result = victim && scope.valid(victim) && !scope.friendly(victim) ? guillotineStrike(current, victim) : "miss";
                if (result === "source-left") return;
                WorldFeedback.emit(scope, "world_combat:move_guillotine/jaw", 1, at, { blades, radius }, 6);
                WorldFeedback.emit(scope, guillotineScene, 1, at,
                    { moment: result === "hit" ? "snap" : "miss", target: ref, grip, scale, intensity: 1, span, arc: half * 360 / Math.PI,
                        direction: vertex(heading) }, result === "hit" ? 30 : 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1, 0)), result === "hit" ? guillotineHitText
                    : result === "immune" || result === "resisted" ? "world_combat.move.guillotine.text.resisted" : guillotineMissText, [], 26);
                scope.sound(result === "hit" ? "cobblemon:impact.normal" : "minecraft:item.shield.break", at, 14, "{}");
                jaws.finish(current, done);
            }
            function step(current: CombatAction, index: number): void {
                const scope = current.world(), body = scope.observe(actor);
                if (!body) { jaws.finish(current, done); return; }
                const apex = body.position();
                // Subdivide angular travel: the very same clipped edges are tested and drawn.
                const parts = Math.max(1, Math.ceil(span * half / mark / .14));
                let blades: number[][][] = [];
                for (let part = 1; part <= parts; part++) {
                    const closure = (index + part / parts) / mark;
                    let first: CombatImpact | null = null, distance = Infinity;
                    blades = [];
                    for (let side = -1; side <= 1; side += 2) {
                        const angle = side * half * (1 - closure), c = Math.cos(angle), s = Math.sin(angle);
                        const direction = heading.scale(c).plus(plane.right.scale(s));
                        const hit = current.trace(apex, apex.plus(direction.scale(span)), radius, true);
                        blades.push([vertex(apex), vertex(hit.position())]);
                        if (hit.blocked() || hit.hitEntity()) {
                            const reach = hit.position().minus(apex).length();
                            if (reach < distance) { distance = reach; first = hit; }
                        }
                    }
                    jaws.show(current, "jaws", apex, { blades, radius, closure });
                    if (first) { end(current, first, blades); return; }
                }
                if (index + 1 >= mark) { end(current, null, blades); return; }
                current.after(1, next => step(next, index + 1));
            }
            sound(action, "minecraft:entity.player.attack.sweep");
            step(action, 0);
        }

    });
}
