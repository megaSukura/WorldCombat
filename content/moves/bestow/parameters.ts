/**
 * 传递礼物 / bestow —— 第 159 组「资源线的封锁与转手」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：一般、变化、威力 —、命中 必中、PP 15、单体；命中时若目标没有携带道具，
 *   施法者就把自己携带的道具交给目标；目标已有道具则失败。
 * - 即时战斗翻译：把这件「送给队友」的礼物交出去——施法者把手里那件东西托起，缎带牵着它沿一条线飞到
 *   空手的伙伴身上，落进它的道具位。自己空了手，伙伴得到了它。只送出去、不换回来，也不丢弃。
 * - 与同组分开：查封（embargo）封住目标的道具通道、腐蚀气体（corrosivegas）当场溶毁、回复封锁（healblock）封回血；
 *   传递礼物是这一组里唯一把道具**交到别人手上**的招式。与戏法／掉包（交换）分开：它不换回任何东西；
 *   与回收利用分开：它送出去后自己不再拿回。
 *
 * 参数分散到精灵数据：递送距离取体型高度与等级，起手取速度，收招取速度，冷却取等级，缎带数取特攻，
 * 光点取等级，光尘取亲密度（朋友间递得更亮），飞行时长取速度。配置 urgent 在「递得远」与「递得快」之间取舍。
 * 本招不造成伤害。
 */
namespace PokemonSkills {
    export const bestowScene = "world_combat:move_bestow";
    export const bestowGiftText = "world_combat.move.bestow.text.gift";
    export const bestowReceiveText = "world_combat.move.bestow.text.receive";
    export const bestowEmptyText = "world_combat.move.bestow.text.empty";
    export const bestowFullText = "world_combat.move.bestow.text.full";
    export const bestowSealedText = "world_combat.move.bestow.text.sealed";
    export const bestowRefusedText = "world_combat.move.bestow.text.refused";

    actionParameters.define("bestow", {
        /** 递送距离：基础 5 格；体型高度每比 1.4 高 1 格加 0.3（夹 -0.2..+1.2），20 级起每级加 0.04；
         *  urgent 开 ×0.8、关 ×1.15；夹在 3..10 格。 */
        reach: formula(
            F.base(5)
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.2, 1.2).as("体型"))
                .plus(F.level().minus(20).max(0).times(0.04).as("等级"))
                .times(F.when(F.pref("urgent"), F.const(0.8), F.const(1.15)).as("递法"))
                .clamp(3, 10).round(2),
            "递送距离", { unit: " 格", description: "能把礼物送到多远；个头越大、等级越高够得越远，急递 ×0.8、郑重递 ×1.15。它也是本招实际射程的来源。" }),
        /** 起手：基础 9 刻，速度每点 −0.03 刻；urgent 开 −3、关 +3；夹在 4..14 刻。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.03).as("速度"))
                .plus(F.when(F.pref("urgent"), F.const(-3), F.const(3)).as("递法"))
                .clamp(4, 14).round(0),
            "起手", "把礼物托起来需要多久；速度越快越短，急递更快、郑重递更慢。"),
        /** 收招：基础 6 刻，速度每点 −0.02 刻；夹在 4..9 刻。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").times(0.02).as("速度")).clamp(4, 9).round(0),
            "收招", "把礼物交出去后的收势；速度越快收得越快。"),
        /** 冷却：基础 85 刻 − 等级 ×0.4；urgent 开 −10、关 +10；夹在 45..110 刻。 */
        recharge: seconds(
            F.base(85).minus(F.level().times(0.4).as("等级"))
                .plus(F.when(F.pref("urgent"), F.const(-10), F.const(10)).as("递法"))
                .clamp(45, 110).round(0),
            "冷却", "两次递送之间的等待；急递更短、郑重递更长，等级越高越熟练。"),
        /** 缎带数：基础 10 条，特攻每 10 点 +1；夹在 8..22 条。 */
        ribbons: formula(
            F.base(10).plus(F.stat("specialAttack").div(10).as("特攻")).clamp(8, 22).round(0),
            "缎带数量", { unit: " 条", description: "牵着礼物飞过去的缎带数量；特攻越高越多，粒子按它发射。" }),
        /** 光点数：基础 8 个，等级每 5 级 +1；夹在 8..18 个。 */
        motes: formula(
            F.base(8).plus(F.level().div(5).as("等级")).clamp(8, 18).round(0),
            "光点数量", { unit: " 个", description: "礼物沿途落下的光点数量；等级越高越多，驱动飞行粒子。" }),
        /** 光尘数：基础 6 个，亲密度每 40 点 +1；夹在 6..16 个。 */
        shine: formula(
            F.base(6).plus(F.individual("friendship").div(40).as("亲密度")).clamp(6, 16).round(0),
            "光尘数量", { unit: " 个", description: "收到礼物时在伙伴身上亮起的光尘数量；亲密度越高越亮，驱动接收画面。" }),
        /** 飞行时长：基础 14 刻，速度每点 −0.05 刻；夹在 8..20 刻。 */
        glide: seconds(
            F.base(14).minus(F.stat("speed").times(0.05).as("速度")).clamp(8, 20).round(0),
            "飞行时长", "礼物从施法者手里飞到伙伴身上的时间；速度越快越短。")
    });

    stages("bestow", [
        { level: 35, values: { reach: 6.0 } },
        { level: 50, values: { reach: 6.4, ribbons: 16 } }
    ]);

    describe("bestow", [
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["ribbons", "shine"] },
        { key: "urgent.on", values: [], when: function (context) { return read(context.detail.values, ["urgent"]) === true; } },
        { key: "urgent.off", values: [], when: function (context) { return read(context.detail.values, ["urgent"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.ribbons"] }
    ]);
}
