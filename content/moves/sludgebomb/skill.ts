/**
 * 污泥炸弹 / sludgebomb —— 出手方式。
 *
 * 核心念头：一记**落地插引信、过一小会儿才炸的污泥炸弹**。把毒泥塞进弹壳掷出去，炸弹落在目标脚边，
 *   引信嗞嗞冒烟；烧完的一刻爆心一圈的敌人一起挨毒泥、被沿离爆心方向推开、按概率中毒。
 *   爆心是活的：对手在引信烧完前走开就能少挨一下。
 *
 * 幕：
 *   起（windup，提交前）：毒泥在身前压进弹壳、引信点着的预告（`action.present`，可被打断、不花 PP）。
 *   掷（flight，提交后）：炸弹沿真实抛物线飞出；动作只负责这一掷，撞到实体/方块立刻把引信交给有限托管效果并结束，
 *       施法者随即可以移动或接下一招（`actionScenes` 只在这个动作内维持飞行表现，转段 stop、结束 finish）。
 *   炸（fuse → burst，托管效果）：动作结束后由 `world_combat:sludgebomb_fuse` 在**真实碰撞点**捧着炸弹走完引信；
 *       引信烧完在真实爆点结算一次 `blast`、按遮挡筛掉被墙挡住的候选、按实际目标位置求推力并可能挂毒，随后收掉效果与警戒圈。
 *
 * 落点规则：真实首碰点就是爆点，墙前落弹不会穿到墙后的准星点爆炸；飞行自然到期（打空）时安全散去，
 *   不把炸弹挪到准星再炸。引信表现绑定在同一托管效果上，随它自然结束或被驱散一起收掉。
 *
 * 与同族分开：污泥攻击是低弧小泥团直接糊人、垃圾射击是负重直线炮、浊雾是正前方雾锥；
 *   只有污泥炸弹是**落地插引信的延时爆弹**，反制方式是在引信烧完前离开爆心。
 */
namespace PokemonSkills {
    const sludgebombScene = "world_combat:move_sludgebomb";
    const sludgebombFuse = "world_combat:sludgebomb_fuse";
    const sludgebombBurstText = "world_combat.move.sludgebomb.text.burst";
    const sludgebombFuseText = "world_combat.move.sludgebomb.text.fuse";
    const sludgebombPoisonText = "world_combat.move.sludgebomb.text.poison";
    const sludgebombFizzText = "world_combat.move.sludgebomb.text.fizz";

    function sludgebombPoint(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    // 一枚落在真实爆点上的炸弹：动作结束后由本托管效果捧着走完引信，再结算一次爆心。
    WorldCombat.effect(sludgebombFuse, 1, 1200, "actor", function (json) {
        const state = JSON.parse(json);
        if (!Array.isArray(state.point) || state.point.length !== 3
            || !state.point.every(function (value: any) { return typeof value === "number" && isFinite(value); }))
            throw new Error("Invalid sludgebomb point");
        ["power", "radius", "fuse", "chance", "venom", "push", "fumes", "cap", "scale", "intensity"].forEach(function (key: string) {
            if (typeof state[key] !== "number" || !isFinite(state[key])) throw new Error("Invalid sludgebomb value: " + key);
        });
        if (!(state.power > 0) || !(state.radius > 0) || !(state.fuse >= 1)) throw new Error("Invalid sludgebomb values");
        state.sealed = state.sealed === true;
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);

    WorldCombat.effectHandler(sludgebombFuse, "start", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state()), at = sludgebombPoint(state.point);
        // 引信滋烟与警戒圈只画在真实爆点，并随这个效果自然结束/被驱散一起收掉。
        WorldFeedback.onEffect(world, effect.id(), "sludgebomb:fuse:" + effect.id(), sludgebombScene, 1, at,
            { moment: "fuse", point: state.point, fuse: state.fuse, radius: state.radius, fumes: state.fumes,
                scale: state.scale, sealed: state.sealed === true });
        world.sound("minecraft:block.fire.ambient", at, 10, "{}");
        effect.schedule("detonate", "detonate", Math.max(1, Math.round(state.fuse)), "{}");
    });

    WorldCombat.effectHandler(sludgebombFuse, "detonate", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state()), at = sludgebombPoint(state.point);
        let hits = 0, poisoned = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, state.radius, { below: 2, above: 3 }),
            function (enemy: CombatActor, facts: CombatObservation) {
                if (hits >= state.cap) return;
                // 真实可达性：被墙挡住的候选不吃这一爆。
                if (!world.clear(at, facts.position())) return;
                if (!hurt(world, enemy, "sludgebomb", state.power, { damage: damageSpec("sludgebomb", "blast") })) return;
                hits++;
                if (world.valid(enemy) && world.random() < state.chance
                    && CombatStatus.inflict(world, enemy, "poison", state.venom, 0, { secondary: true })) poisoned++;
                // 推力按实际目标位置与爆心连线（水平），不沿准星伪方向。
                const away = WorldCombat.point(facts.position().x() - at.x(), 0, facts.position().z() - at.z());
                if (world.valid(enemy) && away.length() > 0.2) world.hitDisplace(enemy, away.unit().scale(state.push));
            });
        WorldFeedback.emit(world, sludgebombScene, 1, at,
            { moment: "burst", point: state.point, radius: state.radius, fumes: state.fumes, hits: hits,
                intensity: state.intensity, scale: state.scale }, 34);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.8, 0)),
            hits > 0 ? sludgebombBurstText : sludgebombFizzText, hits > 0 ? [hits] : [], 28);
        if (poisoned > 0) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), sludgebombPoisonText, [], 26);
        world.sound("minecraft:entity.generic.explode", at, 20, "{}");
        world.sound("minecraft:entity.slime.squish", at, 18, "{}");
        effect.end();
    });

    WorldCombat.effectHandler(sludgebombFuse, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    define({
        id: "sludgebomb",
        cooldownParameter: "recharge",
        name: "Sludge Bomb",
        description: "把毒泥塞进弹壳掷向目标脚边，炸弹落地插着引信嗞嗞冒烟；引信烧完的一刻爆心一圈的敌人一起挨伤、被推开、可能中毒。对手能在引信烧完前走开；掷完自己就能走，引信在真实落点独立走完。密封形态范围更大更毒，代价是爆心略轻、引信更长。",
        uses: ["把一枚延时爆弹丢进人堆，逼人散开", "在目标走位路线上封住一小片地", "一次让爆心一圈的人中毒"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(sludgebombScene);
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
            const sealed = !!(config && config.sealed === true);
            const launch = LivingActions.ballistic(origin, action.targetPosition(), speed, gravity) || aim(action);
            let armed = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 真实首碰：把炸弹与引信交给有限托管效果，动作立即结束，施法者恢复自由。 */
            function arm(current: CombatAction, point: CombatPoint): void {
                if (armed) return;
                armed = true;
                scenes.stop(current, "flight");
                current.world().effect(sludgebombFuse, current.actor(), JSON.stringify({
                    point: [point.x(), point.y(), point.z()], power: power, radius: radius, fuse: fuse,
                    chance: chance, venom: venomTicks, push: push, fumes: fumes, cap: cap, scale: scale,
                    intensity: intensity, sealed: sealed }), fuse + 60);
                finish(current);
            }

            sound(action, "cobblemon:move.sludgebomb.actor");
            sound(action, "minecraft:entity.slime.squish");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: bombRadius, gravity: gravity, lifetime: 220,
                direction: launch,
                appearance: { sprite: "cobblemon:moves/sludgebomb", tint: 0x7FB84A, glow: false,
                    scale: Math.max(0.9, bombRadius / 0.24) },
                impact: function (current: CombatAction, hit: CombatImpact) { arm(current, hit.position()); }
            }, function (current: CombatAction) {
                // 飞空到期：没有真实末点就不挪去准星，只安全散去这一枚。
                if (!armed) { armed = true; scenes.stop(current, "flight"); finish(current); }
            });
            scenes.show(action, "flight", origin, { moment: "flight", projectile: flight, fumes: fumes, intensity: intensity });
        }
    });
}
