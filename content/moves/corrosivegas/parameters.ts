/**
 * 腐蚀气体 / corrosivegas —— 第 159 组「资源线的封锁与转手」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：毒、变化、威力 —、命中 100、PP 40、目标 allAdjacent（相邻的所有宝可梦）：
 *   用强酸气体包裹住自己周围所有的宝可梦，融化它们所携带的道具。
 * - 即时战斗翻译：以施法者为中心炸开一片强酸毒雾，三百六十度罩住周围——雾里每个活体（队友与对手一视同仁，
 *   施法者自己除外）携带的道具被当场溶毁、谁也不得到；没有道具的活体也沾上一层短暂可见的「沾酸」身份。
 *   毒雾本身不造成伤害，落地后还会留一小段时间的残雾。
 * - 与同组分开：查封（embargo）只封住一个目标、道具仍在手里；回复封锁（healblock）封的是回血；
 *   传递礼物（bestow）是把道具送出去。腐蚀气体是一次无差别的范围溶毁，道具真的没了（不是被封、不是掉落）。
 * - 与烧尽（incinerate）分开：烧尽是朝前的扇形、只烧树果与宝石、还带伤害；腐蚀气体是绕身的整圈、什么道具都溶，
 *   且不造成伤害——代价是它连队友的道具一起溶掉。
 *
 * 参数分散到精灵数据：雾半径取特攻与体型高度，沾酸时长取等级与特攻，残雾维持取体重，起手取速度，
 * 收招取速度，冷却取速度，溶蚀粒子取特攻，酸泡取等级，雾团取体重。配置 spread 双向取舍。本招不造成伤害。
 */
namespace PokemonSkills {
    export const corrosiveGasScene = "world_combat:move_corrosivegas";
    export const corrosiveGasEffect = "world_combat:corroded";
    export const corrosiveGasStatus = "corroded";
    export const corrosiveGasMeltText = "world_combat.move.corrosivegas.text.melt";
    export const corrosiveGasFizzText = "world_combat.move.corrosivegas.text.fizz";
    export const corrosiveGasTaintText = "world_combat.move.corrosivegas.text.taint";

    actionParameters.define("corrosivegas", {
        /** 雾半径：基础 3.2 格；特攻每比 60 多 1 加 0.02（夹 -0.4..+1.6），体型高度每比 1.4 高 1 格加 0.6（夹 -0.3..+1.8）；
         *  spread 开 ×1.3、关 ×0.85；夹在 2.0..6.4 格。 */
        radius: formula(
            F.base(3.2)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.4, 1.6).as("特攻"))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.8).as("体型"))
                .times(F.when(F.pref("spread"), F.const(1.3), F.const(0.85)).as("铺法"))
                .clamp(2.0, 6.4).round(2),
            "雾半径", { unit: " 格", description: "强酸毒雾罩住多大一片地；特攻越高、个头越大铺得越开，铺开式 ×1.3、收束式 ×0.85。它同时决定谁被裹住。" }),
        /** 沾酸时长：基础 60 刻；等级每级 +1.2（夹 24..96），特攻每 1 点 +0.4（夹 8..48）；夹在 40..200 刻。 */
        duration: seconds(
            F.base(60)
                .plus(F.level().times(1.2).as("等级"))
                .plus(F.stat("specialAttack").times(0.4).as("特攻"))
                .clamp(40, 200).round(0),
            "沾酸时长", "被雾裹住的活体身上「沾酸」身份留多久；等级与特攻越高越久，供别的招式按身份消费。"),
        /** 残雾维持：基础 60 刻；体重每比 50 多 1 加 0.4（夹 -10..+40）；夹在 40..180 刻。 */
        linger: seconds(
            F.base(60).plus(F.body("weight").minus(50).times(0.4).clamp(-10, 40).as("体重")).clamp(40, 180).round(0),
            "残雾维持", "毒雾炸开后贴地留多久；体重越大压得越久。它是能被看见、被绕开的一段残雾。"),
        /** 起手：基础 13 刻，速度每点 −0.05 刻；夹在 8..16 刻。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").times(0.05).as("速度")).clamp(8, 16).round(0),
            "起手", "把胃里的酸气逼到体表、撑开成雾需要多久；速度越快起得越短。"),
        /** 收招：基础 8 刻，速度每点 −0.02 刻；夹在 5..11 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").times(0.02).as("速度")).clamp(5, 11).round(0),
            "收招", "毒雾散开后的收势；速度越快收得越快。"),
        /** 冷却：基础 150 刻 − 速度 ×0.1；spread 开 +8、关 −6；夹在 90..200 刻。 */
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.1).as("速度"))
                .plus(F.when(F.pref("spread"), F.const(8), F.const(-6)).as("铺法"))
                .clamp(90, 200).round(0),
            "冷却", "两次喷酸之间的等待；铺开式更久、收束式更短。"),
        /** 溶蚀粒子：基础 14，特攻每 7 点 +1；夹在 12..34 个。 */
        meltMotes: formula(
            F.base(14).plus(F.stat("specialAttack").div(7).as("特攻")).clamp(12, 34).round(0),
            "溶蚀粒子", { unit: " 个", description: "每件被熔掉的道具炸开的酸粒子数量；特攻越高越多，粒子按它发射。" }),
        /** 酸泡数量：基础 10，等级每 4 级 +1；夹在 10..26 个。 */
        bubbles: formula(
            F.base(10).plus(F.level().div(4).as("等级")).clamp(10, 26).round(0),
            "酸泡数量", { unit: " 个", description: "毒雾里翻腾的酸泡数量；等级越高越多，驱动雾层粒子。" }),
        /** 雾团数量：基础 16，体重每 8 点 +1；夹在 12..36 团。 */
        cloudlets: formula(
            F.base(16).plus(F.body("weight").div(8).as("体重")).clamp(12, 36).round(0),
            "雾团数量", { unit: " 团", description: "撑开毒雾的雾团数量；体重越大越厚，驱动雾的规模。" })
    });

    stages("corrosivegas", [
        { level: 30, values: { radius: 3.6 } },
        { level: 50, values: { radius: 4.0, meltMotes: 20 } }
    ]);

    describe("corrosivegas", [
        { key: "description.0", values: ["radius", "duration"] },
        { key: "spread.on", values: [], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "spread.off", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.radius"] }
    ]);
}
