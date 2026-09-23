/**
 * 蛮干 / endeavor 的出手方式。
 *
 * 念头的形状：压低身子站定，在两人之间拉出一根「量尺」（windup，提交前只播预告，读双方生命差）→
 * 沿量尺方向扑出去（dash）→ 撞上的一刻把对手的血线拽到自己这条线上（equalize：直接结算一段等于生命差的伤害）。
 * 自己更健康时量尺为零，扑上去也只擦出一记空响（flat）——这招只有在「你落后」时才有形状。
 * 越身式撞实后从对手身侧穿过去换位，代价是几乎不顶开。
 *
 * 三幕：windup（brace + measure）→ dash → equalize / flat。提交后才触碰世界。
 */
namespace PokemonSkills {
    const endeavorScene = "world_combat:move_endeavor";
    const endeavorHitText = "world_combat.move.endeavor.text.hit";
    const endeavorFlatText = "world_combat.move.endeavor.text.flat";
    const endeavorMissText = "world_combat.move.endeavor.text.miss";

    function endeavorAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    function endeavorVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        freeMovement: true,
        id: "endeavor",
        name: "Endeavor",
        description: "扑身拉平：把对手当前生命拽下来到你这条血线上，伤害正好是「对手生命 − 自己生命」。自己越残、对手越健康，这一下越重；自己更健康时它一分伤害也没有。越身式扑得更远、撞后穿过对手换位，代价是几乎不顶开。",
        uses: ["把高血的对手拉低到自己这条血线", "残血时反打一记大的", "越身换位躲开正面"],
        kind: "enemy",
        range: 2.5,
        maxRange: 4.6,
        prepare: 8,
        active: 24,
        recover: 10,
        cooldown: 38,
        style: "contact",
        defaults: { vault: false, ai: { maxChase: 7, minGap: 0.12, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("endeavor", "collisionRadius", pokemon), geometry: "line", style: "contact", color: 0xB5342B, label: "蛮干" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["endeavor"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const vault = !!(config && config.vault);
            return {
                prepare: p("endeavor", "brace", context),
                recover: p("endeavor", "recover", context) + (vault ? 2 : 0),
                cooldown: p("endeavor", "cooldown", context) + (vault ? 6 : 0),
                range: p("endeavor", "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_endeavor:brace", endeavorScene, 1, action.origin(), JSON.stringify({ moment: "brace" }));
            const target = action.target();
            if (target !== null) {
                const body = action.sense().observe(target);
                action.present("world_combat:move_endeavor:measure", endeavorScene, 1, action.origin(), JSON.stringify({
                    moment: "measure", target: String(target.ref()),
                    path: [String(action.actor().ref()), String(target.ref())],
                    gap: body === null ? 0 : Math.max(0, body.health() - action.sense().observe(action.actor())!.health())
                }));
            }
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const vault = !!(config && config.vault);
            const length = p("endeavor", "lunge", action);
            const speed = p("endeavor", "lungeSpeed", action);
            const radius = p("endeavor", "collisionRadius", action);
            const shove = p("endeavor", "shove", action);
            const stride = p("endeavor", "maximumStride", action);
            const direction = endeavorAim(action);
            const start = world.observe(self);
            if (start === null) { done(action); return; }
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, endeavorScene, 1, action.origin(),
                { moment: "dash", direction: endeavorVector(direction), scale: radius / 0.45 }, 40);
            sound(action, "minecraft:entity.player.attack.weak");

            /** 收势：落点播 settle，miss 时补一行浮字。命中/空响的浮字已在各自幕里写出。 */
            function settle(current: CombatAction, missed: boolean, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), endeavorScene, 1, at, { moment: "settle", scale: radius / 0.45 }, 22);
                if (missed) {
                    const body = current.world().observe(current.actor());
                    if (body !== null) WorldFeedback.text(current.world(), body.position().plus(WorldCombat.point(0, 1.2, 0)), endeavorMissText, [], 22);
                }
                sound(current, missed ? "minecraft:entity.player.attack.sweep" : "minecraft:entity.iron_golem.attack");
                done(current);
            }

            function slide(current: CombatAction, remaining: number, left: number): void {
                if (settled) return;
                const scope = current.world();
                if (remaining <= 0.02 || left <= 0) { settle(current, false, current.origin()); return; }
                const moved = scope.displace(current.actor(), direction.scale(Math.min(remaining, speed * 0.7)));
                if (moved < p("endeavor", "maximumStride", current)) { settle(current, false, current.origin()); return; }
                current.after(1, function (next: CombatAction) { slide(next, remaining - moved, left - 1); });
            }

            function strike(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const damage = p("endeavor", "damage", current);
                const body = scope.observe(target);
                const gap = body === null ? 0 : Math.max(0, body.health() - scope.observe(current.actor())!.health());
                const intensity = body === null ? 0 : Math.min(2.6, 0.4 + gap / Math.max(1, body.maxHealth()) * 3.2);
                const landed = endeavorRawHit(current, target, damage, true);
                if (landed) {
                    WorldFeedback.emit(scope, endeavorScene, 1, at,
                        { moment: "equalize", target: String(target.ref()), gap: gap, intensity: intensity,
                            count: Math.round(14 + intensity * 26), scale: radius / 0.45 }, 28);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), endeavorHitText, [Math.round(gap)], 26);
                    sound(current, "cobblemon:impact.fighting");
                    if (vault) { slide(current, length * 0.6, 8); return; }
                    if (scope.valid(target)) scope.displace(target, direction.scale(shove));
                    settle(current, false, at);
                    return;
                }
                WorldFeedback.emit(scope, endeavorScene, 1, at,
                    { moment: "flat", target: String(target.ref()), gap: gap, scale: radius / 0.45 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), endeavorFlatText, [], 22);
                settle(current, false, at);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { settle(current, true, origin); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(1.3)), radius + stride);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) { strike(current, target, hit.position()); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("endeavor", "maximumStride", current) || travelled >= length) {
                    settle(current, true, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
