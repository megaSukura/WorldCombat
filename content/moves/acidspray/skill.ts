/**
 * 酸液炸弹 / acidspray —— 注册与动作。
 *
 * 核心念头：**贴脸喷出一整片短而宽的酸雾，把身前楔形里所有人的特防一次溶掉两级**——不脱手、没有飞行物，
 * 雾还在空气里停一小会儿，走进来的人也会被淋到（每人只算一次）。
 *
 * 三幕：
 *   起（windup，提交前）：喉间与口边聚起酸滴（`action.present` 预告，不碰世界）。
 *   喷（spray，提交后）：以施法者为顶点的楔形里每个敌人各结算一次 `core` 伤害，并无条件
 *       `NativeEffects.boost(..., "spd", -2)`；画面按同一组楔角与射程画出来。
 *   留（drift → fade）：原地租借一个锥形酸雾场地（规则 `world_combat:acidspray_drift` 由本单元注册），
 *       停留 `cloudTicks`；期间第一次走进锥里（且未被淋过）的人再挨一口 `drift` 并同样 −2 级特防。
 *
 * 与同族分开：同是「喷酸」，溶解液是低弧抛出的一团酸、落点留池、只是概率掉防；酸液炸弹不脱手、
 * 是覆盖身前一整块楔形的即时喷雾、命中必定掉两级、射程最短、PP 最多——四式里最便宜的一口狠的。
 *
 * 配置 `focus`（聚焦喷口）由 resolve 改时序与射程、由公式改张角与单发：开启＝窄而远、单发更重；
 * 关闭＝宽喷，一次淋一片。
 */
namespace PokemonSkills {
    const acidsprayScene = "world_combat:move_acidspray";
    const acidsprayDrift = "world_combat:acidspray_drift";
    const acidspraySunderText = "world_combat.move.acidspray.text.sunder";

    /** 锥形酸雾场地：以 store 里的 origin/direction 为形，只在锥内、且每人只咬一次。 */
    WorldEffects.fieldRule(acidsprayDrift, {
        stay: function (world, actor, field) {
            if (world.friendly(actor)) return;
            const data = field.data as any, body = world.observe(actor);
            if (body === null) return;
            const origin = WorldCombat.point(data.origin[0], data.origin[1], data.origin[2]);
            const region = WorldGeometry.sector(origin, WorldCombat.point(data.direction[0], 0, data.direction[2]),
                data.range, data.angle, { below: 2, above: 3 });
            if (!region.contains(body.position())) return;
            const hit = data.hit || (data.hit = {}), ref = String(actor.ref());
            if (hit[ref]) return;
            hit[ref] = true;
            if (!hurt(world, actor, "acidspray", data.power, { damage: damageSpec("acidspray", "drift") })) return;
            NativeEffects.boost(world, actor, "spd", -Math.max(1, Math.round(data.stages)));
            WorldFeedback.emit(world, acidsprayScene, 1, body.position(),
                { moment: "drift_hit", target: ref, drops: data.drops, scale: data.scale,
                    intensity: Math.max(0.5, Math.min(1.8, data.power / 12)) }, 20);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), acidspraySunderText,
                [Math.max(1, Math.round(data.stages))], 28);
        }
    });

    define({
        id: "acidspray",
        name: "Acid Spray",
        description: "在身前喷出一道短而宽的酸雾：楔形里的每个敌人各承受一次特殊伤害，特防立刻下降 2 级；酸雾在原地停留片刻，期间走进来的人也会被淋到。聚焦喷口更窄更远、单发更重，宽喷一次罩住一片。",
        uses: ["贴脸一次淋掉身前一群对手的两级特防", "用最便宜的出手反复磨特防", "在窄口把想挤过来的对手连人带路一起喷酸"],
        kind: "enemy",
        range: 5,
        maxRange: 9,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 22,
        style: "corrosive",
        defaults: { focus: false, ai: { maxChase: 8, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("acidspray", "sprayRange", pokemon), geometry: "area", style: "corrosive",
                color: 0x8FCB3A, label: config && config.focus === true ? "聚焦喷口酸液炸弹" : "宽喷酸液炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["acidspray"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const focus = !!(config && config.focus);
            return {
                prepare: Math.round(p("acidspray", "tempo", context)),
                recover: 8,
                cooldown: 22 + (focus ? 5 : 0),
                active: 0,
                range: p("acidspray", "sprayRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:acidspray:" + action.id(), acidsprayScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const aim = PokemonSkills.aim(action);
            const power = p("acidspray", "core", action);
            const driftPower = p("acidspray", "drift", action);
            const range = Math.max(3.0, p("acidspray", "sprayRange", action));
            const angle = Math.max(20, p("acidspray", "sprayAngle", action));
            const cloud = Math.max(20, Math.round(p("acidspray", "cloudTicks", action)));
            const drops = Math.max(10, Math.round(p("acidspray", "droplets", action)));
            const stages = Math.max(1, Math.round(p("acidspray", "sunderStages", action)));
            const scale = Math.max(0.5, Math.min(2.4, range / 5.0));
            const intensity = Math.max(0.5, Math.min(2.2, power / 38));
            const direction = [aim.x(), aim.y(), aim.z()];
            let hits = 0;

            sound(action, "cobblemon:move.acidspray.actor");
            const region = WorldGeometry.sector(origin, aim, range, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                if (!hurt(action, enemy, "acidspray", power, { damage: damageSpec("acidspray", "core") })) return;
                hits++;
                NativeEffects.boost(world, enemy, "spd", -stages);
                WorldFeedback.emit(world, acidsprayScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), drops: drops, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), acidspraySunderText, [stages], 30);
            });
            WorldFeedback.emit(world, acidsprayScene, 1, origin,
                { moment: "spray", direction: direction, range: range, angle: angle, drops: drops, scale: scale,
                    intensity: intensity, hits: hits }, 24);
            if (hits > 0) sound(action, "cobblemon:move.acidspray.target");

            const centre = origin.plus(aim.scale(range * 0.5));
            WorldEffects.field(world, acidsprayDrift, centre, range * 0.5 + 1.5,
                { origin: [origin.x(), origin.y(), origin.z()], direction: direction, range: range, angle: angle,
                    power: driftPower, stages: stages, drops: drops, scale: scale, hit: {} }, cloud);
            WorldFeedback.keep(world, "acidspray:drift:" + action.id(), acidsprayScene, 1, centre,
                { moment: "drift", direction: direction, range: range, angle: angle, drops: drops, scale: scale,
                    intensity: Math.max(0.4, Math.min(1.6, driftPower / 12)) }, cloud);
            done(action);
        }
    });
}
