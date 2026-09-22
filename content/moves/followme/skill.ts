/**
 * 看我嘛 / Follow Me —— 执行组织。
 *
 * 核心念头：原地抬手招呼一嗓子，把身边的敌人的注意全勾到自己身上——原本打向同伴的火力会不断被拉过来；
 *   它是一嗓子，不限属性、不看目标，也不给任何人加成。
 *
 * 两幕：
 *   呼（windup 在提交前只观察与预告；准备期很短，忠实原生优先度 +2）。
 *   引（提交后）：给自己挂上真实 MobEffect world_combat:followed（共享身份 world_combat:status/followme），
 *     旁边挂一枚机读标记；标记每 `interval` 刻把喊话半径内不属于自己的敌人重新指向自己（world.target），
 *     脚下画出一圈随半径扩散的招呼波。
 * 结束：喊住时长走完或被清除时收回标记、清掉身份，注意散去。
 * 反制：被拉过来只是「下一个目标是你」，敌人仍可以走位、放远程或干脆离开喊话半径；注意会随时间失效。
 */
namespace PokemonSkills {
    WorldCombat.effect(followMeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid follow me value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(followMeMark, "start", function (effect) { effect.schedule("call", "call", 1, "{}"); });
    WorldCombat.effectHandler(followMeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(followMeMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        if (CombatStatus.has(world, self, followMeStatus)) CombatStatus.cure(world, self, followMeStatus);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, followMeScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), followMeTextFade, [], 22);
    });

    WorldCombat.effectHandler(followMeMark, "call", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const radius = Math.max(1, data.radius), centre = body.position();
        const found = world.query(centre, radius, false);
        let lured = 0;
        for (let index = 0; index < found.length; index++) {
            const other = found[index];
            if (String(other.ref()) === String(self.ref())) continue;
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || facts.player()) continue;
            if (world.target(other, self)) lured++;
        }
        WorldFeedback.emit(world, followMeScene, 1, centre,
            { moment: "call", target: String(self.ref()), motes: data.motes, lured: lured,
                wave: Math.max(0.1, radius / 20), intensity: Math.max(0.7, Math.min(1.8, 0.7 + lureCount(lured))) }, 24);
        WorldFeedback.keep(world, "world_combat:move_followme/held/" + String(self.ref()), followMeScene, 1, centre,
            { moment: "held", target: String(self.ref()), motes: data.motes, lured: lured }, 30);
        if (lured > 0) world.sound("minecraft:block.note_block.bell", centre, 14, "{}");
        effect.schedule("call", "call", Math.max(4, Math.round(data.interval)), "{}");
    });

    /** 被拉住的敌人数换算成表现强度（小工具，避免在对象字面量里堆运算）。 */
    function lureCount(lured: number): number {
        return Math.min(1.1, lured * 0.25);
    }

    // 身份被清掉（时长走完以外的手段：牛奶／/effect clear）时收回标记。
    WorldCombat.on("world_combat:move_followme/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== followMeEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, followMeMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    define({
        id: followMeId, name: "看我嘛",
        description: "原地抬手招呼，把喊话半径内敌人的攻击目标不断拉到自己身上；喊住时长之内注意都在你身上，不限属性、也不给谁加成。",
        uses: ["替身边的同伴把火力引到自己身上", "把贴住同伴的敌人拉过来，给同伴脱身的机会", "在开阔地挡住追兵，把交战点聚到自己这里"],
        kind: "self", range: 0, prepare: 5, active: 0, recover: 5, cooldown: 100, style: "call",
        stationary: true, maximumTicks: 400,
        defaults: { shout: false },
        fields: [flag("shout", "喊话")],
        indicator: function () { return { radius: 1, style: "call", color: 0xFF9ECF, label: "看我嘛" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[followMeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(followMeId, "tempo", context)),
                recover: Math.round(p(followMeId, "aftercast", context)),
                cooldown: Math.round(p(followMeId, "recharge", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!world.valid(self) || world.observe(self) === null) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_followme:windup", followMeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const ticks = Math.max(40, Math.round(p(followMeId, "callTicks", action)));
            const interval = Math.max(8, Math.round(p(followMeId, "interval", action)));
            const radius = Math.max(2, p(followMeId, "callRadius", action));
            const motes = Math.max(10, Math.round(p(followMeId, "motes", action)));
            sound(action, "minecraft:block.note_block.chime");
            if (!CombatStatus.apply(world, self, followMeStatus, followMeEffect, ticks, 0, { unique: true })) { done(action); return; }
            const marks = world.effects(self, followMeMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(followMeMark, self, JSON.stringify({ interval: interval, radius: radius, motes: motes }), ticks);
            WorldFeedback.emit(world, followMeScene, 1, body.position(),
                { moment: "call", target: String(self.ref()), motes: motes, wave: Math.max(0.1, radius / 20), lured: 0 }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), followMeTextCall, [radius], 26);
            done(action);
        }
    });
}
