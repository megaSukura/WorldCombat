/**
 * 看我嘛 / Follow Me —— 执行组织。
 *
 * 原地抬手招呼一嗓子，把身边敌人的注意勾到自己身上：原本打向同伴的火力会被拉过来。
 * 它是一嗓子，不限属性、不看目标，也不给任何人加成；这是请求不是硬控：玩家和免疫转向的 Boss 都能拒绝。
 *
 * 两幕：
 *   呼（windup 在提交前只观察与预告；准备期很短，忠实原生优先度 +2）。
 *   引（提交后）：给自己挂真实 MobEffect world_combat:followed（身份 world_combat:status/followme），
 *     旁边挂一枚机读标记，并记下这次 carrier 的精确 revision。标记在开始那一刻对喊话半径内可响应的敌人
 *     各发一次有限目标请求租约 world.targetLease(other, self, remaining)：被原生接受者记入 accepted，
 *     玩家/不支持/被拒绝者不纳入，本次施放不再追写；后来进圈者也不拉。
 *     之后每 `interval` 刻只维护 accepted：仍由本 owner 重定向、还在半径内就续租；离界或换阵营的调用
 *     targetLeaseRelease 交还、本次不重新抢回；被外部真实请求接管的只清自己的账本与连线，不周期强写。
 * 结束：时长走完/被清除时，只有本次 carrier 仍是同一 revision 才由旧标记清除身份；租约随作用域自动交还，
 *   原生可拒恢复，本招不另清新命令目标。
 */
namespace PokemonSkills {
    WorldCombat.effect(followMeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid follow me value: " + key);
        });
        if (typeof value.seeded !== "boolean" || !Array.isArray(value.accepted))
            throw new Error("Invalid follow me ledger");
        if (value.carrier !== undefined && value.carrier !== null && !MobEffects.validAnchor(value.carrier))
            throw new Error("Invalid follow me carrier");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(followMeMark, "start", function (effect) { effect.schedule("call", "call", 1, "{}"); });
    WorldCombat.effectHandler(followMeMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(followMeMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        const data = JSON.parse(effect.state());
        // 只有本次 carrier 仍是同一 revision 时才由这枚旧标记清除身份；刷新后的新 carrier 归新标记。
        if (data.carrier && MobEffects.matches(world, self, data.carrier) && CombatStatus.has(world, self, followMeStatus))
            CombatStatus.cure(world, self, followMeStatus);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, followMeScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), followMeTextFade, [], 22);
    });

    /** A hostile, living, non-player body other than the caller that this shout is allowed to ask. */
    function followMeCanRespond(world: CombatWorld, self: CombatActor, other: CombatActor): boolean {
        if (String(other.ref()) === String(self.ref())) return false;
        if (world.friendly(other)) return false;
        const facts = world.observe(other);
        return facts !== null && facts.health() > 0 && !facts.player();
    }

    WorldCombat.effectHandler(followMeMark, "call", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        // carrier 被驱散或刷新成新 revision 后，本声招呼不再拥有载体，收束。
        if (data.carrier && !MobEffects.matches(world, self, data.carrier)) { effect.end(); return; }
        const radius = Math.max(1, data.radius), centre = body.position(), selfRef = String(self.ref());
        const hold = Math.max(1, Math.round(effect.remaining()));
        if (!data.seeded) {
            // 第一声：对半径内可响应者各申请一次有限重定向租约；接受者纳入响应表，其余本次不再追写。
            data.seeded = true;
            data.accepted = [];
            const found = world.query(centre, radius, false);
            for (let index = 0; index < found.length; index++) {
                const other = found[index];
                if (!followMeCanRespond(world, self, other)) continue;
                if (world.targetLease(other, self, hold)) data.accepted.push(String(other.ref()));
            }
        } else {
            // 之后只维护本 owner 仍持有的重定向：离界/换阵营交还且不抢回，被外部接管只清账本。
            const kept: string[] = [];
            for (let index = 0; index < data.accepted.length; index++) {
                const ref = data.accepted[index];
                const other = world.actor(ref);
                if (other === null) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0 || facts.player()) continue;
                if (world.friendly(other)) { world.targetLeaseRelease(other); continue; }
                if (facts.position().minus(centre).length() > radius) { world.targetLeaseRelease(other); continue; }
                const state = JSON.parse(world.targetLeaseState(other));
                if (!state.owned || !state.active || state.mode !== "redirect") continue;
                world.targetLease(other, self, hold);
                kept.push(ref);
            }
            data.accepted = kept;
        }
        effect.state(JSON.stringify(data));

        // 只向真正还能被指向的响应者放短连线：held 只表示自己站桩招呼，不代表谁已被锁死。
        let linked = 0;
        for (let index = 0; index < data.accepted.length; index++) {
            const ref = data.accepted[index];
            const other = world.actor(ref);
            if (other === null) continue;
            const facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || facts.player()) continue;
            if (facts.position().minus(centre).length() > radius) continue;
            linked++;
            WorldFeedback.keep(world, "world_combat:move_followme/link/" + ref, followMeScene, 1, centre,
                { moment: "link", target: selfRef, other: ref, path: [selfRef, ref], lured: linked }, Math.max(12, Math.round(data.interval) + 8));
        }
        WorldFeedback.emit(world, followMeScene, 1, centre,
            { moment: "call", target: selfRef, motes: data.motes, wave: Math.max(0.1, radius / 20), lured: linked,
                intensity: Math.max(0.7, Math.min(1.8, 0.7 + lureCount(linked))) }, 26);
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_followme/held", followMeScene, 1, centre,
            { moment: "held", target: selfRef, motes: data.motes, lured: linked });
        effect.schedule("call", "call", Math.max(6, Math.round(data.interval)), "{}");
    });

    /** 被维持住的响应者数换算成表现强度（小工具，避免在对象字面量里堆运算）。 */
    function lureCount(lured: number): number {
        return Math.min(1.1, lured * 0.25);
    }

    // 身份被清掉（时长走完以外的手段：牛奶／/effect clear）时收回标记；只是被刷新则留给新标记。
    WorldCombat.on("world_combat:move_followme/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== followMeEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        if (CombatStatus.has(world, self, followMeStatus)) return;
        const marks = world.effects(self, followMeMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    define({
        id: followMeId,
        cooldownParameter: "recharge", name: "看我嘛",
        description: "原地抬手招呼，对喊话半径内可响应的敌人各发一次攻击目标转向你的请求，之后只维持已经回应的那些：它们留在你身边时会被反复指向你。离开喊话半径、或喊住时长走完，本招就交还目标，敌人按自己的判断选择；玩家或拒绝转向的 Boss 可以不应，本招不强迫靠近、也不给任何人加成。",
        uses: ["替身边的同伴把火力引到自己身上", "把贴住同伴的敌人拉过来，给同伴脱身的机会", "在开阔地挡住追兵，把交战点聚到自己这里"],
        kind: "self", range: 0, prepare: 5, active: 0, recover: 5, cooldown: 100, style: "call",
        stationary: true, maximumTicks: 400,
        defaults: { shout: false },
        fields: [flag("shout", "喊话")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(followMeId, "callRadius", pokemon) : 6, style: "call", color: 0xFF9ECF, label: "看我嘛" };
        },
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
            const interval = Math.max(6, Math.round(p(followMeId, "interval", action)));
            const radius = Math.max(2, p(followMeId, "callRadius", action));
            const motes = Math.max(10, Math.round(p(followMeId, "motes", action)));
            sound(action, "minecraft:block.note_block.chime");
            // 先退掉旧标记，再挂本次 carrier：旧标记结束不得清掉刚加上的新身份。
            const marks = world.effects(self, followMeMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            if (!CombatStatus.apply(world, self, followMeStatus, followMeEffect, ticks, 0, { unique: true })) { done(action); return; }
            const applied = MobEffects.read(world, self, followMeEffect);
            const carrier = applied === null ? null : MobEffects.anchor(applied);
            world.effect(followMeMark, self, JSON.stringify({ interval: interval, radius: radius, motes: motes,
                carrier: carrier, seeded: false, accepted: [] }), ticks);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), followMeTextCall, [radius], 26);
            done(action);
        }
    });
}
