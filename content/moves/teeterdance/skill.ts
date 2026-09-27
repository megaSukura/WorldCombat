/**
 * 摇晃舞 / teeterdance —— 执行组织与载体行为。
 *
 * 核心念头：一场把节奏推出去的舞。施法者先踏几拍小侧步，末拍才把舞圈里的每个活体（除自己）带进节奏：
 *   站不稳、走路会歪，出手也容易散。它不分敌我——连带盟友一起晃晕是它的代价，施法者自己反而不会中招。
 *
 * 出手：短起手（windup 播「起势」）后提交。
 * 编排：提交后先走 `beats` 拍，每拍朝侧向做一次真实、安全的小侧步（原生位移、撞墙即止），步幅与轨迹按实际移动画；
 *       末拍在当刻身体位置铺开舞圈，圈内每个非自己的活体挂上共享身份 world_combat:status/confusion 的
 *       world_combat:teeterdance_spin（物品栏可见、/effect 可用），并尝试当场用原生受击位移带偏一步——
 *       位移被抗击退或碰撞拒绝时不假装拖动。
 * 失手：载体不带 identity_only，共享 CombatStatus 门禁按载体振幅同时覆盖脚本招式与原生近战，本单元不再自己掷骰。
 * 持续：被带进节奏的人每 12 刻尝试朝侧向小位移一次（摇晃走位），只有真正移动了才画轨迹，行动受限时不重复补写。
 * 结束：晃动随载体到期自然停止；牛奶、/effect clear 与清除类效果都能提前把它解掉。
 * 反制：舞圈以施法者为圆心，站到半径之外就什么都不受影响；它也会把盟友卷进来，被围住时反而不好放。
 *       节奏是听觉的：判定不查通视，声音与地板一起把它送到墙体与楼层另一侧。
 */
namespace PokemonSkills {
    function teeterdanceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    define({
        id: teeterdanceId,
        cooldownParameter: "recharge",
        name: "摇晃舞",
        description: "先踏几拍小侧步，末拍把舞圈内除自己以外的每个活体都带进节奏，陷入混乱——站不稳、走路会歪、出手容易散。不分敌我，会连带盟友一起晃晕；站到半径之外就不受影响。这是一场听觉的舞。",
        uses: ["被围住时把一圈人一起晃晕", "打断贴身近战的走位与出手", "在人多的地方制造一片失衡"],
        kind: "self",
        range: 2.5,
        maxRange: 6,
        prepare: 12,
        active: 1,
        recover: 8,
        cooldown: 80,
        maximumTicks: 160,
        style: "dance",
        stationary: true,
        defaults: { careful: false, ai: { maxChase: 8, minFoes: 1 } },
        fields: [flag("careful", "顾友")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[teeterdanceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(teeterdanceId, "tempo", context)),
                recover: Math.round(p(teeterdanceId, "aftercast", context)),
                cooldown: Math.round(p(teeterdanceId, "recharge", context)),
                active: 1,
                range: p(teeterdanceId, "danceRadius", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[teeterdanceId], detail: { values: config } };
            return { radius: p(teeterdanceId, "danceRadius", context), geometry: "area", style: "dance", color: 0xB15CE0,
                label: config && config.careful === true ? "摇晃舞 · 顾友" : "摇晃舞" };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_teeterdance:windup", teeterdanceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", careful: config && config.careful === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const careful = !!(config && config.careful);
            const radius = Math.max(2.5, p(teeterdanceId, "danceRadius", action));
            const ticks = Math.max(60, Math.round(p(teeterdanceId, "dazeTicks", action)));
            const sway = Math.max(0.04, Math.min(0.2, p(teeterdanceId, "sway", action)));
            const amplifier = Math.max(1, Math.round(sway * 100));
            const beats = Math.max(2, Math.min(6, Math.round(p(teeterdanceId, "beats", action))));
            const beatTicks = Math.max(3, Math.round(p(teeterdanceId, "beatTicks", action)));
            const motes = Math.max(12, Math.round(p(teeterdanceId, "motes", action)));
            const scenes = WorldFeedback.actionScenes(teeterdanceScene);

            /** 末拍：在当刻身体位置铺开舞圈，圈内每人不分敌我（顾友式除外）被带进节奏一次。 */
            function burst(current: CombatAction): void {
                const now = current.world(), here = now.observe(actor);
                if (here === null) { scenes.finish(current, done); return; }
                const centre = here.position();
                let caught = 0;
                scenes.stop(current, "tempo");
                WorldFeedback.emit(now, teeterdanceScene, 1, centre,
                    { moment: "dance", radius: radius, motes: motes, beats: beats, beatTicks: beatTicks,
                        intensity: Math.max(0.7, Math.min(2, motes / 28)) }, 30);
                WorldGeometry.select(now, WorldGeometry.ring(centre, 0, radius, { below: 3.5, above: 4 }), function (target, facts) {
                    if (String(target.ref()) === String(actor.ref())) return;
                    if (careful && facts.friendly()) return;
                    if (!CombatStatus.apply(now, target, teeterdanceStatus, teeterdanceEffect, ticks, amplifier, { unique: true })) return;
                    caught++;
                    // 只尝试原生受击位移（保留抗击退与事件），按真正发生的位移表现；免疫或被挡住时不画拖动。
                    const angle = now.random() * Math.PI * 2;
                    const step = WorldCombat.point(Math.cos(angle) * sway, 0, Math.sin(angle) * sway);
                    const from = facts.position();
                    const moved = now.hitDisplace(target, step);
                    const after = now.observe(target);
                    const at = after === null ? from : after.position();
                    WorldFeedback.emit(now, teeterdanceScene, 1, at,
                        { moment: "daze", target: String(target.ref()), motes: Math.max(8, Math.round(motes / 2)), intensity: 1 }, 26);
                    if (moved > 0.01) WorldFeedback.emit(now, teeterdanceScene, 1, from,
                        { moment: "sway", target: String(target.ref()), motes: Math.max(6, Math.round(moved * 60)),
                            moved: Math.round(moved * 100) / 100 }, 16);
                });
                if (caught === 0) WorldFeedback.emit(now, teeterdanceScene, 1, centre,
                    { moment: "steady", radius: radius }, 20);
                WorldFeedback.text(now, teeterdanceAbove(centre),
                    caught > 0 ? teeterdanceDazeText : teeterdanceSteadyText,
                    caught > 0 ? [caught, Math.round(sway * 100)] : [radius], 30);
                sound(current, "cobblemon:status.volatile.confusion.actor");
                now.sound("minecraft:block.note_block.pling", centre, 14, "{}");
                scenes.finish(current, done);
            }

            /** 一拍：朝当刻朝向的侧向做一次真实小侧步；末拍再发作。 */
            function beat(current: CombatAction, index: number): void {
                const now = current.world(), here = now.observe(actor);
                if (here === null) { scenes.finish(current, done); return; }
                const look = WorldGeometry.facing(now, actor);
                const forward = look === null ? WorldCombat.point(1, 0, 0) : WorldGeometry.flatUnit(look);
                const side = WorldCombat.point(-forward.z(), 0, forward.x());
                const sign = index % 2 === 0 ? 1 : -1;
                // 安全小侧步：原生位移受碰撞限制，撞墙即止；实际移动多少就画多少。
                const moved = now.displace(actor, side.scale(sway * sign));
                const at = (now.observe(actor) || here).position();
                scenes.show(current, "tempo", at,
                    { moment: "tempo", target: String(actor.ref()), beat: index, beats: beats, radius: radius,
                        motes: Math.max(6, Math.round(motes * 0.4)), moved: Math.round(moved * 100) / 100 });
                now.sound("minecraft:block.note_block.hat", at, 10, "{}");
                if (index >= beats) { burst(current); return; }
                current.after(beatTicks, function (next: CombatAction) { beat(next, index + 1); });
            }

            beat(action, 1);
        }
    });

    // 摇晃走位：被带进节奏的人每 12 刻朝侧向被带偏一小步；摇晃强度由载体振幅（sway 百分数）读回。
    WorldCombat.on("world_combat:move_teeterdance/sway", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== teeterdanceEffect || event.world().tick() % teeterdanceInterval !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const effect = MobEffects.read(world, actor, teeterdanceEffect);
        if (effect === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const velocity = body.velocity();
        let heading = WorldCombat.point(velocity.x(), 0, velocity.z());
        if (heading.length() < 0.02) heading = WorldCombat.point(1, 0, 0);
        heading = heading.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const sign = Math.floor(world.tick() / teeterdanceInterval) % 2 === 0 ? 1 : -1;
        const strength = Math.max(0.04, Math.min(0.2, effect.amplifier() / 100));
        const step = side.scale(strength * sign);
        const from = body.position();
        // 受击位移走原生 hitDisplace：抗击退、击退事件与碰撞都参与；推不动就不画轨迹。
        const moved = world.hitDisplace(actor, step);
        if (!(moved > 0.01)) return;
        const after = world.observe(actor);
        const at = after === null ? from : after.position();
        WorldFeedback.emit(world, teeterdanceScene, 1, at,
            { moment: "sway", target: String(actor.ref()), motes: Math.max(6, Math.round(moved * 60)),
                moved: Math.round(moved * 100) / 100 }, 16);
    });
}
