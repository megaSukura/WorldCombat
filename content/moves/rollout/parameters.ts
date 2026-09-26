/**
 * 滚动 / rollout 的参数与数值来源。
 *
 * 原生事实：岩石／物理／威力 30／命中 90／PP 20／接触；锁定 5 回合连续滚动，每命中一次威力翻倍
 * （30→60→120→240→480），被睡倒、畏缩或换招打断就归零；使用者处于「蜷缩」状态时整招威力再翻倍
 * （Cobblemon 1.8，共 200 位学习者）。
 *
 * 翻译：回合制的「一回合滚一次、越滚越重」落在即时战斗里就是**一趟一趟地接着滚**——每一趟把自己缩成
 * 石球撞向对手，命中即结算一段 `roll`，并把「连滚层数」往上抬一级；层数直接进 `roll` 的公式（2^层数），
 * 所以下一趟真地更重。滚到第 5 趟（层数到顶）这一串就自然收束，像滚过头的石头散成一地碎石。
 * 落空或换用任何别的招式都会立刻把层数清空——这才是原生「打断就归零」的另一半。
 *
 * 连滚层数是真实 MobEffect `world_combat:rollout_momentum`（共享身份 world_combat:status/rollout，
 * 振幅即层数 0..4）。命中把目标顶开一段，所以想接着滚就得重新贴上；这是对手最直接的读法：拉开就打不到。
 *
 * 数值分散（每个参数各吃不同的精灵数据，小差距才在场上看得出来）：
 *   roll     每趟威力：物攻定撞得多重；再乘 2^连滚层数，所以层数越高越吃物攻。
 *   chain    连滚上限：5 趟封顶，是本招整套的长度。
 *   accuracy 每趟命中率：速度决定石球贴得准不准；重滚式更难控。只在这一趟真实撞到人时才掷。
 *   reach    滚击距离：速度与身高决定这一趟最多滚多远，也是本招的实际射程来源。
 *   radius   判定半径：碰撞箱宽度与身高决定石球扫过多大一圈，也是逐刻真实碰撞的判定体。
 *   step     每刻位移：速度决定滚得多快（表现里的滚动速度）。
 *   turn     每刻转角：体重决定滚行惯性，越重越难拐；重滚式更低。它让石球只能缓慢朝当前瞄准转。
 *   push     击退：物攻决定撞开后顶多远。
 *   recoil   弹回：体重决定从真实碰撞点弹回来多少。
 *   window   连滚窗口：等级决定层数能维持多久不散。
 *   grains   碎石点数：物攻派生，表现按它发射。
 *   tempo／recover／recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `heavy`（重滚式）双向取舍（默认关）：
 *   开（重滚）：每次命中翻倍幅度 2.35 倍（上限更高），代价是每趟命中率 −5%、滚击距离 ×0.92、每刻转角 ×0.6、
 *     收招 +2 刻、冷却 +8 刻——滚得更重但更难接住、更拐不动。
 *   关（轻滚，原生形态）：翻倍 2.0 倍、每趟命中率 +2%、滚得更远、转向更灵，收招与冷却更短，代价是天花板较低。
 *
 * 伤害段 `roll` 走共享换算（对手防御、相性与暴击在命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const rolloutId = "rollout";
    export const rolloutScene = "world_combat:move_rollout";
    export const rolloutMomentum = "world_combat:rollout_momentum";
    export const rolloutStreak = "world_combat:status/rollout";
    export const rolloutRiseText = "world_combat.move.rollout.text.rise";
    export const rolloutHitText = "world_combat.move.rollout.text.hit";
    export const rolloutMissText = "world_combat.move.rollout.text.miss";
    export const rolloutCapText = "world_combat.move.rollout.text.cap";
    /** 表现里一趟滚击的参考判定半径（格）；服务端传 scale = 实际半径 / 这个值。 */
    export const rolloutReference = 0.5;

    /** 当前连滚层数 0..4，只认本单元注册的连滚载体。 */
    export function rolloutStage(world: CombatWorld, actor: CombatActor): number {
        const effect = MobEffects.read(world, actor, rolloutMomentum);
        return effect === null ? 0 : Math.max(0, Math.min(4, effect.amplifier()));
    }

    // 共享身份 state.rollout：公式与详情读到的是同一个真实 MobEffect 的振幅（层数）。
    defineFacts(rolloutId, function (context) {
        return { read: function (id) {
            if (id !== "state.rollout") return undefined;
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return rolloutStage(context.world, context.actor);
        } };
    });

    actionParameters.define(rolloutId, {
        /** 每趟威力：(7 + 物攻偏移[−2,8]) × 2^连滚层数（重滚 2.35），夹 5..88。 */
        roll: formula(
            F.base(7)
                .plus(F.stat("attack").minus(50).times(0.09).clamp(-2, 8))
                .times(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }),
                    F.const(2.35), F.const(2.0)).pow(F.state("rollout", { key: "worldcombat.skill.rollout.value.stage", fallback: "连滚层数" })))
                .clamp(5, 88).round(1),
            "每趟威力", {
                unit: "威力",
                description: "一趟滚击撞上去的威力；物攻越高撞得越重，再乘 2 的连滚层数次方，所以接得越深、这一趟越重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 连滚上限：固定 5 趟。 */
        chain: formula(
            F.base(5).round(0),
            "连滚上限", {
                unit: "次",
                description: "这一串最多接几次；接满 5 趟就像滚过头的石头一样散开，连滚层数随之归零。"
            }),
        /** 每趟命中率：0.9 + 速度偏移[−0.05,0.07]；重滚 −0.05 / 轻滚 +0.02；夹 0.72..0.97。 */
        accuracy: percent(
            F.base(0.9)
                .plus(F.stat("speed").minus(50).times(0.001).clamp(-0.05, 0.07))
                .plus(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(-0.05), F.const(0.02)))
                .clamp(0.72, 0.97).round(3),
            "每趟命中率", "石球这一趟真实撞到人时，这一撞落不落中的概率（原生 90% 起）；速度提高它，重滚式把它压低。撞上了却没中就是擦偏，连滚层数当场散尽。"),
        /** 滚击距离：3.4 + 速度偏移[−0.25,0.7] + 身高偏移[−0.12,0.4]；重滚 ×0.92；夹 2.6..4.8。 */
        reach: formula(
            F.base(3.4)
                .plus(F.stat("speed").minus(50).times(0.006).clamp(-0.25, 0.7))
                .plus(F.body("height").minus(1.4).times(0.08).clamp(-0.12, 0.4))
                .times(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(0.92), F.const(1)))
                .clamp(2.6, 4.8).round(2),
            "滚击距离", {
                unit: "格",
                description: "石球这一趟能够到多远；速度与身高决定贴上去的短距，它也是本招的实际射程来源。重滚式滚得近。"
            }),
        /** 判定半径：0.5 + 碰撞箱宽度偏移[−0.06,0.3] + 身高偏移[−0.05,0.2]；夹 0.42..0.95。 */
        radius: formula(
            F.base(0.5)
                .plus(F.body("width").minus(0.9).times(0.35).clamp(-0.06, 0.3))
                .plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.2))
                .clamp(0.42, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "石球能撞到多大一圈；身板越宽的个体滚得越宽，画面里石球的体积与它一致。"
            }),
        /** 每刻位移：0.55 + 速度偏移[−0.08,0.22]；夹 0.4..0.9。 */
        step: formula(
            F.base(0.55).plus(F.stat("speed").minus(50).times(0.004).clamp(-0.08, 0.22)).clamp(0.4, 0.9).round(2),
            "滚动速度", {
                unit: "格/刻",
                description: "石球每刻滚过的距离；速度快的个体滚得更利落，画面里的滚动速度按它走。"
            }),
        /** 每刻转角：(10 − 体重偏移[−1.2,3.5]) × 重滚 0.6；夹 4..12。 */
        turn: formula(
            F.base(10)
                .minus(F.body("weight").minus(45).times(0.02).clamp(-1.2, 3.5))
                .times(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(0.6), F.const(1)))
                .clamp(4, 12).round(1),
            "每刻转角", {
                unit: "度",
                description: "每一刻石球最多把滚动方向朝当前瞄准转多少度；身体越重惯性越大、转得越慢，重滚式更明显。所以急转折不回来，弯线来自真实滚行。"
            }),
        /** 击退：0.3 + 物攻偏移[−0.05,0.4]；夹 0.18..0.8。 */
        push: formula(
            F.base(0.3).plus(F.stat("attack").minus(50).times(0.005).clamp(-0.05, 0.4)).clamp(0.18, 0.8).round(2),
            "击退", {
                unit: "格",
                description: "被打中的人沿滚动方向被顶开的距离；力量越大顶得越远——这也是对手拉开、打断连滚的办法。"
            }),
        /** 弹回：0.5 + 体重偏移[−0.12,0.5]；夹 0.36..1.2。 */
        recoil: formula(
            F.base(0.5).plus(F.body("weight").minus(45).times(0.006).clamp(-0.12, 0.5)).clamp(0.36, 1.2).round(2),
            "弹回", {
                unit: "格",
                description: "撞中之后石球弹回来的距离；越重的个体弹得越远，也越需要重新贴上去。"
            }),
        /** 连滚窗口：35 + (等级 − 20) × 0.6；重滚 +8；夹 25..90。 */
        window: seconds(
            F.base(35).plus(F.level().minus(20).times(0.6))
                .plus(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(8), F.const(0)))
                .clamp(25, 90).round(0),
            "连滚窗口", "在这段时间内继续滚动，层数就保留；落空或任何别的招式提交都会立刻清零。等级越高维持越久。"),
        /** 碎石点数：14 + 物攻偏移[−3,16]；夹 10..44。 */
        grains: formula(
            F.base(14).plus(F.stat("attack").minus(50).times(0.12).clamp(-3, 16)).clamp(10, 44).round(0),
            "碎石点数", {
                unit: "点",
                description: "滚动与撞击时迸出的碎石数量，随物攻增长；粒子直接按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：6 − 速度偏移[−0.8,1.5]；重滚 +1；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.5))
                .plus(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(1), F.const(0)))
                .clamp(4, 10).round(0),
            "起手", "蜷身缩成石球的时间；速度越快越短，重滚式多花一刻。"),
        /** 收招：5 − 速度偏移[−0.6,1.2]；重滚 +2；夹 3..9。 */
        recover: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.6, 1.2))
                .plus(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "一趟滚完收势的时间；速度越快收得越快，重滚式更慢。"),
        /** 冷却：34 − 速度偏移[−2,5]；重滚 +8 / 轻滚 −4；夹 20..50。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(50).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("heavy", { key: "worldcombat.skill.rollout.preference.heavy", fallback: "重滚式" }), F.const(8), F.const(-4)))
                .clamp(20, 50).round(0),
            "冷却", "下一趟滚击前的等待；速度越快回得越快，重滚式更费、轻滚式更短。PP 20 的代价。")
    });

    defineDamage(rolloutId, "roll", {}, { contact: true });

    stages(rolloutId, [
        { level: 30, values: { roll: 9, window: 45 } },
        { level: 55, values: { roll: 12, reach: 3.8 } }
    ]);

    describe(rolloutId, [
        { key: "description.0", values: ["roll","chain"] },
        { key: "description.1", values: ["accuracy", "reach", "radius", "push"] },
        { key: "description.2", values: ["recoil","window"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.roll", "tier.0.window"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.roll", "tier.1.reach"] }
    ]);
}
