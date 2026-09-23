/**
 * 吵闹 / uproar 的出手方式。
 *
 * 核心念头：站在原地扯开嗓子连喊几声，一圈圈声浪撞在附近每个人身上；只要这一阵还没停，
 *   听见的人就睡不着。声音以自己为圆心，所以想罩住谁就得先走进谁的身边。
 *
 * 三幕：
 *   起：提交前 windup 在喉头聚起声线（action.present），只用 action.sense 观察。
 *   喊：提交后给自己挂 world_combat:uproar_voice（共享身份 uproar，止眠的凭据），并以自己为源起一个
 *      绑定效果 world_combat:uproar_roar，按 interval 连发 pulses 圈声浪；每圈用
 *      WorldGeometry.selectEnemies 取半径内非友方，逐个 hurt 一记声音伤害，并 keep 画面。
 *   收：喊完最后一圈绑定效果结束；声音身份到点自行褪去，被牛奶或别的手段清掉则提前收声。
 * 止眠：共享 CombatStatus.gate 拦下落在「听得见吵闹」的目标身上的一切 sleep；开场先把范围内已睡的喊醒。
 * 反制：声浪只作用到贴近的人，走开或不靠近即可；它不改变地形，也不追人。
 */
namespace PokemonSkills {
    const uproarSleepText = "world_combat.move.uproar.text.sleep";
    const uproarWakeText = "world_combat.move.uproar.text.wake";

    /** 绑定效果的命名空间数据只描述这一阵声浪：半径、止眠范围、威力、间隔与剩余段数。 */
    function uproarRoarData(json: string): string {
        const value = JSON.parse(json);
        ["radius", "guard", "power", "interval", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid uproar roar");
        });
        if (value.radius <= 0 || value.interval < 1 || value.left < 0) throw new Error("Invalid uproar roar");
        return JSON.stringify(value);
    }

    /** 声浪每一圈都按同一个威力换算画面亮度；机制值变了画面才变。 */
    function uproarIntensity(power: number): number { return Math.max(0.6, Math.min(2, power / 64)); }

    WorldCombat.effect(uproarRoar, 1, 1200, "actor", uproarRoarData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(uproarRoar, "start", function (effect) {
        effect.schedule("pulse", "pulse", 1, "{}");
    });
    WorldCombat.effectHandler(uproarRoar, "pulse", function (effect) {
        const world = effect.world(), singer = effect.source(), data = JSON.parse(effect.state());
        if (!world.valid(singer)) { effect.end(); return; }
        const body = world.observe(singer);
        if (body === null) { effect.end(); return; }
        const centre = body.position(), radius = data.radius, power = data.power;
        let hits = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius), function (target) {
            hurt(world, target, "uproar", power, { damage: damageSpec("uproar", "shout"), sound: true });
            hits++;
            const at = world.observe(target);
            if (at !== null) WorldFeedback.emit(world, uproarScene, 1, at.position(),
                { moment: "shock", target: String(target.ref()), intensity: uproarIntensity(power), scale: radius / 5 }, 22);
        });
        WorldFeedback.emit(world, uproarScene, 1, centre,
            { moment: "roar", scale: radius / 5, radius: radius, intensity: uproarIntensity(power), hits: hits, pulse: data.left }, 26);
        world.sound("minecraft:entity.warden.sonic_boom", centre, 22, "{}");
        data.left = data.left - 1;
        effect.state(JSON.stringify(data));
        if (data.left > 0) effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
        else effect.end();
    });
    WorldCombat.effectHandler(uproarRoar, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(uproarRoar, "end", function (effect) {
        const world = effect.world(), singer = effect.source();
        if (!world.valid(singer)) return;
        const body = world.observe(singer);
        if (body !== null) WorldFeedback.emit(world, uproarScene, 1, body.position(), { moment: "fade", target: String(singer.ref()) }, 22);
    });
    // 声音身份被外力清掉（牛奶、/effect clear、别的招式）时，声浪随之收声。
    WorldCombat.on("world_combat:move_uproar/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== uproarVoice) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, uproarVoice) !== null) return;
        const roars = world.effects(actor, uproarRoar);
        for (let i = 0; i < roars.length; i++) world.operation(roars[i].id(), "world_combat:dispel", "{}");
    });

    /** 听不听得见吵闹：周围有带着 uproar 身份的人，且自己在它记录的止眠范围内；身份就是凭据。 */
    function uproarCovers(world: CombatWorld, target: CombatActor): boolean {
        if (!world.valid(target)) return false;
        if (CombatStatus.has(world, target, "uproar")) return true;
        const body = world.observe(target);
        if (body === null) return false;
        const centre = body.position(), near = world.query(centre, 24, false);
        for (let i = 0; i < near.length; i++) {
            const other = near[i];
            if (!CombatStatus.has(world, other, "uproar")) continue;
            const otherBody = world.observe(other);
            if (otherBody === null) continue;
            let guard = 6.5;
            const roars = world.effects(other, uproarRoar);
            for (let j = 0; j < roars.length; j++) {
                try {
                    const data = JSON.parse(roars[j].data());
                    if (typeof data.guard === "number" && data.guard > guard) guard = data.guard;
                } catch (error) { }
            }
            if (centre.minus(otherBody.position()).length() <= guard) return true;
        }
        return false;
    }
    CombatStatus.gate.define({
        id: "world_combat:uproar/sleep",
        applies: function (context) { return context.name === "sleep"; },
        apply: function (context) {
            if (uproarCovers(context.world, context.actor)) { context.allowed = false; context.reason = "uproar"; }
        }
    });

    define({
        id: "uproar",
        name: "吵闹",
        description: "连喊几声，一圈圈声浪以自己为圆心撞向附近的敌人；只要这一阵还没停，听见声音的人就睡不着。声浪每一圈都从你当时的位置散开，站到谁身边就罩到谁，走开就听不见。",
        uses: ["被围住时向四周同时开火", "堵住对方的睡眠与恢复", "把贴身追击的人一起震开"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "uproar",
        defaults: { sustain: false, ai: { maxChase: 10, minFoes: 1, leaveStation: false } },
        fields: [flag("sustain", "长啸")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["uproar"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const sustain = !!(config && config.sustain);
            return {
                prepare: Math.round(p("uproar", "prepare", context) + (sustain ? 3 : 0)),
                recover: Math.round(p("uproar", "recover", context)),
                cooldown: Math.round(p("uproar", "cooldown", context) * (sustain ? 1.15 : 1)),
                active: 0,
                range: 0
            };
        },
        windup: function (action, config, prepare) {
            action.present("uproar:windup", uproarScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", sustain: config && config.sustain ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: p("uproar", "radius", pokemon), geometry: "circle", style: "uproar",
                label: config && config.sustain ? "吵闹·长啸" : "吵闹" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), singer = action.actor();
            const body = world.observe(singer);
            const centre = body === null ? action.origin() : body.position();
            const radius = Math.max(3.6, Math.min(9.0, p("uproar", "radius", action)));
            const guard = Math.max(radius, Math.min(11.0, p("uproar", "guardRadius", action)));
            const power = p("uproar", "shout", action);
            const interval = Math.max(6, Math.round(p("uproar", "interval", action)));
            const pulses = Math.max(1, Math.round(p("uproar", "pulses", action)));
            const duration = interval * pulses + 20;
            MobEffects.apply(world, singer, uproarVoice, duration, 0);
            // 开场先把已经睡着的人喊醒；「谁都不能入眠」从这一刻生效。
            let woken = 0;
            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, guard), function (target) {
                if (!CombatStatus.has(world, target, "sleep")) return;
                CombatStatus.cure(world, target, "sleep");
                woken++;
                const at = world.observe(target);
                if (at !== null) {
                    WorldFeedback.emit(world, uproarScene, 1, at.position(), { moment: "wake", target: String(target.ref()) }, 22);
                    WorldFeedback.text(world, at.position(), uproarWakeText, [], 26);
                }
            });
            WorldFeedback.emit(world, uproarScene, 1, centre,
                { moment: "roar", scale: radius / 5, radius: radius, intensity: uproarIntensity(power), hits: woken, pulse: pulses }, 24);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), uproarSleepText, [], 36);
            sound(action, "minecraft:entity.warden.sonic_charge");
            world.effect(uproarRoar, singer,
                JSON.stringify({ radius: radius, guard: guard, power: power, interval: interval, left: pulses }), duration);
            done(action);
        }
    });
}
