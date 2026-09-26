/**
 * 速度互换 / speedswap —— 执行组织与可逆交换。
 *
 * 核心念头：把两个人的速度本钱在一条线上对调——你快我慢的次序，从碰到的一刻起倒过来。
 *
 * 速度读数用同一把尺：原生移动速度属性 `minecraft:generic.movement_speed` 的当前值（含除本实例之外的一切来源），
 * 宝可梦、原版生物、其他模组生物、玩家走同一条路。交换不是把能力等级四舍五入到某一档，而是各挂一份由本实例
 * 拥有的 `add_multiplied_total` 修正：倍率 = 目标有效速度 / 自己有效速度，换完的有效速度精确等于对方原来的值。
 * 之后任何别的加速/减速（等级、药水、装备）仍在外层照常乘上来；窗口结束只撤本实例这一份，不动别人。
 *
 * 三幕：
 *   读（windup，提交前）：两道读数在两人脚边各亮一圈，只播预告。
 *   换（execute，提交后）：重查距离与通视，读出双方有效速度，给各自挂上交换窗口（共享身份
 *     world_combat:status/speedswap 的真实效果），并创建一枚本实例拥有的绑定窗口，把这一侧的移速修正
 *     与另一侧的效果锚点一起记下；两端数值由机制算出的方向与幅度同时驱动表现。
 *   归（end）：窗口走完或被牛奶/清除时，成对的两扇窗一起收：只撤本实例登记的修正与自己的载体，
 *     另一侧若已被新窗口替换则不动它；画面在两人脚边静收。
 *
 * 谁接收：aim 选中范围内任意关系的活体（友方或敌方），自己无效，墙会挡住。对敌方换速仍要真正写入
 *   原生属性（world.attribute 返回 false 即整次失败，不半换）；对友方则是把快节奏借出去。
 */
namespace PokemonSkills {
    export const speedswapId = "speedswap";
    export const speedswapShift = "world_combat:speedswap_shift";
    export const speedswapBind = "world_combat:speedswap_bind";
    export const speedswapScene = "world_combat:move_speedswap";
    export const speedswapShiftText = "world_combat.move.speedswap.text.shift";
    export const speedswapRevertText = "world_combat.move.speedswap.text.revert";
    export const speedswapEqualText = "world_combat.move.speedswap.text.equal";
    export const speedswapFailText = "world_combat.move.speedswap.text.fail";
    /** 所有域共用的中性速度基准：原生移动速度属性。 */
    export const speedswapAttribute = "minecraft:generic.movement_speed";

    /** 一名战斗者此刻的有效原生移动速度（排除本作用域自己写入的修正，其他来源照常计入）；读不到返回 -1。 */
    export function speedswapSpeed(world: CombatWorld, actor: CombatActor): number {
        const attribute = world.attributeValue(actor, speedswapAttribute, true);
        return attribute === null ? -1 : attribute.value();
    }
    /** 供 AI 事实使用：把一名战斗者的有效速度折成同一把尺上的读数。 */
    export function speedswapRating(world: CombatWorld, actor: CombatActor): number { return speedswapSpeed(world, actor); }
    /** 画面里的脚边刻线数量：由实际速度派生，快的人刻线更密。 */
    function speedswapMarks(speed: number): number { return Math.max(4, Math.min(20, Math.round(speed * 16))); }

    // 交换窗口的绑定效果：两侧各一枚，拥有自己这一侧的原生移速修正。窗口结束或被清除时自动收回本实例贡献。
    WorldCombat.effect(speedswapBind, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["ratio", "speed", "marks", "mode"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid speed swap window: " + key);
        });
        if (value.ratio <= 0) throw new Error("Invalid speed swap ratio");
        if (typeof value.partner !== "string" || !value.partner) throw new Error("Invalid speed swap partner");
        if (!MobEffects.validAnchor(value.self) || !MobEffects.validAnchor(value.other)) throw new Error("Invalid speed swap carriers");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    /** 成对窗口是否都还在：自己一侧的载体仍在，且另一侧仍带着当初登记的那一枚。 */
    function speedswapAlive(effect: CombatEffect): boolean {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.self)) return false;
        const partner = world.actor(state.partner);
        return partner !== null && MobEffects.matches(world, partner, state.other);
    }
    function speedswapHold(effect: CombatEffect, state: any): void {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor);
        if (body === null) return;
        // 持续窗口表现绑在这枚托管效果上：结束或被提前清除时同步收回。
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_speedswap/hold/" + String(actor.ref()),
            speedswapScene, 1, body.position(), { moment: "hold", target: String(actor.ref()), pair: state.partner,
                speed: Number(state.speed) || 0, marks: Number(state.marks) || 6, ratio: Number(state.ratio) || 1,
                mode: Number(state.mode) || 1 });
    }
    WorldCombat.effectHandler(speedswapBind, "start", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!speedswapAlive(effect)) { effect.end(); return; }
        // 真实写入原生移速；写不进去就整次作废，两端一起收回。
        if (!world.attribute(actor, speedswapAttribute, state.ratio - 1, "add_multiplied_total")) { effect.end(); return; }
        speedswapHold(effect, state);
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(speedswapBind, "watch", function (effect) {
        if (!speedswapAlive(effect)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    // 任一侧失效或清除：成对窗口同步结束。只撤本实例登记的两枚载体，已被新窗口替换的不动。
    WorldCombat.effectHandler(speedswapBind, "end", function (effect) {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        const partner = world.actor(state.partner);
        if (partner !== null && MobEffects.matches(world, partner, state.other)) MobEffects.consume(world, partner, speedswapShift);
        if (world.valid(actor) && MobEffects.matches(world, actor, state.self)) MobEffects.consume(world, actor, speedswapShift);
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, speedswapScene, 1, body.position(),
            { moment: "revert", target: String(actor.ref()), pair: state.partner, marks: Number(state.marks) || 6 }, 26);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), speedswapRevertText, [], 26);
        world.sound("minecraft:block.beacon.deactivate", body.position(), 12, "{}");
    });
    WorldCombat.effectHandler(speedswapBind, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: speedswapId,
        cooldownParameter: "recharge",
        name: "Speed Swap",
        description: "锁定范围内一名活体，把双方的移动速度对调一段时间：换完你快我慢的次序倒过来，窗口走完自动换回。",
        uses: ["从比自己快的对手身上借速度", "把快节奏借给需要追击的队友", "在对手先手压制的开局把次序倒过来"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 75,
        style: "swap",
        defaults: { mode: 1, ai: { maxChase: 12, minEdge: 1.15, leaveStation: false, helpFriends: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[speedswapId], detail: { values: config } };
            return { radius: p(speedswapId, "reach", context), geometry: "line", style: "swap", color: 0x7FD8E8,
                label: config && config.mode === 0 ? "速度互换·拉平" : "速度互换" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[speedswapId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(speedswapId, "tempo", context)),
                recover: Math.round(p(speedswapId, "aftercast", context)),
                cooldown: Math.round(p(speedswapId, "recharge", context)),
                active: 1,
                range: p(speedswapId, "reach", context)
            };
        },
        ready: function (action, _config) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) return "invalid-target";
            if (CombatStatus.has(world, actor, "speedswap") || CombatStatus.has(world, target, "speedswap")) return "already-swapped";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p(speedswapId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const mine = speedswapSpeed(world, actor), theirs = speedswapSpeed(world, target);
            if (!(mine > 0) || !(theirs > 0)) return "no-speed";
            if (Math.abs(mine - theirs) < 0.0001) return "no-change";
            return "";
        },
        windup: function (action, _config, prepare) {
            const target = action.target();
            action.present("world_combat:move_speedswap:read", speedswapScene, 1, action.origin(),
                JSON.stringify({ moment: "read", target: target === null ? "" : String(target.ref()),
                    threads: Math.max(1, Math.round(p(speedswapId, "threads", action))) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const here = body.position();
            const span = Math.max(60, Math.round(p(speedswapId, "span", action)));
            const threads = Math.max(1, Math.round(p(speedswapId, "threads", action)));
            const mode = config && config.mode === 0 ? 0 : 1;

            function fizzle(reason: string): void {
                WorldFeedback.emit(world, speedswapScene, 1, here, { moment: "fizzle", reason: reason }, 16);
                WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.15, 0)), speedswapFailText, [], 22);
                done(action);
            }

            if (target === null || !world.valid(target) || String(target.key()) === String(actor.key())) { fizzle("invalid-target"); return; }
            const targetBody = world.observe(target);
            if (targetBody === null) { fizzle("target-left"); return; }
            const there = targetBody.position();
            // 提交后重查距离与通视：两端其中一方够不到时整次有清楚失败结果，不做半换。
            if (there.minus(here).length() > p(speedswapId, "reach", action)) { fizzle("out-of-range"); return; }
            if (!world.clear(here, there)) { fizzle("no-line"); return; }
            const mine = speedswapSpeed(world, actor), theirs = speedswapSpeed(world, target);
            if (!(mine > 0) || !(theirs > 0)) { fizzle("no-speed"); return; }

            const middle = (mine + theirs) / 2;
            const targetMine = mode === 1 ? theirs : middle;
            const targetTheirs = mode === 1 ? mine : middle;
            const ratioMine = targetMine / mine, ratioTheirs = targetTheirs / theirs;
            const changed = Math.abs(ratioMine - 1) > 1e-6 || Math.abs(ratioTheirs - 1) > 1e-6;
            if (!changed) {
                WorldFeedback.emit(world, speedswapScene, 1, here,
                    { moment: "equal", target: String(target.ref()), marks: threads }, 24);
                WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.15, 0)), speedswapEqualText, [], 24);
                world.sound("minecraft:block.beacon.deactivate", here, 12, "{}");
                done(action);
                return;
            }

            // 交换窗口身份：两端各一枚真实效果；绑定效果各拥有自己这一份原生移速修正，并记住对方。
            const carrierMine = MobEffects.apply(world, actor, speedswapShift, span, 0);
            const carrierTheirs = MobEffects.apply(world, target, speedswapShift, span, 0);
            if (!carrierMine || !carrierTheirs) {
                MobEffects.consume(world, actor, speedswapShift);
                MobEffects.consume(world, target, speedswapShift);
                fizzle("no-window");
                return;
            }
            const mineId = world.effect(speedswapBind, actor, JSON.stringify({ ratio: ratioMine, partner: String(target.ref()),
                self: MobEffects.anchor(carrierMine), other: MobEffects.anchor(carrierTheirs),
                speed: targetMine, marks: speedswapMarks(targetMine), mode: mode }), span);
            const theirsId = world.effect(speedswapBind, target, JSON.stringify({ ratio: ratioTheirs, partner: String(actor.ref()),
                self: MobEffects.anchor(carrierTheirs), other: MobEffects.anchor(carrierMine),
                speed: targetTheirs, marks: speedswapMarks(targetTheirs), mode: mode }), span);
            if (!mineId || !theirsId) {
                if (mineId) world.operation(mineId, "world_combat:dispel", "{}");
                if (theirsId) world.operation(theirsId, "world_combat:dispel", "{}");
                MobEffects.consume(world, actor, speedswapShift);
                MobEffects.consume(world, target, speedswapShift);
                fizzle("no-window");
                return;
            }

            // 两端数值由机制给出：画面在各自脚边按实际速度画出更密/更疏的刻线。
            const gap = Math.round(Math.abs(theirs - mine) * 1000) / 1000;
            WorldFeedback.emit(world, speedswapScene, 1, here,
                { moment: "cross", target: String(target.ref()), marks: threads, mine: targetMine, theirs: targetTheirs,
                    gap: gap, mode: mode, scale: 1, intensity: Math.max(0.7, Math.min(2.2, gap + 0.6)) }, 32);
            WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.25, 0)), speedswapShiftText, [Math.round(span / 20)], 32);
            world.sound("minecraft:block.beacon.power_select", here, 14, "{}");
            done(action);
        }
    });
}
