/**
 * 电磁炮 / zapcannon —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric／特殊／威力 120／命中 50／PP 5／单体／100% 令对手麻痹／bullet。
 * 翻译：把「发射大炮一样的电流」翻成一门**要蓄满才能放的重炮**——蓄力时间长，射出的电弹又慢又沉，
 *   只做有限修正，走位能把它甩开；但只要命中，伤害很重且一定麻住。原生 50 命中在即时战里就是「慢弹 + 难中」，
 *   玩家的反制是横向拉开，而不是靠运气。
 *   配置 `quickload`（速装式）把这一发改成更轻更快的版本：蓄得快、弹速高、更容易打中，代价是威力、爆开范围与麻痹时长都缩水。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   shell        炮弹威力：特攻决定电压，体重决定炮膛里的分量（重个体打出更沉的弹）。
 *   shellSpeed   弹体速度：等级（炮术越熟越快）− 体重（弹越重越慢）＋ 速度；速装式再乘 1.3。
 *   shellTurn    修正转向：特攻决定有限制导的强度；速装式转得更急。慢弹只靠这个跟上走位。
 *   shockRadius  爆开半径：碰撞箱高度（大个子炮口更大）＋速装式收窄。
 *   numbTicks    麻痹时长：特攻决定穿透力；速装式略短。
 *   recoil       后坐：体型越大越稳、被推得越少；它是施法者开炮后被向后推的距离。
 *   reach        射程：等级。
 *   arcs         电弧条数：特攻；同时是画面里的电弧数量。
 *   chargeTicks  蓄力：速度（手快的人蓄得快）；速装式 ×0.6。
 *   settle       收招：速装式更短。
 *   recharge     冷却：等级；速装式略短。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const zapcannonId = "zapcannon";

    actionParameters.define(zapcannonId, {
        /** 威力：104 + 特攻偏移[−24,80] + 体重偏移[0,34]；速装 ×0.78；夹 70..170。 */
        shell: formula(
            F.base(104).plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-24, 80))
                .plus(F.body("weight").minus(60).times(0.2).clamp(0, 34))
                .times(F.when(F.pref("quickload"), F.const(0.78), F.const(1)))
                .clamp(70, 170).round(1),
            "炮弹威力", {
                unit: "威力",
                description: "这一炮命中时的基础威力；特攻越高电压越强，体重越大的个体打出的弹越沉。速装式更轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 弹速：0.62 + 等级偏移[0,0.25] − 体重偏移[0,0.2] + 速度偏移[−0.08,0.12]；速装 ×1.3；夹 0.35..1.1。 */
        shellSpeed: formula(
            F.base(0.62).plus(F.level().minus(25).times(0.006).clamp(0, 0.25))
                .minus(F.body("weight").times(0.0012).clamp(0, 0.2))
                .plus(F.stat("speed").minus(60).times(0.002).clamp(-0.08, 0.12))
                .times(F.when(F.pref("quickload"), F.const(1.3), F.const(1)))
                .clamp(0.35, 1.1).round(2),
            "弹体速度", {
                unit: "格/刻",
                description: "电弹飞出去的速度——本招比同族的电击慢得多，正是它难中的原因；等级高、体重轻、速度快的个体打得更快，速装式再快三成。"
            }),
        /** 修正转向：2.4 + 特攻偏移[0,2]；速装 ×1.35；夹 1.2..5。 */
        shellTurn: formula(
            F.base(2.4).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 2))
                .times(F.when(F.pref("quickload"), F.const(1.35), F.const(1)))
                .clamp(1.2, 5.0).round(2),
            "修正转向", {
                unit: "度/刻",
                description: "电弹每刻朝目标修正的幅度；慢弹只靠这点制导跟上走位，横向拉开仍能甩掉，速装式转得更急。"
            }),
        /** 爆开半径：1.0 + 高度偏移[−0.2,0.8]；速装 ×0.8；夹 0.7..2.2。 */
        shockRadius: formula(
            F.base(1.0).plus(F.body("height").minus(1.4).times(0.28).clamp(-0.2, 0.8))
                .times(F.when(F.pref("quickload"), F.const(0.8), F.const(1)))
                .clamp(0.7, 2.2).round(2),
            "爆开半径", {
                unit: "格",
                description: "命中处炸开的范围；个子高的个体炮口更大，速装式的弹更小。它是命中范围，也是画面的尺寸。"
            }),
        /** 麻痹时长：220 + 特攻偏移[−40,120]；速装 ×0.85；夹 140..420。 */
        numbTicks: seconds(
            F.base(220).plus(F.stat("specialAttack").minus(60).times(0.8).clamp(-40, 120))
                .times(F.when(F.pref("quickload"), F.const(0.85), F.const(1)))
                .clamp(140, 420).round(0),
            "麻痹时长", "这一炮一定麻住目标，这里是麻住多久；特攻决定穿透力，速装式略短。"),
        /** 后坐：0.9 − 高度偏移[−0.25,0.55]；夹 0.2..1.2。 */
        recoil: formula(
            F.base(0.9).minus(F.body("height").minus(1.4).times(0.25).clamp(-0.25, 0.55)).clamp(0.2, 1.2).round(2),
            "后坐", {
                unit: "格",
                description: "开炮后施法者被向后推的距离；体型越大越稳、被推得越少。它是位置结果，不造成伤害。"
            }),
        /** 射程：12 + 等级(≥25)偏移[0,4]；夹 10..19。 */
        reach: formula(
            F.base(12).plus(F.level().minus(25).times(0.06).clamp(0, 4)).clamp(10, 19).round(2),
            "射程", {
                unit: "格",
                description: "能锁定多远处开炮；等级越高够得越远。它也是本招的实际射程。"
            }),
        /** 电弧条数：10 + 特攻偏移[0,12]；夹 6..24。 */
        arcs: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.1).clamp(0, 12)).clamp(6, 24).round(0),
            "电弧条数", {
                unit: "条",
                description: "蓄电与爆开时的电弧数量；特攻越高越密，也是画面里电弧的数量。"
            }),
        /** 蓄力：30 − 速度偏移[0,8]；速装 ×0.6；夹 10..40。 */
        chargeTicks: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.15).clamp(0, 8))
                .times(F.when(F.pref("quickload"), F.const(0.6), F.const(1)))
                .clamp(10, 40).round(0),
            "蓄力", "把电灌满炮膛要多久；速度越快蓄得越短，速装式只要六成。蓄力期间可被打断，不花 PP。"),
        /** 收招：12；速装 ×0.85；夹 6..18。 */
        settle: seconds(
            F.base(12).times(F.when(F.pref("quickload"), F.const(0.85), F.const(1))).clamp(6, 18).round(0),
            "收招", "开炮后恢复架势的时间；速装式更短。"),
        /** 冷却：54 − 等级(≥25)偏移[0,12]；速装 ×0.9；夹 28..80。 */
        recharge: seconds(
            F.base(54).minus(F.level().minus(25).times(0.3).clamp(0, 12))
                .times(F.when(F.pref("quickload"), F.const(0.9), F.const(1)))
                .clamp(28, 80).round(0),
            "冷却", "两炮之间的等待；这是本族最长的冷却，等级越高回得越快，速装式略短。")
    });

    defineDamage(zapcannonId, "shell", {});

    stages(zapcannonId, [
        { level: 40, values: { shell: 128 } },
        { level: 56, values: { numbTicks: 300, shockRadius: 1.4 } }
    ]);

    describe(zapcannonId, [
        { key: "description.0", values: ["shell", "shellSpeed", "reach"] },
        { key: "description.1", values: ["chargeTicks", "numbTicks"] },
        { key: "description.2", values: ["shellTurn", "recoil", "recharge"] },
        { key: "quickload.on", values: [], when: function (context) { return read(context.detail.values, ["quickload"]) === true; } },
        { key: "quickload.off", values: [], when: function (context) { return read(context.detail.values, ["quickload"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shell"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.numbTicks"] }
    ]);
}
