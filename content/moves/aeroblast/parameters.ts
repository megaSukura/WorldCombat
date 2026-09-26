/**
 * 气旋攻击 / aeroblast —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 100／命中 95／PP 5／目标单体（any）／critRatio 2（高暴击）／
 *   非接触、可打远（distance）、风（wind）（Cobblemon 1.8，洛奇亚专属，1 位学习者）。
 *   原生描述：「发射空气旋涡进行攻击。容易击中要害。」
 *
 * 翻译：把「发射空气旋涡」落成**一条拧紧的短促细束**——空气被拧成一束涡流，蓄足后朝锁定方向连续压出三拍；
 *   每一拍沿这条射线只咬住第一个可见敌人，把它沿弹道推开一点点，撞墙即截束。它不是炸开一圈的炮弹，
 *   而是四记里射程最远、单发最重的一记近专招；高暴击沿用原生 critRatio 2 的共享结算。
 *
 * 与同族分开：空气利刃是瞬发宽扇面（范围、轻）；飞叶快刀是窄带连发（连续、多波）；叶刃是贴身重斩（接触、单体）。
 *   气旋攻击是唯一**远距钉住一条射线、连续三拍只打首敌**的一记细束——玩家从「束不长眼、挡墙即断」把它认出来。
 * 与其他风招分开（airslash／hurricane／gust）：空气斩是一道月牙直线贯穿；暴风是宽域风场；
 *   气旋攻击是一条短促的三拍涡流细束，不产生圆形溅射。
 *
 * 数值分散（每个参数读不同的精灵数据）：
 *   blast   涡流总威力：特攻定空气拧得多紧，速度与等级定冲势；命中时按拍数拆成三份结算。
 *   reach   射程：等级与特攻决定细束能钉多远不散（它也是本招实际射程）。
 *   pulse   脉冲间隔：速度决定三拍之间多急。
 *   radius  涡流判定：碰撞箱高度决定细束有多粗。
 *   push    合计推距：特攻决定整束把首个目标推多远；按拍数拆开，合计不因三拍而增加。
 *   spiral  螺旋量：特攻换算，驱动表现密度。
 *   beats   拍数：固定 3（协议常量），总威力与总推距按它拆开。
 *   tempo／aftercast／recharge：速度定节奏；蓄力式更慢更重、冷却更长。
 *
 * 配置 `charge`（蓄力式）双向取舍：开＝威力 ×1.18、射程 +2.5、涡流判定 ×1.15，
 *   但起手 +6、收招 +2、冷却 +14、脉冲间隔 ×1.15；关（速射式，默认）＝拍得更急（间隔 ×0.85）、冷却 −8、射程 −0.5，但威力 ×0.94。
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
            "涡流总威力", {
                unit: "威力",
                description: "整束三拍合计的基础威力，命中时按拍数拆成三份分别结算；特攻决定空气拧得多紧，速度与等级给出冲势。对手特防、相性与暴击在命中时另算。"
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
        /** 脉冲间隔：基础 4 刻，速度每比 55 快 1 减 0.02（夹 −1..2）；蓄力 ×1.15 / 速射 ×0.85；夹在 2..7。 */
        pulse: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(1.15), F.const(0.85)))
                .clamp(2, 7).round(0),
            "脉冲间隔", "三拍细束之间隔多久；速度越快拍得越急，蓄力式稍慢、速射式更紧凑。"),
        /** 涡流判定：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.18（夹 −0.08..0.5）；蓄力 ×1.15；夹在 0.34..1.2。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.18).clamp(-0.08, 0.5))
                .times(F.when(F.pref("charge", text("worldcombat.skill.aeroblast.preference.charge")), F.const(1.15), F.const(1)))
                .clamp(0.34, 1.2).round(2),
            "涡流判定", {
                unit: "格",
                description: "涡流锥扫过的横向判定半径；个头越高的个体拧出的锥越粗，越不容易从旁边让开。"
            }),
        /** 合计推距：基础 0.5 格，特攻每比 60 多 1 加 0.004（夹 −0.1..0.5）；夹在 0.3..1.4；命中时按拍数拆开。 */
        push: formula(
            F.base(0.5).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.1, 0.5)).clamp(0.3, 1.4).round(2),
            "合计推距", {
                unit: "格",
                description: "整束三拍合计把首个目标沿弹道推开多远；特攻越高推得越远，按拍数拆开、合计不因三拍而增加。"
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
        /** 细束拍数：固定 3（几何与协议常量）；总威力与总推距按它拆开。 */
        beats: hidden(3)
    });

    defineDamage(aeroblastId, "blast", { rationale: "涡流的冲击；与原生一致走特殊类别，不改变减伤规则。" }, {});

    stages(aeroblastId, [
        { level: 50, values: { blast: 140, reach: 18 } }
    ]);

    describe(aeroblastId, [
        { key: "description.0", values: ["blast","beats","radius"] },
        { key: "description.1", values: ["reach","pulse","push"] },
        { key: "charge.on", values: [], when: function (context) { return read(context.detail.values, ["charge"]) === true; } },
        { key: "charge.off", values: [], when: function (context) { return read(context.detail.values, ["charge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.reach"] }
    ]);
}
