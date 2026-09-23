/**
 * 起草 / trailblaze 的参数与数值来源。
 *
 * 原生事实：草、物理、威力 50、命中 100、PP 20、接触；命中后自身速度 +1（100%）。
 * 翻译：把「跳出草丛进行攻击、轻快的步伐提高速度」翻成一次**借草木起势的窜跃**——
 * 起跳点附近有草丛／树叶就借势：跃得更远、窜袭更重、轻步多带一档速度；空地上也能跳，只是少了这一份助力。
 * 这层「草丛借势」读的是现场方块（`trailblazeCoverOf`），通过本招的自定义事实 `cover` 进入公式，悬浮里看得见。
 *
 * 数值分散（每项依赖不同的精灵数据或现场事实）：
 *   strike  窜袭威力：速度偏移 + 草丛借势；快而轻的脚步切得更利。
 *   leap    窜跃距离：速度偏移；腿快跳得远。
 *   pace    每刻位移：速度偏移。
 *   haste   提速级数：草丛借势 +1，等级 56 起台阶再 +1。
 *   push    击退：速度偏移。
 *   girth   判定半径：碰撞箱高度偏移，大个子触面更宽。
 *   veil    草屑数量：速度派生，表现按它发射。
 *   crouch/landing/regroup 起手吃速度、收招固定、冷却固定（PP 20 的代价）。
 *
 * 配置 `overshoot`：命中后是就地收步还是顺势多掠一段落在对手身后——两者各有站位优劣。
 */
namespace PokemonSkills {
    /** 可借势的草木：叶片、可替换植物、花，以及名称里带草叶的方块。 */
    function trailblazePlant(id: string, block: CombatBlock | null): boolean {
        if (!block) return false;
        if (block.tagged("minecraft:leaves") || block.tagged("minecraft:replaceable_plants") || block.tagged("minecraft:flowers")) return true;
        var parts = ["short_grass", "tall_grass", "fern", "sapling", "azalea", "bush", "vine", "moss", "sprout"];
        for (var i = 0; i < parts.length; i++) if (id.indexOf(parts[i]) >= 0) return true;
        return false;
    }

    /** 起跳点脚边一格见方内是否有草木；供公式的 cover 事实与实际表现共用。 */
    export function trailblazeCoverOf(world: CombatWorld, actor: CombatActor): boolean {
        var body = world.observe(actor);
        if (body === null) return false;
        var p = body.position(), feet = WorldCombat.point(p.x(), p.y() - body.height() / 2, p.z());
        for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
            var column = WorldCombat.point(feet.x() + dx, feet.y(), feet.z() + dz);
            var low = world.block(column), high = world.block(column.plus(WorldCombat.point(0, 1, 0)));
            if (trailblazePlant(low ? String(low.id()) : "", low) || trailblazePlant(high ? String(high.id()) : "", high)) return true;
        }
        return false;
    }

    defineFacts("trailblaze", function (context) {
        return { read: function (id: string) {
            if (id !== "cover") return undefined;
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return trailblazeCoverOf(context.world, context.actor) ? 1 : 0;
        } };
    });

    actionParameters.define("trailblaze", {
        /** 窜袭威力：基础 50，速度每比 60 快 1 加 0.14（夹 -18..30），草丛借势 +12，夹 34..98。 */
        strike: formula(
            F.base(50).plus(F.stat("speed").minus(60).times(0.14).clamp(-18, 30))
                .plus(F.var("cover", text("worldcombat.skill.trailblaze.value.cover")).times(12)).clamp(34, 98).round(1),
            "窜袭威力", {
                unit: "威力",
                description: "窜出去那一下的威力；脚步越快切得越重，从草木里起跳再借一份。对手防御、相性与暴击在命中时另算。"
            }),
        /** 窜跃距离：基础 3.0 格，速度每比 60 快 1 加 0.022，夹 2.4..4.6。 */
        leap: formula(
            F.base(3.0).plus(F.stat("speed").minus(60).times(0.022)).clamp(2.4, 4.6).round(2),
            "窜跃距离", {
                unit: "格",
                description: "一次起跳最多窜出多远；腿快的个体够得到更远的对手。它同时是本招的射程基准。"
            }),
        /** 每刻位移：基础 1.0 格/刻，速度每比 60 快 1 加 0.006，夹 0.8..1.5。 */
        pace: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006)).clamp(0.8, 1.5).round(2),
            "窜跃速度", {
                unit: "格/刻",
                description: "窜跃时每刻移动的距离；越快越突然，留给对手侧移的时间越短。"
            }),
        /** 提速级数：草丛借势 +1，等级 56 台阶再 +1，夹 1..2。 */
        haste: formula(
            F.base(1).plus(F.when(F.var("cover", text("worldcombat.skill.trailblaze.value.cover")).gte(1), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "提速级数", {
                unit: "级",
                description: "命中后提高的速度等级；从草丛起跳时多带一档。脱战后同样消退。"
            }),
        /** 击退：基础 0.3 格，速度每比 60 快 1 加 0.004，夹 0.2..0.6。 */
        push: formula(
            F.base(0.3).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.2, 0.6).round(2),
            "击退", {
                unit: "格",
                description: "窜中后把目标带开的方向偏移；冲得快的个体推得更远。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.15，夹 0.4..0.9。 */
        girth: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.4, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "窜跃时的横向判定半径；身板越宽大触面越大。"
            }),
        /** 草屑数量：基础 18，速度每比 60 快 1 加 0.35，夹 12..42。 */
        veil: formula(
            F.base(18).plus(F.stat("speed").minus(60).times(0.35)).clamp(12, 42).round(0),
            "草屑数量", {
                unit: "个",
                description: "起跳与落地扬起的草屑数量，随速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 8 刻，速度每比 60 快 1 少 0.02，夹 5..10。 */
        crouch: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 10).round(0),
            "起手", "屈膝压进草丛、看清去路的时长；速度越快越干脆。"),
        landing: seconds(F.base(7).round(0), "收招", "落地收势。"),
        regroup: seconds(F.base(40).round(0), "冷却", "再次窜跃前的间隔；PP 20 的代价。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage("trailblaze", "strike", {}, { contact: true });

    stages("trailblaze", [
        { level: 40, values: { strike: 64 } },
        { level: 56, values: { strike: 78, haste: 2 } }
    ]);

    describe("trailblaze", [
        { key: "description.0", values: ["strike","leap","pace"] },
        { key: "description.1", values: ["haste","push","girth"] },
        { key: "description.cover", values: [] },
        { key: "overshoot.on", values: [], when: function (context) { return read(context.detail.values, ["overshoot"]) === true; } },
        { key: "overshoot.off", values: [], when: function (context) { return read(context.detail.values, ["overshoot"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.strike"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.strike", "tier.1.haste"] }
    ]);
}
