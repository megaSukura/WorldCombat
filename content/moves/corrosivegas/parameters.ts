/** 腐蚀气体：原生持有物溶毁与普通耐久装备腐蚀共享范围，磨损比例独立列入说明参数。 */
namespace PokemonSkills {
    export const corrosiveGasScene = "world_combat:move_corrosivegas";
    /** 起手预告层：逐帧画出真实雾半径，并圈出此刻会被裹住的活体（队友遇险时边缘转警示色）。 */
    export const corrosiveGasReachScene = "world_combat:move_corrosivegas_reach";
    export const corrosiveGasMeltText = "world_combat.move.corrosivegas.text.melt";
    export const corrosiveGasFizzText = "world_combat.move.corrosivegas.text.fizz";
    export const corrosiveGasWearText = "world_combat.move.corrosivegas.text.wear";
    export const corrosiveGasBrokeText = "world_combat.move.corrosivegas.text.broke";

    actionParameters.define("corrosivegas", {
        wearPercent: formula(F.const(6), "装备腐蚀", { unit: "%", description: "普通手持耐久装备一次损失的最大耐久比例；损耗按原生耐久路径结算，可以真的损毁到 0。" }),
        /** 雾半径：基础 3.2 格；特攻每比 60 多 1 加 0.02（夹 -0.4..+1.6），体型高度每比 1.4 高 1 格加 0.6（夹 -0.3..+1.8）；
         *  spread 开 ×1.3、关 ×0.85；夹在 2.0..6.4 格。 */
        radius: formula(
            F.base(3.2)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.4, 1.6).as("特攻"))
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 1.8).as("体型"))
                .times(F.when(F.pref("spread"), F.const(1.3), F.const(0.85)).as("铺法"))
                .clamp(2.0, 6.4).round(2),
            "雾半径", { unit: " 格", description: "强酸毒雾罩住多大一片地；特攻越高、个头越大铺得越开，铺开式 ×1.3、收束式 ×0.85。它同时决定谁被裹住。" }),
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
            "溶蚀粒子", { unit: " 个", description: "每件被溶毁／腐蚀的装备炸开的酸粒子数量；特攻越高越多，粒子按它发射。" }),
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
        { key: "description.0", values: ["radius"] },
        { key: "description.1", values: ["wearPercent"] },
        { key: "spread.on", values: [], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "spread.off", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.radius"] }
    ]);
}
