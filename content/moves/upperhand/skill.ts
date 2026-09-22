/**
 * 快手还击 / upperhand 的出手方式。
 *
 * 核心念头：看清对手正在抬出那一记先制招的瞬间，一记掌根迎上去，把它整只手按停——对手这一下就作废。
 * 它是本族唯一以「打断」为目的的一招，也最挑时机：读不到先制招就只是一记空掌。
 *
 * 两幕：
 *   察（windup，提交前）：目光一凝、掌心亮起；读到目标的先制招就压低身体准备，读不到就空等（present alert / whiff）。
 *   按（execute）：出手那一刻仍读到就先迎上去；点掌打锁定目标，横扫式则扫出身前一小片扇面，
 *       每个被扫到的敌人吃 `snap` 并挂上共享身份 `world_combat:status/flinch`、投递 `world_combat:interrupt`
 *       把它此刻正在执行的那一招按停。
 *
 * 与同族分开：突袭只抢一下伤害、不断招；快手还击只认先制招，要的是对手这一手作废。
 */
namespace PokemonSkills {
    function upperhandFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, upperhandFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 横扫扇面的有序顶点：原点 + 从瞄准方向左右各半个张角间采样的弧点；判定与画面用同一组顶点。 */
    function upperhandFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(4, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.5, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    define({
        id: upperhandId,
        name: "Upper Hand",
        description: "察觉到对手正在使出先制招时迎上去用掌根按停；对手此刻不在出先制招时这一记落空，PP 照常消耗。",
        uses: ["打断对手的先制招", "惩罚靠先制招抢节奏的敌人", "在对手抢先手时把它按回原地"],
        kind: "enemy",
        range: 2.6,
        maxRange: 4.6,
        prepare: 1,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "punch",
        defaults: { wide: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: config && config.wide === true ? p(upperhandId, "swipe", pokemon) : p(upperhandId, "collisionRadius", pokemon) * 1.5,
                geometry: config && config.wide === true ? "circle" : "line", style: "punch", color: 0xE0B060,
                label: config && config.wide === true ? "快手还击·横扫" : "快手还击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[upperhandId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(upperhandId, "tempo", context)),
                recover: Math.round(p(upperhandId, "settle", context)),
                cooldown: Math.round(p(upperhandId, "recharge", context)),
                active: 0,
                range: p(upperhandId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const window = p(upperhandId, "window", action);
            const fresh = target !== null && upperhandFresh(world, String(target.ref()), window);
            action.present("upperhand:alert", upperhandScene, 1, action.origin(),
                JSON.stringify({ moment: fresh ? "alert" : "whiff", windup: prepare,
                    target: target === null ? "" : String(target.ref()), wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), target = action.target();
            const window = p(upperhandId, "window", action);
            const power = p(upperhandId, "snap", action);
            const flinchTicks = Math.round(p(upperhandId, "flinchTicks", action));
            const wide = !!(config && config.wide);
            const radius = p(upperhandId, "collisionRadius", action);

            function whiff(current: CombatAction): void {
                const scope = current.world(), at = current.targetPosition();
                WorldFeedback.emit(scope, upperhandScene, 1, at, { moment: "whiff", scale: radius / 0.4 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), upperhandWhiffText, [], 24);
                scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                done(current);
            }

            if (target === null || !world.valid(target) || !upperhandFresh(world, String(target.ref()), window)) {
                whiff(action);
                return;
            }

            const count = Math.round(14 + power * 0.2);
            sound(action, "cobblemon:move.suckerpunch.target");

            function strike(current: CombatAction, victim: CombatActor, point: CombatPoint, dealt: boolean): void {
                const scope = current.world();
                WorldFeedback.emit(scope, upperhandScene, 1, point,
                    { moment: wide ? "wide" : "strike", target: String(victim.ref()), count: count,
                        scale: radius / 0.4, power: Math.round(power * 10) / 10 }, 28);
                scope.sound("cobblemon:impact.fighting", point, 16, "{}");
                if (dealt) {
                    upperhandFlinch(scope, victim, flinchTicks);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), upperhandHitText,
                        [Math.round(power)], 26);
                }
            }

            if (wide) {
                const direction = aim(action);
                const swipe = p(upperhandId, "swipe", action), arc = p(upperhandId, "arc", action);
                const body = world.observe(action.actor());
                const origin = body === null ? action.origin() : body.position();
                const path = upperhandFan(origin, direction, swipe + 0.6, arc, 10);
                WorldFeedback.emit(world, upperhandScene, 1, origin,
                    { moment: "sweep", path: path, scale: swipe / 1.2, arc: arc, direction: [direction.x(), direction.y(), direction.z()] }, 22);
                WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, swipe + 0.6, arc, { below: 1.2, above: 2.4 }),
                    function (victim: CombatActor, facts: CombatObservation): void {
                        const landed = hurt(action, victim, upperhandId, power,
                            { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
                        const away = facts.position().minus(origin);
                        if (landed && away.length() > 0.05) world.displace(victim, away.unit().scale(p(upperhandId, "push", action)));
                        strike(action, victim, facts.position(), landed);
                    });
                done(action);
                return;
            }

            const direction = aim(action);
            const length = p(upperhandId, "reach", action);
            const step = p(upperhandId, "speed", action);
            let travelled = 0;

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(upperhandId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, upperhandId, power,
                            { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05) scope.displace(victim, away.unit().scale(p(upperhandId, "push", current)));
                        }
                        strike(current, victim, hit.position(), landed);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(upperhandId, "minimumMove", current) || travelled >= length) {
                    whiff(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

}
