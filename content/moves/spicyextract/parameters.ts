/**
 * 辣椒精华 / spicyextract 的参数与数值来源。
 *
 * 原生事实：Grass、Status、威力 —、命中 100、PP 15、目标 normal（单体）／boosts={atk:+2, def:-2}。
 * 世界化：这不是一次「必定生效的加攻减防」，而是把一管辣椒精华甩到交战位置：point 自由落点，
 * 瓶子沿弧线飞出、落地炸成一团呛人辣雾，落点半径内所有敌人的攻击被辣高、防御被烧穿；直接被瓶子命中的那一个
 * 可以是队友，定向赠予这份双刃提升，而辣雾本身只筛选敌人。全程不造成任何伤害，只改攻防。
 * 浓缩原液贴脸砸一只，泼得最狠；稀释喷洒抛得更远、铺得更开，但每一口都更淡。
 * 辣雾会在落点残留一段，**新进入**的敌人也会被辣一次（同一目标只结算一次，记在区域数据里，爆开时已命中的也不会被入场再叠）。
 * 辣雾不造成伤害，只是把「揍它」的窗口画在世界上。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   blast     半径：浓缩 1.6／稀释 3.2；体重每 15kg 多 0.4；夹 1.2..3.8 格。越重的个体甩出的量越多、铺得越开。
 *   gift      给敌人的攻击等级：浓缩 3／稀释 1，等级 50 起 +1。浓缩更狠，也更容易反噬。
 *   shred     削掉的防御等级：浓缩 3／稀释 1，与浓度绑定：越浓越脆。
 *   linger    辣雾残留：基础 60 刻，施法者特攻每比 60 多 1 点 +0.5；夹 40..120 刻。辣度高留得久。
 *   throwSpeed/collision 瓶子的飞行与判定：速度随速度值，判定随碰撞箱高度。
 * 配置 mix（原液浓缩／稀释喷洒）真的改变射程：射程走 resolve，声明 maxRange 12 作为上限。
 */
namespace PokemonSkills {
    export const spicyHazeRule = "world_combat:spicy_haze";
    export const spicyReferenceRadius = 1.6;

    actionParameters.define("spicyextract", {
        /** 落点半径：浓缩 1.6／稀释 3.2，加体重每 150 百克 0.4，夹 1.2..3.8。 */
        blast: formula(
            F.when(F.pref("mix", text("worldcombat.skill.spicyextract.preference.mix")), F.const(3.2), F.const(1.6))
                .plus(F.body("weight").div(150).times(0.4))
                .clamp(1.2, 3.8).round(2),
            "辣雾半径", {
                unit: " 格",
                description: "落点辣雾覆盖的半径；稀释喷洒铺得更开，体重越大的个体一次甩出的量越多。"
            }),
        /** 攻击礼物：浓缩 3／稀释 1，等级 50 起 +1，夹 1..4。 */
        gift: formula(
            F.when(F.pref("mix", text("worldcombat.skill.spicyextract.preference.mix")), F.const(1), F.const(3))
                .plus(F.when(F.level().gte(50), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "攻击礼物", {
                unit: " 级",
                description: "送给敌人的攻击等级；浓缩原液给得最多，等级 50 起再 +1。它打你更疼。"
            }),
        /** 防御削减：浓缩 3／稀释 1，夹 1..3。 */
        shred: formula(
            F.when(F.pref("mix", text("worldcombat.skill.spicyextract.preference.mix")), F.const(1), F.const(3)).clamp(1, 3).round(0),
            "防御削减", {
                unit: " 级",
                description: "削掉的防御等级；与浓度绑定，收益属于所有打它的人。"
            }),
        /** 辣雾残留：基础 60 刻，特攻每比 60 多 1 点 +0.5，夹 40..120。 */
        linger: seconds(
            F.base(60).plus(F.stat("specialAttack").minus(60).max(0).times(0.5)).clamp(40, 120).round(0),
            "辣雾残留", "落点辣雾存在多久；辣度高的个体把呛味留得更久。"),
        /** 瓶子速度：基础 0.7 格/刻，速度每比 60 多 0.004，夹 0.6..1.2。 */
        throwSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).max(0).times(0.004)).clamp(0.6, 1.2).round(2),
            "投掷速度", {
                unit: " 格/刻",
                description: "瓶子飞行的速度；快个体抛得更急。"
            }),
        /** 判定半径：基础 0.32 格，碰撞箱高度每比 1.4 高 1 格 +0.1，夹 0.2..0.6。 */
        collision: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.2, 0.6).round(2),
            "判定半径", {
                unit: " 格",
                description: "瓶子的横向判定半径；大个子判定更宽。"
            }),
        gravity: hidden(0.012),
        /** 起手：速度每比 60 快 1 少 0.04 刻，夹 8..14。 */
        telegraph: seconds(
            F.base(12).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(8, 14).round(0),
            "起手", "取出并甩出精华瓶需要多久；快个体更早脱手。"),
        /** 收招：基础 8 刻，碰撞箱高度每比 1.4 高 1 格 +1.5，夹 6..12。 */
        aftermath: seconds(
            F.base(8).plus(F.body("height").minus(1.4).times(1.5)).clamp(6, 12).round(0),
            "收招", "甩出之后的收势；身板越大越慢。"),
        /** 冷却：基础 90 刻，等级 30 起每级 -0.4，夹 70..100。 */
        wait: seconds(
            F.base(90).minus(F.level().minus(30).max(0).times(0.4)).clamp(70, 100).round(0),
            "冷却", "两次投掷之间的等待；等级越高越熟练。")
    });

    describe("spicyextract", [
        { key: "description.0", values: ["gift", "shred"] },
        { key: "description.additional", values: [] },
        { key: "description.1", values: ["blast", "linger"] },
        { key: "description.2", values: ["throwSpeed", "collision", "range"] },
        { key: "description.3", values: ["telegraph", "aftermath", "wait"] }
    ]);
}
