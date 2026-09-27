/**
 * 青草搅拌器 / leaftornado 的出手方式。
 *
 * 核心念头：召起一圈锋利叶片，在选定地点立起旋转切割的旋风——它不是一颗弹丸，而是一块留在场上几秒的区域；
 * 每一拍割伤范围里的敌人，并按概率把叶屑扑进眼睛、削掉命中。对手可以走出旋风躲开后续切割。
 *
 * 选取：kind 为 point——玩家可以把旋风提前放在走道、门口或空地上，而不必锁定某个敌人。
 * 落点必须是真实支撑面上的可达点：脚下要有顶面，且施法者到落点没有方块阻挡；否则空放。
 *
 * 三幕：
 *   起：叶片在施法者周围升起打旋（提交前 windup 预告）。
 *   裹：提交后在所选落点立起旋风，作为**一块自己的托管区域**（`world_combat:leaftornado_storm`）留在场上：
 *       它不属于出手动作，术者随后交回共享战斗顺序。区域每 `interval` 切割一拍，直到整段 `duration` 走完；
 *       最后一拍落在时长之内，收尾才散叶。
 *   散：时间走完，叶片四散。
 *
 * 每一拍只对真被切到、且仍有效的非友方结算一次伤害；只有这一次真的造成伤害，才掷一次降命中，
 * 并按实际变化反馈。同一目标整场最多成功一次，避免多拍叠满。区域被墙挡住（`blockHit`）的目标不吃刀。
 *
 * 与同族分开：另外三招都是把东西送到脸上的弹丸；青草搅拌器不飞，它把选定的地点变成一块会持续切割的区域，
 * 被罩住的目标可以走开，画面上的叶片环就是它的范围。
 */
namespace PokemonSkills {
    const leaftornadoScene = "world_combat:move_leaftornado";
    const leaftornadoStorm = "world_combat:leaftornado_storm";
    const leaftornadoBlindText = "world_combat.move.leaftornado.text.blind";

    function leaftornadoPoint(value: any): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }

    /** 落点必须是真实支撑面上的可达点：脚下有顶面，且施法者到落点上方没有方块阻挡；否则返回 null。 */
    function leaftornadoGround(world: CombatWorld, origin: CombatPoint, raw: CombatPoint): CombatPoint | null {
        const ground = SurfacePaths.support(world, raw, 1.5, 6);
        if (ground === null) return null;
        const probe = ground.plus(WorldCombat.point(0, 0.4, 0));
        if (WorldGeometry.blockHit(world, origin.plus(WorldCombat.point(0, 0.6, 0)), probe) !== null) return null;
        return ground;
    }

    function leaftornadoStormData(json: string): string {
        const value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3) throw new Error("Invalid leaf tornado anchor");
        ["radius", "shred", "interval", "blindChance", "blind", "blades", "duration", "end", "total", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid leaf tornado storm");
        });
        if (value.radius <= 0 || value.interval < 1 || value.duration < 1 || value.total < 1 || !isFinite(value.end)) throw new Error("Invalid leaf tornado storm");
        if (value.blinded === undefined || value.blinded === null || typeof value.blinded !== "object") value.blinded = {};
        return JSON.stringify(value);
    }

    /** 一拍：真被切到的非友方各结算一次；只有这次真的造成伤害才可能再成功降一次命中，被墙挡住的不吃刀。 */
    function leaftornadoPulse(effect: CombatEffect): void {
        const world = effect.world(), data = JSON.parse(effect.state());
        const centre = leaftornadoPoint(data.point);
        WorldGeometry.selectBodies(world, WorldGeometry.bodySphere(centre, Math.max(0.5, data.radius)), function (victim, facts) {
            if (facts.friendly() || facts.health() <= 0) return;
            if (WorldGeometry.blockHit(world, centre, facts.position()) !== null) return;
            if (!hurt(world, victim, "leaftornado", data.shred,
                { damage: damageSpec("leaftornado", "shred"), slice: true })) return;
            const ref = String(victim.ref());
            let blindedNow = false;
            if (!data.blinded[ref] && world.random() < data.blindChance) {
                const dropped = NativeEffects.boost(world, victim, "accuracy", -data.blind);
                if (dropped !== 0) {
                    data.blinded[ref] = true;
                    blindedNow = true;
                    const at = world.observe(victim);
                    WorldFeedback.text(world, (at !== null ? at.position() : facts.position()).plus(WorldCombat.point(0, 1.1, 0)),
                        leaftornadoBlindText, [data.blind], 30);
                }
            }
            WorldFeedback.emit(world, leaftornadoScene, 1, facts.position(),
                { moment: "cut", target: ref, blades: data.blades, blind: blindedNow ? 1 : 0,
                    flecks: blindedNow ? Math.max(6, Math.round(data.blades * 0.5)) : 0,
                    intensity: Math.max(0.4, Math.min(2, data.shred / 15)) }, 22);
        });
        data.pulses = (data.pulses || 0) + 1;
        effect.state(JSON.stringify(data));
    }

    // 旋风是一块自己的托管区域：术者随后可以继续行动，区域按自己的时长一拍一拍地切割。
    WorldCombat.effect(leaftornadoStorm, 1, 260, "actor", leaftornadoStormData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(leaftornadoStorm, "start", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        // 全程绑定在真实区域效果上：区域到期或被驱散，叶片环与地面范围同时收走。
        WorldFeedback.onEffect(world, effect.id(), "leaftornado:storm", leaftornadoScene, 1, leaftornadoPoint(data.point),
            { moment: "spin", radius: data.radius, flow: Math.max(30, Math.round(data.radius * 22)), blades: data.blades,
                duration: data.duration, interval: data.interval, repeats: Math.max(2, Math.ceil(data.duration / 5) + 2),
                pulses: 0, intensity: data.intensity });
        effect.schedule("pulse", "pulse", 1, "{}");
    });
    WorldCombat.effectHandler(leaftornadoStorm, "pulse", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (!world.valid(effect.source()) || world.tick() >= data.end) { effect.end(); return; }
        // 拍数固定为 round(duration / interval)：切满这些拍后，旋风继续旋转但不再出刀，直到整段时长走完才散。
        if ((data.pulses || 0) < data.total) leaftornadoPulse(effect);
        const remaining = data.end - world.tick();
        effect.schedule("pulse", "pulse", Math.max(1, Math.min(Math.round(data.interval), remaining)), "{}");
    });
    WorldCombat.effectHandler(leaftornadoStorm, "end", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        WorldFeedback.emit(world, leaftornadoScene, 1, leaftornadoPoint(data.point),
            { moment: "disperse", radius: data.radius, scatter: Math.max(8, Math.round(data.radius * 4)),
                hits: data.pulses || 0, blades: data.blades, intensity: data.intensity }, 30);
    });
    WorldCombat.effectHandler(leaftornadoStorm, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "leaftornado",
        name: "Leaf Tornado",
        description: "在瞄准的可达落点召起一圈锋利叶片，把走道或空地变成一块持续旋转切割的旋风：旋风留在原地继续切，术者随后可以自由行动；每一拍都割伤范围里的敌人，只有真被切到才可能把叶屑扑进眼睛、削掉命中。旋风停在原地，走出范围的敌人不再被后续的拍子切到；落点需要真实支撑面且不能被墙挡住。",
        uses: ["把走道或门口预先变成持续切割的区域", "同时割伤扎堆的敌人", "用叶屑不断掷概率致盲"],
        kind: "point",
        range: 11,
        maxRange: 18,
        prepare: 10,
        active: 0,
        recover: 10,
        cooldown: 48,
        style: "leaf",
        defaults: { tight: false, ai: { maxChase: 17, crowd: true, lead: 6, leaveStation: true } },
        fields: [
            flag("tight", "紧裹")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["leaftornado"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const tight = !!(config && config.tight);
            return { prepare: Math.round(p("leaftornado", "tempo", context)), recover: 10,
                cooldown: 48 + (tight ? 4 : 0), active: 0, range: p("leaftornado", "reach", context) };
        },
        windup: function (action, config, prepare) {
            action.present("leaftornado:gather", leaftornadoScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "gather", tight: config && config.tight ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const radius = pokemon ? p("leaftornado", "radius", pokemon) : 2.6;
            return { radius: radius, geometry: "circle", style: "leaf", color: 0x7CC24E,
                label: config && config.tight === true ? "紧裹青草搅拌器" : "青草搅拌器" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const centre = leaftornadoGround(world, action.origin(), action.targetPosition());
            if (centre === null) {
                WorldFeedback.emit(world, leaftornadoScene, 1, action.targetPosition(), { moment: "miss" }, 18);
                done(action);
                return;
            }
            const radius = Math.max(1.2, p("leaftornado", "radius", action));
            const shred = p("leaftornado", "shred", action);
            const blindChance = Math.max(0.01, Math.min(0.95, p("leaftornado", "blindChance", action)));
            const blind = Math.max(1, Math.round(p("leaftornado", "blind", action)));
            const blades = Math.max(6, Math.round(p("leaftornado", "blades", action)));
            const duration = Math.max(20, Math.round(p("leaftornado", "duration", action)));
            const interval = Math.max(6, Math.round(p("leaftornado", "interval", action)));
            const intensity = Math.max(0.4, Math.min(2, shred / 15));
            const state = { point: [centre.x(), centre.y(), centre.z()], radius: radius, shred: shred,
                interval: interval, blindChance: blindChance, blind: blind, blades: blades,
                duration: duration, end: world.tick() + duration, total: Math.max(1, Math.round(duration / interval)),
                pulses: 0, intensity: intensity, blinded: {} };
            world.effect(leaftornadoStorm, action.actor(), JSON.stringify(state), duration + 20);
            WorldFeedback.emit(world, leaftornadoScene, 1, centre,
                { moment: "open", radius: radius, blades: blades, intensity: intensity }, 20);
            sound(action, "cobblemon:move.razorleaf.actor_1");
            done(action);
        }
    });
}
