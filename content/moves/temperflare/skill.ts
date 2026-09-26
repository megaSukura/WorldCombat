/**
 * 豁出去 / temperflare 的出手方式。
 *
 * 核心念头：上一次出手落空、索性什么都不顾了——点着自己整个人朝目标撞过去；撞上的那一下连人带火炸开，
 *   把身边的人都燎到。带着这股自暴自弃时，火更大、撞到的人还会被点着。
 *
 * 两幕：
 *   起（gather，提交前）：火从脚下窜起、裹住身体，只播预告。
 *   撞（charge → burst／scorch／miss）：提交后逐刻朝目标冲，trace 撞上活体即结算 `flare` 接触伤害、
 *       把目标顶开，并在落点炸开一圈 `scorch` 溅射；没撞到人也在尽头炸开一次。带豁出去时命中/燎到的敌人被点燃，
 *       但免疫火的生物只吃伤害、不会被点着。
 *
 * 与同族分开：
 *   跺脚（stompingtantrum）是原地跺地、沿一条缝掀人，走的是地面；
 *   豁出去是**把自己整个人烧着撞出去**，走的是空中与火，代价是收招与冷却更长——一个埋进地里，一个烧在风里。
 */
namespace PokemonSkills {
    /** 真实火免疫：原生 fireImmune 生物，以及宝可梦按属性/特性对灼伤的免疫（火属性等）。 */
    function temperFireImmune(world: CombatWorld, target: CombatActor): boolean {
        const entity = world.nativeEntity(target);
        if (entity !== null && typeof entity.fireImmune === "function" && entity.fireImmune()) return true;
        if (String(target.domain()) !== "cobblemon") return false;
        try { return !NativeEffects.statusAllowed(world, target, "burn", false, true); }
        catch (error) { return false; }
    }

    define({
        freeMovement: true,
        id: temperId,
        cooldownParameter: "recharge",
        name: "Temper Flare",
        description: "上一次出手落空、索性什么都不顾了：点着自己整个人朝目标撞过去，撞上时连人带火炸开，燎到身边的人；上一次打空了的话，这一撞翻倍、撞到的人还会被点着。",
        uses: ["上一次打空后烧着自己撞出去", "在落点炸开一片火、燎到围观的人", "把撞到的人点着"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.2,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "fire",
        defaults: { reckless: false, ai: { maxChase: 8, punishWhiff: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(temperId, "blast", pokemon) : 1.5, geometry: "line", style: "fire",
                color: 0xE0562A, label: config && config.reckless === true ? "豁出去·拼命" : "豁出去" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[temperId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(temperId, "tempo", context)),
                recover: Math.round(p(temperId, "settle", context)),
                cooldown: Math.round(p(temperId, "recharge", context)),
                active: 0,
                range: p(temperId, "dash", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:temperflare:gather", temperScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(temperScene);
            const world = action.world();
            const actor = action.actor();
            const start = world.observe(actor);
            if (start === null) { movementScenes.finish(action, done); return; }
            const direction = aim(action);
            const length = p(temperId, "dash", action);
            const step = p(temperId, "charge", action);
            const radius = p(temperId, "collisionRadius", action);
            const doubled = CombatStatus.has(world, actor, temperStatus);
            let travelled = 0, settled = false;

            sound(action, "minecraft:entity.blaze.shoot");
            movementScenes.show(action, "charge", start.position(), { moment: "charge", direction: [direction.x(), direction.y(), direction.z()], scale: radius / 0.45,
                    intensity: Math.max(0.6, Math.min(2.4, p(temperId, "flare", action) / 75)) });

            /** 撞上或冲到尽头：结算主目标、爆开一次溅射、只给真正点燃的目标挂上火尾，然后收招。 */
            function detonate(current: CombatAction, point: CombatPoint, primary: CombatImpact | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const flarePower = p(temperId, "flare", current);
                const scorchPower = p(temperId, "scorch", current);
                const blast = p(temperId, "blast", current);
                const push = p(temperId, "push", current);
                const embers = Math.max(6, Math.round(p(temperId, "embers", current)));
                const ignite = Math.max(20, Math.round(p(temperId, "igniteTicks", current)));
                const burnTicks = Math.max(30, Math.min(160, ignite));
                const scale = Math.max(0.5, Math.min(2.2, blast / 1.5));
                const intensity = Math.max(0.5, Math.min(2.4, flarePower / 75));
                let struck = 0;
                let primaryRef = "";

                if (primary !== null) {
                    const target = primary.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        primaryRef = String(target.ref());
                        if (impact(current, primary, temperId, flarePower, { damage: damageSpec(temperId, "flare"), contact: true })) {
                            struck++;
                            const away = primary.position().minus(current.origin());
                            if (away.length() > 0.05 && scope.valid(target)) scope.displace(target, away.unit().scale(push));
                            if (doubled && scope.valid(target) && !temperFireImmune(scope, target) && scope.ignite(target, ignite))
                                WorldFeedback.emit(scope, temperScene, 1, primary.position(),
                                    { moment: "burn", target: String(target.ref()), embers: Math.max(6, Math.round(embers / 2)),
                                        burnTicks: burnTicks, scale: scale, intensity: intensity }, burnTicks);
                        }
                    }
                }

                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, blast, { below: 2, above: 2.5 }), function (enemy, facts) {
                    const ref = String(enemy.ref());
                    if (ref === primaryRef || ref === String(current.actor().ref())) return;
                    if (!scope.clear(point, facts.position())) return;
                    if (!hurt(current, enemy, temperId, scorchPower, { damage: damageSpec(temperId, "scorch") })) return;
                    struck++;
                    const away = facts.position().minus(point);
                    if (scope.valid(enemy)) {
                        if (away.length() > 0.2) scope.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(push * 0.7));
                        if (doubled && !temperFireImmune(scope, enemy) && scope.ignite(enemy, ignite))
                            WorldFeedback.emit(scope, temperScene, 1, facts.position(),
                                { moment: "burn", target: ref, embers: Math.max(4, Math.round(embers / 2)),
                                    burnTicks: burnTicks, scale: scale, intensity: intensity }, burnTicks);
                    }
                    WorldFeedback.emit(scope, temperScene, 1, facts.position(),
                        { moment: "scorch", target: ref, embers: Math.max(4, Math.round(embers / 2)), scale: scale, intensity: intensity }, 22);
                });

                WorldFeedback.emit(scope, temperScene, 1, point,
                    { moment: "burst", embers: embers, scale: scale, intensity: intensity }, 26);
                sound(current, doubled ? "minecraft:entity.generic.explode" : "cobblemon:impact.fire");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                    doubled ? temperRageText : struck > 0 ? temperHitText : temperMissText, doubled || struck > 0 ? [struck] : [], 26);
                movementScenes.finish(current, done);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { detonate(current, hit.position(), hit); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) { detonate(current, current.origin(), null); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
