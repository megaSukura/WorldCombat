/**
 * 气旋攻击 / aeroblast —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 100／命中 95／PP 5／目标单体（any）／critRatio 2（高暴击）／
 *   非接触、可打远（distance）、风（wind）（Cobblemon 1.8，洛奇亚专属，1 位学习者）。
 *   原生描述：「发射空气旋涡进行攻击。容易击中要害。」
 *
 * 翻译：把「发射空气旋涡」落成**一支拧紧的高速涡流弹**——空气被拧成一支旋转的锥，笔直射出去，
 *   命中时在目标处炸开成向外的气环；主目标吃满 `blast`，气环里的旁人各吃一份波及。它是四记里射程最远、
 *   单发最重的一击，也是唯一的专属招；高暴击沿用原生 critRatio 2 的共享结算。
 *
 * 与同族分开：空气利刃是瞬发宽扇面（范围、轻）；飞叶快刀是窄带连发（连续、多波）；叶刃是贴身重斩（接触、单体）。
 *   气旋攻击是唯一**远程单体、命中炸环**的一记涡流弹——玩家从「飞得远、命中处炸成气环」把它认出来。
 * 与其他风招分开（airslash／hurricane／gust）：空气斩是一道月牙直线贯穿；暴风是宽域风场；
 *   气旋攻击是一支点状涡流弹，命中处收成向外的环。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   blast   涡流威力：特攻定空气拧得多紧，速度与等级定冲势。
 *   reach   射程：等级与特攻决定涡流能撑多远不散（它也是本招实际射程）。
 *   flight  飞行速度：速度决定涡流飞多快。
 *   radius  涡流判定：碰撞箱高度决定锥有多粗。
 *   ring    气环半径：特攻决定命中处炸开多大一圈。
 *   echo    波及比例：气环里的旁人吃几成。
 *   push    推距：特攻决定命中把目标推多远。
 *   spiral  螺旋量：特攻换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；蓄力式更慢更重、冷却更长。
 *
 * 配置 `charge`（蓄力式）双向取舍：开＝威力 ×1.18、射程 +2.5、涡流判定 ×1.15、气环 ×1.1，
 *   但起手 +6、收招 +2、冷却 +14、飞行 ×0.9；关（速射式，默认）＝飞得更快、冷却 −8、射程 −0.5，但威力 ×0.94。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原生类别 Special，Flying 属性，非接触）。
 */
namespace PokemonSkills {
    export const aeroblastId = "aeroblast";
    export const aeroblastScene = "world_combat:move_aeroblast";
    export const aeroblastBurstText = "world_combat.move.aeroblast.text.burst";
    export const aeroblastMissText = "world_combat.move.aeroblast.text.miss";
    export const aeroblastCritText = "world_combat.move.aeroblast.text.crit";
    /** 表现里射程的参考值（格）；服务端传 scale = 实际射程 / 这个值。 */
    export const aeroblastReference = 16;

    actionParameters.define(aeroblastId, {
        /** 涡流威力：基础 100，特攻每比 60 多 1 加 0.6（夹 −20..60），速度每比 55 快 1 加 0.2（夹 −6..20），
         *  等级 40 起每级 +0.4（夹 −8..20）；蓄力 ×1.18 / 速射 ×0.94；夹在 82..210。 */
        blast: formula(
            F.base(100).plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 60))
                .plus(F.stat("speed").minus(55).times(0.2).clamp(-6, 20))
                .plus(F.level().minus(40).times(0.4).clamp(-8, 20))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(1.18), F.const(0.94)))
                .clamp(82, 210).round(1),
            "涡流威力", {
                unit: "威力",
                description: "涡流弹命中那一下的基础威力；特攻决定空气拧得多紧，速度与等级给出冲势。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：基础 16 格，等级 30 起每级 +0.08（夹 −1..3），特攻每比 60 多 1 加 0.05（夹 −2..3）；
         *  蓄力 +2.5 / 速射 −0.5；夹在 12..22。它也是本招实际射程。 */
        reach: formula(
            F.base(16).plus(F.level().minus(30).times(0.08).clamp(-1, 3))
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 3))
                .plus(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(2.5), F.const(-0.5)))
                .clamp(12, 22).round(2),
            "射程", {
                unit: "格",
                description: "涡流弹能飞多远不散；等级与特攻决定它撑到哪。它也是本招的实际射程，四记里最远。"
            }),
        /** 飞行速度：基础 1.05 格/刻，速度每比 55 快 1 加 0.007（夹 −0.2..0.35）；蓄力 ×0.9 / 速射 ×1.12；夹 0.7..1.7。 */
        flight: formula(
            F.base(1.05).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.2, 0.35))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(0.9), F.const(1.12)))
                .clamp(0.7, 1.7).round(2),
            "飞行速度", {
                unit: "格/刻",
                description: "涡流弹每刻飞多远；速度越快，对手能走位让开的窗口越短。蓄力式沉一点、速射式更急。"
            }),
        /** 涡流判定：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.18（夹 −0.08..0.5）；蓄力 ×1.15；夹在 0.34..1.2。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.08, 0.5))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(1.15), F.const(1)))
                .clamp(0.34, 1.2).round(2),
            "涡流判定", {
                unit: "格",
                description: "涡流锥扫过的横向判定半径；个头越高的个体拧出的锥越粗，越不容易从旁边让开。"
            }),
        /** 气环半径：基础 2.4 格，特攻每比 60 多 1 加 0.012（夹 −0.5..1.5）；蓄力 ×1.1；夹在 1.6..4.5。 */
        ring: formula(
            F.base(2.4).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.5, 1.5))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(1.1), F.const(1)))
                .clamp(1.6, 4.5).round(2),
            "气环半径", {
                unit: "格",
                description: "涡流命中时炸开的那圈气环半径；特攻越高炸得越开，气环里的旁人被波及。"
            }),
        /** 波及比例：固定 0.4，夹在 0.2..0.6。 */
        echo: formula(F.base(0.4).clamp(0.2, 0.6).round(2), "波及比例", {
            unit: "倍",
            description: "气环里的其他敌人各吃主伤几成的威力。"
        }),
        /** 推距：基础 0.5 格，特攻每比 60 多 1 加 0.004（夹 −0.1..0.5）；夹在 0.3..1.4。 */
        push: formula(
            F.base(0.5).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.1, 0.5)).clamp(0.3, 1.4).round(2),
            "推距", {
                unit: "格",
                description: "涡流命中时把主目标沿弹道方向推开多远；特攻越高推得越远。"
            }),
        /** 螺旋量：基础 30，特攻每比 60 多 1 加 0.3（夹 −8..24）；夹在 18..70。 */
        spiral: formula(
            F.base(30).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-8, 24)).clamp(18, 70).round(0),
            "螺旋量", {
                unit: "圈",
                description: "涡流锥拧出的螺旋密度，由特攻换算；它驱动飞行与爆发的画面密度。"
            }),
        /** 起手：基础 12 刻，速度每比 55 快 1 减 0.05（夹 −2..4）；蓄力 +6；夹在 8..22。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(6), F.const(0))).clamp(8, 22).round(0),
            "起手", "把空气拧成涡流、甩出去前的时间；速度越快越短，蓄力式多蓄一拍（95% 命中的对位）。"),
        /** 收招：基础 10 刻，速度每比 55 快 1 减 0.03（夹 −2..4）；蓄力 +2；夹在 7..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(2), F.const(0))).clamp(7, 16).round(0),
            "收招", "甩出后收势的时间；速度越快越利落。"),
        /** 冷却：基础 60 刻，速度每比 55 快 1 减 0.06（夹 −6..10）；蓄力 +14 / 速射 −8；夹在 40..90。 */
        recharge: seconds(
            F.base(60).minus(F.stat("speed").minus(55).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(14), F.const(-8))).clamp(40, 90).round(0),
            "冷却", "两次涡流之间的等待；PP 5 的专属招，冷却最长，蓄力式缓得更久、速射式回得更快。"),
        /** 气环最多波及几个旁人：固定 3（几何与协议常量）。 */
        ringCap: hidden(3)
    });

    defineDamage(aeroblastId, "blast", { rationale: "涡流的冲击；与原生一致走特殊类别，不改变减伤规则。" }, {});

    stages(aeroblastId, [
        { level: 50, values: { blast: 140, reach: 18, ring: 3 } }
    ]);

    describe(aeroblastId, [
        { key: "description.0", values: ["blast","radius"] },
        { key: "description.1", values: ["reach","flight","push"] },
        { key: "description.2", values: ["ring","echo","ringCap"] },
        { key: "charge.on", values: [], when: function (context) { return read(context.detail.values, ["charge"]) === true; } },
        { key: "charge.off", values: [], when: function (context) { return read(context.detail.values, ["charge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.reach", "tier.0.ring"] }
    ]);
}
