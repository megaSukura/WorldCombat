/**
 * 看我嘛 / Follow Me —— 执行组织。
 *
 * 核心念头：原地抬手招呼一嗓子，把身边的敌人的注意全勾到自己身上——原本打向同伴的火力会被拉过来。
 *   它是一嗓子，不限属性、不看目标，也不给任何人加成；但这是一次请求，不是硬控：玩家和免疫转向的 Boss 都能拒绝，
 *   被拉住的也只是「下一个目标是你」，敌人仍可走位、放远程或干脆离开喊话半径。
 *
 * 两幕：
 *   呼（windup 在提交前只观察与预告；准备期很短，忠实原生优先度 +2）。
 *   引（提交后）：给自己挂上真实 MobEffect world_combat:followed（共享身份 world_combat:status/followme），
 *     旁边挂一枚机读标记。标记在开始那一刻对喊话半径内可响应的敌人各发一次原生仇恨请求（world.target）：
 *       请求被接受者记入 accepted，被拒绝者（模组 Boss 等）记入 rejected，本次施放不再追写。
 *     之后每 `interval` 刻只维持 accepted 里仍在半径内的对象——重新指向、并放一条短连线；离场或失效者自然脱落。
 *     被拒绝的对象直到下一次施放前都不再尝试，避免对拒绝转向的 Boss 反复写入。伤害权限不受影响。
 * 结束：喊住时长走完或被清除时收回标记、清掉身份，注意散去。
 */
namespace PokemonSkills {
    WorldCombat.effect(followMeMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid follow me value: " + key);
        });
        if (!Array.isArray(value.accepted) || !Array.isArray(value.rejected)) throw new Error("Invalid follow me lists");
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
        const radius = Math.max(1, data.radius), centre = body.position();
        const selfRef = String(self.ref());
        if (!data.seeded) {
            // 第一声：对半径内可响应者各发一次原生仇恨请求；接受与拒绝分别记账，拒绝者本次不再追写。
            data.seeded = true;
            const found = world.query(centre, radius, false);
            for (let index = 0; index < found.length; index++) {
                const other = found[index];
                if (!followMeCanRespond(world, self, other)) continue;
                const ref = String(other.ref());
                if (data.rejected.indexOf(ref) >= 0) continue;
                if (world.target(other, self)) data.accepted.push(ref); else data.rejected.push(ref);
            }
        } else {
            // 之后只维持已接受者：仍在半径内就重新指向；失败者脱落，离场者保留待回。
            const kept: string[] = [];
            for (let index = 0; index < data.accepted.length; index++) {
                const ref = data.accepted[index];
                const other = world.actor(ref);
                if (other === null) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0 || facts.player()) continue;
                if (facts.position().minus(centre).length() > radius) { kept.push(ref); continue; }
                if (world.target(other, self)) kept.push(ref);
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
        id: followMeId,
        cooldownParameter: "recharge", name: "看我嘛",
        description: "原地抬手招呼，对喊话半径内可响应的敌人各发一次攻击目标转向你的请求，之后只维持已经回应的那些：它们在你身边会被反复指向你，直到喊住时长结束。玩家或拒绝转向的 Boss 可以不应，本招不强迫靠近、也不给任何人加成。",
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
            const interval = Math.max(6, Math.round(p(followMeId, "interval", action)));
            const radius = Math.max(2, p(followMeId, "callRadius", action));
            const motes = Math.max(10, Math.round(p(followMeId, "motes", action)));
            sound(action, "minecraft:block.note_block.chime");
            if (!CombatStatus.apply(world, self, followMeStatus, followMeEffect, ticks, 0, { unique: true })) { done(action); return; }
            const marks = world.effects(self, followMeMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(followMeMark, self, JSON.stringify({ interval: interval, radius: radius, motes: motes,
                accepted: [], rejected: [], seeded: false }), ticks);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), followMeTextCall, [radius], 26);
            done(action);
        }
    });
}
