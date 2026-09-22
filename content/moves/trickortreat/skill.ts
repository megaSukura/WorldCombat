/**
 * 万圣夜 / trickortreat 的出手方式。
 *
 * 核心念头：邀请对手参加万圣夜——**给它套上一件幽灵外壳**，追加幽灵属性。壳里它得到幽灵本系，一般与格斗
 *   打不上它，幽灵与恶反而效果绝佳；一件外套能套在本来不是幽灵、且临时属性层还放得下第三条的对手身上。
 *
 * 三幕：
 *   招呼（windup，提交前只观察与预告，可被打断，不花代价）。
 *   披壳（提交后）：把目标当前属性加一条 ghost 写进 NativeModifiers 的临时属性层，并挂世界效果
 *     world_combat:trick_shell（共享身份 world_combat:status/trickortreat）；记录层 world_combat:trick_record
 *     记下属性层实例、装饰量与外壳时长。属性和 STAB、受击相性、AI 与 ready 一起变化。
 *   脱壳（外壳到期或被解除）：解除属性层，属性随原生个体本身恢复；自然到期额外播一次剥落。
 *
 * 与识破同族：识破一族在对手身上「看穿并摘掉幽灵」，万圣夜反过来「把幽灵外壳套上去」——一摘一套，正好成对。
 * 反制：双属性目标套不上（预检直接拒绝，不浪费 20 发 PP）；识破／气味侦测能把壳的幽灵免疫再摘掉。
 */
namespace PokemonSkills {
    function trickortreatAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.15, 0)); }

    WorldCombat.effect(trickortreatRecordEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.layer !== "number" || !isFinite(value.layer)) throw new Error("Invalid trick record: layer");
        ["motes", "shell"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid trick record: " + key);
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(trickortreatRecordEffect, "start", function () { });
    WorldCombat.effectHandler(trickortreatRecordEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function trickortreatRecordOf(world: CombatWorld, target: CombatActor): any {
        const views = world.effects(target, trickortreatRecordEffect);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function trickortreatReleaseRecord(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, trickortreatRecordEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }
    /** 目标当前生效的属性（含临时层）；非宝可梦返回空。 */
    function trickortreatTypes(world: CombatWorld, target: CombatActor): string[] {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return [];
        return NativeEffects.types(CobblemonCombat.pokemon(target), NativeEffects.read(world, target));
    }
    /** 能不能套：非宝可梦没有属性；已是幽灵、或已到第三属性仍没有空位都套不上。返回拒绝原因或空串。 */
    function trickortreatRefusal(world: CombatWorld, target: CombatActor): string {
        const types = trickortreatTypes(world, target);
        if (types.length === 0) return "no-types";
        if (types.indexOf("ghost") >= 0) return "already-ghost";
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        // The temporary type layer can hold the native two plus one appended type; a dual-type target is fair game.
        return types.length >= 3 ? "no-room" : "";
    }

    // 脱壳：外壳到期或被清除时解除属性层，属性随原生个体本身恢复；自然到期额外播一次剥落。
    WorldCombat.on("world_combat:move_trickortreat/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== trickortreatShellEffect) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target)) return;
        const record = trickortreatRecordOf(world, target);
        if (record !== null) world.operation(Math.round(Number(record.layer)), "world_combat:dispel", "{}");
        trickortreatReleaseRecord(world, target);
        if (String(data.cause) !== "expired") return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, trickortreatScene, 1, body.position(), { moment: "tear", target: String(target.ref()) }, 26);
        WorldFeedback.text(world, trickortreatAbove(body.position()), trickortreatTearText, [], 26);
        world.sound("minecraft:entity.vex.ambient", body.position(), 12, "{}");
    });

    // 存续期：每 20 刻续一圈目标身上的南瓜灯火花，数量沿用本招算出的装饰量。
    WorldCombat.on("world_combat:move_trickortreat/hold", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== trickortreatShellEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), target = event.actor();
        if (!world.valid(target) || MobEffects.read(world, target, trickortreatShellEffect) === null) return;
        const record = trickortreatRecordOf(world, target);
        if (record === null) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_trickortreat/hold/" + String(target.ref()), trickortreatScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), motes: Math.max(8, Math.round(Number(record.motes) / 2)) }, 40);
    });

    define({
        id: trickortreatId,
        name: "万圣夜",
        description: "邀请对手参加万圣夜：给它套上一件幽灵外壳、追加幽灵属性——一般与格斗打不上它，幽灵与恶反而效果绝佳，直到壳剥落。",
        uses: ["给目标套成幽灵，打开它的幽灵／恶弱点", "封住一个靠一般或格斗输出的对手", "配合识破，把壳的免疫再摘掉"],
        kind: "enemy",
        range: 6,
        maxRange: 10,
        prepare: 7,
        active: 1,
        recover: 5,
        cooldown: 78,
        style: "costume",
        defaults: { grand: false },
        fields: [flag("grand", "盛大")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[trickortreatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(trickortreatId, "tempo", context)),
                recover: Math.round(p(trickortreatId, "aftercast", context)),
                cooldown: Math.round(p(trickortreatId, "recharge", context)),
                active: 1,
                range: p(trickortreatId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[trickortreatId], detail: { values: config } };
            return { radius: p(trickortreatId, "reach", context), geometry: "line", style: "costume", color: 0xE88A3C,
                label: config && config.grand === true ? "万圣夜 · 盛大" : "万圣夜" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(trickortreatId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return trickortreatRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_trickortreat:windup", trickortreatScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", grand: config && config.grand === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, trickortreatScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, trickortreatScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, trickortreatAbove(point), trickortreatBlockedText, [], 26);
                done(action);
                return;
            }
            const refusal = trickortreatRefusal(world, target);
            if (refusal) {
                WorldFeedback.emit(world, trickortreatScene, 1, point, { moment: "fizzle", target: String(target.ref()), reason: refusal }, 18);
                WorldFeedback.text(world, trickortreatAbove(point), trickortreatNoRoomText, [], 28);
                done(action);
                return;
            }
            const shell = Math.max(60, Math.round(p(trickortreatId, "shell", action)));
            const motes = Math.max(8, Math.round(p(trickortreatId, "motes", action)));
            const types = trickortreatTypes(world, target).concat(["ghost"]);
            const layer = NativeModifiers.apply(world, target, { types: types }, shell);
            MobEffects.apply(world, target, trickortreatShellEffect, shell, 0);
            trickortreatReleaseRecord(world, target);
            world.effect(trickortreatRecordEffect, target, JSON.stringify({ layer: layer, motes: motes, shell: shell }), shell);
            sound(action, "cobblemon:item.medicine.candy.use");
            world.sound("minecraft:block.pumpkin.carve", point, 12, "{}");
            if (at !== null) {
                WorldFeedback.emit(world, trickortreatScene, 1, at.position(),
                    { moment: "dress", target: String(target.ref()), motes: motes, shell: shell,
                        types: types.length, scale: Math.max(0.6, Math.min(2.2, shell / 260)),
                        intensity: Math.max(0.7, Math.min(2, 0.7 + motes / 40)) }, 34);
                WorldFeedback.text(world, trickortreatAbove(at.position()), trickortreatDressText, [Math.round(shell / 20)], 30);
            }
            done(action);
        }
    });
}
