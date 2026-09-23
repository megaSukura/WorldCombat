/**
 * 精神转移 / psychoshift —— 执行组织与异常转移。
 *
 * 核心念头：把自己身上正在受的那份折磨，用念力原样推走、种进对手身上——你轻了，它重了。
 *
 * 三幕：
 *   起意（windup，提交前）：念力把自己身上那层异常的边缘描亮、抽出几颗病核，只播预告，可被打断且不花代价。
 *   推出（push，提交后）：按共享身份读出自己最重的主异常，先按同一身份、同一强度把它种到对手身上；
 *     **种上了才**解除自己身上的那一层——转移成功才痊愈，种不上（对方免疫或已有异常）就作废、保留自己的异常。
 *   落身（plant，同一次提交内）：病核沿两人连线落到对手身上、炸开一层与异常同色的余韵；自己那边收束、干净。
 *
 * 深种（配置 deep）：种下的异常更久（×1.5），若推的是「中毒」还会加深为「剧毒」（amplifier 1）；代价是更慢、
 *   更贵。浅推便宜、能更频繁地清理自己的异常，但种得不深。
 *
 * 与同族分开：这一族搬的都是「现有的东西」。特性互换搬身份、意念移物搬身体、力量戏法搬数值；
 *   精神转移搬的是**异常状态**，并且是单向的——只把它从自己身上推出去，不会从对手那里拿回来。
 */
namespace PokemonSkills {
    const psychoshiftScene = "world_combat:move_psychoshift";
    const psychoshiftPushText = "world_combat.move.psychoshift.text.push";
    const psychoshiftFizzleText = "world_combat.move.psychoshift.text.fizzle";
    const psychoshiftImmuneText = "world_combat.move.psychoshift.text.immune";

    /** 主异常的显示名；未知身份回落到通用词。 */
    function psychoshiftStatusKey(name: string): string {
        switch (name) {
            case "burn": return "world_combat.move.psychoshift.text.burn";
            case "poison": return "world_combat.move.psychoshift.text.poison";
            case "toxic": return "world_combat.move.psychoshift.text.toxic";
            case "paralysis": return "world_combat.move.psychoshift.text.paralysis";
            case "sleep": return "world_combat.move.psychoshift.text.sleep";
            case "frozen": return "world_combat.move.psychoshift.text.frozen";
            default: return "world_combat.move.psychoshift.text.other";
        }
    }
    function psychoshiftAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    define({
        id: "psychoshift",
        cooldownParameter: "recharge",
        name: "精神转移",
        description: "用念力把自己身上的一种主异常种给对手：种上了自己才痊愈，对方已有主异常或免疫该异常则作废。",
        uses: ["把自己身上的灼伤／中毒／麻痹转手给对手", "打完异常招后清掉自己身上的负担", "在消耗战里把持续的异常反手甩回去"],
        kind: "enemy",
        range: 6,
        maxRange: 12,
        prepare: 7,
        active: 1,
        recover: 6,
        cooldown: 70,
        style: "transfer",
        defaults: { deep: false, ai: { maxChase: 12, requireTransferable: true, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["psychoshift"], detail: { values: config } };
            return { radius: p("psychoshift", "reach", context), geometry: "line", style: "transfer", color: 0x8FA83C,
                label: config && config.deep === true ? "精神转移 · 深种" : "精神转移" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["psychoshift"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("psychoshift", "tempo", context)),
                recover: Math.round(p("psychoshift", "aftercast", context)),
                cooldown: Math.round(p("psychoshift", "recharge", context)),
                active: 1,
                range: p("psychoshift", "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (!CombatStatus.major(world, actor)) return "no-status";
            if (CombatStatus.major(world, target)) return "target-statused";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("psychoshift", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return "";
        },
        windup: function (action, _config, prepare) {
            const actor = action.actor(), target = action.target();
            const name = CombatStatus.major(action.sense(), actor);
            action.present("world_combat:psychoshift:draw", psychoshiftScene, 1, action.origin(), JSON.stringify({
                moment: "draw", target: target === null ? "" : String(target.ref()), status: name,
                path: target === null ? [String(actor.ref())] : [String(actor.ref()), String(target.ref())],
                motes: p("psychoshift", "motes", action)
            }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null || target === null || !world.valid(target) || world.friendly(target)) { done(action); return; }
            const name = CombatStatus.major(world, actor);
            if (!name) {
                WorldFeedback.emit(world, psychoshiftScene, 1, body.position(), { moment: "fizzle", target: String(actor.ref()) }, 20);
                WorldFeedback.text(world, psychoshiftAbove(body.position()), psychoshiftFizzleText, [], 24);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            if (CombatStatus.major(world, target)) {
                WorldFeedback.emit(world, psychoshiftScene, 1, body.position(), { moment: "immune", target: String(target.ref()) }, 22);
                WorldFeedback.text(world, psychoshiftAbove(body.position()), psychoshiftImmuneText, [], 24);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            const source = CombatStatus.representative(world, actor, name, true) || CombatStatus.representative(world, actor, name);
            const remaining = source === null ? 800 : source.duration();
            const deep = !!(config && config.deep === true);
            const defName = deep && name === "poison" ? "toxic" : name;
            let duration = remaining < 0 ? 2400 : Math.max(40, remaining);
            if (deep) duration = Math.round(duration * 1.5);
            const potency = Math.max(0.4, p("psychoshift", "potency", action));
            duration = Math.max(40, Math.round(duration * potency));
            const amplifier = deep && name === "poison" ? 1 : undefined;
            const moved = CombatStatus.inflict(world, target, defName, duration, amplifier);
            if (!moved) {
                WorldFeedback.emit(world, psychoshiftScene, 1, body.position(), { moment: "immune", target: String(target.ref()), status: name }, 22);
                WorldFeedback.text(world, psychoshiftAbove(body.position()), psychoshiftImmuneText, [], 24);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            CombatStatus.cure(world, actor, name);
            const motes = Math.max(6, Math.round(p("psychoshift", "motes", action)));
            const path = [String(actor.ref()), String(target.ref())];
            WorldFeedback.emit(world, psychoshiftScene, 1, body.position(),
                { moment: "push", target: String(target.ref()), status: name, path: path, motes: motes }, 34);
            const targetBody = world.observe(target);
            if (targetBody !== null)
                WorldFeedback.emit(world, psychoshiftScene, 1, targetBody.position(),
                    { moment: "plant", target: String(target.ref()), status: name, path: path, motes: motes,
                        intensity: Math.max(0.7, Math.min(2.4, potency)) }, 36);
            WorldFeedback.text(world, psychoshiftAbove(body.position()), psychoshiftPushText,
                [{ key: psychoshiftStatusKey(name), fallback: name }], 34);
            sound(action, "minecraft:entity.illusioner.cast_spell");
            world.sound(psychoshiftStatusSound(name), body.position(), 14, "{}");
            done(action);
        }
    });

    /** 异常本身的音效（挑原版里真实存在的几个）；未知状态用幻术师施法音。 */
    function psychoshiftStatusSound(name: string): string {
        switch (name) {
            case "burn": return "minecraft:entity.blaze.hurt";
            case "poison": return "minecraft:entity.puffer_fish.sting";
            case "toxic": return "minecraft:entity.puffer_fish.sting";
            case "paralysis": return "minecraft:entity.vex.charge";
            default: return "minecraft:entity.illusioner.cast_spell";
        }
    }
}
