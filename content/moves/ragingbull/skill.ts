/**
 * 怒牛 / ragingbull 的出手方式。
 *
 * 核心念头：低头压角，整副身板沿直线冲出去；角尖撞在屏障上，整片屏障随冲势一起碎。
 * 三幕：
 *   起（windup，提交前）：低头压角、后蹄刨地，身周聚起对应形态颜色的气。
 *   冲（execute → charge → ram）：提交后沿瞄准方向逐刻冲出，身后拖出尘与角气；trace 撞到活体即结算冲撞
 *       并按体重顶开；贯穿式一路撞穿最多四个目标，猛停式撞到第一个就停。
 *   碎（break）：每个命中点半径内的反射壁、光墙与极光幕一起震碎。
 *
 * 与同族分开：劈瓦是贴身快劈；精神之牙是更远更重的一口；上菜是带增益的优雅一击。
 * 怒牛是全族唯一「人也在动」的多目标冲撞，属性还随形态在普通／格斗／火／水之间变化。
 */
namespace PokemonSkills {
    const ragingbullScene = "world_combat:move_ragingbull";
    const ragingbullBreakText = "world_combat.move.ragingbull.text.break";
    const ragingbullMissText = "world_combat.move.ragingbull.text.miss";

    function ragingbullShatter(world: CombatWorld, centre: CombatPoint, radius: number): number {
        let broken = 0;
        const zones = WorldEffects.areasWithTag(world, WorldEffects.categories.screen);
        for (let z = 0; z < zones.length; z++) {
            const area = zones[z];
            const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
            if (at.minus(centre).length() > radius + area.radius) continue;
            if (world.operation(area.id, "world_combat:dispel", "{}")) broken++;
        }
        const actors: CombatActor[] = world.query(centre, radius, false).slice();
        actors.push(world.source());
        const seen: { [ref: string]: boolean } = {};
        for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (!actor || !world.valid(actor)) continue;
            const ref = String(actor.ref());
            if (seen[ref]) continue;
            seen[ref] = true;
            broken += CombatStatus.cureTagged(world, actor, WorldEffects.categories.screen);
        }
        return broken;
    }

    define({
        freeMovement: true,
        id: "ragingbull",
        cooldownParameter: "recharge",
        name: "怒牛",
        description: "低头压角沿直线冲出去：撞开路上的一切，角尖把沿途的反射壁、光墙与极光幕整片震碎。属性随形态在普通、格斗、火与水之间变化。全族唯一「人也在动」的一招。",
        uses: ["沿直线撞穿一排敌人", "一路把屏障撞碎", "属性随形态变化的重型起手"],
        kind: "enemy",
        range: 5.0,
        maxRange: 9.0,
        prepare: 8,
        active: 40,
        recover: 10,
        cooldown: 34,
        style: "charge",
        defaults: { trample: false, ai: { maxChase: 10, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("ragingbull", "charge", pokemon) : 5, geometry: "line", style: "charge",
                color: pokemon ? ragingbullColorOf(pokemon) : 0xC8C8C0, label: config && config.trample ? "贯穿式" : "猛停式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["ragingbull"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("ragingbull", "tempo", context))),
                recover: Math.max(3, Math.round(p("ragingbull", "aftercast", context))),
                cooldown: Math.max(12, Math.round(p("ragingbull", "recharge", context))),
                range: p("ragingbull", "charge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const tint = ragingbullColorOf(CobblemonCombat.pokemon(action.actor()));
            action.present("world_combat:move_ragingbull:windup", ragingbullScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", trample: config && config.trample ? 1 : 0, tint: tint }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const length = p("ragingbull", "charge", action);
            const speed = p("ragingbull", "gallop", action);
            const radius = p("ragingbull", "collisionRadius", action);
            const power = p("ragingbull", "ram", action);
            const shove = p("ragingbull", "shove", action);
            const wardBreak = p("ragingbull", "wardBreak", action);
            const traceAhead = p("ragingbull", "traceAhead", action);
            const minimum = p("ragingbull", "minimumMove", action);
            const trample = !!(config && config.trample);
            const maxTargets = trample ? 4 : 1;
            const tint = ragingbullColorOf(CobblemonCombat.pokemon(actor));
            const scale = radius / 0.5;
            let travelled = 0, hits = 0, wards = 0, finished = false;
            const struck: { [ref: string]: boolean } = {};

            function finish(current: CombatAction, moment: string): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, ragingbullScene, 1, body.position(),
                        { moment: moment, tint: tint, hits: hits, wards: wards, scale: scale }, 22);
                    if (hits === 0)
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), ragingbullMissText, [], 24);
                }
                done(current);
            }
            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { finish(current, "miss"); return; }
                const delta = direction.scale(step);
                const hit = current.trace(origin, origin.plus(delta.scale(traceAhead)), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    const point = hit.position();
                    if (target !== null) {
                        const ref = String(target.ref());
                        if (!struck[ref]) {
                            struck[ref] = true;
                            hits++;
                            const broken = ragingbullShatter(scope, point, wardBreak);
                            wards += broken;
                            if (broken > 0) {
                                WorldFeedback.emit(scope, ragingbullScene, 1, point,
                                    { moment: "break", target: ref, wards: broken, scale: wardBreak / 8 }, 26);
                                sound(current, "minecraft:block.glass.break");
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), ragingbullBreakText, [broken], 28);
                            }
                            const landed = impact(current, hit, "ragingbull", power,
                                { damage: damageSpec("ragingbull", "ram"), contact: true });
                            WorldFeedback.emit(scope, ragingbullScene, 1, point,
                                { moment: "ram", target: ref, tint: tint, hits: hits, power: Math.round(power), scale: scale }, 26);
                            if (landed && scope.valid(target)) scope.displace(target, direction.scale(shove));
                            sound(current, "minecraft:entity.ravager.attack");
                        }
                    }
                    if (hits >= maxTargets) { finish(current, "stop"); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < minimum || travelled >= length) { finish(current, "miss"); return; }
                WorldFeedback.keep(scope, "ragingbull:trail:" + String(current.actor().ref()), ragingbullScene, 1, origin,
                    { moment: "charge", tint: tint, scale: scale, ratio: Math.min(1, travelled / Math.max(0.001, length)) }, 8);
                current.after(1, advance);
            }
            WorldFeedback.keep(world, "ragingbull:trail:" + String(actor.ref()), ragingbullScene, 1, action.origin(),
                { moment: "charge", tint: tint, scale: scale, ratio: 0 }, 10);
            sound(action, "minecraft:entity.goat.prepare_ram");
            advance(action);
        }
    });
}
