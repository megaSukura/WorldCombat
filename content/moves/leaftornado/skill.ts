/**
 * 青草搅拌器 / leaftornado 的出手方式。
 *
 * 核心念头：召起一圈锋利叶片，在选定地点立起旋转切割的旋风——它不是一颗弹丸，而是一块留在场上几秒的区域；
 * 每一拍割伤范围里的敌人，并按概率把叶屑扑进眼睛、削掉命中。对手可以走出旋风躲开后续切割。
 *
 * 选取：kind 为 point——玩家可以把旋风提前放在走道、门口或空地上，而不必锁定某个敌人。
 * 择一个固定落点后，旋风就停在原地不追人，命中下降每个目标整场只结算一次。
 *
 * 三幕：
 *   起：叶片在施法者周围升起打旋（提交前 windup 预告）。
 *   裹：提交后在所选落点立起旋风，按 `interval` 一拍一拍地切割；
 *       每一拍罩住范围内所有敌人，命中下降每个目标整场只结算一次，避免多拍叠满。
 *   散：时间走完，叶片四散。
 *
 * 与同族分开：另外三招都是把东西送到脸上的弹丸；青草搅拌器不飞，它把选定的地点变成一块会持续切割的区域，
 * 被罩住的目标可以走开，画面上的叶片环就是它的范围。
 */
namespace PokemonSkills {
    const leaftornadoScene = "world_combat:move_leaftornado";

    define({
        id: "leaftornado",
        name: "Leaf Tornado",
        description: "在瞄准的落点召起一圈锋利叶片，把走道或空地变成旋转切割的旋风；每一拍都割伤范围里的敌人，并可能把叶屑扑进眼睛、削掉命中。旋风停在原地，走出范围的敌人不再被后续的拍子切到。",
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
        indicator: function () { return { radius: 2.4, geometry: "circle", style: "leaf", color: 0x7CC24E, label: "青草搅拌器" }; },
        execute: function (action, move, config, done) {
            const world = action.world();
            const center = action.targetPosition();
            const radius = p("leaftornado", "radius", action);
            const shred = p("leaftornado", "shred", action);
            const blindChance = p("leaftornado", "blindChance", action);
            const blind = Math.max(1, Math.round(p("leaftornado", "blind", action)));
            const blades = Math.max(6, Math.round(p("leaftornado", "blades", action)));
            const duration = Math.max(20, Math.round(p("leaftornado", "duration", action)));
            const interval = Math.max(6, Math.round(p("leaftornado", "interval", action)));
            const pulses = Math.max(1, Math.round(duration / interval));
            const region = WorldGeometry.ring(center, 0, radius, { below: 2, above: 3 });
            const blinded: { [ref: string]: boolean } = {};
            let index = 0, hits = 0, settled = false;
            const scaleRing = radius / 2.6;
            const intensity = Math.max(0.4, Math.min(2, shred / 15)) * scaleRing;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), leaftornadoScene, 1, center,
                    { moment: "disperse", radius: radius, scatter: Math.max(8, Math.round(radius * 4)), hits: hits }, 30);
                done(current);
            }
            function pulse(current: CombatAction): void {
                if (settled) return;
                if (index >= pulses) { finish(current); return; }
                index++;
                const currentWorld = current.world();
                WorldGeometry.selectEnemies(currentWorld, region, function (target, facts) {
                    hurt(current, target, "leaftornado", shred, { damage: damageSpec("leaftornado", "shred"), slice: true });
                    hits++;
                    const ref = String(target.ref());
                    let blindedNow = false;
                    if (!blinded[ref] && currentWorld.random() < blindChance) {
                        blinded[ref] = true;
                        blindedNow = true;
                        NativeEffects.boost(currentWorld, target, "accuracy", -blind);
                        WorldFeedback.text(currentWorld, facts.position().plus(WorldCombat.point(0, 1.1, 0)),
                            "world_combat.move.leaftornado.text.blind", [blind], 30);
                    }
                    WorldFeedback.emit(currentWorld, leaftornadoScene, 1, facts.position(),
                        { moment: "cut", target: ref, blades: blades, blind: blindedNow ? 1 : 0,
                            flecks: blindedNow ? Math.max(6, Math.round(blades * 0.5)) : 0,
                            intensity: Math.max(0.4, Math.min(2, shred / 15)) }, 22);
                });
                if (index >= pulses) { finish(current); return; }
                current.after(interval, pulse);
            }
            sound(action, "cobblemon:move.razorleaf.actor_1");
            WorldFeedback.emit(world, leaftornadoScene, 1, center,
                { moment: "spin", radius: radius, flow: Math.max(30, Math.round(radius * 22)), blades: blades,
                    pulses: pulses, duration: duration, intensity: intensity }, duration + 30);
            pulse(action);
        }
    });
}
