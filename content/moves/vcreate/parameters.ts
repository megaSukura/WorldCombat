/**
 * Ｖ热焰 / vcreate 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fire／物理／威力 180／命中 95／PP 5／优先度 0／接触／单体；
 *   `self.boosts` = 防御 −1、特防 −1、速度 −1；`isNonstandard: "Unobtainable"`（比克提尼专属）。
 *   原生描述「从前额产生灼热的火焰，舍身撞击对手。防御、特防和速度会降低」。
 *
 * 翻译：把「前额生出灼热火焰、舍身撞击」落成一记**把自身当弹丸的舍身冲撞**——前额先炸开一团炽白的火、
 *   火舌向两侧张成一个 V，随后整个人拖着这道 V 撞进目标怀里；撞完身上的火焰萎落下来，V 收成两条残焰。
 *   它是全项目威力最高的一档冲撞，代价写在明面上：**提交那一刻**就付出防御、特防、速度各一段（走公共能力阶梯），
 *   无论中与不中都照付——这是「舍身」的含义，不是命中后才结算的效果。
 *
 * 与同族分开：蛮力（superpower）降攻防、地面留坑；近身战（closecombat）是一串快拳、降防特防；十万马力用体重
 *   平地冲撞、什么都不留下。Ｖ热焰是唯一同时压上**防御、特防、速度**三段的近身冲撞，也是威力最高的一记；
 *   玩家凭「前额那道 V 形火 + 撞完自己又慢又脆」认出它。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   flare     热焰威力：物攻给冲劲、速度给把自身当弹丸的初速、等级拾级抬升；尽燃式再重一档。
 *   charge    冲程：速度决定扑出去多远、身高决定步幅；同时是本招实际射程。
 *   rush      冲速：速度决定每刻推进的距离；尽燃式更沉、收焰式更轻快。
 *   radius    前额火焰判定：身高与宽度决定撞面大小。
 *   push      撞飞距离：物攻给冲量，**目标体重**把撞飞距离压下来；收焰式更轻快、把人送得更远。
 *   flames    V 焰量：物攻换算出的火舌量，驱动表现。
 *   guardLoss 自身防御下降级：原生固定 1 级。
 *   poiseLoss 自身特防下降级：原生固定 1 级。
 *   speedLoss 自身速度下降级：原生 1 级；尽燃式额外再压一段（1→2）。
 *   tempo／aftercast／recharge：速度定节奏；尽燃式更慢更贵。
 *
 * 配置 `nova`（尽燃式，默认关）双向取舍：
 *   开（尽燃式）：热焰威力 ×1.15、V 焰更盛，代价是**自身速度额外再降一段**（降级更狠）、收招 +2 刻、冷却 +8 刻、
 *     冲程 ×0.95、冲速 ×0.94——一次赌上机动性的爆发。
 *   关（收焰式）：冲速 ×1.1、冲程 ×1.1、推进更利落、冷却 −8 刻，代价是热焰威力 ×0.95。
 *
 * 伤害段 `flare` 与参数同名，`contact: true`，原始类别 Physical（Fire）；对手物防、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    export const vcreateId = "vcreate";
    export const vcreateScene = "world_combat:move_vcreate";
    export const vcreateSlumpText = "world_combat.move.vcreate.text.slump";
    export const vcreateMissText = "world_combat.move.vcreate.text.miss";

    actionParameters.define(vcreateId, {
        /** 热焰威力：基础 180；物攻每比 55 多 1 加 0.55（夹 −22..66）；速度每比 55 快 1 加 0.18（夹 −7..27）；
         *  等级每比 30 高 1 加 0.4（夹 0..24）；尽燃 ×1.15 / 收焰 ×0.95；夹 140..320。 */
        flare: formula(
            F.base(180).plus(F.stat("attack").minus(55).times(0.55).clamp(-22, 66))
                .plus(F.stat("speed").minus(55).times(0.18).clamp(-7, 27))
                .plus(F.level().minus(30).times(0.4).clamp(0, 24))
                .times(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(1.15), F.const(0.95)))
                .clamp(140, 320).round(1),
            "热焰威力", {
                unit: "威力",
                description: "前额炽焰裹着全身撞实这一下的基础威力；物攻给冲劲、速度给把自身当弹丸的初速、等级越高越沉。尽燃式再重一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 3.8 格；速度每比 55 快 1 加 0.022（夹 −0.7..1.5）；身高每比 1.4 高 1 格加 0.5（夹 −0.2..0.8）；
         *  尽燃 ×0.95 / 收焰 ×1.1；夹 2.8..6.5。 */
        charge: formula(
            F.base(3.8).plus(F.stat("speed").minus(55).times(0.022).clamp(-0.7, 1.5))
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .times(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(0.95), F.const(1.1)))
                .clamp(2.8, 6.5).round(2),
            "冲程", {
                unit: "格",
                description: "把自己整个扑出去多远，也是本招的实际射程；速度快的个体扑得更远，尽燃式沉一点、收焰式轻快。"
            }),
        /** 冲速：基础 0.62 格/刻；速度每比 55 快 1 加 0.007（夹 −0.18..0.4）；尽燃 ×0.94 / 收焰 ×1.1；夹 0.4..1.2。 */
        rush: formula(
            F.base(0.62).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.18, 0.4))
                .times(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(0.94), F.const(1.1)))
                .clamp(0.4, 1.2).round(2),
            "冲速", {
                unit: "格/刻",
                description: "冲刺时每刻前进的距离；速度快的个体更猛，尽燃式更沉、收焰式更轻快。"
            }),
        /** 前额火焰判定：基础 0.5 格；身高每比 1.4 高 1 加 0.3（夹 −0.06..0.4）；宽度每比 0.9 宽 1 加 0.2（夹 −0.05..0.3）；
         *  夹 0.4..1.1。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.06, 0.4))
                .plus(F.body("width").minus(0.9).times(0.2).clamp(-0.05, 0.3)).clamp(0.4, 1.1).round(2),
            "前额火焰判定", {
                unit: "格",
                description: "前额那团火扫过的横向判定半径；身板越大撞面越宽。"
            }),
        /** 撞飞距离：基础 0.8 格；物攻每比 55 多 1 加 0.011（夹 −0.25..0.9）；
         *  减去目标体重超出 300 的部分每 1 单位 0.0004（最多减 0.6）；尽燃 ×0.9 / 收焰 ×1.15；夹 0.3..2.2。 */
        push: formula(
            F.base(0.8).plus(F.stat("attack").minus(55).times(0.011).clamp(-0.25, 0.9))
                .minus(F.target("body.weight").minus(300).times(0.0004).clamp(0, 0.6))
                .times(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(0.9), F.const(1.15)))
                .clamp(0.3, 2.2).round(2),
            "撞飞距离", {
                unit: "格",
                description: "撞中后把目标沿冲撞方向撞开多远；物攻越强推得越远，目标越重越推不动，收焰式轻快地把人送得更远。"
            }),
        /** V 焰量：基础 24；物攻每比 55 多 1 加 0.45（夹 −8..44）；尽燃 ×1.15；夹 18..72。 */
        flames: formula(
            F.base(24).plus(F.stat("attack").minus(55).times(0.45).clamp(-8, 44))
                .times(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(1.15), F.const(1)))
                .clamp(18, 72).round(0),
            "V 焰量", {
                unit: "个",
                description: "前额张成 V 形的火舌数量，驱动表现里的火焰密度；物攻越高烧得越旺，尽燃式更盛。"
            }),
        /** 自身防御下降级：原生固定 1 级；夹 1..3。 */
        guardLoss: formula(F.const(1).clamp(1, 3).round(0), "自身防御下降", {
            unit: "级",
            description: "舍身撞完之后自身防御下降的能力等级；原生固定 1 级，是无法回避的代价。"
        }),
        /** 自身特防下降级：原生固定 1 级；夹 1..3。 */
        poiseLoss: formula(F.const(1).clamp(1, 3).round(0), "自身特防下降", {
            unit: "级",
            description: "舍身撞完之后自身特防下降的能力等级；原生固定 1 级。"
        }),
        /** 自身速度下降级：基础 1 级；尽燃 +1；夹 1..3。 */
        speedLoss: formula(
            F.const(1).plus(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(1), F.const(0))).clamp(1, 3).round(0),
            "自身速度下降", {
                unit: "级",
                description: "舍身撞完之后自身速度下降的能力等级；原生 1 级，尽燃式赌上机动性、额外再压一段。"
            }),
        /** 起手：基础 10 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2.5）；尽燃 +1；夹 5..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(1), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "前额起火、身体压低准备扑出的时间；速度越快越短，尽燃式要多蓄一点。"),
        /** 收招：基础 12 刻；速度每比 55 快 1 减 0.02（夹 −1..2）；尽燃 +2；夹 6..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "撞完把散掉的架子收回来、火焰萎落的时间；尽燃式收得更久。"),
        /** 冷却：基础 50 刻；速度每比 55 快 1 减 0.06（夹 −5..9）；尽燃 +8 / 收焰 −8；夹 30..70。 */
        recharge: seconds(
            F.base(50).minus(F.stat("speed").minus(55).times(0.06).clamp(-5, 9))
                .plus(F.when(F.pref("nova", text("worldcombat.skill.vcreate.preference.nova")), F.const(8), F.const(-8)))
                .clamp(30, 70).round(0),
            "冷却", "两次舍身撞击之间等待多久；速度快的个体回气更快，尽燃式蓄得更久。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.04)
    });

    stages(vcreateId, [
        { level: 40, values: { flare: 208 } },
        { level: 60, values: { flare: 238, charge: 4.4 } }
    ]);

    defineDamage(vcreateId, "flare", {}, { contact: true });

    describe(vcreateId, [
        { key: "description.0", values: ["flare","push"] },
        { key: "description.1", values: ["charge","rush","radius"] },
        { key: "description.2", values: ["guardLoss","poiseLoss","speedLoss"] },
        { key: "nova.on", values: [], when: function (context) { return read(context.detail.values, ["nova"]) === true; } },
        { key: "nova.off", values: [], when: function (context) { return read(context.detail.values, ["nova"]) !== true; } },
        { key: "description.aim", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flare"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.flare", "tier.1.charge"] }
    ]);
}
