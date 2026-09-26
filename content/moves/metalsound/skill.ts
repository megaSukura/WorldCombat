/**
 * 金属音 / metalsound — 执行组织。
 *
 * 核心念头：用身上的金属相互摩擦，慢慢刮出一声让人牙酸的高频音。声音贴着墙也能送到对手耳里，
 *   在它体内拉出一条长长的回响，特防被一次一次刮掉。它不飞、不铺地，也不需要看见对方——但要把音磨出来，
 *   施法者得先站定，这是本组起手最久、回响最久的一招。
 *
 * 出手：长起手（windup 在身上刮出金属火花与一圈圈声纹）后提交；起手可被打断，打断不花代价。
 * 命中：把预算拆成最多三次、间隔 gap 刻的刮擦，每次只降一级特防；首个成功段挂共享身份
 *       world_combat:status/grating（本单元效果 world_combat:metal_sound_grating，只借身份）。每段之前
 *       重新核对目标还在射程内，离开就停掉剩下的刮擦；已实现的等级变化保留。
 * 反制：拉开到回响距离之外就听不见；它不造成伤害，站定磨音的时间正是对手冲上来的窗口。
 */
namespace PokemonSkills {
    function metalsoundAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: metalsoundId,
        cooldownParameter: "wait",
        name: "金属音",
        description: "摩擦身上的金属，发出让人牙酸的高频声，隔着掩体也能送到对手耳里，分几次一次一级地刮掉它的特防。要把音磨出来就得先站定，起手很长；每刮过一次会重新核对目标还在射程内；长磨多刮一级、回响更久，但更慢。",
        uses: ["隔着掩体一级一级磨掉一个特防位", "在队友承伤、目标走不动时把特防刮到底", "在墙后安全起手，再把声音送到对面"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 15,
        active: 1,
        recover: 8,
        cooldown: 150,
        style: "metal",
        defaults: { long: false },
        fields: [
            flag("long", "长磨")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[metalsoundId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(metalsoundId, "tempo", context)),
                recover: p(metalsoundId, "recover", context),
                cooldown: Math.round(p(metalsoundId, "wait", context)),
                active: 1,
                range: p(metalsoundId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("metalsound-windup", metalsoundScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", long: config && config.long ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: config && config.long ? 9 : 6, geometry: "line", style: "metal", color: 0xC9B04C,
                label: config && config.long ? "金属音·长磨" : "金属音·短刮" };
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(metalsoundScene);
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const total = Math.max(1, Math.min(3, Math.round(p(metalsoundId, "drop", action))));
            const ring = Math.max(80, Math.round(p(metalsoundId, "ring", action)));
            const cycles = Math.max(6, Math.round(p(metalsoundId, "cycles", action)));
            const gap = Math.max(4, Math.round(p(metalsoundId, "gap", action)));
            const reach = Math.max(2, p(metalsoundId, "reach", action));
            const long = !!(config && config.long);
            sound(action, "minecraft:block.amethyst_block.resonate");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, metalsoundScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const first = world.observe(target);
            if (first === null) { WorldFeedback.emit(world, metalsoundScene, 1, action.targetPosition(), { moment: "fizzle" }, 16); done(action); return; }
            const ref = String(target.ref());
            let applied = 0;

            /** 收束：停掉连接纹，交回动作。 */
            function settle(current: CombatAction): void {
                scenes.stop(current, "grate");
                scenes.finish(current, done);
            }

            /** 目标离开射程、离场或被换掉：剩下的刮擦不再发生，已实现的等级变化保留。 */
            function breakOff(current: CombatAction, point: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, metalsoundScene, 1, point,
                    { moment: "snap", target: ref, applied: applied, total: total, sparks: Math.round(10 + applied * 6) }, 22);
                WorldFeedback.text(scope, metalsoundAbove(point), "world_combat.move.metalsound.text.break", [], 26);
                settle(current);
            }

            /** 一次刮擦：重新核对在射程内，降一级特防并记下声纹抵达。 */
            function scrape(current: CombatAction, remaining: number): void {
                const scope = current.world();
                current.stopMovement();
                const currentTarget = current.target();
                if (currentTarget === null || !scope.valid(currentTarget) || scope.friendly(currentTarget)) { settle(current); return; }
                const body = scope.observe(currentTarget);
                if (body === null) { settle(current); return; }
                const point = body.position();
                // 声音不需要通视：掩体挡不住金属音，但距离拉到 reach 之外就听不见。
                if (point.minus(origin).length() > reach) { breakOff(current, point); return; }
                if (applied === 0) MobEffects.apply(scope, currentTarget, metalsoundEffect, ring, 0);
                NativeEffects.boost(scope, currentTarget, "spd", -1);
                applied++;
                sound(current, "minecraft:block.amethyst_block.resonate");
                scenes.show(current, "grate", origin,
                    { moment: "grate", path: ["source", "target"], target: ref, cycles: cycles, long: long ? 1 : 0,
                        applied: applied, total: total, remaining: remaining });
                WorldFeedback.emit(scope, metalsoundScene, 1, point,
                    { moment: "scrape", target: ref, cycles: cycles, applied: applied, total: total,
                        sparks: Math.round(8 + applied * 5) }, 22);
                WorldFeedback.text(scope, metalsoundAbove(point), "world_combat.move.metalsound.text.grate", [applied], 26);
                if (remaining <= 1) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { scrape(next, remaining - 1); });
            }

            // 连接纹从第一次刮擦起就持续存在，每段更新一次；完成或被拉开时 stop 收束。
            scenes.show(action, "grate", origin,
                { moment: "grate", path: ["source", "target"], target: ref, cycles: cycles, long: long ? 1 : 0,
                    applied: 0, total: total, remaining: total });
            scrape(action, total);
        }
    });

    // 回响未消期间，目标身上持续荡开一圈圈金属声纹。
    WorldCombat.on("world_combat:move_metalsound/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== metalsoundEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "metalsound:" + String(actor.ref()), metalsoundScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
