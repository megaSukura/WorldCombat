/**
 * 污泥炸弹 / sludgebomb —— 出手方式。
 *
 * 核心念头：一记**落地插引信、过一小会儿才炸的污泥炸弹**。把毒泥塞进弹壳掷出去，炸弹落在目标脚边，
 *   引信嗞嗞冒烟；烧完的一刻爆心一圈的敌人一起挨毒泥、被沿离爆心方向推开、按概率中毒。
 *   爆心是活的：对手在引信烧完前走开就能少挨一下。
 *
 * 幕：
 *   起（windup，提交前）：毒泥在身前压进弹壳、引信点着的预告（`action.present`，可被打断、不花 PP）。
 *   落（flight → fuse）：炸弹沿弧线飞出，落在落点，插着引信嗞嗞冒烟（`fuseTicks` 刻）。
 *   炸（burst / fizz）：引信烧完，爆心一圈结算 `blast`、推开、按概率挂共享中毒身份；空爆则只冒烟。
 *
 * 与同族分开：污泥攻击是低弧小泥团直接糊人、垃圾射击是负重直线炮、浊雾是正前方雾锥；
 *   只有污泥炸弹是**落地插引信的延时爆弹**，反制方式是在引信烧完前离开爆心。
 */
namespace PokemonSkills {
    const sludgebombScene = "world_combat:move_sludgebomb";
    const sludgebombBurstText = "world_combat.move.sludgebomb.text.burst";
    const sludgebombFuseText = "world_combat.move.sludgebomb.text.fuse";
    const sludgebombPoisonText = "world_combat.move.sludgebomb.text.poison";
    const sludgebombFizzText = "world_combat.move.sludgebomb.text.fizz";

    define({
        id: "sludgebomb",
        name: "Sludge Bomb",
        description: "把毒泥塞进弹壳掷向目标脚边，炸弹落地插着引信嗞嗞冒烟；引信烧完的一刻爆心一圈的敌人一起挨伤、被推开、可能中毒。对手能在引信烧完前走开。密封形态范围更大更毒，代价是爆心略轻、引信更长。",
        uses: ["把一枚延时爆弹丢进人堆，逼人散开", "在目标走位路线上封住一小片地", "一次让爆心一圈的人中毒"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 13,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "sludge",
        defaults: { sealed: false, ai: { maxChase: 14, crowd: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["sludgebomb"], detail: { values: config } };
            return { radius: p("sludgebomb", "burstRadius", context), geometry: "area", style: "sludge", color: 0x7FB84A,
                label: config && config.sealed === true ? "污泥炸弹·密封" : "污泥炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sludgebomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sludgebomb", "tempo", context)),
                recover: Math.round(p("sludgebomb", "settle", context)),
                cooldown: Math.round(p("sludgebomb", "recharge", context)),
                active: 0,
                range: p("sludgebomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const fumes = Math.max(6, Math.round(p("sludgebomb", "fumes", action)));
            action.present("sludgebomb:shell:" + action.id(), sludgebombScene, 1, action.origin(),
                JSON.stringify({ moment: "shell", windup: prepare, fumes: fumes, sealed: config && config.sealed === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const speed = p("sludgebomb", "tossSpeed", action);
            const gravity = 0.05;
            const bombRadius = p("sludgebomb", "bombRadius", action);
            const power = p("sludgebomb", "blast", action);
            const radius = p("sludgebomb", "burstRadius", action);
            const fuse = Math.max(6, Math.round(p("sludgebomb", "fuseTicks", action)));
            const chance = p("sludgebomb", "toxinChance", action);
            const venomTicks = Math.max(40, Math.round(p("sludgebomb", "venomTicks", action)));
            const push = p("sludgebomb", "push", action);
            const fumes = Math.max(8, Math.round(p("sludgebomb", "fumes", action)));
            const cap = Math.max(1, Math.round(p("sludgebomb", "maxTargets", action)));
            const scale = radius / 2.4;
            const intensity = Math.max(0.6, Math.min(2.2, power / 90));
            const launch = LivingActions.ballistic(origin, action.targetPosition(), speed, gravity) || aim(action);
            let armed = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 引信烧完：爆心一圈结算，随后收尾。 */
            function detonate(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                let hits = 0, poisoned = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2, above: 3 }), function (enemy, facts) {
                    if (hits >= cap) return;
                    const dealt = hurt(current, enemy, "sludgebomb", power,
                        { damage: damageSpec("sludgebomb", "blast") });
                    if (!dealt) return;
                    hits++;
                    if (scope.valid(enemy) && scope.random() < chance
                        && CombatStatus.inflict(scope, enemy, "poison", venomTicks, 0, { secondary: true })) poisoned++;
                    const away = WorldCombat.point(facts.position().x() - point.x(), 0, facts.position().z() - point.z());
                    if (scope.valid(enemy) && away.length() > 0.2)
                        scope.displace(enemy, away.unit().scale(push));
                });
                WorldFeedback.emit(scope, sludgebombScene, 1, point,
                    { moment: "burst", radius: radius, fumes: fumes, hits: hits, intensity: intensity, scale: scale }, 34);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)),
                    hits > 0 ? sludgebombBurstText : sludgebombFizzText, hits > 0 ? [hits] : [], 28);
                if (poisoned > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), sludgebombPoisonText, [], 26);
                scope.sound("minecraft:entity.generic.explode", point, 20, "{}");
                scope.sound("minecraft:entity.slime.squish", point, 18, "{}");
                finish(current);
            }

            sound(action, "cobblemon:move.sludgebomb.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: bombRadius, gravity: gravity, lifetime: 220,
                direction: launch,
                appearance: { sprite: "cobblemon:moves/sludgebomb", tint: 0x7FB84A, glow: false,
                    scale: Math.max(0.9, bombRadius / 0.24) },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    if (armed) return;
                    armed = true;
                    const point = hit.position();
                    const scope = current.world();
                    WorldFeedback.keep(scope, "sludgebomb:fuse:" + current.id(), sludgebombScene, 1, point,
                        { moment: "fuse", fuse: fuse, radius: radius, fumes: fumes, scale: scale }, fuse + 12);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.7, 0)), sludgebombFuseText, [], 24);
                    current.after(fuse, function (next: CombatAction) { detonate(next, point); });
                }
            }, function (current: CombatAction) {
                if (armed) return;
                armed = true;
                const point = current.targetPosition();
                detonate(current, point);
            });
            WorldFeedback.keep(world, "sludgebomb:fly:" + action.id(), sludgebombScene, 1, origin,
                { moment: "flight", projectile: flight, fumes: fumes, intensity: intensity }, 80);
        }
    });
}
