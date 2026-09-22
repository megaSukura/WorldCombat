/**
 * 水流环 / Aqua Ring —— 执行组织与逐刻回血。
 *
 * 核心念头：把一层水幕拢在自己身上，它自己按钟涌一次、回一口；挂着水幕就能边走边回，直到走完时间或被清除。
 *
 * 一幕半：
 *   铺（windup 预告 + 提交后合拢）：脚下升起水环、水幕包住身体，给施法者挂上真实 MobEffect
 *     world_combat:aqua_ring（共享身份 world_combat:status/aquaring），旁边挂一枚机读标记带走间隔、
 *     每次回量、起止时刻与表现数值。
 *   涌（pulse × N）：每 `interval` 刻回 `pulse` 比例的最大生命（不超上限），脚下画一环、身上浮水光；
 *     间隔之外的拍子只续着水幕的持续表现。
 * 结束：时间走完或被人清除（牛奶／/effect clear）都会收掉标记与身份，水幕散去。
 * 与睡觉分开：睡觉是站定长休一次回满；水流环是不用站定的持续小额续航，可以边打边走。
 */
namespace PokemonSkills {
    WorldCombat.effect(aquaRingMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["start", "interval", "pulse", "ticks", "motes", "radius"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid aqua ring value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(aquaRingMark, "start", function (effect) {
        const data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(aquaRingMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(aquaRingMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        if (CombatStatus.has(world, self, aquaRingStatus)) CombatStatus.cure(world, self, aquaRingStatus);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, aquaRingScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
    });

    /** 回血走共享健康写入：宝可梦经过 NativeEffects.heal，其他战斗者直接写 MC 生命。 */
    function aquaRingHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number): number {
        const amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        let healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            const pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, aquaRingId);
        } else {
            healed = world.health(self, amount, "world_combat:" + aquaRingId);
        }
        const after = world.observe(self);
        if (healed > 0 && after) feedback(world, self, after.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    // 每次涌（pulse）自己安排下一次：间隔是参数算出的刻数，不必对齐到固定节拍。
    WorldCombat.effectHandler(aquaRingMark, "pulse", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const interval = Math.max(1, Math.round(data.interval));
        const scale = Math.max(0.5, Math.min(2.2, data.radius / 1.6));
        const healed = aquaRingHeal(world, self, Math.max(0, body.maxHealth() - body.health()), data.pulse);
        WorldFeedback.emit(world, aquaRingScene, 1, body.position(),
            { moment: "pulse", target: String(self.ref()), motes: data.motes, scale: scale,
                healed: Math.round(healed * 10) / 10,
                intensity: Math.max(0.5, Math.min(2, healed / Math.max(1, body.maxHealth()) * 22)) }, 22);
        // 水幕在下一次涌之前一直亮着：续期长度盖过间隔。
        WorldFeedback.keep(world, "world_combat:move_aquaring/veil/" + String(self.ref()), aquaRingScene, 1, body.position(),
            { moment: "veil", target: String(self.ref()), motes: data.motes, scale: scale }, Math.max(30, interval + 15));
        if (healed > 0) world.sound("minecraft:entity.fishing_bobber.splash", body.position(), 10, "{}");
        effect.schedule("pulse", "pulse", interval, "{}");
    });

    // 水幕被清掉（牛奶／/effect clear／到期）时收回标记，避免留下没有结算的水环。
    WorldCombat.on("world_combat:move_aquaring/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== aquaRingEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, aquaRingMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    define({
        id: aquaRingId, name: "水流环",
        description: "把一层水幕拢在自己身上，它每隔一会儿涌一次、回一小口最大生命；水幕挂着自己走完时间或被清除，期间不用站定、可以边走边回。",
        uses: ["在拉锯战里给自己接一条稳定的续航线", "边后退边回血，把消耗战拖长", "在雨里把水幕开得更旺"],
        kind: "self", range: 0, prepare: 8, active: 0, recover: 6, cooldown: 120, style: "aqua",
        stationary: false, maximumTicks: 400,
        defaults: { spring: false },
        fields: [flag("spring", "涌泉")],
        indicator: function () { return { radius: 1, style: "aqua", color: 0x4FC3E8, label: "水流环" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aquaRingId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aquaRingId, "tempo", context)),
                recover: Math.round(p(aquaRingId, "aftercast", context)),
                cooldown: Math.round(p(aquaRingId, "recharge", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!world.valid(self) || world.observe(self) === null) return "invalid-target";
            if (CombatStatus.has(world, self, aquaRingStatus)) return "already-ringed";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_aquaring:windup", aquaRingScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const ticks = Math.max(40, Math.round(p(aquaRingId, "ringTicks", action)));
            const interval = Math.max(10, Math.round(p(aquaRingId, "interval", action)));
            const pulse = Math.max(0.005, p(aquaRingId, "pulse", action));
            const motes = Math.max(8, Math.round(p(aquaRingId, "motes", action)));
            const radius = Math.max(0.8, p(aquaRingId, "veilRadius", action));
            sound(action, "minecraft:entity.player.splash");
            if (!CombatStatus.apply(world, self, aquaRingStatus, aquaRingEffect, ticks, 0, { unique: true })) { done(action); return; }
            const marks = world.effects(self, aquaRingMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(aquaRingMark, self, JSON.stringify({ start: world.tick(), interval: interval, pulse: pulse,
                ticks: ticks, motes: motes, radius: radius }), ticks);
            const scale = Math.max(0.5, Math.min(2.2, radius / 1.6));
            WorldFeedback.keep(world, "world_combat:move_aquaring/veil/" + String(self.ref()), aquaRingScene, 1, body.position(),
                { moment: "veil", target: String(self.ref()), motes: motes, scale: scale }, Math.max(30, interval + 15));
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), aquaRingTextVeil, [Math.round(ticks / 20)], 28);
            done(action);
        }
    });
}
