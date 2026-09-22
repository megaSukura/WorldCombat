/**
 * 日光束 / solarbeam —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Grass／特殊／威力 120／命中 100／PP 10／优先度 0／非接触／flags charge。
 * 第 1 回合收集日光，第 2 回合发射；强日光（sunnyday／desolateland）下当回合立即发射；雨／沙暴／冰雹／雪中威力减半。
 *
 * 翻译：把「收光→放光」翻成一束沿直线贯穿的光柱。提交前站在地上聚光（可被打断，打断不花 PP），
 *   `charge` 由世界日光与速度共同决定——站在强日光下直接跳过聚光，阴天与夜里要站着慢慢聚。
 *   命中走一条走廊（WorldGeometry.polygon，表现与判定同一组顶点），走廊内每个非友方依次挨一记 `ray`，
 *   最多贯穿 `pierce` 个；光柱犁过的草地会被晒焦（world.terrain 的 linger 租约），范围因此在世界里有痕迹。
 *
 * 数据分散（每个参数取不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   ray         光束威力：特攻定光的浓度、等级定收束程度；雨里 ×0.5（取自原生），散光形态 ×0.66。
 *   reach       光柱长度：特攻定能推多远，当前日光越强越远。
 *   width       光柱半宽：碰撞箱高度决定身板能拢住多宽的光；散光 ×1.6、聚焦 ×0.7。
 *   pierce      贯穿上限：特攻决定能穿几个，散光多穿。
 *   charge      聚光时间：速度决定收束快慢；强日光直接为 0。
 *   light       聚起的光点数：日光与特攻，驱动表现的密度。
 *   scorchTicks 晒焦留存：日光越强焦得越久，驱动世界留痕的时长。
 *   push        命中推离：特攻越高顶得越开。
 *
 * 配置 `broad`（散光）双向取舍：开启＝光束更宽（×1.6）、贯穿更多（+3），但单发威力 ×0.66、收招与冷却各 +2/+3 刻；
 * 关闭＝聚焦更窄（×0.7）、单发威力更高，适合点名单体重击。两向各有局面（扫排队 vs 破单体）。
 *
 * 伤害段 `ray`：光柱命中每个目标那一下，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("solarbeam", {
        /** 光束威力：120 + (特攻−60)×0.9（夹 −30..72）+ (等级−24)×0.5（夹 0..30）；散光 ×0.66；雨天 ×0.5；夹 64..236。 */
        ray: formula(
            F.base(120)
                .plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-30, 72))
                .plus(F.level().minus(24).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("broad", text("worldcombat.skill.solarbeam.preference.broad")), F.const(0.66), F.const(1)))
                .times(F.when(F.world("rain", text("worldcombat.skill.solarbeam.value.rain")).gte(0.35), F.const(0.5), F.const(1)))
                .clamp(64, 236).round(1),
            "光束威力", { base: 120,
                unit: "威力",
                description: "光柱命中每个目标的基础威力；特攻越高光越浓，散光会摊薄单发，阴雨天再折半。对手防御、相性与暴击在命中时另算。"
            }),
        /** 光柱长度：12 + (特攻−60)×0.04（夹 −1.5..4）+ 当前日光 × 2.5；夹 9..20 格。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 4))
                .plus(F.world("sunlight", text("worldcombat.skill.solarbeam.value.sunlight")).times(2.5))
                .clamp(9, 20).round(1),
            "光柱长度", {
                unit: "格",
                description: "光柱从施法者向前延伸到多远；特攻高、日光强时更远。它驱动本招的实际目标接受范围。"
            }),
        /** 光柱半宽：0.62 + (碰撞箱高度−1.4)×0.2；散光 ×1.6、聚焦 ×0.7；夹 0.3..1.4 格。 */
        width: formula(
            F.base(0.62).plus(F.body("height").minus(1.4).times(0.2))
                .times(F.when(F.pref("broad", text("worldcombat.skill.solarbeam.preference.broad")), F.const(1.6), F.const(0.7)))
                .clamp(0.3, 1.4).round(2),
            "光柱半宽", {
                unit: "格",
                description: "走廊的横向半宽，也就是玩家看到的那条光带有多宽；身板越高越宽，散光铺开、聚焦收窄。"
            }),
        /** 贯穿上限：2 + (特攻−60)/28；散光再 +3；夹 1..7 个。 */
        pierce: formula(
            F.base(2)
                .plus(F.stat("specialAttack").minus(60).div(28).clamp(-1, 3))
                .plus(F.when(F.pref("broad", text("worldcombat.skill.solarbeam.preference.broad")), F.const(3), F.const(0)))
                .clamp(1, 7).round(0),
            "贯穿上限", { base: 2,
                unit: "个",
                description: "一束最多贯穿几个活体；特攻越高越能穿透，散光形态更容易一次扫到成排的敌人。"
            }),
        /** 聚光时间：26 − (速度−50)×0.06（夹 0..14）刻；强日光直接为 0；夹 0..26 刻。 */
        charge: seconds(
            F.when(F.world("sunlight", text("worldcombat.skill.solarbeam.value.sunlight")).gte(0.85),
                F.const(0),
                F.base(26).minus(F.stat("speed").minus(50).times(0.06).clamp(0, 14)))
                .clamp(0, 26).round(0),
            "聚光时间", "站定把日光收进身体的时间；站在强日光下直接跳过这段当场发射，阴天与夜里要慢慢聚，速度快的收束更快。"),
        /** 光点数：10 + 日光×30 + (特攻−60)×0.15；夹 8..56 簇。 */
        light: formula(
            F.base(10)
                .plus(F.world("sunlight", text("worldcombat.skill.solarbeam.value.sunlight")).times(30))
                .plus(F.stat("specialAttack").minus(60).times(0.15).clamp(-4, 12))
                .clamp(8, 56).round(0),
            "聚光点数", {
                unit: "簇",
                description: "聚光与发射时迸出的光点数，也驱动画面密度；日光越强、特攻越高越密。"
            }),
        /** 晒焦留存：60 + 日光×40 刻；夹 40..120 刻。 */
        scorchTicks: seconds(
            F.base(60).plus(F.world("sunlight", text("worldcombat.skill.solarbeam.value.sunlight")).times(40)).clamp(40, 120).round(0),
            "晒焦留存", "光柱犁过的草地变成焦土的时长，时间一到原地形自己长回来；日光越强焦得越久。"),
        /** 命中推离：0.18 + (特攻−60)×0.003（夹 0..0.5）；夹 0.1..0.7 格。 */
        push: formula(
            F.base(0.18).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(0, 0.5)).clamp(0.1, 0.7).round(2),
            "命中推离", {
                unit: "格",
                description: "被光柱顶上时沿光束方向推开的距离；特攻越高顶得越开。"
            })
    });

    defineDamage("solarbeam", "ray", { defenceCoefficient: 0.0052, rationale: "收束的日光对特殊防御压制略强，让特攻差距在场上更明显。" }, {});

    stages("solarbeam", [
        { level: 30, values: { ray: 106 } },
        { level: 50, values: { ray: 126, pierce: 2 } },
        { level: 68, values: { cooldown: 38 } }
    ]);

    describe("solarbeam", [
        { key: "description.0", values: ["ray"] },
        { key: "description.1", values: ["reach", "width", "pierce"] },
        { key: "description.2", values: ["charge", "light"] },
        { key: "description.3", values: ["push", "scorchTicks"] },
        { key: "stance.broad", values: [], when: function (context) { return !!read(context.detail.values, ["broad"]); } },
        { key: "stance.focus", values: [], when: function (context) { return !read(context.detail.values, ["broad"]); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level"], when: function (context) { return context.pokemon.level() >= 30; } },
        { key: "growth.1", values: ["tier.1.level"], when: function (context) { return context.pokemon.level() >= 50; } },
        { key: "growth.2", values: ["tier.2.level", "tier.2.cooldown"], when: function (context) { return context.pokemon.level() >= 68; } }
    ]);
}
