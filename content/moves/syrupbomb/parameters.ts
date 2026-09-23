/**
 * 糖浆炸弹 / syrupbomb 的参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Grass、特殊、威力 60、命中 85、PP 10、bullet；
 *   命中后目标陷入 volatile syrupbomb：接下来 3 个回合每回合掉 1 级速度。
 *
 * 世界化：把一颗粘稠的麦芽糖炸弹**抛**出去（有弧线、命中 85 翻成“抛物线容易被打空/被走位躲开”），
 *   落地炸开一大团琥珀糖浆：被裹住的目标每 `interval` 掉 1 级速度，共 `pulses` 阵；落点地面留下
 *   一片粘糖洼（`WorldEffects.field`），踏进去的敌人会被黏住一下。它本身不追人，只是把一片地弄脏。
 *
 * 数值来源（不同参数读不同个体数据）：
 *   burst       炸开那一下：基础 60，特攻每比 60 多 1 加 0.24，夹 34..110。
 *   blast       糖浆爆散半径：基础 2.2 格，特攻每比 60 多 1 加 0.01，浓糖 ×1.4，夹 1.8..3.6。
 *   poolRadius  粘糖洼半径：基础 1.6 格，碰撞箱每比 1.4 高 1 格加 0.8，浓糖 ×1.3，夹 1.2..3.0。
 *   poolTicks   粘糖洼存在：基础 100 刻，30 级起每级 +1，夹 80..220。
 *   coatTicks   满身糖持续：基础 160 刻，20 级起每级 +1.2，夹 120..280。
 *   interval    掉速间隔：基础 30 刻，速度每比 60 快 1 减 0.04，夹 22..38。
 *   pulses      掉速阵数：3 阵。
 *   speed       炸弹投掷速度：基础 0.5 格/刻，速度每比 60 快 1 加 0.003，浓糖 ×0.85，夹 0.35..0.8。
 *   gravity     抛物线重力（固定 0.02）。
 *   collision   判定半径：基础 0.4 格，碰撞箱每比 1.4 高 1 格加 0.15，夹 0.3..0.8。
 *   reach       投掷距离：基础 8 格，特攻每比 60 多 1 加 0.02，夹 7..11。
 *   tempo       起手：基础 12 刻，速度每比 60 快 1 减 0.04，夹 9..15。
 *   wait        冷却：基础 70 刻，30 级起每级 -0.3，浓糖 +10，夹 55..100。
 *   stick       粘糖洼黏人时长：固定 8 刻。
 *
 * 伤害段 burst 是炸开那一下；之后的掉速按级别结算（不造成伤害）。
 * 配置 thick（浓糖）：爆散与洼更大、更容易罩住一片，但炸弹更慢、冷却更长。
 */
namespace PokemonSkills {
    export const syrupbombScene = "world_combat:move_syrupbomb";
    export const syrupbombEffect = "world_combat:syrup_coated";
    export const syrupbombBind = "world_combat:syrupbomb_bind";
    export const syrupbombPool = "world_combat:syrup_pool";

    actionParameters.define("syrupbomb", {
        /** 炸开威力：基础 60，特攻每比 60 多 1 加 0.24，夹 34..110。 */
        burst: formula(
            F.base(60).plus(F.stat("specialAttack").minus(60).times(0.24)).clamp(34, 110).round(1),
            "炸开威力", {
                unit: "威力",
                description: "糖浆炸开那一下的基础特殊威力；对手防御、相性与暴击在命中时另算。"
            }),
        /** 爆散半径：基础 2.2 格，特攻每比 60 多 1 加 0.01，浓糖 ×1.4，夹 1.8..3.6。 */
        blast: formula(
            F.base(2.2).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(-0.5, 1.4))
                .times(F.when(F.pref("thick"), F.const(1.4), F.const(1)))
                .clamp(1.8, 3.6).round(2),
            "爆散半径", {
                unit: "格",
                description: "糖浆罩住多大一片；浓糖铺得更开，也更容易一次裹住多人。"
            }),
        /** 粘糖洼半径：基础 1.6 格，碰撞箱每比 1.4 高 1 格加 0.8，浓糖 ×1.3，夹 1.2..3.0。 */
        poolRadius: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.8))
                .times(F.when(F.pref("thick"), F.const(1.3), F.const(1)))
                .clamp(1.2, 3.0).round(2),
            "粘糖洼半径", {
                unit: "格",
                description: "落点那片粘糖洼的半径；身量大、浓糖的个体摊得更宽。"
            }),
        /** 粘糖洼存在：基础 100 刻，30 级起每级 +1，夹 80..220。 */
        poolTicks: seconds(
            F.base(100).plus(F.level().minus(30).max(0).times(1.0)).clamp(80, 220).round(0),
            "粘糖洼存在", "落点粘糖洼留多久；等级越高留得越久。"),
        /** 满身糖持续：基础 160 刻，20 级起每级 +1.2，夹 120..280。 */
        coatTicks: seconds(
            F.base(160).plus(F.level().minus(20).max(0).times(1.2)).clamp(120, 280).round(0),
            "满身糖持续", "被糖浆裹住多久；期间每隔一段掉一级速度。"),
        /** 掉速间隔：基础 30 刻，速度每比 60 快 1 减 0.04，夹 22..38。 */
        interval: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.04)).clamp(22, 38).round(0),
            "掉速间隔", "每隔多久掉一级速度；糖浆越粘，掉得越密。"),
        /** 掉速阵数：固定 3 阵。 */
        pulses: formula(F.const(3), "掉速阵数", { unit: "阵", description: "满身糖期间一共掉几级速度。" }),
        /** 投掷速度：基础 0.5 格/刻，速度每比 60 快 1 加 0.003，浓糖 ×0.85，夹 0.35..0.8。 */
        speed: formula(
            F.base(0.5).plus(F.stat("speed").minus(60).times(0.003).clamp(-0.15, 0.3))
                .times(F.when(F.pref("thick"), F.const(0.85), F.const(1)))
                .clamp(0.35, 0.8).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "炸弹的出手速度；浓糖的炸弹更沉更慢，也更容易被打空。"
            }),
        gravity: hidden(0.02),
        /** 判定半径：基础 0.4 格，碰撞箱每比 1.4 高 1 格加 0.15，夹 0.3..0.8。 */
        collision: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.3, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "炸弹的横向判定半径；大个子判定更宽。"
            }),
        /** 投掷距离：基础 8 格，特攻每比 60 多 1 加 0.02，夹 7..11。 */
        reach: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3)).clamp(7, 11).round(1),
            "投掷距离", {
                unit: "格",
                description: "能把炸弹抛到多远；特攻越高甩得越远。"
            }),
        /** 起手：基础 12 刻，速度每比 60 快 1 减 0.04，夹 9..15。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4)).clamp(9, 15).round(0),
            "起手", "把糖浆搓成一颗炸弹需要多久；快个体更早脱手。"),
        /** 冷却：基础 70 刻，30 级起每级 -0.3，浓糖 +10，夹 55..100。 */
        wait: seconds(
            F.base(70).minus(F.level().minus(30).max(0).times(0.3))
                .plus(F.when(F.pref("thick"), F.const(10), F.const(0)))
                .clamp(55, 100).round(0),
            "冷却", "两次投弹之间的等待；等级越高越熟练，浓糖更费。"),
        /** 粘糖洼黏人时长：固定 8 刻。 */
        stick: seconds(F.base(8), "黏人时长", "敌人踏进粘糖洼时被黏住、短暂抬不起脚的时间。")
    });

    defineDamage("syrupbomb", "burst", {});

    describe("syrupbomb", [
        { key: "description.0", values: ["burst"] },
        { key: "description.1", values: ["blast", "coatTicks", "interval"] },
        { key: "description.2", values: ["pulses"] },
        { key: "description.3", values: ["poolRadius","poolTicks","stick"] },
        { key: "description.4", values: ["reach","speed","collision"] },
        { key: "description.5", values: ["tempo", "wait"] }
    ]);
}
