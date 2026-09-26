/**
 * 黑夜魔影 / nightshade — 参数、数值来源与直接结算。
 *
 * 原生事实：Ghost、特殊、威力 0、命中 100、PP 15、不接触；伤害恒等于使用者等级（Cobblemon 1.8，99 位学习者）。
 *
 * 翻译：一记远程的恐怖幻影。施法者把一段自己的等级凝成幽影脱手掷出，幻影自己追向目标、钻进它的心里；
 * 伤害只认等级（特攻给一点加成），不来自攻防比拼，因此由行动直接结算；幽灵系打不到一般系由属性表拦住。
 * 目标不位移，幻影在它身上盘踞一小会儿——这是它和地球上投最直观的区别：一个把人甩出去，一个不碰身体。
 * 配置 splash（炸影）把单体一记摊成范围爆发，每一发都变轻。
 *
 * 数据分散：damage 读等级与特攻；haunt 读速度；boltSpeed/boltRange 读速度与特攻；collisionRadius 读体高；
 * shroud 读等级；splashRadius 读体高。
 */
namespace PokemonSkills {
    /**
     * 与蛮干相同的直接结算入口，专属本招命名；返回目标实际失去的生命（世界单位）。
     * 见 endeavor/parameters.ts 的说明：返回 0 表示被属性免疫、护盾或原生伤害上限完全挡下。
     */
    export function nightshadeRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): number {
        const world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return 0;
        const before = world.observe(target);
        if (before === null) return 0;
        const start = before.health();
        const landed = PokemonDamage.fixed(world, target, CobblemonCombat.moveTemplate("nightshade"), amount,
            { contact: contact, knockback: false, bypassCooldown: true, ignoreArmor: true }, "immunity", action);
        const after = world.observe(target);
        if (after !== null) return Math.max(0, start - after.health());
        return landed ? start : 0;
    }

    actionParameters.define("nightshade", {
        /** 等级伤害：等级 ×（1 + 特攻项，夹 −0.12..+0.3）；炸影 ×0.55。特攻 60 时正好等于等级。 */
        damage: formula(
            F.level().times(F.const(1).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.12, 0.3)))
                .times(F.when(F.pref("splash", text("worldcombat.skill.nightshade.preference.splash")), F.const(0.55), F.const(1)))
                .round(1),
            "幻影伤害", {
                unit: "点",
                description: "幻影钻心那一下的固定伤害，等于使用者等级再乘一个特攻系数（特攻 60 时为等级本身）；炸影式每一发减到五成五。对手防御不参与结算，属性免疫、护盾与原生伤害上限照常裁定。"
            }),
        /** 起手：基础 9 刻，速度每比 55 快 1 少 0.03 刻；夹在 6..13。 */
        haunt: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3)).clamp(6, 13).round(0),
            "起手时长", "把幻影凝成形、脱手之前要多久；快的个体收得更快。"),
        /** 幻影速度：基础 0.9 格/刻，速度每比 55 多 1 加 0.006；夹在 0.75..1.4。 */
        boltSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.12, 0.5)).clamp(0.75, 1.4).round(2),
            "幻影速度", {
                unit: "格/刻",
                description: "幻影飞行的速度；它自己会追向目标，速度越快越难在到达前走开。"
            }),
        /** 幻影射程：基础 6.5 格，特攻每比 60 多 1 加 0.03；夹在 6..11；它同时是实际射程来源。 */
        boltRange: formula(
            F.base(6.5).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-0.5, 4.5)).clamp(6, 11).round(2),
            "幻影射程", {
                unit: "格",
                description: "幻影能被送到多远；特攻越高，恐怖幻影铺得越远。"
            }),
        /** 判定半径：基础 0.32 格，碰撞箱每比 1.4 高 1 格加 0.1；夹在 0.26..0.6。 */
        collisionRadius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.26, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "幻影命中判定的半径；大个子的幻影罩面略大。"
            }),
        /** 盘踞时长：基础 24 刻，等级每比 30 高 1 加 0.5 刻；夹在 18..48。 */
        shroud: seconds(
            F.base(24).plus(F.level().minus(30).times(0.5).clamp(-6, 24)).clamp(18, 48).round(0),
            "盘踞时长", "幻影命中后在目标身上盘踞、发出幽光的时长；等级越高盘踞越久。"),
        /** 炸影半径：基础 1.7 格，碰撞箱每比 1.4 高 1 格加 0.4；夹在 1.4..3；仅炸影式生效。 */
        splashRadius: formula(
            F.base(1.7).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.3, 1.3)).clamp(1.4, 3).round(2),
            "炸影半径", {
                unit: "格",
                description: "炸影式在命中点爆开的范围半径；身板越大罩得越开。"
            }),
        maximumTargets: hidden(4),
        gravity: hidden(0)
    });

    stages("nightshade", [
        { level: 35, values: { shroud: 30 } },
        { level: 55, values: { splashRadius: 2.6 } }
    ]);

    describe("nightshade", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["haunt","boltRange","boltSpeed","collisionRadius"] },
        { key: "splash.on", values: ["splashRadius","maximumTargets"], when: function (context) { return read(context.detail.values, ["splash"]) === true; } },
        { key: "splash.off", values: [], when: function (context) { return read(context.detail.values, ["splash"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.splashRadius"] }
    ]);
}
