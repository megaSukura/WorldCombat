/**
 * 十字毒刃 / crosspoison 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Poison／物理／威力 70／命中 100／PP 20／接触／slicing 标记／critRatio 2／
 *   10% 使目标中毒；34 位学习者。原生描述：「用毒刃劈开对手。有时会让对手陷入中毒状态，也容易击中要害。」
 *
 * 翻译：把「用毒刃劈开」落成**两片毒刃从左右同时合拢的一剪**——两刃在目标身上交叉剪出一个 X，同刻各检测：
 *   被两条刃共同覆盖的正中目标吃满一记 `slit`、并按更高的 `sealChance` 中毒；只被一条刃擦到的侧边目标吃
 *   `slit × share`、并按较低的 `poisonChance` 中毒；每个目标至多结算一次毒。墙分别截住两道刃：任一条刃
 *   撞上墙体就缩短到墙面，线条后面的目标划不到。它是本族唯一**同时合拢、凭交点决定毒深浅**的斩击。
 *
 * 与同族分开：十字劈是两道劈击从斜上方**先后**落下、第一劈为第二劈撞开架势；十字毒刃是两刃从左右**同时**合拢的
 *   一剪，靠两条刃是否共同覆盖来定伤与毒。十字剪是合拢扫过两片半扇面，毒刃只剪一个交叉点。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   slit         剪击威力：物攻定刃劲，速度定合拢的快；腐蚀式把每一剪摊薄。
 *   reach        出手距离：速度与身高决定两刃能探多远；也是本招射程基准。
 *   spread       剪线半宽：碰撞箱宽度决定两刃交叉点张多开。
 *   share        副目标折扣：等级决定只被一条刃擦到时留几分力。
 *   poisonChance 擦边毒率：特攻（毒液）与物攻（按进伤口）派生，只被一条刃擦到时用。
 *   sealChance   交点毒率：特攻与等级派生，比擦边高——两条刃共同覆盖时毒更深。
 *   venomTicks   中毒时长：特攻与等级派生。
 *   drops        毒滴数：物攻派生，表现按它发射。
 *   tempo/settle/recharge：速度与等级决定起手、收招与冷却。
 * 配置 corrode（腐蚀式）双向取舍：开启＝擦边毒率 ×1.2、交点毒率 ×1.3、中毒更久，但剪击 ×0.9——以毒取胜；
 * 关闭（快刃式）＝剪得更重更快，但毒更难按进伤口。
 *
 * 伤害段 slit：这一剪随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("crosspoison", {
        /** 剪击威力：基础 70，物攻每比 60 多 1 加 0.3（夹 -10..24），速度每比 60 快 1 加 0.14（夹 -5..14）；腐蚀 ×0.9；夹 48..126。 */
        slit: formula(
            F.base(70).plus(F.stat("attack").minus(60).times(0.3).clamp(-10, 24))
                .plus(F.stat("speed").minus(60).times(0.14).clamp(-5, 14))
                .times(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(0.9), F.const(1)))
                .clamp(48, 126).round(1),
            "剪击威力", {
                unit: "威力",
                description: "两刃合拢剪在正对目标身上的基础威力；物攻定刃劲、速度定合拢的快，腐蚀式把每一剪摊薄。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手距离：基础 2.5 格，速度每比 60 快 1 加 0.01（夹 -0.25..0.5），身高每比 1.4 高 1 加 0.15（夹 -0.1..0.4）；夹 2.1..3.6。 */
        reach: formula(
            F.base(2.5).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.25, 0.5))
                .plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.4))
                .clamp(2.1, 3.6).round(2),
            "出手距离", {
                unit: "格",
                description: "两刃能探到多远的对手；速度与身高决定伸展范围。它也是本招的实际射程。"
            }),
        /** 剪线半宽：基础 0.7 格，碰撞箱每比 0.9 宽 1 加 0.3（夹 -0.1..0.5）；夹 0.55..1.3。 */
        spread: formula(
            F.base(0.7).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.5)).clamp(0.55, 1.3).round(2),
            "剪线半宽", {
                unit: "格",
                description: "两刃之间那条窄线从目标向两侧张开多宽；身体越宽张得越开，越容易顺手划到旁边的人。"
            }),
        /** 副目标折扣：基础 0.5，等级每比 30 高 1 加 0.005（夹 0..0.3）；夹 0.42..0.8。 */
        share: formula(
            F.base(0.5).plus(F.level().minus(30).times(0.005).clamp(0, 0.3)).clamp(0.42, 0.8).round(2),
            "副目标折扣", {
                unit: "比例",
                description: "被两刃之间那条窄线顺带划到的其他人吃到的威力比例；等级越高刃势越足。"
            }),
        /** 初毒概率：基础 0.10，特攻每比 60 多 1 加 0.0016（夹 -0.04..0.2），物攻每比 60 多 1 加 0.0008（夹 -0.02..0.1）；腐蚀 ×1.2；夹 0.06..0.5。 */
        poisonChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0016).clamp(-0.04, 0.2))
                .plus(F.stat("attack").minus(60).times(0.0008).clamp(-0.02, 0.1))
                .times(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(1.2), F.const(1)))
                .clamp(0.06, 0.5),
            "擦边毒率", "只被其中一条刃擦到时把毒按进伤口的概率；特攻越高、按得越准，腐蚀式更高。"),
        /** 交点毒率：基础 0.22，特攻每比 60 多 1 加 0.002（夹 -0.06..0.24），等级每比 30 高 1 加 0.003（夹 0..0.15）；腐蚀 ×1.3；夹 0.1..0.7。 */
        sealChance: percent(
            F.base(0.22).plus(F.stat("specialAttack").minus(60).times(0.002).clamp(-0.06, 0.24))
                .plus(F.level().minus(30).times(0.003).clamp(0, 0.15))
                .times(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(1.3), F.const(1)))
                .clamp(0.1, 0.7),
            "交点毒率", "两条刃共同覆盖的正中目标真正中毒的概率；比只擦到一边更高，腐蚀式更高。"),
        /** 中毒时长：基础 280 刻，特攻每比 60 多 1 加 0.6（夹 -24..70），等级每比 30 高 1 加 2（夹 0..110）；腐蚀 ×1.15；夹 200..520。 */
        venomTicks: seconds(
            F.base(280).plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-24, 70))
                .plus(F.level().minus(30).times(2).clamp(0, 110))
                .times(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(1.15), F.const(1)))
                .clamp(200, 520).round(0),
            "中毒时长", "毒按进伤口后持续多久；特攻越高、等级越高挂得越久，腐蚀式更久。"),
        /** 毒滴数：基础 14，物攻每比 60 多 1 加 0.14（夹 -4..16）；夹 10..34。 */
        drops: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.14).clamp(-4, 16)).clamp(10, 34).round(0),
            "毒滴数", {
                unit: "滴",
                description: "两刃合拢时迸出的毒滴数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.03（夹 -1..2.5），腐蚀 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 2.5))
                .plus(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "两刃分开、在身前对齐准备合拢的时间；速度越快越短，腐蚀式多蓄一拍。"),
        /** 收招：基础 6 刻，速度每比 60 快 1 减 0.02（夹 -1..1.5）；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 1.5)).clamp(3, 9).round(0),
            "收招", "剪完把两刃收回架势的时间。"),
        /** 冷却：基础 20 刻，速度每比 60 快 1 减 0.05（夹 -2..4），腐蚀 +4；夹 12..30。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(60).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("corrode", text("worldcombat.skill.crosspoison.preference.corrode")), F.const(4), F.const(0)))
                .clamp(12, 30).round(0),
            "冷却", "再次合拢两刃之间的等待；速度越快回得越快，腐蚀式缓得更久。")
    });

    defineDamage("crosspoison", "slit", {}, { contact: true, slice: true });

    stages("crosspoison", [
        { level: 30, values: { slit: 78 } },
        { level: 48, values: { slit: 88, sealChance: 0.32 } }
    ]);

    describe("crosspoison", [
        { key: "description.0", values: ["slit", "reach"] },
        { key: "description.1", values: ["spread","share"] },
        { key: "description.2", values: ["poisonChance","sealChance","venomTicks"] },
        { key: "corrode.on", values: [], when: function (context) { return read(context.detail.values, ["corrode"]) === true; } },
        { key: "corrode.off", values: [], when: function (context) { return read(context.detail.values, ["corrode"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slit"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slit", "tier.1.sealChance"] }
    ]);
}
