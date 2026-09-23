/**
 * 愤怒粉 / Rage Powder —— 执行组织。
 *
 * 核心念头：把一团刺鼻的粉尘撒在自己身上，粉尘罩住的范围里，敌人只会盯着你打——本来追同伴的火力被吸过来。
 *   它是粉末，所以草属性身上不生效，这是它和「看我嘛」最要紧的分界。
 *
 * 两幕：
 *   扬（windup 在提交前只观察与预告；准备期很短，忠实原生优先度 +2）。
 *   吸（提交后）：给自己挂上真实 MobEffect world_combat:rage_powder（共享身份 world_combat:status/ragepowder），
 *     旁边挂一枚机读标记；标记每 `interval` 刻把粉尘半径内不属于自己、又不是草属性的活物指向自己（world.target）。
 * 结束：存续走完或被清除时收回标记、清掉身份，粉尘落定散去。
 * 反制：草属性免疫这团粉；被拉住的敌人仍可走位、放远程或走出粉尘半径；注意会随时间失效。
 */
namespace PokemonSkills {
    WorldCombat.effect(ragePowderMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["interval", "radius", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid rage powder value: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ragePowderMark, "start", function (effect) { effect.schedule("draw", "draw", 1, "{}"); });
    WorldCombat.effectHandler(ragePowderMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ragePowderMark, "end", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) return;
        if (CombatStatus.has(world, self, ragePowderStatus)) CombatStatus.cure(world, self, ragePowderStatus);
        const body = world.observe(self);
        if (body === null) return;
        WorldFeedback.emit(world, ragePowderScene, 1, body.position(), { moment: "fade", target: String(self.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), ragePowderTextFade, [], 22);
    });

    /** 粉末对草属性无效（忠实原生的 powder 标记），其余战斗者类型表为空、照常被吸。 */
    export function ragePowderImmune(world: CombatWorld, actor: CombatActor): boolean {
        return PokemonDamage.combatants.read(world, actor).types.indexOf("grass") >= 0;
    }

    WorldCombat.effectHandler(ragePowderMark, "draw", function (effect) {
        const world = effect.world(), self = effect.target();
        if (!world.valid(self)) { effect.end(); return; }
        const body = world.observe(self);
        if (body === null) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        const radius = Math.max(1, data.radius), centre = body.position();
        const found = world.query(centre, radius, false);
        let lured = 0, immune = 0;
        for (let index = 0; index < found.length; index++) {
            const other = found[index];
            if (String(other.ref()) === String(self.ref())) continue;
            if (world.friendly(other)) continue;
            const facts = world.observe(other);
            if (facts === null || facts.health() <= 0 || facts.player()) continue;
            if (ragePowderImmune(world, other)) { immune++; continue; }
            if (world.target(other, self)) lured++;
        }
        WorldFeedback.keep(world, "world_combat:move_ragepowder/cloud/" + String(self.ref()), ragePowderScene, 1, centre,
            { moment: "cloud", target: String(self.ref()), motes: data.motes, radius: radius,
                lured: lured, immune: immune, intensity: Math.max(0.7, Math.min(1.9, 0.7 + lureWeight(lured))) }, 30);
        WorldFeedback.emit(world, ragePowderScene, 1, centre,
            { moment: "draw", target: String(self.ref()), motes: data.motes, radius: radius, lured: lured }, 20);
        if (lured > 0) world.sound("minecraft:block.grass.break", centre, 12, "{}");
        effect.schedule("draw", "draw", Math.max(4, Math.round(data.interval)), "{}");
    });

    /** 被吸住的敌人数换算成表现强度。 */
    function lureWeight(lured: number): number {
        return Math.min(1.2, lured * 0.3);
    }

    // 身份被清掉（时长走完以外的手段：牛奶／/effect clear）时收回标记。
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
        description: "把一团刺鼻的粉尘撒在自己身上，粉尘范围里的敌人会被不断拉向自己；因为是粉末，草属性免疫。",
        uses: ["用一团粉把敌人的火力从同伴身上吸到自己这里", "把贴住同伴的敌人黏住，给同伴脱身的机会", "在开阔地罩住一小片区域，把交战点攥在手里"],
        kind: "self", range: 0, prepare: 6, active: 0, recover: 5, cooldown: 110, style: "powder",
        stationary: true, maximumTicks: 400,
        defaults: { thick: false },
        fields: [flag("thick", "浓粉")],
        indicator: function () { return { radius: 1, style: "powder", color: 0xC8D97A, label: "愤怒粉" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[ragePowderId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(ragePowderId, "tempo", context)),
                recover: Math.round(p(ragePowderId, "aftercast", context)),
                cooldown: Math.round(p(ragePowderId, "recharge", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (!world.valid(self) || world.observe(self) === null) return "invalid-target";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_ragepowder:windup", ragePowderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const ticks = Math.max(40, Math.round(p(ragePowderId, "cloudTicks", action)));
            const interval = Math.max(6, Math.round(p(ragePowderId, "interval", action)));
            const radius = Math.max(2, p(ragePowderId, "cloudRadius", action));
            const motes = Math.max(12, Math.round(p(ragePowderId, "motes", action)));
            sound(action, "minecraft:entity.witch.throw");
            if (!CombatStatus.apply(world, self, ragePowderStatus, ragePowderEffect, ticks, 0, { unique: true })) { done(action); return; }
            const marks = world.effects(self, ragePowderMark);
            for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
            world.effect(ragePowderMark, self, JSON.stringify({ interval: interval, radius: radius, motes: motes }), ticks);
            WorldFeedback.keep(world, "world_combat:move_ragepowder/cloud/" + String(self.ref()), ragePowderScene, 1, body.position(),
                { moment: "cloud", target: String(self.ref()), motes: motes, radius: radius, lured: 0, immune: 0 }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), ragePowderTextCloud, [radius], 26);
            done(action);
        }
    });
}
