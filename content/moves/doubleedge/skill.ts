/**
 * 舍身冲撞 / doubleedge 的出手方式。
 *
 * 核心念头：一次最朴素的全身正面猛冲——压低身体沿瞄准方向直线撞出去，撞实的一刻两个人的惯性都还没散：
 * 目标被顶飞、自己也顺着反震滑开。它是这一族里最直白的一招，也是唯一“撞完双方都被弹开”的；
 * 反震中等，不追求极端自损。定桩式让自己站住、把目标顶得更远，代价是反伤更重、节奏更慢。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体、踏地蓄势，只播预告。
 *   撞（charge → impact / skid）：提交后逐刻沿瞄准方向推进；trace 撞上活体即结算 tackle 接触伤害，
 *       按 recoil 比例反伤自己（共享结算），把目标沿冲撞方向顶飞 shove 格，自己向反方向滑开 rebound 格；
 *       冲到底、撞墙或推不动就只是收势（skid）——这一招撞空不自伤，那是双刃头锤的代价。
 *
 * 与同族分开：勇鸟猛攻从空中俯冲打穿一条线；波动冲裹水撞击、把人浇透；木槌用坚硬躯体砸出地面裂纹。
 * 舍身冲撞的辨识点是撞完之后两个人各自滑开的那一下。
 * 配置 brace（定桩式）由 resolve 改时序、由公式改威力/反伤/顶飞/自身反弹，提交后才触碰世界。
 */
namespace PokemonSkills {
    const doubleedgeScene = "world_combat:move_doubleedge";
    const doubleedgeHitText = "world_combat.move.doubleedge.text.hit";
    const doubleedgeReboundText = "world_combat.move.doubleedge.text.rebound";
    const doubleedgeSkidText = "world_combat.move.doubleedge.text.skid";

    define({
        freeMovement: true,
        id: "doubleedge",
        cooldownParameter: "recharge",
        name: "Double-Edge",
        description: "最朴素的全身正面猛冲：压低身体直线撞出去，撞实后目标被顶飞、自己也被反震弹开，并承担中等反伤。撞空只是收势，不自伤。",
        uses: ["正面撞开一个挡路的对手", "把目标顶离队友或顶下高台", "在生存无虞时换一记扎实的接触重击"],
        kind: "enemy",
        range: 4.0,
        maxRange: 7.2,
        prepare: 8,
        active: 34,
        recover: 9,
        cooldown: 46,
        style: "contact",
        defaults: { brace: false, ai: { maxChase: 9, minHealth: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("doubleedge", "collisionRadius", pokemon) * 1.7, geometry: "line", style: "contact",
                color: 0xD9CBB0, label: config && config.brace === true ? "定桩式舍身冲撞" : "舍身冲撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["doubleedge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("doubleedge", "tempo", context)),
                recover: Math.round(p("doubleedge", "aftercast", context)),
                cooldown: Math.round(p("doubleedge", "recharge", context)),
                active: skills["doubleedge"].active,
                range: p("doubleedge", "rush", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_doubleedge:tempo", doubleedgeScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", brace: !!(config && config.brace) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(doubleedgeScene);
            const world = action.world();
            const length = p("doubleedge", "rush", action);
            const speed = p("doubleedge", "speed", action);
            const radius = p("doubleedge", "collisionRadius", action);
            const traceAhead = p("doubleedge", "traceAhead", action);
            const minimumMove = p("doubleedge", "minimumMove", action);
            const power = p("doubleedge", "tackle", action);
            const recoil = p("doubleedge", "recoil", action);
            const shove = p("doubleedge", "shove", action);
            const rebound = p("doubleedge", "rebound", action);
            const dust = Math.round(p("doubleedge", "dust", action));
            const brace = !!(config && config.brace);
            const direction = aim(action);
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.4, power / 115));
            let travelled = 0, settled = false;

            movementScenes.show(action, "charge", action.origin(), { moment: "charge", dust: dust, scale: scale, intensity: intensity });
            sound(action, "cobblemon:move.bodyslam.actor_1");
            sound(action, "minecraft:entity.player.attack.strong");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 冲空：没有额外自伤，只是收势；留下一道尘土与文字。 */
            function skid(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, doubleedgeScene, 1, body.position(),
                        { moment: "skid", dust: dust, scale: scale, intensity: intensity * 0.7 }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), doubleedgeSkidText, [], 24);
                }
                sound(current, "minecraft:block.gravel.break");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { skid(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const landed = impact(current, hit, "doubleedge", power,
                        { damage: damageSpec("doubleedge", "tackle"), contact: true, recoil: recoil });
                    WorldFeedback.emit(scope, doubleedgeScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", dust: dust, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.4, power / 110)) }, 30);
                    sound(current, "cobblemon:move.bodyslam.target");
                    if (landed && target !== null && scope.valid(target)) {
                        scope.displace(target, direction.scale(shove));
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), doubleedgeHitText, [], 28);
                    }
                    // 双方各自被惯性弹开：目标向前、自己向后（定桩式站住不动）。
                    if (rebound > 0.01) {
                        const self = scope.observe(current.actor());
                        if (self !== null) {
                            scope.displace(current.actor(), direction.scale(-rebound));
                            WorldFeedback.emit(scope, doubleedgeScene, 1, self.position(),
                                { moment: "rebound", dust: dust, scale: scale, brace: brace ? 1 : 0 }, 24);
                            WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.3, 0)), doubleedgeReboundText, [], 24);
                        }
                    }
                    finish(current);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { skid(current); return; }
                movementScenes.show(current, "charge", origin, { moment: "charge", dust: dust, scale: scale, intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, length)) });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
