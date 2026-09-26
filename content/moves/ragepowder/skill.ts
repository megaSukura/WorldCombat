/**
 * 愤怒粉 / Rage Powder —— 执行组织。
 *
 * 核心念头：把一团刺鼻的粉尘撒在原地，自己退开；谁穿过这团粉尘，谁就短暂把注意转向你。它是**一块地方**，
 *   不是挂在你身上的光环——先铺好，再走位躲开，让追兵自己踩进来。因为是粉末，草属性直接穿过。
 *
 * 两幕：
 *   扬（windup 在提交前只观察与预告；准备期很短，忠实原生优先度 +2）。
 *   铺（提交后）：在选定的近地撒下一团固定不动的粉尘云（托管效果，存续期内与施法者距离无关，自己可走开）。
 *     云每 `interval` 刻扫一遍：对刚刚走进来、可受粉末、且不在再次入云冷却里的个体各发一次原生仇恨请求
 *     （world.target）；请求被接受就放一条从入云者指向施术者的短连线，被拒绝的 Boss 只是不触发，不绕免疫。
 *     留在云里不会被反复强续；同一个个体的再次入云冷却走完才会被重新牵引；离开云后不再追写。
 * 结束：存续走完或被清除时收回粉尘，画面随之整体淡去。
 */
namespace PokemonSkills {
    WorldCombat.effect(ragePowderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (!Array.isArray(value.centre) || value.centre.length !== 3
            || !value.centre.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid rage powder centre");
        ["radius", "interval", "recontact", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid rage powder value: " + key);
        });
        if (value.contacts === null || typeof value.contacts !== "object" || Array.isArray(value.contacts))
            throw new Error("Invalid rage powder contacts");
        if (!Array.isArray(value.inside)) throw new Error("Invalid rage powder inside");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ragePowderMark, "start", function (effect) { effect.schedule("scan", "scan", 1, "{}"); });
    WorldCombat.effectHandler(ragePowderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ragePowderMark, "end", function (effect) {
        const world = effect.world(), self = effect.target(), state = JSON.parse(effect.state());
        if (world.valid(self) && CombatStatus.has(world, self, ragePowderStatus)) CombatStatus.cure(world, self, ragePowderStatus);
        if (!Array.isArray(state.centre) || state.centre.length !== 3) return;
        const centre = WorldCombat.point(state.centre[0], state.centre[1], state.centre[2]);
        WorldFeedback.emit(world, ragePowderScene, 1, centre,
            { moment: "fade", radius: state.radius, motes: state.motes, scale: Math.max(0.5, Math.min(2.2, state.radius / 2.3)) }, 26);
        WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), ragePowderTextFade, [], 24);
    });

    /** 粉末对草属性无效（忠实原生的 powder 标记）；非宝可梦战斗者类型表为空、照常被吸。 */
    export function ragePowderImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const facts = PokemonDamage.combatants.read(world, actor);
        return !!facts && facts.types.indexOf("grass") >= 0;
    }

    WorldCombat.effectHandler(ragePowderMark, "scan", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const selfBody = world.observe(self);
        if (selfBody === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const centre = WorldCombat.point(data.centre[0], data.centre[1], data.centre[2]);
        const radius = Math.max(1, data.radius), now = world.tick();
        // 施法者完全离开后，这团留在原地的短寿粉云自然收掉。
        if (selfBody.position().minus(centre).length() > 60) { effect.end(); return; }
        const found = world.query(centre, radius, false);
        const inside: string[] = [];
        let lured = 0, immune = 0, fresh = 0;
        for (let index = 0; index < found.length; index++) {
            const other = found[index];
            if (String(other.ref()) === String(self.ref())) continue;
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || facts.player()) continue;
            const ref = String(other.ref());
            inside.push(ref);
            if (ragePowderImmune(world, other)) { immune++; continue; }
            lured++;
            // 只有刚入云、且不在再次入云冷却里的个体才发一次请求；留在云里不强续。
            if (data.inside.indexOf(ref) >= 0) continue;
            const until = data.contacts[ref];
            if (typeof until === "number" && now < until) continue;
            data.contacts[ref] = now + Math.max(20, Math.round(data.recontact));
            if (!world.target(other, self)) continue;
            fresh++;
            const body = facts.position();
            WorldFeedback.emit(world, ragePowderScene, 1, body,
                { moment: "draw", path: [ref, String(self.ref())], target: ref, other: ref, centre: data.centre,
                    radius: radius, motes: data.motes, lured: lured }, 26);
        }
        data.inside = inside;
        Object.keys(data.contacts).forEach(function (ref) {
            if (now - data.contacts[ref] > 2400) delete data.contacts[ref];
        });
        effect.state(JSON.stringify(data));
        // 粉尘云视觉绑在这片云自己的效果上：自然到期或被驱散时画面一起收掉。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_ragepowder/cloud", ragePowderScene, 1, centre,
            { moment: "cloud", radius: radius, motes: data.motes, lured: lured, immune: immune,
                scale: Math.max(0.5, Math.min(2.2, radius / 2.3)) });
        if (fresh > 0) world.sound("minecraft:block.grass.break", centre, 12, "{}");
        effect.schedule("scan", "scan", Math.max(4, Math.round(data.interval)), "{}");
    });

    // 身份被清掉（时长走完以外的手段：牛奶／/effect clear）时收回粉尘。
    WorldCombat.on("world_combat:move_ragepowder/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ragePowderEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, ragePowderMark);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    define({
        id: ragePowderId,
        cooldownParameter: "recharge", name: "愤怒粉",
        description: "在选定近地撒下一团固定不动、短寿的粉尘云，自己可以走开；刚走进云、可受粉末的生物会被请求把攻击转向你，同一个体要等再次入云冷却走完才会再次被牵引，留在云里不强续。因为是粉末，草属性免疫。",
        uses: ["把粉撒在退路上，自己走开让追兵踩进来", "提前把粉铺在敌人必经的通道口", "罩住一小片位置经营，把交战点钉在那里"],
        kind: "point", range: 4, maxRange: 7, prepare: 6, active: 0, recover: 5, cooldown: 110, style: "powder",
        stationary: true, maximumTicks: 400,
        defaults: { thick: false },
        fields: [flag("thick", "浓粉")],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(ragePowderId, "cloudRadius", pokemon) : 4, geometry: "area", style: "powder", color: 0xC8D97A,
                label: config && config.thick === true ? "愤怒粉 · 浓粉" : "愤怒粉" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ragePowderId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(ragePowderId, "tempo", context)),
                recover: Math.round(p(ragePowderId, "aftercast", context)),
                cooldown: Math.round(p(ragePowderId, "recharge", context)),
                active: 0, range: p(ragePowderId, "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!world.valid(self) || world.observe(self) === null) return "invalid-target";
            const point = action.targetPosition();
            if (point.minus(action.origin()).length() > action.range() + 1) return "out-of-range";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_ragepowder:windup", ragePowderScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "windup", thick: config && config.thick === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor();
            if (world.observe(self) === null) { done(action); return; }
            const centre = WorldGeometry.ground(world, action.targetPosition());
            const ticks = Math.max(40, Math.round(p(ragePowderId, "cloudTicks", action)));
            const interval = Math.max(4, Math.round(p(ragePowderId, "interval", action)));
            const recontact = Math.max(20, Math.round(p(ragePowderId, "recontact", action)));
            const radius = Math.max(2, p(ragePowderId, "cloudRadius", action));
            const motes = Math.max(12, Math.round(p(ragePowderId, "motes", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 2.3));
            sound(action, "minecraft:entity.witch.throw");
            if (!CombatStatus.apply(world, self, ragePowderStatus, ragePowderEffect, ticks, 0, { unique: true })) { done(action); return; }
            const marks = world.effects(self, ragePowderMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(ragePowderMark, self, JSON.stringify({ centre: [centre.x(), centre.y(), centre.z()],
                radius: radius, interval: interval, recontact: recontact, motes: motes, contacts: {}, inside: [] }), ticks);
            WorldFeedback.emit(world, ragePowderScene, 1, centre,
                { moment: "burst", radius: radius, motes: motes, scale: scale }, 28);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.9, 0)), ragePowderTextCloud, [radius], 26);
            done(action);
        }
    });
}
