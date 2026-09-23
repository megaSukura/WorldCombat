/**
 * 挡路 / block — 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中必中／PP 5／单体；命中即让目标 trapped（无法逃走、无法换人）。
 * 原生介绍「张开双手进行阻挡，封住对手的退路，使其不能逃走。」学习者 121，是「不让走」家族里最普通的一招。
 *
 * 世界化：把「张开双手封住退路」落成**在目标背影一侧真的立起一道拦网**——术者在目标背后一臂远的地方，
 *   把铁栅栏租借成一圈朝术者张开的弧形围墙（`world.terrain`，`linger` 活过招式，到期原方块回来）。
 *   目标被夹在术者与拦网之间：落栅的一刻被向术者方向推半步并短暂钉住，整段时间里被压得走不快，
 *   绕过弧墙要绕远路。它是本族唯一**把退路变成世界里的实物**的一招：不靠状态锁，靠一堵墙。
 *
 * 与同族分开：黑色目光靠术者站在原地一直凝视（术者一被打断就断）；蛛网把目标自己缠成茧（怕火）；
 *   挡路把墙立在**对手背后**，墙在，退路就不在；墙短、可翻越、可挖开、时长一到就消失。
 *
 * 数据分散（每项读不同精灵数据，落到不同参数）：
 *   span     拦网弧长：碰撞箱越宽弧越长；撑臂更窄更高。
 *   height   拦网高度：身体越高越高；撑臂再加一格。
 *   gap      离背影距离：碰撞箱越宽立得越远，免得压到自己和目标。
 *   arc      弧的圆心角：物攻越高张得越开，围得住更宽的路口。
 *   columns  栅栏根数：物攻与等级换算，也决定画面里的立柱数量。
 *   hold     拦网与压制时长：防御与等级决定墙立多久。
 *   pin      落栅一瞬间的钉住：速度决定那一下有多突然。
 *   shove    落栅推挤：物攻决定把目标往术者方向推多远。
 *   reach    施放距离：速度决定能在多远的人背后立墙。
 *   tempo／aftercast／recharge：速度与身形定节奏。
 *
 * 配置 `brace`（撑臂）双向取舍（默认关）：
 *   开（撑臂）：高度 +1、压制时长 ×1.35、绷得更久；代价是弧更窄（×0.75）、起手 +3 刻、冷却 +12 刻。
 *     用来把单个逃跑的厚目标锁死在一段窄巷里。
 *   关（平地张臂）：弧更宽（×1.15）、出手更快、冷却更短；代价是墙矮一格、压制更短。
 *     用来在开阔地横拦一条退路，或把挤在一起的目标一并挡回去。
 */
namespace PokemonSkills {
    actionParameters.define("block", {
        /** 拦网弧长：3.2 + 碰撞箱宽度 ×1.8；撑臂 ×0.75／平地 ×1.15；夹 2.4..7。 */
        span: formula(
            F.base(3.2).plus(F.body("width").times(1.8))
                .times(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(0.75), F.const(1.15)))
                .clamp(2.4, 7.0).round(2),
            "拦网弧长", {
                unit: "格",
                description: "弧形拦网有多宽；碰撞箱越宽张得越开，撑臂形态更窄。弧长就是它封住的退路宽度。"
            }),
        /** 拦网高度：2 + (身高 −1.4) ×0.5 + 撑臂 1；夹 1..3。 */
        height: formula(
            F.base(2).plus(F.body("height").minus(1.4).times(0.5))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(1), F.const(0)))
                .clamp(1, 3).round(0),
            "拦网高度", {
                unit: "格",
                description: "栅栏立起几格高；身体越高越高，撑臂再高一格。够高才挡得住跳跃与飞越。"
            }),
        /** 离背影距离：1.0 + 碰撞箱宽度 ×0.5 + 撑臂 0.3；夹 0.8..2.2。 */
        gap: formula(
            F.base(1.0).plus(F.body("width").times(0.5))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(0.3), F.const(0)))
                .clamp(0.8, 2.2).round(2),
            "离背影距离", {
                unit: "格",
                description: "墙立在目标背后多远；身板越宽立得越远，免得把自己或目标卡进墙里。"
            }),
        /** 弧的圆心角：150 + (物攻 −60) ×0.3；夹 100..220。 */
        arc: formula(
            F.base(150).plus(F.stat("attack").minus(60).times(0.3)).clamp(100, 220).round(0),
            "张开角度", {
                unit: "度",
                description: "弧形拦网张开多大；物攻越高张得越开，能围住更宽的路口或退路。"
            }),
        /** 栅栏根数：5 + 物攻 ÷25 + 等级 ×0.15；夹 4..12。 */
        columns: formula(
            F.base(5).plus(F.stat("attack").div(25)).plus(F.level().times(0.15)).clamp(4, 12).round(0),
            "栅栏根数", {
                unit: "根",
                description: "拼成这道弧墙的立柱数量；物攻与等级越高越密，画面里的立柱也随之增减。"
            }),
        /** 压制时长：120 + 防御 ×0.8 + 等级 ×1.2；撑臂 ×1.35；夹 90..320。 */
        hold: seconds(
            F.base(120).plus(F.stat("defence").times(0.8)).plus(F.level().times(1.2))
                .times(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(1.35), F.const(1)))
                .clamp(90, 320).round(0),
            "封锁时长", "拦网立着、目标被压在里面的时长；防御与等级越高压得越久，撑臂再拉长。到期栅栏自己收回。"),
        /** 落栅钉住：10 + 速度 ×0.1；夹 8..24。 */
        pin: seconds(
            F.base(10).plus(F.stat("speed").times(0.1)).clamp(8, 24).round(0),
            "落栅钉住", "墙落下的那一下把目标短暂钉在原地多久；速度越快越突然。"),
        /** 落栅推挤：0.4 + 物攻 ×0.01；夹 0.2..1.0。 */
        shove: formula(
            F.base(0.4).plus(F.stat("attack").times(0.01)).clamp(0.2, 1.0).round(2),
            "落栅推挤", {
                unit: "格",
                description: "墙落下时把目标往术者方向推多远；物攻越高推得越实，把目标按进包围里。"
            }),
        /** 施放距离：4 + (速度 −60) ×0.015；夹 4..6。 */
        reach: formula(
            F.base(4).plus(F.stat("speed").minus(60).times(0.015)).clamp(4, 6).round(1),
            "施放距离", {
                unit: "格",
                description: "能在多远的目标背后立墙；速度越快够得越远。它也是本招的实际射程。"
            }),
        /** 起手：9 − (速度 −60) ×0.03 + 撑臂 3；夹 6..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "张开双手、把拦网拉起来需要多久；速度越快越短，撑臂要多撑几刻。"),
        /** 收招：7 + (身高 −1.4) ×0.8；夹 5..12。 */
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8)).clamp(5, 12).round(0),
            "收招", "立完墙的收势；身量越大收得越慢。"),
        /** 冷却：100 − (等级 −30) ×0.4 + 撑臂 12；夹 70..130。 */
        recharge: seconds(
            F.base(100).minus(F.level().minus(30).max(0).times(0.4))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.block.preference.brace")), F.const(12), F.const(0)))
                .clamp(70, 130).round(0),
            "冷却", "两次封路之间的等待；等级越高越熟练，撑臂更费。PP 5 的代价。")
    });

    stages("block", [
        { level: 40, values: { hold: 180, recharge: 88 } }
    ]);

    describe("block", [
        { key: "description.0", values: ["span", "height", "gap"] },
        { key: "description.1", values: ["hold","pin","shove"] },
        { key: "description.press", values: [] },
        { key: "description.2", values: ["columns", "arc"] },
        { key: "description.3", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hold", "tier.0.recharge"] }
    ]);
}
