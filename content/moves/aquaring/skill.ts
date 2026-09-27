/**
 * 水流环 / Aqua Ring —— 执行组织与逐刻回血。
 *
 * 核心念头：把一层水幕拢在自己身上，它自己按钟涌一次、回一口；挂着水幕就能边走边回，直到走完时间或被清除。
 *
 * 一幕半：
 *   铺（windup 预告 + 提交后合拢）：脚下升起水环、水幕包住身体，给施法者挂上真实 MobEffect
 *     world_combat:aqua_ring（共享身份 world_combat:status/aquaring），旁边挂一枚机读标记带走间隔、
 *     每次回量、起止时刻与表现数值，并把这次水幕的 carrier 修订用 lease 认下来——只有本次 carrier 还在，
 *     标记才有效；水幕被牛奶／/effect clear／被重铺替换时 lease 失效，标记与画面随之收走。
 *   涌（pulse × N）：每 `interval` 刻回 `pulse` 比例的已损失生命（不超上限），脚下画一环、身上浮水光；
 *     水幕本身由标记持续托管，不必每拍重发。
 * 结束：时间走完或被人清除都会收掉标记与身份；标记结束时 lease 收回本次水幕，画面（onEffect 绑在标记上）一起散去。
 * 与睡觉分开：睡觉是站定长休一次回满；水流环是不用站定的持续小额续航，可以边打边走。
 */
namespace PokemonSkills {
    WorldCombat.effect(aquaRingMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["start", "interval", "pulse", "ticks", "motes", "radius", "lease"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid aqua ring value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(aquaRingMark, "start", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(self)) { effect.end(); return; }
        // 只认本次铺下的水幕修订：别人重铺、牛奶清除或到期都会让旧 lease 失效，之后的清理都属于新的那次。
        const lease = MobEffects.bind(world, self, aquaRingEffect);
        if (!lease) {
            if (CombatStatus.has(world, self, aquaRingStatus)) CombatStatus.cure(world, self, aquaRingStatus);
            effect.end();
            return;
        }
        data.lease = lease;
        effect.state(JSON.stringify(data));
        const body = world.observe(self);
        if (body !== null) {
            const scale = Math.max(0.5, Math.min(2.2, Number(data.radius) / 1.6));
            // 水幕画面绑在标记效果上：标记在，画面在；标记收，画面一起收，不靠独立计时残留。
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_aquaring/veil", aquaRingScene, 1, body.position(),
                { moment: "veil", target: String(self.ref()), motes: data.motes, scale: scale });
        }
        effect.schedule("watch", "watch", 5, "{}");
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    // 短频率复核：水幕被清除或替换后，5 刻内就把水幕表现与结算一起收掉。
    WorldCombat.effectHandler(aquaRingMark, "watch", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(self) || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        effect.schedule("watch", "watch", 5, "{}");
    });
    WorldCombat.effectHandler(aquaRingMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(aquaRingMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, aquaRingScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
    });

    /** 回血走共享健康写入：宝可梦经过 NativeEffects.heal，其他战斗者直接写 MC 生命；返回值一律是世界生命单位。 */
    function aquaRingHeal(world: CombatWorld, self: CombatActor, missing: number, fraction: number, body: CombatObservation): number {
        const amount = Math.max(0, missing) * Math.max(0, Math.min(1, fraction));
        if (amount <= 0) return 0;
        let healed = 0;
        if (String(self.domain()) === "cobblemon" && world.valid(self)) {
            const pokemon = CobblemonCombat.pokemon(self), scale = Math.max(0.001, pokemon.healthScale());
            // NativeEffects.heal 回执是宝可梦 HP，乘回 healthScale 换算成本次实际回复的世界生命。
            healed = NativeEffects.heal(world, self, pokemon, amount / scale, aquaRingId) * scale;
        } else {
            healed = world.health(self, amount, "world_combat:" + aquaRingId);
        }
        if (healed > 0) feedback(world, self, body.position(), "heal", { amount: Math.round(healed * 10) / 10 });
        return healed;
    }

    // 每次涌（pulse）自己安排下一次：间隔是参数算出的刻数，不必对齐到固定节拍。
    WorldCombat.effectHandler(aquaRingMark, "pulse", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        if (!MobEffects.present(world, data.lease)) { effect.end(); return; }
        const interval = Math.max(1, Math.round(data.interval));
        const scale = Math.max(0.5, Math.min(2.2, data.radius / 1.6));
        const healed = aquaRingHeal(world, self, Math.max(0, body.maxHealth() - body.health()), data.pulse, body);
        WorldFeedback.emit(world, aquaRingScene, 1, body.position(),
            { moment: "pulse", target: String(self.ref()), motes: data.motes, scale: scale,
                healed: Math.round(healed * 10) / 10,
                intensity: Math.max(0.5, Math.min(2, healed / Math.max(1, body.maxHealth()) * 22)) }, 22);
        if (healed > 0) world.sound("minecraft:entity.fishing_bobber.splash", body.position(), 10, "{}");
        effect.schedule("pulse", "pulse", interval, "{}");
    });

    define({
        id: aquaRingId,
        cooldownParameter: "recharge", name: "水流环",
        description: "给自己覆上一层水幕，持续回复一小部分已损失生命；可以边走边回，水幕到期或被清除时结束。",
        uses: ["在拉锯战里给自己接一条稳定的续航线", "边后退边回血，把消耗战拖长", "在雨里把水幕开得更旺"],
        kind: "self", range: 0, prepare: 8, active: 0, recover: 6, cooldown: 120, style: "aqua",
        stationary: false, maximumTicks: 400,
        defaults: { spring: false },
        fields: [flag("spring", "涌泉")],
        // 指示器画到这个个体真实的 veilRadius，预览圈就是水幕判定/表现的半径。
        indicator: function (_config, pokemon) {
            return { radius: pokemon ? p(aquaRingId, "veilRadius", pokemon) : 1.5, geometry: "circle",
                style: "aqua", color: 0x4FC3E8, label: "水流环" };
        },
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
            // 先安全结束本次自己的旧水幕（标记结束会释放旧 lease，连同旧水幕一起），再铺新的；顺序反了会误清新幕。
            const previous = world.effects(self, aquaRingMark);
            for (let index = 0; index < previous.length; index++) world.operation(previous[index].id(), "world_combat:dispel", "{}");
            if (!CombatStatus.apply(world, self, aquaRingStatus, aquaRingEffect, ticks, 0, { unique: true })) { done(action); return; }
            world.effect(aquaRingMark, self, JSON.stringify({ start: world.tick(), interval: interval, pulse: pulse,
                ticks: ticks, motes: motes, radius: radius, lease: 0 }), ticks);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), aquaRingTextVeil, [Math.round(ticks / 20)], 28);
            done(action);
        }
    });
}
