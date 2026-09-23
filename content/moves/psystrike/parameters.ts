/**
 * 精神击破 / psystrike —— 参数与伤害段。
 *
 * 原生事实：Psychic／分类特殊但**改按目标物理防御结算**（`overrideDefensiveStat: def`）／威力 100／命中 100／PP 10／
 *   单体／**全招只有 1 位学习者**（超梦，Cobblemon 1.8，Showdown）。描述与精神冲击相同，但更重、更贵。
 *
 * 翻译：把同一份「念波实体化」做成**一次头顶的下压**——施法者把念波在目标上方堆成一整块沉重的实体，
 *   然后让它砸下来；落地把地面压出冲击面并震裂目标的精神防线（特防 −1）。它与精神冲击共用同一句原生描述与同一种
 *   结算方式，但形态完全不同：精神冲击是手里的小棱，精神击破是头顶的重物，更慢、更贵、带碎裂。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   crush    重压威力：特攻决定念力压得多沉，等级让重物更实。
 *   shock    冲击面威力：wide 时对范围内其他人的部分伤害，同样随特攻。
 *   reach    射程：特攻与等级（念力的触及）。
 *   height   落高：施法者体型越高，堆出的重物越高、落得越远。
 *   descend  落速：特攻越高落得越快越沉。
 *   mass     判定半径：施法者体型（碰撞箱高度）。
 *   splash   冲击面半径：特攻与体型（wide 时的波及范围）。
 *   cracks   碎裂数：特攻与等级，驱动画面密度。
 *   sunderStages 特防下降级数：固定 1 级。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `wide`（压场）双向取舍：开启＝落点铺开 `splash` 半径的冲击面，对范围内其他非友方结算 `shock`，
 *   但主击 ×0.85、起手 +3 刻、冷却 +8 刻；关闭（点压）＝只压目标一个，主击 ×1.12、更快。
 *
 * 伤害段 `crush`（主击）与 `shock`（压场溅射，仅 wide）走共享换算（原始类别 Special）；「按物理防御结算」写在
 * 两段 spec 的 `defenceStat: def`，预览与命中同算（本招只作用于自己）。
 */
namespace PokemonSkills {
    export const psystrikeId = "psystrike";
    export const psystrikeScene = "world_combat:move_psystrike";
    export const psystrikeHitText = "world_combat.move.psystrike.text.hit";
    export const psystrikeSunderText = "world_combat.move.psystrike.text.sunder";
    export const psystrikeMissText = "world_combat.move.psystrike.text.miss";

    actionParameters.define(psystrikeId, {
        /** 重压威力：86 + 特攻偏移[−18,52] + 等级(≥40)偏移[0,16]，压场 ×0.85 / 点压 ×1.12；夹 60..190。 */
        crush: formula(
            F.base(86)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-18, 52))
                .plus(F.level().minus(40).times(0.6).clamp(0, 16))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.12)))
                .clamp(60, 190).round(1),
            "重压威力", {
                base: 86, unit: "威力",
                description: "头顶重物砸下的基础威力；特攻越高念力越沉，等级让重物更实。对手按物理防御、相性与暴击在命中时另算。压场式主击更轻、点压式更重。"
            }),
        /** 冲击面威力：32 + 特攻偏移[−8,26]；夹 18..74。 */
        shock: formula(
            F.base(32)
                .plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-8, 26))
                .clamp(18, 74).round(1),
            "冲击面威力", {
                base: 32, unit: "威力",
                description: "压场式落地时冲击面对范围内其他非友方造成的部分伤害；随特攻增长。点压式不会用到它。"
            }),
        /** 射程：14 + 特攻偏移[−2,4] + 等级(≥40)偏移[0,3]；夹 10..22。 */
        reach: formula(
            F.base(14)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.level().minus(40).times(0.1).clamp(0, 3))
                .clamp(10, 22).round(1),
            "射程", {
                base: 14, unit: "格",
                description: "念力能在多远的目标头顶堆起重物；特攻与等级越高够得越远。它也是本招的实际射程。"
            }),
        /** 落高：4.5 + 碰撞箱高度偏移[−0.5,2.5]；夹 3.5..8.0。 */
        height: formula(
            F.base(4.5)
                .plus(F.body("height").minus(1.4).times(1.2).clamp(-0.5, 2.5))
                .clamp(3.5, 8.0).round(1),
            "落高", {
                unit: "格",
                description: "重物在目标头顶多高凝成；体型越大的个体堆得越高，落下的行程也更长。"
            }),
        /** 落速：1.1 + 特攻偏移[−0.2,0.5]；夹 0.7..1.9。 */
        descend: formula(
            F.base(1.1)
                .plus(F.stat("specialAttack").minus(60).times(0.006).clamp(-0.2, 0.5))
                .clamp(0.7, 1.9).round(2),
            "落速", {
                unit: "格/刻",
                description: "重物下落每刻的距离；特攻越高这一压落得越快越沉。"
            }),
        /** 判定半径：0.5 + 碰撞箱高度偏移[−0.1,0.5]；夹 0.35..1.1。 */
        mass: formula(
            F.base(0.5)
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.5))
                .clamp(0.35, 1.1).round(2),
            "判定半径", {
                unit: "格",
                description: "重物落下与命中时的横向判定半径；大个子的重物更宽。"
            }),
        /** 冲击面半径：2.6 + 特攻偏移[0,1.4] + 体型偏移[0,0.8]；夹 2.0..5.0。 */
        splash: formula(
            F.base(2.6)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 1.4))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(0, 0.8))
                .clamp(2.0, 5.0).round(2),
            "冲击面半径", {
                unit: "格",
                description: "压场式落地时冲击面波及的半径；特攻与体型越大铺得越开。点压式不铺面。"
            }),
        /** 碎裂数：18 + 特攻偏移[0,30] + 等级(≥40)偏移[0,12]；夹 18..60。 */
        cracks: formula(
            F.base(18)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(0, 30))
                .plus(F.level().minus(40).times(0.3).clamp(0, 12))
                .clamp(18, 60).round(0),
            "碎裂数", {
                unit: "块",
                description: "重物砸碎时飞散的碎块数量，随特攻与等级增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 特防下降级数：固定 1 级。 */
        sunderStages: formula(
            F.base(1),
            "特防下降级数", {
                unit: "级",
                description: "重压震裂目标精神防线，使其特防下降的能力等级。"
            }),
        /** 起手：16 − 速度偏移[−3,4]，压场 +3；夹 9..22。 */
        tempo: seconds(
            F.base(16)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-3, 4))
                .plus(F.when(F.pref("wide"), F.const(3), F.const(0)))
                .clamp(9, 22).round(0),
            "起手", "在目标头顶把念力堆成重物需要多久；速度越快堆得越快，压场式多堆一拍。"),
        /** 收招：11 − 速度偏移[−2,3]；夹 6..15。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.025).clamp(-2, 3)).clamp(6, 15).round(0),
            "收招", "重物落下后的收势；速度越快收得越利落。"),
        /** 冷却：42 − 速度偏移[−6,9]，压场 +8；夹 26..62。 */
        recharge: seconds(
            F.base(42)
                .minus(F.stat("speed").minus(55).times(0.06).clamp(-6, 9))
                .plus(F.when(F.pref("wide"), F.const(8), F.const(0)))
                .clamp(26, 62).round(0),
            "冷却", "再堆一块重物之间的等待；速度越快回得越快，压场式更久。")
    });

    defineDamage(psystrikeId, "crush", { defenceStat: "def" });
    defineDamage(psystrikeId, "shock", { defenceStat: "def" });

    stages(psystrikeId, [
        { level: 55, values: { crush: 122, reach: 17 } },
        { level: 70, values: { crush: 140, shock: 54 } }
    ]);

    describe(psystrikeId, [
        { key: "description.0", values: ["reach", "crush", "height"] },
        { key: "description.1", values: ["descend", "mass"] },
        { key: "description.2", values: ["sunderStages"] },
        { key: "description.3", values: ["shock", "splash"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crush", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crush", "tier.1.shock"] }
    ]);
}
