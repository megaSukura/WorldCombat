/**
 * 蛸固 / octolock —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：格斗、变化、威力 0、命中 100、PP 15、优先度 0、目标 单体；
 *   `volatileStatus: "octolock"`：`onResidual` 每回合对目标降防御与特防各 1 级，`onTrapPokemon` 让目标无法逃走；
 *   术者离场或濒死时锁自动解除。原生介绍「让对手无法逃走。对手被固定后，每回合都会降低防御和特防。」
 *
 * 世界化：把「缠住不放、每回合勒紧一点」落成**一条从术者伸出去的触手**——命中即把目标缠住钉在原地，
 *   此后每过一拍（原生的一回合）都勒紧一次，防御与特防各降一级。缠是**术者维持**的：术者离得太远或倒下，
 *   触手就松开，目标脱困。所以它的用法是「贴上去缠死一个必须解决的目标」，代价是术者也被拴在这片地方。
 *
 * 与同族分开：紧咬不放是双方互锁、只咬一次；捕兽夹丢在地上施法者走开；蛸固只锁目标、施法者仍能打，
 *   但每拍把目标削得更软，且必须留在维持距离之内。
 *
 * 数值来源（每项读不同的个体数据，落到不同参数）：
 *   reach       伸出的距离：特攻决定够得多远；缠紧式收近 1 格。
 *   grip        维持距离：体型（宽＋高）决定缠能放多长；超过它就松开，缠紧式更牢。
 *   bindTicks   缠绕时长：等级与防御决定缠多久。
 *   interval    每拍间隔（原生的「一回合」）：速度决定勒得多快；缠紧式更密。
 *   tentacles   触手数量：特攻换算，驱动画面里触手的密度。
 *   tempo／aftercast／recharge：速度、身形与等级定节奏。
 *   每拍降低的防御／特防固定为各 1 级（与原生一致），上限由共享 −6..+6 阶梯限制。
 *
 * 配置 `coil`（缠紧）双向取舍（默认关）：
 *   开（缠紧）：勒得密（间隔 ×0.75）、维持距离 +1 格；代价是伸出距离 −1 格、冷却 ×1.2——缠得更牢更狠，但更近更费。
 *   关（松缠）：够得更远、出手更快、冷却更短；代价是勒得更慢、更容易被挣脱。
 */
namespace PokemonSkills {
    export const octoId = "octolock";
    export const octoScene = "world_combat:move_octolock";
    export const octoBound = "world_combat:octolock_bound";
    export const octoBind = "world_combat:octolock_bind";
    export const octoLashText = "world_combat.move.octolock.text.lash";
    export const octoSqueezeText = "world_combat.move.octolock.text.squeeze";
    export const octoReleaseText = "world_combat.move.octolock.text.release";
    export const octoSlipText = "world_combat.move.octolock.text.slip";

    actionParameters.define(octoId, {
        reach: formula(
            F.base(5).plus(F.stat("specialAttack").minus(60).times(0.02).as("特攻"))
                .minus(F.when(F.pref("coil", text("worldcombat.skill.octolock.preference.coil")), F.const(1), F.const(0)))
                .clamp(4, 7).round(1),
            "伸出距离", {
                unit: " 格",
                description: "触手能伸到多远咬住目标；特攻越高够得越远，缠紧式收近 1 格。它也是本招的实际射程。"
            }),
        grip: formula(
            F.base(4).plus(F.body("width").times(1.2).as("身宽")).plus(F.body("height").times(0.4).as("身高"))
                .plus(F.when(F.pref("coil", text("worldcombat.skill.octolock.preference.coil")), F.const(1), F.const(0)))
                .clamp(3.5, 8).round(1),
            "维持距离", {
                unit: " 格",
                description: "术者离开目标超过这个距离，触手就松开、目标脱困；体型越大缠放得越长，缠紧式更牢。"
            }),
        bindTicks: seconds(
            F.base(220).plus(F.level().times(2).as("经验")).plus(F.stat("defence").times(0.5).as("防御")).clamp(180, 460).round(0),
            "缠绕时长", "触手最多缠住目标多久；等级与防御越高缠得越久。术者离开维持距离或倒下会提前松开。"),
        interval: seconds(
            F.base(60).minus(F.stat("speed").minus(60).times(0.12).as("速度"))
                .times(F.when(F.pref("coil", text("worldcombat.skill.octolock.preference.coil")), F.const(0.75), F.const(1)))
                .clamp(30, 80).round(0),
            "勒紧间隔", "每过多久勒紧一次（原生的一回合）；速度越快勒得越密，缠紧式更密。每次防御与特防各 −1 级。"),
        tentacles: formula(
            F.base(10).plus(F.stat("specialAttack").times(0.2).as("特攻")).clamp(10, 28).round(0),
            "触手数量", {
                unit: " 道",
                description: "缠住目标的触手道数；特攻越高越密，也是画面里触手粒子的数量。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).as("速度"))
                .plus(F.when(F.pref("coil", text("worldcombat.skill.octolock.preference.coil")), F.const(3), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把触手伸出去咬住需要多久；速度越快越短，缠紧式要多盘几刻。"),
        aftercast: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(0.8).as("身高")).clamp(5, 12).round(0),
            "收招", "触手落下后的收势；身量越大收得越慢。"),
        recharge: seconds(
            F.base(110).minus(F.level().times(0.5).as("经验"))
                .plus(F.when(F.pref("coil", text("worldcombat.skill.octolock.preference.coil")), F.const(15), F.const(0)))
                .clamp(70, 150).round(0),
            "冷却", "两次缠绕之间的等待；等级越高越熟练，缠紧式更费。PP 15 的代价。")
    });

    stages(octoId, [
        { level: 45, values: { bindTicks: 320, recharge: 92 } }
    ]);

    describe(octoId, [
        { key: "description.0", values: ["reach", "grip", "bindTicks"] },
        { key: "description.1", values: ["interval"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["coil"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["coil"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bindTicks", "tier.0.recharge"] }
    ]);
}
