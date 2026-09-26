/**
 * 隐形岩 / stealthrock 的参数与伤害段。
 *
 * 原生事实：Rock／变化／威力 0／命中 必中／PP 20／target foeSide。出场即触发，伤害几乎只看岩属性相性，
 *   不检查目标是否落地；它没有周期性，踩上才结算。
 *
 * 世界化：把「在对手周围悬浮无数岩石」翻成**一片悬浮在空中的石阵**——施法者抬手把碎石抬到选定的地点，
 *   石阵悬着固定 6 枚小石（`WorldEffects.field`，规则 `world_combat:hazard/stealthrock`）。它不再按时间
 *   自动砸人：敌人首次进入（或离开后再进入、且该敌警戒冷却到时）时，离它最近的一枚悬石离轨，作为真正
 *   飞行的短岩射向它；只有岩块真的碰到才结算 `fall` 岩属性伤害，打空、撞墙都不伤。发出的那块留出空位，
 *   过 `stoneInterval` 补回，最多 6 枚；空位未补时石阵容量有限，不会凭空多砸。石阵不隔实墙发射，
 *   沉岩式只响应贴地目标，浮岩式连空中的一起打。
 *
 * 数值来源（每个参数读不同的个体数据，分散到不同参数上）：
 *   fall           每块岩的威力：特攻偏移 + 等级偏移；沉岩 ×1.3 / 浮岩 ×0.8；夹 18..74。
 *   fieldRadius    石阵半径（触发空域与轨位基准）：身高 ＋ 特攻；沉岩 ×0.85 / 浮岩 ×1.2；夹 1.8..4.6。
 *   stoneTicks     石阵存在时长：等级 ＋ HP；沉岩 ×1.3 / 浮岩 ×0.9；夹 120..420。
 *   stoneInterval  空位补回一枚悬石所需时间：速度（越快补得越紧）；夹 18..44。
 *   alert          同一目标再次触发所需的警戒冷却：速度与等级；夹 16..60。
 *   launchSpeed    离轨岩块飞向目标的初速：速度；夹 0.7..1.4。
 *   reach          抬石距离：特攻与等级；夹 7..13，也是实际射程。
 *   raiseSpeed     抬石速度：速度。
 *   tempo          起手：速度；沉岩 +3 刻、浮岩 −2 刻。
 *   recharge       冷却：特攻；沉岩 ×1.08 / 浮岩 ×0.95。
 *
 * 配置 `heavy`（沉岩）双向取舍：开启＝每块岩更重、石阵存在更久，但石阵收窄到 0.85 倍、起手 +3 刻、
 *   冷却更长，且只响应贴地目标；关闭＝浮岩式，石阵铺宽 1.2 倍、起手更快，且**连飞行目标一起打**，
 *   代价是每块 ×0.8、存在更短。
 *
 * 伤害段 `fall` 是 Rock／特殊，`defenceCoefficient` 调低到 0.0015，让岩属性相性（而不是目标防御）主导结果。
 */
namespace PokemonSkills {
    export const stealthrockId = "stealthrock";
    export const stealthrockRule = "world_combat:hazard/stealthrock";
    export const stealthrockScene = "world_combat:move_stealthrock";
    /** 悬石轨位的持久表现：用客户端 scene 画 6 个真实轨位与空位，随 field 效果存续。 */
    export const stealthrockFieldScene = "world_combat:move_stealthrock_field";
    /** 挂在共享 world_combat:field 定义上的命名弹体回调；只有真实岩块命中才结算伤害。 */
    export const stealthrockHitHandler = "stealthrock/rock/hit";
    export const stealthrockCompleteHandler = "stealthrock/rock/complete";
    export const stealthrockStones = 6;
    export const stealthrockRaiseText = "world_combat.move.stealthrock.text.raise";
    export const stealthrockHitText = "world_combat.move.stealthrock.text.hit";

    actionParameters.define(stealthrockId, {
        fall: formula(
            F.base(26)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 28))
                .plus(F.level().minus(25).times(0.24).clamp(0, 10))
                .times(F.when(F.pref("heavy"), F.const(1.3), F.const(0.8)))
                .clamp(18, 74).round(1),
            "每块岩威力", {
                unit: "威力",
                description: "一枚悬石离轨砸中的威力；特攻与等级越高越重，沉岩式再抬三成。岩属性相性在命中时由共享结算按目标的属性算出。"
            }),
        fieldRadius: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.005).clamp(-0.3, 0.7))
                .times(F.when(F.pref("heavy"), F.const(0.85), F.const(1.2)))
                .clamp(1.8, 4.6).round(2),
            "石阵半径", {
                unit: "格",
                description: "石阵覆盖的半径，也是悬石轨位展开的范围与触发空域；身高与特攻越高罩得越宽，浮岩式铺得更开。"
            }),
        stoneTicks: seconds(
            F.base(200).plus(F.level().minus(25).times(2.2).clamp(0, 80)).plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 34))
                .times(F.when(F.pref("heavy"), F.const(1.3), F.const(0.9)))
                .clamp(120, 420).round(0),
            "石阵存在时长", "一片悬浮石阵在世界上留多久；等级与 HP 越高留得越久，沉岩式更耐放。"),
        stoneInterval: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6)).clamp(18, 44).round(0),
            "补石间隔", "一枚悬石离轨后，空位过多久补回一枚；速度越快补得越紧，期间石阵能打出的岩块更少。"),
        alert: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10)).plus(F.level().minus(25).times(0.2).clamp(0, 8))
                .clamp(16, 60).round(0),
            "警戒冷却", "同一个目标再次触发石阵前的等待；速度与等级越高回得越快，目标进出得越密也能更早再挨一记。"),
        launchSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35)).clamp(0.7, 1.4).round(2),
            "岩块速度", {
                unit: "格/刻",
                description: "离轨岩块飞向目标的初速；速度快的个体抛得更急，目标更难在岩块到达前走开。"
            }),
        reach: formula(
            F.base(9)
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .clamp(7, 13).round(2),
            "抬石距离", {
                unit: "格",
                description: "能把石阵抬到多远的地点；特攻与等级越高够得越远。它也是本招的实际射程。"
            }),
        raiseSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.005).clamp(-0.15, 0.4)).clamp(0.75, 1.5).round(2),
            "抬石速度", {
                unit: "格/刻",
                description: "碎石飞向落点的速度；速度快的个体抬得更急，目标更难在石阵成形前走开。"
            }),
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("heavy"), F.const(3), F.const(-2)))
                .clamp(6, 16).round(0),
            "起手", "把碎石抬起来需要多久；速度越快越短，沉岩 +3 刻、浮岩 −2 刻。"),
        recharge: seconds(
            F.base(110).minus(F.stat("specialAttack").minus(60).times(0.2).clamp(-10, 20))
                .times(F.when(F.pref("heavy"), F.const(1.08), F.const(0.95)))
                .clamp(60, 180).round(0),
            "冷却", "两次抬石之间的等待；特攻越高回得越快，沉岩 ×1.08、浮岩 ×0.95。")
    });

    defineCategory(stealthrockId, "special");
    defineDamage(stealthrockId, "fall", { defenceCoefficient: 0.0015 });

    stages(stealthrockId, [
        { level: 45, values: { fall: 40, fieldRadius: 3.0 } }
    ]);

    describe(stealthrockId, [
        { key: "description.0", values: ["fall"] },
        { key: "description.1", values: ["fieldRadius","stoneTicks","stoneInterval"] },
        { key: "description.2", values: ["alert"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fall", "tier.0.fieldRadius"] }
    ]);
}
